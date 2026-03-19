import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, CheckCheck, Clock } from 'lucide-react';

interface StatusDemoProps {
  onStatusUpdate: (messageId: string, status: 'sent' | 'delivered' | 'read') => void;
}

const StatusDemo = ({ onStatusUpdate }: StatusDemoProps) => {
  const [demoMessageId] = useState('demo-123');
  const [currentStatus, setCurrentStatus] = useState<'sending' | 'sent' | 'delivered' | 'read'>('sent');

  const simulateStatusProgression = () => {
    // Reset to sending first
    setCurrentStatus('sending');
    
    // Note: In real implementation, status updates would come from WebSocket
    // This is just for demo purposes to show the different status states
    console.log('Demo: Status updates should come from WebSocket, not automatic progression');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3" />;
      case 'sent':
        return <Check className="h-3 w-3" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3" />;
      case 'read':
        return <CheckCheck className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getStatusColors = (status: string) => {
    switch (status) {
      case 'sending':
        return 'bg-yellow-500 text-white border-yellow-600';
      case 'sent':
        return 'bg-gray-500 text-white border-gray-600';
      case 'delivered':
        return 'bg-blue-500 text-white border-blue-600';
      case 'read':
        return 'bg-green-500 text-white border-green-600';
      default:
        return 'bg-gray-500 text-white border-gray-600';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Message Status Demo</CardTitle>
        <CardDescription>
          Status indicators now wait for real WebSocket updates from backend
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Status:</span>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-yellow-600">Sending</span>
              <span className="text-xs text-gray-500">→</span>
              <span className="text-xs text-gray-600">Sent</span>
              <span className="text-xs text-gray-500">→</span>
              <span className="text-xs text-blue-600">Delivered</span>
              <span className="text-xs text-gray-500">→</span>
              <span className="text-xs text-green-600">Read</span>
            </div>
          </div>
          
          {/* Demo message with floating status indicator */}
          <div className="relative">
            <div className="max-w-xs px-4 py-2 rounded-lg bg-green-600 text-white">
              <p className="text-sm">Hello! This is a demo message</p>
              <p className="text-xs text-green-100 mt-1">10:30 AM</p>
            </div>
            
            {/* Floating status indicator */}
            <div className="absolute -bottom-1 -right-1">
              <div 
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold transition-all duration-200 border-2 shadow-lg ${getStatusColors(currentStatus)}`}
                title={currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
              >
                {getStatusIcon(currentStatus)}
              </div>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={simulateStatusProgression}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          Reset to Sending Status
        </Button>
        
        <div className="text-xs text-gray-500 space-y-1">
          <p>• <strong>Sending:</strong> Clock icon (yellow background)</p>
          <p>• <strong>Sent:</strong> Single check mark (gray background)</p>
          <p>• <strong>Delivered:</strong> Double check mark (blue background)</p>
          <p>• <strong>Read:</strong> Double check mark (green background)</p>
        </div>
        
        <div className="text-xs text-gray-400 space-y-1">
          <p>🔄 <strong>Important:</strong></p>
          <p>• Status updates now come from WebSocket</p>
          <p>• No automatic progression - waits for backend</p>
          <p>• Backend sends status_update messages</p>
          <p>• Real-time status changes based on actual delivery</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatusDemo; 