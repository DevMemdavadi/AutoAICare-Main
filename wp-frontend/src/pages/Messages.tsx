
import React, { useState, useEffect } from 'react';
import { Play, Pause, Filter, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Message {
  id: string;
  phoneNumber: string;
  content: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  timestamp: string;
  type: 'text' | 'template' | 'image';
}

const Messages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Simulate real-time messages
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/messages/");
  
    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };
  
    ws.onmessage = (event) => {
      if (isPaused) return;
  
      console.log("RAW WS MESSAGE:", event.data);
      const rawData = JSON.parse(event.data);
      
      // Backend wrapper: { type: "new_message", message: { ... } }
      // Or { type: "chat_message", message: { ... } }
      const data = rawData.message || rawData; 
      
      console.log("PARSED DATA:", data);

      // If this is just a strict status update (has message_id and status but NO content), skip adding it to feed
      if (data.message_id && data.status && !data.content) {
         console.log("Ignoring status update in Live feed:", data);
         return;
      }
  
      const newMessage: Message = {
        id: data.id || data.message_id || Date.now().toString(),
        phoneNumber: data.phone_number || "Unknown",
        content: data.content || data.text || '[No Content]',
        status: data.status || "received",
        timestamp: data.timestamp || new Date().toISOString(),
        type: data.message_type || "text",
      };
  
      console.log("FINAL MESSAGE OBJECT:", newMessage);
      setMessages(prev => [newMessage, ...prev]);
    };
  
    ws.onclose = (event) => {
      console.log("WebSocket disconnected", event.code, event.reason);
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error observed:", error);
    };
  
    return () => ws.close();
  }, [isPaused]);

 // useEffect(() => {
    // Simulate WebSocket connection
   // setIsConnected(true);
 // }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <MessageSquare className="h-3 w-3" />;
      case 'delivered': return <CheckCircle className="h-3 w-3" />;
      case 'failed': return <XCircle className="h-3 w-3" />;
      case 'pending': return <Clock className="h-3 w-3" />;
      default: return <MessageSquare className="h-3 w-3" />;
    }
  };

  const filteredMessages = messages.filter(message => 
    filter === 'all' || message.status === filter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Messages</h1>
          <p className="mt-2 text-gray-600">
            Real-time WhatsApp message monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`h-2 w-2 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setIsPaused(!isPaused)}
                variant={isPaused ? "default" : "outline"}
                size="sm"
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              {filteredMessages.length} messages
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Message Feed</CardTitle>
          <CardDescription>
            Live stream of WhatsApp messages {isPaused && '(Paused)'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            {filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No messages to display
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredMessages.map((message) => (
                  <div key={message.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                            <MessageSquare className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">
                              {message.phoneNumber}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {message.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 truncate max-w-md">
                            {message.content}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(message.status)}>
                          {getStatusIcon(message.status)}
                          <span className="ml-1 capitalize">{message.status}</span>
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Messages;
