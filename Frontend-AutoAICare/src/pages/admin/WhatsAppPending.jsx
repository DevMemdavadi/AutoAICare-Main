import { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import api from '@/utils/api';
import { MessageSquare, RefreshCw, CheckCircle, XCircle, Reply, Send } from 'lucide-react';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui';

const WhatsAppPending = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Reply Modal State
  const [replyEvent, setReplyEvent] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);

  const fetchEvents = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      // Fetch all events including processed and ignored to keep them visible
      const response = await api.get('/whatsapp/events/');
      setEvents(response.data.results || response.data || []);
    } catch (err) {
      console.error('Error fetching WhatsApp events:', err);
      if (showLoading) setError('Failed to load pending WhatsApp events.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    
    // Auto-refresh (poll) every 5 seconds silently
    const interval = setInterval(() => {
      fetchEvents(false);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.patch(`/whatsapp/events/${id}/`, { status });
      fetchEvents(); // Refresh list
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update event status.');
    }
  };

  const handleSendReply = async () => {
    if (!replyContent.trim()) return;
    
        try {
            setSending(true);
            const payload = {
                phone_number: replyEvent.phone_number,
                content: replyContent.trim()
            };
            
            console.log('Sending WhatsApp Reply Payload:', payload);
            const response = await api.post('/whatsapp/send/', payload);
            console.log('Backend Response for SendReply:', response.data);

            setReplyEvent(null);
            setReplyContent('');
            fetchEvents();
            alert('Reply sent successfully!');
        } catch (error) {
            console.error('Error sending reply. Details:', error);
            if (error.response?.status === 500) {
                const backendError = error.response?.data?.error || '';
                alert(`Internal Server Error: Failed to send reply. ${backendError}`);
            } else {
                alert(error.response?.data?.error || 'Failed to send reply. Please check WP Gateway settings.');
            }
        } finally {
            setSending(false);
        }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pending WhatsApp Events</h1>
          <p className="text-gray-600 mt-1">Review incoming messages and webhooks from WP Gateway</p>
        </div>
        <Button onClick={fetchEvents} disabled={loading} className="flex items-center gap-2">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Received</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Content</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Loading events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p>No pending WhatsApp events found.</p>
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {format(new Date(event.received_at), 'dd MMM yyyy, hh:mm a')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{event.phone_number || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                      {event.event_type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate" title={event.message_content}>
                      {event.message_content || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        event.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        event.status === 'processed' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {event.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleUpdateStatus(event.id, 'processed')}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Mark as Processed"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setReplyEvent(event);
                              setReplyContent('');
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Reply to Message"
                          >
                            <Reply size={18} />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(event.id, 'ignored')}
                            className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                            title="Ignore Event"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Reply Modal */}
      {replyEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Reply to Message</h3>
                <p className="text-sm text-gray-500">To: {replyEvent.phone_number}</p>
              </div>
              <button 
                onClick={() => setReplyEvent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-700 border border-gray-100">
              <span className="font-semibold block mb-1">Customer sent:</span>
              {replyEvent.message_content}
            </div>

            <Textarea
              label="Your Reply"
              placeholder="Type your message here..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={4}
              className="mb-4"
            />
            
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setReplyEvent(null)}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSendReply}
                disabled={sending || !replyContent.trim()}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                {sending ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                {sending ? 'Sending...' : 'Send Reply'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppPending;
