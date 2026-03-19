import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, MoreVertical, Info } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import MessageBubble from './MessageBubble';
import EmojiPicker from 'emoji-picker-react';
import { Theme } from 'emoji-picker-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import WebSocketManager from '@/lib/websocket';
import { isStatusUpdate, isChatMessage, updateMessageStatus as updateMessageStatusUtil } from '@/lib/utils';

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
  status: 'sending' | 'sent' | 'delivered' | 'read';
  file?: File;
  previewUrl?: string;
}

interface ChatWindowProps {
  contact: Contact;
  onToggleCustomerInfo: () => void;
}

const ChatWindow = ({ contact, onToggleCustomerInfo }: ChatWindowProps) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! How can I help you today?',
      type: 'text',
      sender: 'user',
      timestamp: '10:30 AM',
      status: 'read'
    },
    {
      id: '2',
      content: 'Hi there! I need some information about your services.',
      type: 'text',
      sender: 'contact',
      timestamp: '10:32 AM',
      status: 'read'
    },
    {
      id: '3',
      content: 'Of course! I\'d be happy to help. What specific information are you looking for?',
      type: 'text',
      sender: 'user',
      timestamp: '10:33 AM',
      status: 'read'
    },
    {
      id: '4',
      content: 'Thanks for the quick response!',
      type: 'text',
      sender: 'contact',
      timestamp: '10:35 AM',
      status: 'read'
    }
  ]);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [suggestions] = useState([
    'Hello!',
    'How can I help you?',
    'Thank you!',
    'I will get back to you.',
    'Can you share more details?'
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ file: File; previewUrl: string; type: 'image' | 'file' } | null>(null);
  const wsRef = useRef<WebSocketManager | null>(null);
  
  // Message ID mapping: frontend ID -> backend WhatsApp ID
  const [messageIdMapping, setMessageIdMapping] = useState<Map<string, string>>(new Map());
  
  // Queue for status updates that arrive before messages are in state
  const [pendingStatusUpdates, setPendingStatusUpdates] = useState<Array<{messageId: string, status: string}>>([]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Process pending status updates when messages change
  useEffect(() => {
    if (pendingStatusUpdates.length > 0) {
      console.log('🔄 Processing pending status updates:', pendingStatusUpdates);
      pendingStatusUpdates.forEach(({ messageId, status }) => {
        updateMessageStatus(messageId, status as 'sent' | 'delivered' | 'read');
      });
      setPendingStatusUpdates([]);
    }
  }, [messages, pendingStatusUpdates]);

  // Debug: Log messages state changes
  useEffect(() => {
    console.log('📊 Messages state updated. Total messages:', messages.length);
    console.log('📊 Latest messages:', messages.slice(-3).map(m => ({ id: m.id, content: m.content.substring(0, 20), status: m.status, sender: m.sender })));
  }, [messages]);

  // Status update helper function
  const updateMessageStatus = (messageId: string, newStatus: 'sent' | 'delivered' | 'read') => {
    console.log('Attempting to update status for message ID:', messageId);
    console.log('Current messages in state:', messages);
    
    // Try to find the message by ID
    let foundMessage = messages.find(msg => msg.id === messageId);
    
    if (foundMessage) {
      console.log('✅ Found message, updating status:', foundMessage.id, '->', newStatus);
      setMessages(prev => updateMessageStatusUtil(prev, foundMessage.id, newStatus));
    } else {
      console.log('❌ Message not found for ID:', messageId);
      console.log('Available messages:', messages.map(m => ({ id: m.id, status: m.status, sender: m.sender, content: m.content.substring(0, 20) + '...' })));
      console.log('Message ID mapping:', Array.from(messageIdMapping.entries()));
      
      // Check if there are any user messages with 'sending' status
      const sendingMessages = messages.filter(msg => msg.sender === 'user' && msg.status === 'sending');
      console.log('Messages with "sending" status:', sendingMessages);
      
      // Fallback: Update the most recent user message that's still in 'sending' status
      if (sendingMessages.length > 0) {
        const mostRecentSending = sendingMessages.sort((a, b) => parseInt(b.id) - parseInt(a.id))[0];
        console.log('🔄 Fallback: Updating most recent sending message:', mostRecentSending.id, '->', newStatus);
        setMessages(prev => updateMessageStatusUtil(prev, mostRecentSending.id, newStatus));
      } else {
        // Queue the status update for later processing
        console.log('📋 Queueing status update for later:', messageId, '->', newStatus);
        setPendingStatusUpdates(prev => [...prev, { messageId, status: newStatus }]);
      }
    }
  };

  useEffect(() => {
    console.log('Connecting to WebSocket for contact:', contact.phone);
    // Disconnect previous socket if any
    if (wsRef.current) {
      wsRef.current.disconnect();
    }
    // Build websocket URL for localhost:8000
    const wsUrl = `ws://localhost:8000/ws/whatsapp/chat/${contact.phone}/`;
   // const wsUrl = `wss://f38f-2409-40c1-5023-94d7-e832-5dd1-37c5-895c.ngrok-free.app/ws/whatsapp/chat/${contact.phone}/`;
    console.log('WebSocket URL:', wsUrl);
    const ws = new WebSocketManager(wsUrl);
    wsRef.current = ws;
    ws.connect();

    // Listen for incoming messages
    const handleMessage = (data: any) => {
      console.log('WebSocket message received:', data);
      console.log('Message type:', data?.type);
      console.log('Message content:', data?.message);
      
      // Handle backend status updates (direct format from your backend)
      // A status update typically ONLY has message_id, status, phone_number, etc. but NO content.
      // If it has 'content', it's a full message, not just a status update.
      if (data && data.message_id && data.status && !data.content) {
        console.log('✅ Backend status update received:', data);
        console.log('Updating message ID:', data.message_id, 'to status:', data.status);
        
        // If backend provides frontend_id, use it directly
        if (data.frontend_id) {
          console.log('✅ Using frontend_id from backend:', data.frontend_id);
          updateMessageStatus(data.frontend_id, data.status);
        } else {
          updateMessageStatus(data.message_id, data.status);
        }
        return;
      }
      
      // Handle status updates in wrapped format
      if (isStatusUpdate(data)) {
        console.log('✅ Status update received:', data.message);
        console.log('Updating message ID:', data.message.message_id, 'to status:', data.message.status);
        
        // If backend provides frontend_id, use it directly
        const msgAny = data.message as any;
        if (msgAny.frontend_id) {
          console.log('✅ Using frontend_id from backend:', msgAny.frontend_id);
          updateMessageStatus(msgAny.frontend_id, data.message.status);
        } else {
          updateMessageStatus(data.message.message_id, data.message.status);
        }
      } else if (isChatMessage(data)) {
        // Handle incoming chat messages
        console.log('✅ Chat message received:', data.message);
        const newMessage: Message = {
          id: data.message.id || Date.now().toString(),
          content: data.message.content,
          type: 'text',
          sender: 'contact',
          timestamp: data.message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read', // Incoming messages are considered read
        };
        setMessages(prev => [...prev, newMessage]);
      } else if (data && data.content) {
        // Fallback for direct message objects
        console.log('⚠️ Fallback message handling:', data);
        const newMessage: Message = {
          id: data.id || Date.now().toString(),
          content: data.content,
          type: 'text',
          sender: 'contact',
          timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read',
        };
        setMessages(prev => [...prev, newMessage]);
      } else {
        console.log('❓ Unknown message format:', data);
      }
    };

    // Listen for specific status updates
    const handleStatusUpdate = (data: any) => {
      console.log('🔔 Specific status_update event received:', data);
      
      // Handle backend status updates (direct format from your backend)
      if (data && data.message_id && data.status) {
        console.log('✅ Backend status update processed:', data);
        
        // If backend provides frontend_id, use it directly
        if (data.frontend_id) {
          console.log('✅ Using frontend_id from backend:', data.frontend_id);
          updateMessageStatus(data.frontend_id, data.status);
        } else {
          updateMessageStatus(data.message_id, data.status);
        }
        return;
      }
      
      if (isStatusUpdate(data)) {
        console.log('✅ Status update processed:', data.message);
        
        // If backend provides frontend_id, use it directly
        if ((data.message as any).frontend_id) {
          console.log('✅ Using frontend_id from backend:', (data.message as any).frontend_id);
          updateMessageStatus((data.message as any).frontend_id, data.message.status);
        } else {
          updateMessageStatus(data.message.message_id, data.message.status);
        }
      } else {
        console.log('❌ Invalid status update format:', data);
      }
    };

    ws.on('message', handleMessage);
    ws.on('status_update', handleStatusUpdate);

    return () => {
      ws.off('message', handleMessage);
      ws.off('status_update', handleStatusUpdate);
      ws.disconnect();
    };
  }, [contact.phone, messageIdMapping]);

  const handleSendMessage = () => {
    if (message.trim()) {
      const frontendMessageId = Date.now().toString();
      const newMessage: Message = {
        id: frontendMessageId,
        content: message,
        type: 'text',
        sender: 'user',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sending', // Start with sending status
      };
      
      console.log('🔄 Adding new message to state:', newMessage);
      
      // Add message to state immediately
      setMessages(prev => {
        const updatedMessages = [...prev, newMessage];
        console.log('📝 Updated messages state:', updatedMessages);
        return updatedMessages;
      });
      
      // Clear input after adding to state
      setMessage('');
      
      if (wsRef.current) {
        const messageData = {
          type: 'chat_message',
          message: {
            id: frontendMessageId,
            phone_number: contact.phone,
            content: newMessage.content,
            sender: 'admin', // match backend
            timestamp: newMessage.timestamp,
          },
        };
        console.log('Sending message via WebSocket:', messageData);
        
        // Add a small delay to ensure state update completes
        setTimeout(() => {
          wsRef.current?.send(messageData);
          console.log('Message sent with frontend ID:', frontendMessageId);
          console.log('Waiting for backend to send WhatsApp message ID and status updates...');
        }, 100);
      }
      
      console.log('Message sent. Waiting for backend status updates...');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Voice recording logic
  const handleMicClick = async () => {
    if (isRecording) {
      mediaRecorder?.stop();
      setIsRecording(false);
    } else {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        setMediaRecorder(recorder);
        setAudioChunks([]);
        recorder.ondataavailable = (e) => {
          setAudioChunks((prev) => [...prev, e.data]);
        };
        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          const newMessage: Message = {
            id: Date.now().toString(),
            content: audioUrl,
            type: 'file',
            sender: 'user',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'sent',
          };
          setMessages((prev) => [...prev, newMessage]);
        };
        recorder.start();
        setIsRecording(true);
      }
    }
  };

  // Handle file selection (update to close dialog)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      setPendingAttachment({
        file,
        previewUrl: fileUrl,
        type: file.type === 'image/jpeg' || file.type === 'image/png' ? 'image' : 'file',
      });
      setShowFileDialog(false);
    }
  };

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      setPendingAttachment({
        file,
        previewUrl: fileUrl,
        type: file.type === 'image/jpeg' || file.type === 'image/png' ? 'image' : 'file',
      });
      setShowFileDialog(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Send pending attachment
  const handleSendAttachment = () => {
    if (pendingAttachment) {
      const { file, previewUrl, type } = pendingAttachment;
      const newMessage: Message = {
        id: Date.now().toString(),
        content: file.name,
        type,
        sender: 'user',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent',
        file,
        previewUrl,
      };
      setMessages((prev) => [...prev, newMessage]);
      setPendingAttachment(null);
    }
  };

  // Remove pending attachment
  const handleRemoveAttachment = () => {
    setPendingAttachment(null);
  };

  return (
    <div className="flex flex-col h-full max-h-screen overflow-hidden">
      {/* Chat Header - Fixed */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={contact.avatar} alt={contact.name} />
                <AvatarFallback className="bg-green-100 text-green-600">
                  {contact.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              {contact.online && (
                <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>
            <div>
              <h3
                className="font-medium text-gray-900 cursor-pointer hover:underline"
                onClick={onToggleCustomerInfo}
                tabIndex={0}
                role="button"
                aria-label="Open contact info"
              >
                {contact.name}
              </h3>
              <p className="text-sm text-gray-500">
                {contact.online ? 'Online' : 'Last seen recently'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={onToggleCustomerInfo}>
              <Info className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages - Scrollable */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Suggestions Row */}
      <div className="flex flex-wrap gap-2 px-4 pb-2">
        {suggestions.map((s, i) => (
          <button
            key={i}
            className="bg-gray-100 hover:bg-green-100 text-gray-700 px-3 py-1 rounded-full text-sm border border-gray-200"
            onClick={() => setMessage(s)}
            type="button"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Pending Attachment Preview */}
      {pendingAttachment && (
        <div className="flex items-center gap-4 px-4 pb-2 relative">
          {pendingAttachment.type === 'image' ? (
            <div className="relative inline-block">
              <img src={pendingAttachment.previewUrl} alt={pendingAttachment.file.name} className="max-w-[120px] max-h-[120px] rounded border" />
              <button
                className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 shadow hover:bg-red-100"
                onClick={handleRemoveAttachment}
                aria-label="Remove attachment"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 text-red-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="relative inline-block">
              <a href={pendingAttachment.previewUrl} download={pendingAttachment.file.name} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">
                {pendingAttachment.file.name}
              </a>
              <button
                className="absolute -top-2 -right-2 bg-white bg-opacity-80 rounded-full p-1 shadow hover:bg-red-100"
                onClick={handleRemoveAttachment}
                aria-label="Remove attachment"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 text-red-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Message Input - Fixed */}
      <div className="flex-shrink-0 p-3 border-t border-gray-200 bg-white">
        <div className="flex items-end">
          <div className="flex-1 relative">
            {/* Emoji Picker Button (inside input, left) */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1 h-7 w-7"
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              tabIndex={-1}
            >
              <Smile className="h-4 w-4" />
            </Button>
            {/* Attach File Button (inside input, right) */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 h-7 w-7"
              type="button"
              tabIndex={-1}
              onClick={() => setShowFileDialog(true)}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            {/* File Upload Dialog */}
            <Dialog open={showFileDialog} onOpenChange={setShowFileDialog}>
              <DialogContent>
                <DialogTitle>Drag & Drop Files Here</DialogTitle>
                <DialogDescription>
                  (Supported file types are jpeg and png).<br />
                  <a href="#" className="text-green-600 underline text-sm">Learn more about supported file formats here</a>
                </DialogDescription>
                <div
                  className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 mt-4 cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ minHeight: 180 }}
                >
                  <span className="text-gray-400 text-4xl mb-2">📁</span>
                  <span className="text-gray-700">Drag & Drop Files Here</span>
                  <span className="text-gray-500 text-xs mt-2">or click to browse</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={handleFileChange}
                    tabIndex={-1}
                  />
                </div>
              </DialogContent>
            </Dialog>
            {/* Disable input/send if pending attachment */}
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 pr-10 resize-none"
              disabled={!!pendingAttachment}
              onFocus={() => setShowEmojiPicker(false)}
            />
            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-0 z-50 bg-white border rounded shadow-lg">
                <EmojiPicker
                  onEmojiClick={(emoji) => {
                    setMessage((msg) => msg + emoji.emoji);
                  }}
                  theme={Theme.LIGHT}
                  width={320}
                  height={400}
                />
              </div>
            )}
          </div>
          {/* Voice Message Button */}
          <Button
            variant={isRecording ? 'destructive' : 'ghost'}
            size="sm"
            className="flex-shrink-0 ml-2"
            type="button"
            onClick={handleMicClick}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75v1.5m0 0h3.75m-3.75 0H8.25m3.75-1.5a6 6 0 01-6-6V9a6 6 0 1112 0v3.75a6 6 0 01-6 6z" />
            </svg>
          </Button>
          <Button
            onClick={pendingAttachment ? handleSendAttachment : handleSendMessage}
            disabled={pendingAttachment ? false : !message.trim()}
            className="bg-green-600 hover:bg-green-700 flex-shrink-0 ml-2"
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;