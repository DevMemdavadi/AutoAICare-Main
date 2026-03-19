import { useState } from 'react';
import { X, Clock, AlertCircle, Send } from 'lucide-react';
import api from '../utils/api';

/**
 * BufferExtensionModal - Modal for requesting additional buffer time
 * 
 * @param {boolean} isOpen - Whether modal is open
 * @param {function} onClose - Callback to close modal
 * @param {object} jobCard - The job card object
 * @param {function} onSuccess - Callback on successful request
 */
const BufferExtensionModal = ({ isOpen, onClose, jobCard, onSuccess }) => {
    const [additionalMinutes, setAdditionalMinutes] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await api.post(`/jobcards/${jobCard.id}/request_buffer_extension/`, {
                additional_minutes: parseInt(additionalMinutes),
                reason: reason.trim()
            });

            // Show success message
            if (onSuccess) {
                onSuccess(response.data);
            }

            // Reset form and close
            setAdditionalMinutes('');
            setReason('');
            onClose();
        } catch (err) {
            console.error('Error requesting buffer extension:', err);
            setError(err.response?.data?.error || 'Failed to submit request');
        } finally {
            setLoading(false);
        }
    };

    const isValid = additionalMinutes && parseInt(additionalMinutes) > 0 && reason.trim().length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <Clock className="text-blue-600" size={20} />
                        <h2 className="text-lg font-semibold text-gray-900">Request Buffer Extension</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Current Buffer Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="text-sm text-blue-900">
                            <div className="font-semibold mb-1">Current Buffer Status</div>
                            <div className="text-xs space-y-1">
                                <div>Total Buffer: {jobCard.buffer_minutes_allocated || 0} minutes</div>
                                <div>Remaining: {jobCard.remaining_buffer_minutes || 0} minutes</div>
                                <div>Buffer Percentage: {jobCard.buffer_percentage || 20}%</div>
                            </div>
                        </div>
                    </div>

                    {/* Additional Minutes Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Additional Minutes Needed *
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="60"
                            value={additionalMinutes}
                            onChange={(e) => setAdditionalMinutes(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., 15"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            How many additional minutes do you need?
                        </p>
                    </div>

                    {/* Reason Textarea */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reason for Extension *
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            placeholder="Explain why additional buffer time is needed..."
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Provide a clear explanation for admin review
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle size={16} className="text-red-600" />
                            <span className="text-sm text-red-700">{error}</span>
                        </div>
                    )}

                    {/* Info Message */}
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertCircle size={16} className="text-yellow-600 mt-0.5" />
                        <div className="text-xs text-yellow-800">
                            <div className="font-semibold mb-1">Admin Approval Required</div>
                            <div>
                                Your request will be sent to branch admins for approval. You'll be notified once it's reviewed.
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!isValid || loading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={16} />
                            <span>{loading ? 'Submitting...' : 'Submit Request'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BufferExtensionModal;
