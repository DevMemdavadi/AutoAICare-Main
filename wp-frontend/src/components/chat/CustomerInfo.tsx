
import React from 'react';
import { X, Phone, Mail, MapPin, Tag, Clock, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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

interface CustomerInfoProps {
  contact: Contact;
  onClose: () => void;
}

const CustomerInfo = ({ contact, onClose }: CustomerInfoProps) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Contact Info</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Profile Section */}
      <div className="p-6 text-center border-b border-gray-200">
        <Avatar className="h-20 w-20 mx-auto mb-4">
          <AvatarImage src={contact.avatar} alt={contact.name} />
          <AvatarFallback className="bg-green-100 text-green-600 text-lg">
            {contact.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-lg font-semibold text-gray-900">{contact.name}</h2>
        <p className="text-sm text-gray-500 mt-1">{contact.phone}</p>
        <div className="flex justify-center mt-3">
          <Badge className={contact.online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
            {contact.online ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </div>

      {/* Contact Details */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Contact Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{contact.phone}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">customer@example.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Mumbai, India</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Tags</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                VIP Customer
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                Support
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Last Activity */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Last Activity</h4>
            <div className="flex items-center space-x-3">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Active 2 minutes ago</span>
            </div>
          </div>

          <Separator />

          {/* Assigned Agent */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Assigned Agent</h4>
            <div className="flex items-center space-x-3">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">John Doe</span>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Notes</h4>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                Customer interested in premium plans. Follow up scheduled for next week.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200">
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start">
            <Phone className="h-4 w-4 mr-2" />
            Call Customer
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CustomerInfo;
