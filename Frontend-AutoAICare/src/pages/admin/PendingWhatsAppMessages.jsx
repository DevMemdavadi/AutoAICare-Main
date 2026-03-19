import { Button, Card } from '@/components/ui';
import api from '@/utils/api';
import { CheckCircle, Clock, ExternalLink, MessageSquare, Phone, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

const PendingWhatsAppMessages = () => {
    const [messages, setMessages] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState([]);

    useEffect(() => {
        fetchMessages();
        fetchStats();
    }, []);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const response = await api.get('/notify/whatsapp/pending/');
            setMessages(response.data.results || response.data || []);
        } catch (error) {
            console.error('Error fetching pending messages:', error);
            alert('Failed to load pending messages');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get('/notify/whatsapp/pending/stats/');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleSendMessage = async (message) => {
        // Open WhatsApp link in new tab
        window.open(message.whatsapp_link, '_blank');

        // Mark as sent
        try {
            await api.post(`/notify/whatsapp/pending/${message.id}/mark_sent/`);
            alert('Message marked as sent!');
            fetchMessages(); // Refresh list
            fetchStats(); // Refresh stats
        } catch (error) {
            console.error('Error marking message as sent:', error);
            alert('Failed to mark message as sent');
        }
    };

    const handleBulkSend = () => {
        if (selectedMessages.length === 0) {
            alert('Please select messages to send');
            return;
        }

        // Open all selected messages in WhatsApp
        selectedMessages.forEach((msgId, index) => {
            const message = messages.find(m => m.id === msgId);
            if (message) {
                setTimeout(() => {
                    window.open(message.whatsapp_link, '_blank');
                }, index * 500); // Stagger opens by 500ms
            }
        });

        // Mark all as sent
        Promise.all(
            selectedMessages.map(msgId =>
                api.post(`/notify/whatsapp/pending/${msgId}/mark_sent/`)
            )
        ).then(() => {
            alert(`${selectedMessages.length} messages marked as sent!`);
            setSelectedMessages([]);
            fetchMessages();
            fetchStats();
        }).catch(error => {
            console.error('Error marking messages as sent:', error);
            alert('Some messages failed to mark as sent');
        });
    };

    const toggleSelectMessage = (msgId) => {
        setSelectedMessages(prev =>
            prev.includes(msgId)
                ? prev.filter(id => id !== msgId)
                : [...prev, msgId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedMessages.length === messages.length) {
            setSelectedMessages([]);
        } else {
            setSelectedMessages(messages.map(m => m.id));
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Pending WhatsApp Messages</h1>
                    <p className="text-gray-600 mt-1">Click to send WhatsApp messages manually</p>
                </div>
                <div className="flex gap-2">
                    {selectedMessages.length > 0 && (
                        <Button onClick={handleBulkSend} className="bg-green-600 hover:bg-green-700">
                            <ExternalLink size={18} className="mr-2" />
                            Send {selectedMessages.length} Selected
                        </Button>
                    )}
                    <Button onClick={fetchMessages} variant="outline">
                        <RefreshCw size={18} className="mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Bulk Selection Bar */}
            {messages.length > 0 && (
                <Card className="p-4 bg-slate-50">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedMessages.length === messages.length}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                {selectedMessages.length === messages.length
                                    ? `All ${messages.length} messages selected`
                                    : `Select all ${messages.length} messages`}
                            </span>
                        </label>
                        {selectedMessages.length > 0 && (
                            <span className="text-sm text-gray-600">
                                {selectedMessages.length} of {messages.length} selected
                            </span>
                        )}
                    </div>
                </Card>
            )}

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Pending</p>
                                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                            </div>
                            <Clock size={32} className="text-orange-400" />
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Sent Manually</p>
                                <p className="text-2xl font-bold text-green-600">{stats.sent_manual}</p>
                            </div>
                            <CheckCircle size={32} className="text-green-400" />
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Manual</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total_manual}</p>
                            </div>
                            <MessageSquare size={32} className="text-gray-400" />
                        </div>
                    </Card>
                </div>
            )}

            {/* Messages List */}
            <div className="space-y-4">
                {loading ? (
                    <>
                        {[...Array(4)].map((_, i) => (
                            <Card key={i} className="p-6 animate-pulse">
                                <div className="flex items-start gap-4">
                                    <div className="w-5 h-5 bg-gray-200 rounded mt-1 flex-shrink-0" />
                                    <div className="flex-1 space-y-4">
                                        {/* Recipient */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
                                            <div className="space-y-1.5">
                                                <div className="h-4 bg-gray-200 rounded w-36" />
                                                <div className="h-3.5 bg-gray-200 rounded w-28" />
                                            </div>
                                        </div>
                                        {/* Template info */}
                                        <div className="space-y-1.5">
                                            <div className="h-3 bg-gray-200 rounded w-48" />
                                            <div className="h-3 bg-gray-200 rounded w-40" />
                                        </div>
                                        {/* Message content area */}
                                        <div className="bg-gray-100 rounded-lg p-4 space-y-2">
                                            <div className="h-3 bg-gray-200 rounded w-full" />
                                            <div className="h-3 bg-gray-200 rounded w-4/5" />
                                            <div className="h-3 bg-gray-200 rounded w-3/5" />
                                        </div>
                                    </div>
                                    {/* Send button */}
                                    <div className="h-10 bg-gray-200 rounded-lg w-36 flex-shrink-0" />
                                </div>
                            </Card>
                        ))}
                    </>
                ) : messages.length === 0 ? (
                    <Card className="p-8 text-center">
                        <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600">No pending WhatsApp messages</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Messages will appear here when WhatsApp is in manual mode
                        </p>
                    </Card>
                ) : (
                    messages.map((msg) => (
                        <Card key={msg.id} className="p-6">
                            <div className="flex items-start gap-4">
                                {/* Checkbox */}
                                <input
                                    type="checkbox"
                                    checked={selectedMessages.includes(msg.id)}
                                    onChange={() => toggleSelectMessage(msg.id)}
                                    className="mt-1 w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                                />

                                <div className="flex-1">
                                    {/* Recipient Info */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                                            <MessageSquare size={24} className="text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{msg.recipient_name || 'Unknown'}</p>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Phone size={14} />
                                                {msg.recipient_phone}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Template Info */}
                                    <div className="mb-3">
                                        <p className="text-xs text-gray-500 mb-1">Template: {msg.template_name}</p>
                                        <p className="text-xs text-gray-500">
                                            Created: {new Date(msg.created_at).toLocaleString()}
                                        </p>
                                    </div>

                                    {/* Message Content */}
                                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.message_content}</p>
                                    </div>

                                    {/* Related Info */}
                                    {(msg.related_booking_id || msg.related_jobcard_id || msg.related_invoice_id) && (
                                        <div className="flex gap-2 text-xs text-gray-500">
                                            {msg.related_booking_id && (
                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                                    Booking #{msg.related_booking_id}
                                                </span>
                                            )}
                                            {msg.related_jobcard_id && (
                                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                                                    Job #{msg.related_jobcard_id}
                                                </span>
                                            )}
                                            {msg.related_invoice_id && (
                                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                                                    Invoice #{msg.related_invoice_id}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Send Button */}
                                <div className="flex flex-col gap-2">
                                    <Button
                                        onClick={() => handleSendMessage(msg)}
                                        className="whitespace-nowrap"
                                    >
                                        <ExternalLink size={18} className="mr-2" />
                                        Send via WhatsApp
                                    </Button>
                                    <p className="text-xs text-gray-500 text-center">
                                        Opens WhatsApp
                                    </p>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Help Text */}
            {messages.length > 0 && (
                <Card className="p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-start gap-3">
                        <MessageSquare size={20} className="text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">How to send:</p>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>Click "Send via WhatsApp" button</li>
                                <li>WhatsApp Web/App will open with the message pre-filled</li>
                                <li>Review the message and click Send in WhatsApp</li>
                                <li>The message will be automatically marked as sent</li>
                            </ol>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default PendingWhatsAppMessages;
