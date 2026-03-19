import { Button, Card, Select } from '@/components/ui';
import { Bell, Info, Moon, Shield, Sun } from 'lucide-react';
import { useState } from 'react';

const TechnicianSettings = () => {
  const [settings, setSettings] = useState({
    theme: 'light', // light, dark
    notifications: {
      jobAssigned: true,
      jobStatus: true,
      reminders: true,
      feedback: true,
    },
    language: 'en',
  });

  const handleThemeChange = (theme) => {
    setSettings({ ...settings, theme });
    // In a real app, this would update the theme context
    document.documentElement.classList.toggle('dark', theme === 'dark');
  };

  const handleNotificationChange = (key) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key],
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your preferences and application settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <div className="p-6">
              <nav className="space-y-1">
                {[
                  { key: 'appearance', label: 'Appearance', icon: Sun },
                  { key: 'notifications', label: 'Notifications', icon: Bell },
                  { key: 'security', label: 'Security', icon: Shield },
                  { key: 'about', label: 'About', icon: Info },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appearance Settings */}
          <Card title="Appearance">
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Theme</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`p-4 border-2 rounded-lg text-center transition-colors ${
                      settings.theme === 'light'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Sun size={24} className="mx-auto mb-2" />
                    <span className="block font-medium">Light</span>
                  </button>
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`p-4 border-2 rounded-lg text-center transition-colors ${
                      settings.theme === 'dark'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Moon size={24} className="mx-auto mb-2" />
                    <span className="block font-medium">Dark</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Language</h3>
                <Select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'es', label: 'Spanish' },
                    { value: 'fr', label: 'French' },
                    { value: 'de', label: 'German' },
                  ]}
                />
              </div>
            </div>
          </Card>

          {/* Notification Settings */}
          <Card title="Notifications">
            <div className="p-6 space-y-4">
              <p className="text-gray-600">
                Choose which notifications you want to receive
              </p>
              
              {[
                { key: 'jobAssigned', label: 'Job Assigned', description: 'When a new job is assigned to you' },
                { key: 'jobStatus', label: 'Job Status Updates', description: 'When the status of your job changes' },
                { key: 'reminders', label: 'Reminders', description: 'Reminders for upcoming or overdue jobs' },
                { key: 'feedback', label: 'Customer Feedback', description: 'When customers provide feedback on your work' },
              ].map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-sm text-gray-500">{description}</p>
                  </div>
                  <Button
                    variant={settings.notifications[key] ? 'primary' : 'outline'}
                    onClick={() => handleNotificationChange(key)}
                    className="w-12 h-6 p-0"
                  >
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      settings.notifications[key] ? 'bg-white' : 'bg-gray-400'
                    }`}></span>
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* Security Settings */}
          <Card title="Security">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                </div>
                <Button variant="outline">Enable</Button>
              </div>
              
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">Login History</p>
                  <p className="text-sm text-gray-500">View your recent login activity</p>
                </div>
                <Button variant="outline">View</Button>
              </div>
            </div>
          </Card>

          {/* About Section */}
          <Card title="About">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">D</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">DetailEase Technician</h3>
                  <p className="text-gray-600">Version 1.2.0</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <p className="text-gray-600">
                  DetailEase Technician app helps you manage your assigned jobs efficiently.
                </p>
                <p className="text-gray-600">
                  © 2023 DetailEase. All rights reserved.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TechnicianSettings;