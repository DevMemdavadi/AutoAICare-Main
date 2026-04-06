import React, { useState, useEffect, useRef } from 'react';
import api from '@/utils/api';
import { Search, Loader2, MessageSquare, Plus, Send, Phone, MoreVertical, Paperclip, Check, CheckCheck, Smile, Mic, Square, Trash2 } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { Button, Input, Modal } from '@/components/ui';

const ChatsPage = () => {
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const textareaRef = useRef(null);
  
  // New Chat Modal
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  
  // Chat Header UI States
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const chatSearchQueryRef = useRef('');
  const chatMenuRef = useRef(null);
  
  // Voice Recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchContacts();
    
    // Fallback Polling for Contacts alone when no chat is active
    const contactsInterval = setInterval(() => {
        if (!selectedContact) {
            fetchContacts(false);
        }
    }, 5000);
    
    return () => clearInterval(contactsInterval);
  }, []);

  // Segregated useEffect exclusively enforcing activeChatId controlled 5000ms polling without infinite recreations
  useEffect(() => {
      if (!selectedContact) return;
      
      fetchMessages(selectedContact.phone_number, false);
      
      const interval = setInterval(() => {
          fetchMessages(selectedContact.phone_number, false);
          fetchContacts(false);
      }, 5000);
      
      return () => clearInterval(interval);
  }, [selectedContact]);

  useEffect(() => {
    // Close emoji picker when clicking outside
    const handleClickOutside = (event) => {
        if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
            setShowEmojiPicker(false);
        }
        if (chatMenuRef.current && !chatMenuRef.current.contains(event.target)) {
            setShowChatMenu(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchContacts = async (showLoader = true) => {
    try {
      if (showLoader) setLoadingContacts(true);
      const response = await api.get('/chats/contacts/');
      setContacts(response.data?.results || response.data || []);
    } catch (error) {
      console.error('Failed to fetch chat contacts:', error);
    } finally {
      if (showLoader) setLoadingContacts(false);
    }
  };

  const fetchMessages = async (phoneNumber, showLoader = true) => {
    try {
      if (showLoader) setLoadingMessages(true);
      const response = await api.get(`/chats/${phoneNumber}/messages/`);
      setMessages(response.data?.data || []);
      console.log("MESSAGES STATE:", response.data?.data || []);
      
      // Attempt to mark as read immediately only if unread messages explicitly exist
      setContacts(prev => {
          const contact = prev.find(c => c.phone_number === phoneNumber);
          if (contact && contact.unread_count > 0) {
              api.post(`/chats/${phoneNumber}/mark-read/`).catch(console.error);
              return prev.map(c => c.phone_number === phoneNumber ? { ...c, unread_count: 0 } : c);
          }
          return prev;
      });
      
      // Suspend scrolling if the user is actively parsing search filter results
      if (!chatSearchQueryRef.current) {
          setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      if (showLoader) setLoadingMessages(false);
    }
  };

  const handleContactSelect = (contact) => {
    if (selectedContact?.phone_number === contact.phone_number) return;
    setSelectedContact(contact);
    fetchMessages(contact.phone_number);
  };

  const handleEmojiClick = (emojiData, event) => {
    setMessageInput(prev => prev + emojiData.emoji);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if ((!messageInput.trim() && !attachment) || !selectedContact) return;
    
    const content = messageInput.trim();
    
    setShowEmojiPicker(false); // Close emoji picker
    setIsSending(true);
    
    let response;
    try {
      if (attachment) {
          const formData = new FormData();
          formData.append('phone_number', selectedContact.phone_number);
          formData.append('content', content);
          formData.append('attachment', attachment);
          response = await api.post('/chats/send/', formData);
      } else {
          response = await api.post('/chats/send/', {
              phone_number: selectedContact.phone_number,
              content: content
          });
      }
      
      if (response.data?.status === 'success') {
          setMessages(prev => {
              const updated = [...prev, response.data.data];
              console.log("MESSAGES STATE:", updated);
              return updated;
          });
          
          setMessageInput('');
          setAttachment(null);
          if (fileInputRef.current) {
              fileInputRef.current.value = '';
          }
          if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
          }
          
          setTimeout(scrollToBottom, 50);
          fetchContacts(false); // Update last_message silently
          if (selectedContact) {
              fetchMessages(selectedContact.phone_number, false);
          }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert("CRASH DETECTED: " + (error.response ? JSON.stringify(error.response.data) : error.message));
    } finally {
      setIsSending(false);
    }
  };
  
  const handleStartRecording = async (e) => {
      e?.preventDefault();
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];
          
          mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                  audioChunksRef.current.push(event.data);
              }
          };
          
          mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              const audioFile = new File([audioBlob], `voice_note_${new Date().getTime()}.webm`, { type: 'audio/webm' });
              handleSendAudio(audioFile);
              
              // Clean up tracks
              stream.getTracks().forEach(track => track.stop());
          };
          
          mediaRecorder.start();
          setIsRecording(true);
      } catch (error) {
          console.error("Failed to start recording", error);
          alert("Microphone access denied or not available.");
      }
  };
  
  const handleStopRecording = (e) => {
      e?.preventDefault();
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };
  
  const handleSendAudio = async (audioFile) => {
      if (!selectedContact) return;
      setIsSending(true);
      try {
          const formData = new FormData();
          formData.append('phone_number', selectedContact.phone_number);
          formData.append('content', ''); // No text caption for pure voice notes
          formData.append('attachment', audioFile);
          
          const response = await api.post('/chats/send/', formData);
          
          if (response.data?.status === 'success') {
              setMessages(prev => [...prev, response.data.data]);
              setTimeout(scrollToBottom, 50);
              fetchContacts(false);
          } else {
              console.error("Voice note send failed Server:", response.data);
              alert("SERVER FAILED: " + JSON.stringify(response.data));
          }
      } catch (error) {
          console.error('Failed to send voice note:', error);
          alert("AXIOS CRASH: " + (error.response ? JSON.stringify(error.response.data) : error.message));
      } finally {
          setIsSending(false);
      }
  };
  
  const handleStartNewChat = () => {
    if (!newChatPhone.trim()) return;
    
    // Check if contact already exists
    const existing = contacts.find(c => c.phone_number.includes(newChatPhone) || newChatPhone.includes(c.phone_number));
    
    if (existing) {
        handleContactSelect(existing);
    } else {
        // Create an optimistic local contact
        const optimisticContact = {
            id: 'new',
            phone_number: newChatPhone.replace(/\D/g, ''),
            last_message: '',
            unread_count: 0
        };
        handleContactSelect(optimisticContact);
    }
    
    setShowNewChatModal(false);
    setNewChatPhone('');
  };

  const handleClearChat = async () => {
      if (!selectedContact) return;
      
      const confirm_delete = window.confirm(`Are you sure you want to permanently clear this chat history with ${selectedContact.name || selectedContact.phone_number}? This action cannot be undone on the CRM.`);
      if (!confirm_delete) return;
      
      try {
          const response = await api.post(`/chats/${selectedContact.phone_number}/clear/`);
          if (response.data?.status === 'success') {
              setMessages([]);
              fetchContacts(false); // Update last_message silently
          }
      } catch (error) {
          console.error("Failed to clear chat:", error);
          alert("Failed to clear chat. Ensure the backend is running.");
      }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDateHeader = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    today.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredContacts = contacts.filter((c) =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.phone_number || '').includes(searchQuery)
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Live Chats
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
            />
          </div>
          <Button onClick={() => setShowNewChatModal(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Contacts List */}
        <div className="w-1/3 min-w-[300px] border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
          {loadingContacts ? (
            <div className="flex flex-col items-center justify-center p-8 h-full text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mb-4 text-blue-500" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center text-sm">
                <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                <p>No contacts found.</p>
                <button onClick={() => setShowNewChatModal(true)} className="text-blue-500 mt-2 hover:underline">Start a new chat</button>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.phone_number}
                onClick={() => handleContactSelect(contact)}
                className={`flex items-center p-4 border-b border-slate-100 transition-colors cursor-pointer ${
                  selectedContact?.phone_number === contact.phone_number ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-lg mr-4">
                  {contact.name ? contact.name.charAt(0).toUpperCase() : <Phone className="w-5 h-5 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-semibold text-slate-800 truncate">{contact.name || contact.phone_number}</h3>
                    <span className="text-xs text-slate-400">{formatTime(contact.last_message_time)}</span>
                  </div>
                  <p className="text-sm text-slate-500 truncate flex items-center gap-1">
                    {/* Status ticks prefix could go here if it was outgoing */}
                    {contact.last_message || 'Start typing...'}
                  </p>
                </div>
                {(contact.unread_count > 0) && (
                  <div className="ml-3 bg-blue-600 text-white rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold">
                    {contact.unread_count}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right Pane - Chat Window */}
        <div className="flex-1 flex flex-col bg-[#efeae2]">
          {!selectedContact ? (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
                <div className="text-center text-slate-400 max-w-sm px-6">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-medium text-slate-700 mb-2">WhatsApp Web</h3>
                <p className="text-sm">Send and receive messages directly integrated with the CRM without leaving the dashboard.</p>
                </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                        {selectedContact.name ? selectedContact.name.charAt(0).toUpperCase() : <Phone className="w-5 h-5" />}
                    </div>
                    <div>
                        <h2 className="font-semibold text-slate-800">{selectedContact.name || selectedContact.phone_number}</h2>
                        <span className="text-xs text-slate-500">+{selectedContact.phone_number}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-slate-500 relative">
                    <button onClick={() => { setShowChatSearch(!showChatSearch); setChatSearchQuery(''); }} className={`transition-colors ${showChatSearch ? 'text-blue-600' : 'hover:text-slate-800'}`} title="Search Conversation">
                        <Search className="w-5 h-5" />
                    </button>
                    
                    <button onClick={() => setShowChatMenu(!showChatMenu)} className="hover:text-slate-800 transition-colors" title="More Options">
                        <MoreVertical className="w-5 h-5" />
                    </button>
                    
                    {showChatMenu && (
                        <div ref={chatMenuRef} className="absolute top-10 right-0 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 text-sm">
                            <button 
                                onClick={() => { setShowChatMenu(false); handleClearChat(); }}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-red-600 flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Clear Chat
                            </button>
                        </div>
                    )}
                </div>
              </div>
              
              {/* Inline Chat Search Bar */}
              {showChatSearch && (
                  <div className="bg-slate-50 px-6 py-2 border-b border-slate-200 transition-all">
                      <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                              autoFocus
                              type="text"
                              placeholder="Search in conversation..."
                              value={chatSearchQuery}
                              onChange={(e) => {
                                  setChatSearchQuery(e.target.value);
                                  chatSearchQueryRef.current = e.target.value;
                              }}
                              className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
                          />
                          {chatSearchQuery && (
                              <button onClick={() => { setChatSearchQuery(''); chatSearchQueryRef.current = ''; }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                                  <span className="text-xs font-bold leading-none">✕</span>
                              </button>
                          )}
                      </div>
                  </div>
              )}

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-3 relative">
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                
                {loadingMessages ? (
                  <div className="flex-1 flex items-center justify-center">
                      <div className="bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-sm">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                      </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-slate-500 bg-white/60 p-3 rounded-lg mx-auto w-fit shadow-sm">
                      Send a message to start this conversation
                  </div>
                ) : (() => {
                  const filtered = chatSearchQuery.trim() 
                      ? messages.filter(msg => (msg.content || '').toLowerCase().includes(chatSearchQuery.toLowerCase()) || (msg.filename || '').toLowerCase().includes(chatSearchQuery.toLowerCase()))
                      : messages;
                  
                  if (filtered.length === 0) {
                      return (
                          <div className="flex-1 flex items-center justify-center text-sm text-slate-500 bg-white/60 p-3 rounded-lg mx-auto w-fit shadow-sm">
                              No messages match your search query.
                          </div>
                      );
                  }
                  
                  return filtered.map((msg, idx, arr) => {
                    // Inject Date Header logic
                    let showDate = false;
                    if (idx === 0) {
                        showDate = true;
                    } else {
                        const prevDate = new Date(arr[idx-1].timestamp).toDateString();
                        const currDate = new Date(msg.timestamp).toDateString();
                        if (prevDate !== currDate) showDate = true;
                    }

                    const isOutgoing = msg.type === 'outgoing';
                    return (
                      <React.Fragment key={msg.id || idx}>
                        {showDate && (
                            <div className="flex justify-center my-3 relative z-10">
                                <span className="bg-white text-slate-500 text-xs py-1 px-3 rounded-md shadow-sm border border-slate-100">
                                    {formatDateHeader(msg.timestamp)}
                                </span>
                            </div>
                        )}
                        <div className={`flex w-full ${isOutgoing ? 'justify-end' : 'justify-start'} relative z-10`}>
                          <div
                            className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm relative ${
                              isOutgoing
                                ? 'bg-[#dcf8c6] text-slate-800 rounded-tr-sm'
                                : 'bg-white text-slate-800 rounded-tl-sm border border-slate-100'
                            }`}
                          >
                            <div className="text-[15px] whitespace-pre-wrap leading-relaxed">
                                {msg.media_url ? (
                                    <div className="flex flex-col gap-2">
                                        {msg.media_type === 'image' && (
                                            <a href={msg.media_url} target="_blank" rel="noopener noreferrer">
                                              <img src={msg.media_url} alt="Attachment" className="max-w-full rounded-lg max-h-60 object-contain shadow-sm border border-black/5" />
                                            </a>
                                        )}
                                        {msg.media_type === 'video' && (
                                            <video src={msg.media_url} controls className="max-w-full rounded-lg max-h-60 shadow-sm border border-black/5" />
                                        )}
                                        {msg.media_type === 'audio' && (
                                            <audio src={msg.media_url} controls className="max-w-full w-[240px] h-[40px]" />
                                        )}
                                        {msg.media_type === 'document' && (
                                            <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 p-3 rounded-lg text-sm border hover:opacity-80 transition-opacity ${isOutgoing ? 'bg-green-700/10 border-green-700/20 text-green-900' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                                                <div className="p-2 bg-white/60 rounded-md">
                                                    <Paperclip className="w-5 h-5 flex-shrink-0" />
                                                </div>
                                                <span className="truncate font-medium">{msg.filename ? msg.filename : "Attachment"}</span>
                                            </a>
                                        )}
                                        {msg.content && <p>{msg.content}</p>}
                                    </div>
                                ) : (
                                    <p>{msg.content}</p>
                                )}
                            </div>
                            <div className={`flex items-center justify-end gap-1 mt-1 ${isOutgoing ? 'text-green-700/60' : 'text-slate-400'}`}>
                                <span className="text-[10px] uppercase font-medium">{formatTime(msg.timestamp)}</span>
                                {isOutgoing && (
                                    <CheckCheck className={`w-3 h-3 ${msg.status === 'READ' ? 'text-blue-500' : ''}`} />
                                )}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                })()}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="bg-slate-100 flex flex-col z-10 sticky bottom-0 relative">
                {/* Emoji Picker Popup */}
                {showEmojiPicker && (
                    <div ref={emojiPickerRef} className="absolute bottom-full left-4 mb-2 z-50">
                        <EmojiPicker 
                            onEmojiClick={handleEmojiClick}
                            autoFocusSearch={false}
                            theme={"light"}
                            searchDisabled={true}
                            width={320}
                            height={400}
                        />
                    </div>
                )}
                
                {attachment && (
                  <div className={`px-4 py-2 bg-white border-t border-slate-200 flex items-center justify-between ${isSending ? 'opacity-50' : ''}`}>
                    <span className="text-sm text-blue-600 truncate flex-1">{attachment.name}</span>
                    <button disabled={isSending} onClick={() => setAttachment(null)} className="text-red-500 hover:text-red-700 ml-4 border p-1 rounded disabled:cursor-not-allowed">Clear</button>
                  </div>
                )}
                <div className="px-4 py-3 flex items-end gap-3 w-full">
                  <button disabled={isSending} onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2 transition-colors flex-shrink-0 pb-2 ${showEmojiPicker ? 'text-blue-500' : 'text-slate-500 hover:text-slate-700'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                      <Smile className="w-5 h-5" />
                  </button>
                  <input 
                      disabled={isSending}
                      type="file" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={(e) => setAttachment(e.target.files[0])} 
                      accept="image/*,.pdf,.doc,.docx"
                  />
                  <button disabled={isSending} onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0 pb-2 disabled:opacity-50 disabled:cursor-not-allowed">
                      <Paperclip className="w-5 h-5" />
                  </button>
                  {isRecording ? (
                      <div className="flex-1 bg-red-50 rounded-xl border border-red-200 px-4 py-2 flex items-center justify-between min-h-[44px]">
                          <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                              <span className="text-sm font-medium text-red-600 animate-pulse">Recording voice note...</span>
                          </div>
                      </div>
                  ) : (
                      <div className={`flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${isSending ? 'bg-slate-50 opacity-70' : ''}`}>
                          <textarea
                              ref={textareaRef}
                              disabled={isSending}
                              className="w-full bg-transparent p-3 max-h-32 min-h-[44px] focus:outline-none resize-none text-[15px] disabled:cursor-not-allowed"
                              placeholder={isSending ? "Sending message..." : "Type a message..."}
                              rows={1}
                              value={messageInput}
                              onChange={(e) => {
                                  setMessageInput(e.target.value);
                                  e.target.style.height = 'auto';
                                  e.target.style.height = (e.target.scrollHeight) + 'px';
                              }}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSendMessage();
                                  }
                              }}
                          />
                      </div>
                  )}
                  
                  {messageInput.trim() || attachment ? (
                      <button 
                        onClick={handleSendMessage}
                        disabled={isSending}
                        className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600 flex-shrink-0 flex items-center justify-center h-[44px] w-[44px]"
                      >
                        {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
                      </button>
                  ) : (
                      <button 
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        className={`p-3 text-white rounded-full transition-colors flex-shrink-0 flex items-center justify-center h-[44px] w-[44px] ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-bounce' : 'bg-green-600 hover:bg-green-700'}`}
                      >
                        {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                      </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      <Modal isOpen={showNewChatModal} onClose={() => setShowNewChatModal(false)} title="Start New Chat">
        <div className="p-6">
            <p className="text-sm text-slate-500 mb-4">Enter a WhatsApp number including country code to initiate a new message thread.</p>
            <Input
                label="WhatsApp Phone Number"
                placeholder="e.g. 919876543210"
                value={newChatPhone}
                onChange={(e) => setNewChatPhone(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowNewChatModal(false)}>Cancel</Button>
                <Button onClick={handleStartNewChat} disabled={!newChatPhone.trim()}>Start Chat</Button>
            </div>
        </div>
      </Modal>

    </div>
  );
};

export default ChatsPage;
