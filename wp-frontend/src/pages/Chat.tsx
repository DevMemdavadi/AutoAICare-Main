import React, { useState, useEffect } from 'react';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import CustomerInfo from '@/components/chat/CustomerInfo';
import api from '@/lib/api';

interface Contact {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  online: boolean;
  phone: string;
}

interface Message {
  id: string;
  content: string;
  type: 'text' | 'image' | 'file';
  sender: 'user' | 'contact';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

const Chat = () => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    async function fetchContacts() {
      try {
        const response = await api.get('/whatsapp/dashboard/team-inbox/chat-list/');
        // Map API response to Contact type
        const mappedContacts = response.data.map((c: any) => ({
          id: c.phone_number, // phone number as unique id
          name: c.contact_name,
          avatar: '/placeholder.svg', // You can update this if you have avatar URLs
          lastMessage: c.last_message_preview || '',
          timestamp: c.last_activity_at ? new Date(c.last_activity_at).toLocaleString() : '',
          unreadCount: c.unread_count || 0,
          online: false, // No online info in this API, set as needed
          phone: c.phone_number,
        }));
        setContacts(mappedContacts);
      } catch (error) {
        console.error('Failed to fetch chat list:', error);
      }
    }
    fetchContacts();
  }, []);

  return (
    <div className="flex h-full max-h-screen overflow-hidden bg-gray-50">
      {/* Contact Sidebar - Fixed */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 h-full">
        <ChatSidebar
          contacts={contacts}
          selectedContact={selectedContact}
          onSelectContact={setSelectedContact}
        />
      </div>

      {/* Chat Window - Flexible */}
      <div className="flex-1 min-w-0 flex flex-col h-full">
        {selectedContact ? (
          <ChatWindow
            contact={selectedContact}
            onToggleCustomerInfo={() => setShowCustomerInfo(!showCustomerInfo)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Welcome to Chat</h3>
              <p className="text-gray-500">Select a contact to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Customer Info Panel - Fixed */}
      {selectedContact && showCustomerInfo && (
        <div className="w-80 flex-shrink-0 bg-white border-l border-gray-200 h-full">
          <CustomerInfo
            contact={selectedContact}
            onClose={() => setShowCustomerInfo(false)}
          />
        </div>
      )}
    </div>
  );
};

export default Chat;