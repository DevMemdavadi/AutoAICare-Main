import { Button, Card, Input, Textarea } from '@/components/ui';
import api from '@/utils/api';
import { Building, Edit2, Globe, IndianRupee, Mail, MessageSquare, Phone, Plus, Save, Shield, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useBranch } from '@/contexts/BranchContext';

const Settings = () => {
  const { getCurrentBranchId, getCurrentBranchName, isCompanyAdmin, isSuperAdmin } = useBranch();
  const [activeTab, setActiveTab] = useState('general'); // general, tax, templates
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Global Settings State
  const [settings, setSettings] = useState({
    default_tax_rate: 0,
    tax_name: 'GST',
    business_name: '',
    business_email: '',
    business_phone: '',
    business_address: '',
    currency: 'INR',
    currency_symbol: '₹',
    booking_advance_days: 30,
    cancellation_hours: 24,
    slot_duration_minutes: 60,
    enable_email_notifications: true,
    enable_sms_notifications: false,
    enable_whatsapp_notifications: false,
    whatsapp_mode: 'manual',
    whatsapp_provider: 'meta',
    whatsapp_business_phone: '',
    whatsapp_credentials: {},
    wp_url: '',
    wp_api_key: '',
  });

  // Notification Templates State
  const [templates, setTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showDeleteTemplateModal, setShowDeleteTemplateModal] = useState(false); // Add this new state
  const [pendingDeleteTemplateId, setPendingDeleteTemplateId] = useState(null); // Add this new state
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    notification_type: '',
    channel: 'both',
    email_subject: '',
    email_body: '',
    sms_body: '',
    is_active: true,
  });

  useEffect(() => {
    fetchSettings();
    if (activeTab === 'templates') {
      fetchTemplates();
    }
  }, [activeTab, getCurrentBranchId()]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const params = {};
      if (getCurrentBranchId()) params.branch = getCurrentBranchId();
      const response = await api.get('/settings/', { params });
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const params = {};
      if (getCurrentBranchId()) params.branch = getCurrentBranchId();
      const response = await api.get('/notifications/templates/', { params });
      setTemplates(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const params = {};
      if (getCurrentBranchId()) params.branch = getCurrentBranchId();

      await api.put('/settings/', settings, { params });
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to save settings');
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingTemplate) {
        await api.put(`/notifications/templates/${editingTemplate.id}/`, templateForm);
      } else {
        const payload = { ...templateForm, branch: getCurrentBranchId() || null };
        await api.post('/notifications/templates/', payload);
      }
      setShowTemplateModal(false);
      setEditingTemplate(null);
      fetchTemplates();
      setSuccess('Template saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to save template');
      console.error('Error saving template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    // Store the template ID to be deleted and show confirmation modal
    setPendingDeleteTemplateId(id);
    setShowDeleteTemplateModal(true);
  };

  const handleConfirmDeleteTemplate = async () => {
    setShowDeleteTemplateModal(false);

    try {
      await api.delete(`/notifications/templates/${pendingDeleteTemplateId}/`);
      fetchTemplates();
      setSuccess('Template deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to delete template');
      console.error('Error deleting template:', error);
    }
  };

  const openEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      notification_type: template.notification_type,
      channel: template.channel,
      email_subject: template.email_subject || '',
      email_body: template.email_body || '',
      sms_body: template.sms_body || '',
      is_active: template.is_active,
    });
    setShowTemplateModal(true);
  };

  const notificationTypes = [
    { value: 'booking_created', label: 'Booking Created' },
    { value: 'booking_confirmed', label: 'Booking Confirmed' },
    { value: 'booking_cancelled', label: 'Booking Cancelled' },
    { value: 'job_started', label: 'Job Started' },
    { value: 'job_in_progress', label: 'Job In Progress' },
    { value: 'job_completed', label: 'Job Completed' },
    { value: 'payment_success', label: 'Payment Success' },
    { value: 'payment_failed', label: 'Payment Failed' },
    { value: 'invoice_created', label: 'Invoice Created' },
    { value: 'feedback_request', label: 'Feedback Request' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your application settings</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">{success}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'general'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Building size={16} />
            General & Business
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'tax'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <IndianRupee size={16} />
            Tax & Currency
          </button>
          {/* <button
            onClick={() => setActiveTab('templates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'templates'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <MessageSquare size={16} />
            Email/SMS Templates
          </button> */}
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'whatsapp'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <MessageSquare size={16} />
            WhatsApp Settings
          </button>
        </nav>
      </div>

      {/* General & Business Settings */}
      {activeTab === 'general' && (
        <Card title="General & Business Settings">
          <form onSubmit={handleSaveSettings} className="space-y-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Business Name"
                value={settings.business_name}
                onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                icon={Building}
              />
              <Input
                label="Business Email"
                type="email"
                value={settings.business_email}
                onChange={(e) => setSettings({ ...settings, business_email: e.target.value })}
                icon={Mail}
              />
              <Input
                label="Business Phone"
                type="tel"
                value={settings.business_phone}
                onChange={(e) => setSettings({ ...settings, business_phone: e.target.value })}
                icon={Phone}
              />
              <Input
                label="Currency"
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                icon={Globe}
              />
            </div>

            <Textarea
              label="Business Address"
              value={settings.business_address}
              onChange={(e) => setSettings({ ...settings, business_address: e.target.value })}
              rows={3}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                label="Booking Advance (Days)"
                type="number"
                value={settings.booking_advance_days}
                onChange={(e) => setSettings({ ...settings, booking_advance_days: parseInt(e.target.value) || 0 })}
              />
              <Input
                label="Cancellation Notice (Hours)"
                type="number"
                value={settings.cancellation_hours}
                onChange={(e) => setSettings({ ...settings, cancellation_hours: parseInt(e.target.value) || 0 })}
              />
              <Input
                label="Slot Duration (Minutes)"
                type="number"
                step="15"
                value={settings.slot_duration_minutes}
                onChange={(e) => setSettings({ ...settings, slot_duration_minutes: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-600">Enable email notifications</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enable_email_notifications}
                  onChange={(e) => setSettings({ ...settings, enable_email_notifications: e.target.checked })}
                  className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">SMS Notifications</p>
                  <p className="text-sm text-gray-600">Enable SMS notifications</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enable_sms_notifications}
                  onChange={(e) => setSettings({ ...settings, enable_sms_notifications: e.target.checked })}
                  className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                <Save size={18} className="mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tax & Currency Settings */}
      {activeTab === 'tax' && (
        <Card title="Tax & Currency Settings">
          <form onSubmit={handleSaveSettings} className="space-y-6 p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <Shield size={16} className="inline mr-2" />
                Tax settings will apply to all new invoices by default.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Default Tax Rate (%)"
                type="number"
                step="0.01"
                value={settings.default_tax_rate}
                onChange={(e) => setSettings({ ...settings, default_tax_rate: parseFloat(e.target.value) || 0 })}
                icon={IndianRupee}
              />
              <Input
                label="Tax Name"
                value={settings.tax_name}
                onChange={(e) => setSettings({ ...settings, tax_name: e.target.value })}
                placeholder="e.g., GST, VAT, Sales Tax"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Currency Code"
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                placeholder="e.g., INR, USD, EUR"
              />
              <Input
                label="Currency Symbol"
                value={settings.currency_symbol}
                onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                placeholder="e.g., ₹, $, €"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Preview</h4>
              <p className="text-gray-700">
                Tax: {settings.tax_name} @ {settings.default_tax_rate}%
              </p>
              <p className="text-gray-700">
                Currency: {settings.currency_symbol} ({settings.currency})
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                <Save size={18} className="mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Notification Templates */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Email/SMS Templates</h2>
              <p className="text-gray-600 mt-1">Manage notification templates for automated messages</p>
            </div>
            <button
              onClick={() => {
                setEditingTemplate(null);
                setTemplateForm({
                  name: '',
                  notification_type: '',
                  channel: 'both',
                  email_subject: '',
                  email_body: '',
                  sms_body: '',
                  is_active: true,
                });
                setShowTemplateModal(true);
              }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              Add Template
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Channel</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {templates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No templates found. Create your first template to get started.
                      </td>
                    </tr>
                  ) : (
                    templates.map((template) => (
                      <tr key={template.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <MessageSquare size={16} className="text-gray-400" />
                            <span className="font-medium text-gray-900">{template.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700">
                            {notificationTypes.find(t => t.value === template.notification_type)?.label || template.notification_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${template.channel === 'both' ? 'bg-blue-100 text-blue-800' :
                            template.channel === 'email' ? 'bg-green-100 text-green-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                            {template.channel === 'both' ? (
                              <><Mail size={12} /> <Phone size={12} /> Both</>
                            ) : template.channel === 'email' ? (
                              <><Mail size={12} /> Email</>
                            ) : (
                              <><Phone size={12} /> SMS</>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${template.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                            }`}>
                            {template.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditTemplate(template)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit Template"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Template"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Settings */}
      {activeTab === 'whatsapp' && (
        <Card title="WhatsApp Configuration">
          <form onSubmit={handleSaveSettings} className="space-y-6 p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <Shield size={16} className="inline mr-2" />
                Configure WhatsApp Business API for automated customer notifications.
              </p>
            </div>

            {/* Enable WhatsApp */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Enable WhatsApp Notifications</p>
                <p className="text-sm text-gray-600">Send automated WhatsApp messages to customers</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enable_whatsapp_notifications}
                onChange={(e) => setSettings({ ...settings, enable_whatsapp_notifications: e.target.checked })}
                className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
              />
            </div>

            {settings.enable_whatsapp_notifications && (
              <>
                {/* WhatsApp Mode Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    WhatsApp Mode
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ borderColor: settings.whatsapp_mode === 'manual' ? '#3B82F6' : '#E5E7EB' }}>
                      <input
                        type="radio"
                        name="whatsapp_mode"
                        value="manual"
                        checked={settings.whatsapp_mode === 'manual'}
                        onChange={(e) => setSettings({ ...settings, whatsapp_mode: e.target.value })}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">📱 Manual (Click-to-Send)</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Staff clicks a button to open WhatsApp and manually sends messages.
                          No API setup required. Works with WhatsApp Business App.
                        </p>
                        <div className="mt-2 flex gap-2">
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">
                            ✓ Free
                          </span>
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">
                            ✓ No Setup
                          </span>
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">
                            ✓ Safe & Legal
                          </span>
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ borderColor: settings.whatsapp_mode === 'api' ? '#3B82F6' : '#E5E7EB' }}>
                      <input
                        type="radio"
                        name="whatsapp_mode"
                        value="api"
                        checked={settings.whatsapp_mode === 'api'}
                        onChange={(e) => setSettings({ ...settings, whatsapp_mode: e.target.value })}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">⚡ Automated (Cloud API)</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Fully automated WhatsApp messages via Meta Cloud API.
                          Requires API credentials and template approval.
                        </p>
                        <div className="mt-2 flex gap-2">
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                            ⚡ Automated
                          </span>
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                            📊 Analytics
                          </span>
                          <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded font-medium">
                            ⚙️ Setup Required
                          </span>
                        </div>
                      </div>
                    </label>
                    
                    <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ borderColor: settings.whatsapp_mode === 'wp_gateway' ? '#3B82F6' : '#E5E7EB' }}>
                      <input
                        type="radio"
                        name="whatsapp_mode"
                        value="wp_gateway"
                        checked={settings.whatsapp_mode === 'wp_gateway'}
                        onChange={(e) => setSettings({ ...settings, whatsapp_mode: e.target.value })}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">🌐 WP Messaging Gateway</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Connect to your self-hosted WP Messaging Hub. Supports API Keys and Webhooks.
                        </p>
                        <div className="mt-2 flex gap-2">
                          <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded font-medium">
                            🔗 Third-Party Hub
                          </span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Show API fields only in API mode */}
                {settings.whatsapp_mode === 'api' && (
                  <>
                    {/* WhatsApp Provider */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp Provider</label>
                      <select
                        value={settings.whatsapp_provider}
                        onChange={(e) => setSettings({ ...settings, whatsapp_provider: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="meta">Meta Cloud API (Recommended)</option>
                        <option value="twilio">Twilio</option>
                        <option value="messagebird">MessageBird</option>
                      </select>
                    </div>

                    {/* Business Phone */}
                    <Input
                      label="WhatsApp Business Phone"
                      type="tel"
                      value={settings.whatsapp_business_phone}
                      onChange={(e) => setSettings({ ...settings, whatsapp_business_phone: e.target.value })}
                      placeholder="+919876543210"
                      icon={Phone}
                      helpText="Phone number in E.164 format (e.g., +919876543210)"
                    />

                    {/* Credentials */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        WhatsApp API Credentials (JSON)
                      </label>
                      <Textarea
                        value={JSON.stringify(settings.whatsapp_credentials, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setSettings({ ...settings, whatsapp_credentials: parsed });
                          } catch (err) {
                            // Invalid JSON, keep as is for user to fix
                            setSettings({ ...settings, whatsapp_credentials: e.target.value });
                          }
                        }}
                        rows={8}
                        placeholder={`{
  "provider": "meta",
  "access_token": "YOUR_ACCESS_TOKEN",
  "phone_number_id": "YOUR_PHONE_NUMBER_ID",
  "business_account_id": "YOUR_BUSINESS_ACCOUNT_ID"
}`}
                        className="font-mono text-sm"
                      />
                      <p className="mt-2 text-sm text-gray-600">
                        Get credentials from{' '}
                        <a
                          href="https://business.facebook.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Meta Business Manager
                        </a>
                      </p>
                    </div>

                    {/* Setup Guide Link */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-800 mb-2">
                        <strong>Need help setting up?</strong>
                      </p>
                      <p className="text-sm text-green-700">
                        Follow our{' '}
                        <a
                          href="/WHATSAPP_SETUP_GUIDE.md"
                          target="_blank"
                          className="underline font-medium"
                        >
                          WhatsApp Setup Guide
                        </a>{' '}
                        for step-by-step instructions.
                      </p>
                    </div>
                  </>
                )}
                
                {/* Show WP Gateway fields */}
                {settings.whatsapp_mode === 'wp_gateway' && (
                  <>
                     <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-purple-800">
                        <Globe size={16} className="inline mr-2" />
                        Enter the URL and API Key for your WP Messaging Gateway instance.
                      </p>
                    </div>

                    <Input
                      label="WP Gateway Base URL"
                      type="url"
                      value={settings.wp_url || ''}
                      onChange={(e) => setSettings({ ...settings, wp_url: e.target.value })}
                      placeholder="http://localhost:8001"
                      helpText="Include http:// or https:// (No trailing slash)"
                    />
                    
                    <Input
                      label="API Key"
                      type="password"
                      value={settings.wp_api_key || ''}
                      onChange={(e) => setSettings({ ...settings, wp_api_key: e.target.value })}
                      placeholder="Enter API Key from WP Admin"
                      helpText="Keep this secret. Do not share."
                    />
                  </>
                )}
              </>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                <Save size={18} className="mr-2" />
                {loading ? 'Saving...' : 'Save WhatsApp Settings'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Template Name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notification Type *</label>
                  <select
                    value={templateForm.notification_type}
                    onChange={(e) => setTemplateForm({ ...templateForm, notification_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  >
                    <option value="">Select type...</option>
                    {notificationTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Channel *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="channel"
                      value="both"
                      checked={templateForm.channel === 'both'}
                      onChange={(e) => setTemplateForm({ ...templateForm, channel: e.target.value })}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Email & SMS</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="channel"
                      value="email"
                      checked={templateForm.channel === 'email'}
                      onChange={(e) => setTemplateForm({ ...templateForm, channel: e.target.value })}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">Email Only</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="channel"
                      value="sms"
                      checked={templateForm.channel === 'sms'}
                      onChange={(e) => setTemplateForm({ ...templateForm, channel: e.target.value })}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">SMS Only</span>
                  </label>
                </div>
              </div>

              {(templateForm.channel === 'email' || templateForm.channel === 'both') && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <Mail size={18} />
                    Email Template
                  </h4>
                  <Input
                    label="Email Subject"
                    value={templateForm.email_subject}
                    onChange={(e) => setTemplateForm({ ...templateForm, email_subject: e.target.value })}
                    placeholder="Use {{variable}} for dynamic content"
                  />
                  <Textarea
                    label="Email Body"
                    value={templateForm.email_body}
                    onChange={(e) => setTemplateForm({ ...templateForm, email_body: e.target.value })}
                    rows={6}
                    placeholder="Use {{customer_name}}, {{booking_id}}, etc."
                  />
                </div>
              )}

              {(templateForm.channel === 'sms' || templateForm.channel === 'both') && (
                <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <Phone size={18} />
                    SMS Template
                  </h4>
                  <Textarea
                    label="SMS Body (Max 160 characters)"
                    value={templateForm.sms_body}
                    onChange={(e) => setTemplateForm({ ...templateForm, sms_body: e.target.value })}
                    rows={3}
                    maxLength={160}
                    placeholder="Keep it short. Use {{variable}} for dynamic content"
                  />
                  <p className="text-xs text-gray-600">
                    {templateForm.sms_body?.length || 0} / 160 characters
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={templateForm.is_active}
                  onChange={(e) => setTemplateForm({ ...templateForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label className="text-sm text-gray-700">Template is active</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <Button type="submit" disabled={loading}>
                  <Save size={18} className="mr-2" />
                  {loading ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Template Confirmation Modal */}
      {showDeleteTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Template</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this template? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteTemplateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteTemplate}
                  className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
