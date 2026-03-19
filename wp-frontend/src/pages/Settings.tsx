
import React, { useState } from 'react';
import { Save, Key, Webhook, Database, Shield, Bell, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const Settings = () => {
  const [settings, setSettings] = useState({
    whatsappToken: '',
    webhookUrl: '',
    webhookSecret: '',
    enableNotifications: true,
    enableAutoReply: false,
    enableDeliveryReports: true,
    redisHost: 'localhost',
    redisPort: '6379',
    redisPassword: ''
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      // Show success toast
    }, 1000);
  };

  const systemStatus = [
    { name: 'WhatsApp API', status: 'online', color: 'bg-green-500' },
    { name: 'Webhook', status: 'online', color: 'bg-green-500' },
    { name: 'Redis Cache', status: 'online', color: 'bg-green-500' },
    { name: 'Database', status: 'online', color: 'bg-green-500' }
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">
          Configure your WhatsApp integration and system preferences
        </p>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-green-500" />
            System Status
          </CardTitle>
          <CardDescription>
            Real-time status of all system components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {systemStatus.map((service) => (
              <div key={service.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`h-2 w-2 rounded-full ${service.color} animate-pulse`}></div>
                  <span className="text-sm font-medium text-gray-900">{service.name}</span>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  {service.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-500" />
            WhatsApp API Configuration
          </CardTitle>
          <CardDescription>
            Configure your WhatsApp Business API credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsappToken">WhatsApp API Token</Label>
            <Input
              id="whatsappToken"
              type="password"
              value={settings.whatsappToken}
              onChange={(e) => setSettings({...settings, whatsappToken: e.target.value})}
              placeholder="Enter your WhatsApp API token"
            />
            <p className="text-xs text-gray-500">
              Your WhatsApp Business API access token from Meta for Developers
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneNumberId">Phone Number ID</Label>
            <Input
              id="phoneNumberId"
              placeholder="Enter phone number ID"
            />
            <p className="text-xs text-gray-500">
              The phone number ID from your WhatsApp Business account
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-purple-500" />
            Webhook Configuration
          </CardTitle>
          <CardDescription>
            Configure webhook endpoints for real-time updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <Input
              id="webhookUrl"
              value={settings.webhookUrl}
              onChange={(e) => setSettings({...settings, webhookUrl: e.target.value})}
              placeholder="https://your-domain.com/webhook"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhookSecret">Webhook Secret</Label>
            <Input
              id="webhookSecret"
              type="password"
              value={settings.webhookSecret}
              onChange={(e) => setSettings({...settings, webhookSecret: e.target.value})}
              placeholder="Enter webhook verification secret"
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-900">Webhook Status</span>
            </div>
            <Badge className="bg-green-100 text-green-800">Active</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Redis Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-red-500" />
            Redis Configuration
          </CardTitle>
          <CardDescription>
            Configure Redis for caching and real-time features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="redisHost">Redis Host</Label>
              <Input
                id="redisHost"
                value={settings.redisHost}
                onChange={(e) => setSettings({...settings, redisHost: e.target.value})}
                placeholder="localhost"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="redisPort">Redis Port</Label>
              <Input
                id="redisPort"
                value={settings.redisPort}
                onChange={(e) => setSettings({...settings, redisPort: e.target.value})}
                placeholder="6379"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="redisPassword">Redis Password (Optional)</Label>
            <Input
              id="redisPassword"
              type="password"
              value={settings.redisPassword}
              onChange={(e) => setSettings({...settings, redisPassword: e.target.value})}
              placeholder="Enter Redis password if required"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-yellow-500" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Configure your notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Enable Notifications</Label>
              <p className="text-sm text-gray-500">
                Receive notifications for new messages and system alerts
              </p>
            </div>
            <Switch
              checked={settings.enableNotifications}
              onCheckedChange={(checked) => setSettings({...settings, enableNotifications: checked})}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Auto Reply</Label>
              <p className="text-sm text-gray-500">
                Automatically reply to incoming messages with predefined responses
              </p>
            </div>
            <Switch
              checked={settings.enableAutoReply}
              onCheckedChange={(checked) => setSettings({...settings, enableAutoReply: checked})}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Delivery Reports</Label>
              <p className="text-sm text-gray-500">
                Track message delivery status and generate reports
              </p>
            </div>
            <Switch
              checked={settings.enableDeliveryReports}
              onCheckedChange={(checked) => setSettings({...settings, enableDeliveryReports: checked})}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 px-8"
        >
          {isLoading ? (
            'Saving...'
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
