import React from 'react';
import { Check, CheckCheck, Clock } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  type: 'text' | 'image' | 'file';
  sender: 'user' | 'contact';
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  previewUrl?: string;
}

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isFromUser = message.sender === 'user';

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'sending':
        return {
          icon: <Clock className="h-3 w-3" />,
          text: 'Sending...',
          color: 'sending',
          bgColor: 'bg-yellow-500',
          textColor: 'text-white',
          borderColor: 'border-yellow-600'
        };
      case 'sent':
        return {
          icon: <Check className="h-3 w-3" />,
          text: 'Sent',
          color: 'sent',
          bgColor: 'bg-gray-500',
          textColor: 'text-white',
          borderColor: 'border-gray-600'
        };
      case 'delivered':
        return {
          icon: <CheckCheck className="h-3 w-3" />,
          text: 'Delivered',
          color: 'delivered',
          bgColor: 'bg-blue-500',
          textColor: 'text-white',
          borderColor: 'border-blue-600'
        };
      case 'read':
        return {
          icon: <CheckCheck className="h-3 w-3" />,
          text: 'Read',
          color: 'read',
          bgColor: 'bg-green-500',
          textColor: 'text-white',
          borderColor: 'border-green-600'
        };
      default:
        return {
          icon: null,
          text: '',
          color: 'sent',
          bgColor: 'bg-gray-500',
          textColor: 'text-white',
          borderColor: 'border-gray-600'
        };
    }
  };

  const statusIndicator = getStatusIndicator(message.status);

  return (
    <div 
      className={`flex ${isFromUser ? 'justify-end' : 'justify-start'} relative`}
      data-message-id={message.id}
    >
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isFromUser 
          ? 'bg-green-600 text-white' 
          : 'bg-gray-200 text-gray-900'
      }`}>
        {message.type === 'image' && message.previewUrl ? (
          <img src={message.previewUrl} alt={message.content} className="max-w-[200px] max-h-[200px] rounded mb-2" />
        ) : message.type === 'file' && message.previewUrl ? (
          <a href={message.previewUrl} download={message.content} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">
            {message.content}
          </a>
        ) : (
          <p className="text-sm">{message.content}</p>
        )}
        
        <div className={`flex items-center justify-end mt-1 space-x-1 ${
          isFromUser ? 'text-green-100' : 'text-gray-500'
        }`}>
          <span className="text-xs">{message.timestamp}</span>
        </div>
      </div>
      
      {/* Floating status indicator for user messages */}
      {isFromUser && (
        <div className="absolute -bottom-1 -right-1">
          <div 
            className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold transition-all duration-200 border-2 ${statusIndicator.bgColor} ${statusIndicator.textColor} ${statusIndicator.borderColor} shadow-lg hover:scale-110`}
            title={statusIndicator.text}
          >
            {statusIndicator.icon}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
