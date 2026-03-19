import { Button } from '@/components/ui';
import api from '@/utils/api';
import { MessageSquare, Send } from 'lucide-react';
import { useState } from 'react';

/**
 * Inline WhatsApp Send Button Component
 * Can be used in booking details, job card details, etc.
 * 
 * Props:
 * - recipientId: User ID of the recipient
 * - recipientPhone: Phone number of the recipient
 * - recipientName: Name of the recipient
 * - templateName: WhatsApp template to use
 * - contextData: Additional context (booking_id, jobcard_id, etc.)
 * - variant: 'button' | 'icon' (default: 'button')
 * - size: 'sm' | 'md' | 'lg' (default: 'md')
 */
const WhatsAppSendButton = ({
    recipientId,
    recipientPhone,
    recipientName,
    templateName = 'general_notification',
    contextData = {},
    variant = 'button',
    size = 'md',
    className = ''
}) => {
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSend = async () => {
        try {
            setLoading(true);

            // Trigger notification which will create pending message or send automatically
            const response = await api.post('/notify/send/', {
                user_id: recipientId,
                notification_type: templateName,
                context_data: contextData
            });

            if (response.data.whatsapp?.status === 'pending_manual') {
                // Manual mode - open WhatsApp link
                window.open(response.data.whatsapp.whatsapp_link, '_blank');

                // Mark as sent
                await api.post(`/notify/whatsapp/pending/${response.data.whatsapp.log_id}/mark_sent/`);
                alert('WhatsApp opened! Message will be marked as sent.');
                setSent(true);
            } else if (response.data.whatsapp?.status === 'queued') {
                // Automated mode
                alert('WhatsApp message sent automatically!');
                setSent(true);
            } else {
                alert('WhatsApp notification triggered');
            }
        } catch (error) {
            console.error('Error sending WhatsApp:', error);
            alert('Failed to send WhatsApp message');
        } finally {
            setLoading(false);
        }
    };

    // Icon variant
    if (variant === 'icon') {
        return (
            <button
                onClick={handleSend}
                disabled={loading || sent}
                className={`p-2 rounded-lg transition-colors ${sent
                        ? 'bg-green-100 text-green-600 cursor-not-allowed'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    } ${className}`}
                title={sent ? 'Message sent' : 'Send WhatsApp message'}
            >
                {loading ? (
                    <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                ) : sent ? (
                    <Send size={20} />
                ) : (
                    <MessageSquare size={20} />
                )}
            </button>
        );
    }

    // Button variant
    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg'
    };

    return (
        <Button
            onClick={handleSend}
            disabled={loading || sent}
            className={`${sent
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-green-600 hover:bg-green-700'
                } ${sizeClasses[size]} ${className}`}
        >
            {loading ? (
                <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                </>
            ) : sent ? (
                <>
                    <Send size={18} className="mr-2" />
                    Sent
                </>
            ) : (
                <>
                    <MessageSquare size={18} className="mr-2" />
                    Send WhatsApp
                </>
            )}
        </Button>
    );
};

export default WhatsAppSendButton;
