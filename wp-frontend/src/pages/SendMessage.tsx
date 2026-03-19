import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Send, Image, FileText, Loader2, Phone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';

interface MessageFormData {
  phoneNumber: string;
  messageType: 'text' | 'template' | 'image';
  content: string;
  templateId?: string;
  imageUrl?: string;
}

const SendMessage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [messageType, setMessageType] = useState<'text' | 'template' | 'image'>('text');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<MessageFormData>({
    defaultValues: { messageType: 'text' }
  });

  const onSubmit = async (data: MessageFormData) => {
    console.log('Form submitted!', data);
    setIsLoading(true);
    console.log('data.messageType', data.messageType)
    try {
      if (data.messageType === 'text') {
        await api.post('/whatsapp/dashboard/messages/send/', {
          recipient_phone_number: data.phoneNumber.replace('+',''),
          message_type: 'text',
          content: data.content,
        });
      } else {
        // Simulate API call for other types for now
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
      
      toast.success('Message sent successfully!', {
        icon: '✅',
        duration: 4000,
      });
      
      reset();
    } catch (error) {
      toast.error('Failed to send message. Please try again.', {
        icon: '❌',
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const templates = [
    { id: 'welcome', name: 'Welcome Message' },
    { id: 'order_confirmation', name: 'Order Confirmation' },
    { id: 'delivery_update', name: 'Delivery Update' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Send Message</h1>
        <p className="mt-2 text-gray-600">
          Send WhatsApp messages instantly to your customers
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Compose Message
          </CardTitle>
          <CardDescription className="text-green-100">
            Choose message type and enter recipient details
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+91 98765 43210"
                {...register('phoneNumber', { 
                  required: 'Phone number is required',
                  pattern: {
                    value: /^\+?[1-9]\d{1,14}$/,
                    message: 'Please enter a valid phone number'
                  }
                })}
                className="focus:ring-green-500 focus:border-green-500"
              />
              {errors.phoneNumber && (
                <p className="text-sm text-red-600">{errors.phoneNumber.message}</p>
              )}
            </div>

            {/* Message Type */}
            <div className="space-y-2">
              <Label>Message Type</Label>
              <Select
                value={messageType}
                onValueChange={(value: 'text' | 'template' | 'image') => {
                  console.log('Dropdown changed:', value);
                  setMessageType(value);
                  setValue('messageType', value);
                }}
              >
                <SelectTrigger className="focus:ring-green-500 focus:border-green-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Text Message
                    </div>
                  </SelectItem>
                  <SelectItem value="template">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Template Message
                    </div>
                  </SelectItem>
                  <SelectItem value="image">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Image Message
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Content based on message type */}
            {messageType === 'text' && (
              <div className="space-y-2">
                <Label htmlFor="content">Message Content</Label>
                <Textarea
                  id="content"
                  placeholder="Enter your message here..."
                  rows={5}
                  {...register('content', { required: 'Message content is required' })}
                  className="focus:ring-green-500 focus:border-green-500"
                />
                {errors.content && (
                  <p className="text-sm text-red-600">{errors.content.message}</p>
                )}
              </div>
            )}

            {messageType === 'template' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Template</Label>
                  <Select
                    value={selectedTemplateId}
                    onValueChange={value => setSelectedTemplateId(value)}
                  >
                    <SelectTrigger className="focus:ring-green-500 focus:border-green-500">
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Template Preview:</p>
                  <div className="bg-white p-3 rounded border text-sm">
                    {selectedTemplateId
                      ? templates.find(t => t.id === selectedTemplateId)?.name
                      : 'Select a template to preview.'}
                  </div>
                </div>
              </div>
            )}

            {messageType === 'image' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    {...register('imageUrl', { required: 'Image URL is required' })}
                    className="focus:ring-green-500 focus:border-green-500"
                  />
                  {errors.imageUrl && (
                    <p className="text-sm text-red-600">{errors.imageUrl.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Caption (Optional)</Label>
                  <Textarea
                    id="content"
                    placeholder="Add a caption for your image..."
                    rows={3}
                    {...register('content')}
                    className="focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Message...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Messages
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">1,234</div>
            <div className="text-sm text-gray-600">Messages Sent Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">98.5%</div>
            <div className="text-sm text-gray-600">Delivery Rate</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SendMessage;
