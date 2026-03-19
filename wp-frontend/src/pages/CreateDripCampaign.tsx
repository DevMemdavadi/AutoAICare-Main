import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { dripCampaignService } from '@/lib/dripCampaignService';
import { CreateCampaignRequest } from '@/lib/types';

interface Message {
  sequence_number: number;
  message_type: 'text' | 'template' | 'media';
  content: string;
  template_name?: string;
  template_params?: Record<string, any>;
  media_file?: string;
  delay_hours: number;
  delay_minutes: number;
  delay_days: number;
}

const CreateDripCampaign: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
  });
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      sequence_number: 1,
      message_type: 'text',
      content: '',
      delay_hours: 0,
      delay_minutes: 0,
      delay_days: 0,
    },
  ]);

  // Mock data - replace with actual API calls
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => Promise.resolve([
      { id: 1, name: 'John Doe', phone_number: '+1234567890' },
      { id: 2, name: 'Jane Smith', phone_number: '+0987654321' },
    ]),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => Promise.resolve([
      { id: 1, name: 'VIP Customers' },
      { id: 2, name: 'New Subscribers' },
    ]),
  });

  const createCampaignMutation = useMutation({
    mutationFn: dripCampaignService.createCampaign,
    onSuccess: () => {
      toast.success('Campaign created successfully');
      navigate('/drip-campaigns');
    },
    onError: () => {
      toast.error('Failed to create campaign');
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContactToggle = (contactId: number) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleGroupToggle = (groupId: number) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const addMessage = () => {
    setMessages(prev => [
      ...prev,
      {
        sequence_number: prev.length + 1,
        message_type: 'text',
        content: '',
        delay_hours: 0,
        delay_minutes: 0,
        delay_days: 0,
      },
    ]);
  };

  const removeMessage = (index: number) => {
    setMessages(prev => prev.filter((_, i) => i !== index));
  };

  const updateMessage = (index: number, field: keyof Message, value: any) => {
    setMessages(prev => prev.map((msg, i) =>
      i === index ? { ...msg, [field]: value } : msg
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.start_date || !formData.end_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedContacts.length === 0 && selectedGroups.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    if (messages.some(msg => !msg.content)) {
      toast.error('Please fill in all message content');
      return;
    }

    const campaignData: CreateCampaignRequest = {
      ...formData,
      contact_ids: selectedContacts,
      group_ids: selectedGroups,
      messages: messages.map((msg, index) => ({
        ...msg,
        sequence_number: index + 1,
      })),
    };

    createCampaignMutation.mutate(campaignData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/drip-campaigns')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Drip Campaign</h1>
          <p className="text-gray-600">Set up an automated message sequence for your contacts</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter campaign name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your campaign"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recipients */}
        <Card>
          <CardHeader>
            <CardTitle>Recipients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Contacts */}
            <div>
              <h3 className="text-lg font-medium mb-3">Select Contacts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                {contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`contact-${contact.id}`}
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={() => handleContactToggle(contact.id)}
                    />
                    <Label htmlFor={`contact-${contact.id}`} className="text-sm">
                      {contact.name} ({contact.phone_number})
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Groups */}
            <div>
              <h3 className="text-lg font-medium mb-3">Select Groups</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {groups.map((group) => (
                  <div key={group.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`group-${group.id}`}
                      checked={selectedGroups.includes(group.id)}
                      onCheckedChange={() => handleGroupToggle(group.id)}
                    />
                    <Label htmlFor={`group-${group.id}`} className="text-sm">
                      {group.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Message Sequence</CardTitle>
              <Button type="button" onClick={addMessage} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Message
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {messages.map((message, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Message {index + 1}</h4>
                  {messages.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeMessage(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Message Type</Label>
                    <Select
                      value={message.message_type}
                      onValueChange={(value: 'text' | 'template' | 'media') =>
                        updateMessage(index, 'message_type', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text Message</SelectItem>
                        <SelectItem value="template">Template Message</SelectItem>
                        <SelectItem value="media">Media Message</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Delay (Days)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={message.delay_days}
                      onChange={(e) => updateMessage(index, 'delay_days', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Delay (Hours)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={message.delay_hours}
                      onChange={(e) => updateMessage(index, 'delay_hours', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Delay (Minutes)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={message.delay_minutes}
                      onChange={(e) => updateMessage(index, 'delay_minutes', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {message.message_type === 'template' && (
                  <div>
                    <Label>Template Name</Label>
                    <Input
                      value={message.template_name || ''}
                      onChange={(e) => updateMessage(index, 'template_name', e.target.value)}
                      placeholder="Enter template name"
                    />
                  </div>
                )}

                {message.message_type === 'media' && (
                  <div>
                    <Label>Media File URL</Label>
                    <Input
                      value={message.media_file || ''}
                      onChange={(e) => updateMessage(index, 'media_file', e.target.value)}
                      placeholder="Enter media file URL"
                    />
                  </div>
                )}

                <div>
                  <Label>Message Content *</Label>
                  <Textarea
                    value={message.content}
                    onChange={(e) => updateMessage(index, 'content', e.target.value)}
                    placeholder="Enter your message content"
                    required
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/drip-campaigns')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createCampaignMutation.isPending}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {createCampaignMutation.isPending ? 'Creating...' : 'Create Campaign'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateDripCampaign; 