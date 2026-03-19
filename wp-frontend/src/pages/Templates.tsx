
import React, { useState } from 'react';
import { Plus, Edit, Trash2, Eye, FileText, Image } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Templates = () => {
  const [templates, setTemplates] = useState([
    {
      id: 1,
      name: 'Welcome Message',
      type: 'text',
      content: 'Welcome to Yogi Sarbat! Thank you for choosing us. How can we help you today?',
      category: 'greeting',
      lastUsed: '2024-01-15',
      usageCount: 145
    },
    {
      id: 2,
      name: 'Order Confirmation',
      type: 'template',
      content: 'Hi {{name}}, your order #{{order_id}} has been confirmed. Expected delivery: {{delivery_date}}',
      category: 'order',
      lastUsed: '2024-01-14',
      usageCount: 89
    },
    {
      id: 3,
      name: 'Delivery Update',
      type: 'template',
      content: 'Your order is out for delivery! Track your order: {{tracking_link}}',
      category: 'delivery',
      lastUsed: '2024-01-13',
      usageCount: 67
    },
    {
      id: 4,
      name: 'Product Promotion',
      type: 'image',
      content: 'Check out our latest offers!',
      category: 'marketing',
      lastUsed: '2024-01-12',
      usageCount: 234
    }
  ]);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    type: 'text',
    content: '',
    category: 'general'
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'text': return 'bg-blue-100 text-blue-800';
      case 'template': return 'bg-purple-100 text-purple-800';
      case 'image': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateTemplate = () => {
    const template = {
      id: templates.length + 1,
      ...newTemplate,
      lastUsed: new Date().toISOString().split('T')[0],
      usageCount: 0
    };
    setTemplates([...templates, template]);
    setNewTemplate({ name: '', type: 'text', content: '', category: 'general' });
    setIsCreateDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Message Templates</h1>
          <p className="mt-2 text-gray-600">
            Manage your WhatsApp message templates
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                  placeholder="Enter template name"
                />
              </div>
              <div className="space-y-2">
                <Label>Template Type</Label>
                <Select value={newTemplate.type} onValueChange={(value) => setNewTemplate({...newTemplate, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Message</SelectItem>
                    <SelectItem value="template">Template Message</SelectItem>
                    <SelectItem value="image">Image Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newTemplate.category} onValueChange={(value) => setNewTemplate({...newTemplate, category: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="greeting">Greeting</SelectItem>
                    <SelectItem value="order">Order</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
                  placeholder="Enter template content..."
                  rows={4}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreateTemplate} className="flex-1 bg-green-600 hover:bg-green-700">
                  Create Template
                </Button>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{templates.length}</div>
            <div className="text-sm text-gray-600">Total Templates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {templates.filter(t => t.type === 'text').length}
            </div>
            <div className="text-sm text-gray-600">Text Templates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {templates.filter(t => t.type === 'template').length}
            </div>
            <div className="text-sm text-gray-600">Dynamic Templates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {templates.reduce((sum, t) => sum + t.usageCount, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Usage</div>
          </CardContent>
        </Card>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <div className="flex items-center gap-1">
                  <Badge className={getTypeColor(template.type)}>
                    {getTypeIcon(template.type)}
                    <span className="ml-1">{template.type}</span>
                  </Badge>
                </div>
              </div>
              <CardDescription>
                Category: {template.category} • Used {template.usageCount} times
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700 line-clamp-3">
                  {template.content}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Last used: {template.lastUsed}</span>
                <span>{template.usageCount} uses</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Templates;
