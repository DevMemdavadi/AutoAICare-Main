import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Status indicator helper functions
export interface StatusIndicator {
  icon: string;
  text: string;
  color: 'gray' | 'blue' | 'green';
}

export function getStatusIndicator(status: string): StatusIndicator {
  switch (status) {
    case 'sending':
      return {
        icon: '⏳',
        text: 'Sending...',
        color: 'gray'
      };
    case 'sent':
      return {
        icon: '✓',
        text: 'Sent',
        color: 'gray'
      };
    case 'delivered':
      return {
        icon: '✓✓',
        text: 'Delivered',
        color: 'gray'
      };
    case 'read':
      return {
        icon: '✓✓',
        text: 'Read',
        color: 'blue'
      };
    default:
      return {
        icon: '',
        text: '',
        color: 'gray'
      };
  }
}

export function updateMessageStatus(
  messages: any[],
  messageId: string,
  newStatus: 'sent' | 'delivered' | 'read'
): any[] {
  return messages.map(msg => 
    msg.id === messageId 
      ? { ...msg, status: newStatus }
      : msg
  );
}

// WebSocket message type guards
export function isStatusUpdate(data: any): data is {
  type: 'status_update';
  message: {
    message_id: string;
    status: 'sent' | 'delivered' | 'read';
  };
} {
  return data?.type === 'status_update' && 
         data?.message?.message_id && 
         data?.message?.status;
}

export function isChatMessage(data: any): data is {
  type: 'chat_message';
  message: {
    id: string;
    content: string;
    timestamp: string;
  };
} {
  return data?.type === 'chat_message' && 
         data?.message?.content;
}
