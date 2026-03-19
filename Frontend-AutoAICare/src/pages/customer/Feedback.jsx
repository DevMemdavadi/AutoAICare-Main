import { Alert, Badge, Button, Card, Select, Textarea } from '@/components/ui';
import api from '@/utils/api';
import { CheckCircle, MessageSquare, Send, Star, ThumbsUp } from 'lucide-react';
import { useEffect, useState } from 'react';

const Feedback = () => {
  const [myFeedback, setMyFeedback] = useState([]);
  const [completedBookings, setCompletedBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState('');
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    category: 'service_quality',
    review: '',
    suggestions: '',
  });
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [feedbackRes, bookingsRes] = await Promise.all([
        api.get('/feedback/'),
        api.get('/bookings/?status=completed'),
      ]);

      setMyFeedback(feedbackRes.data.results || feedbackRes.data || []);

      // Filter out bookings that already have feedback
      const bookings = bookingsRes.data.results || bookingsRes.data || [];
      const feedbackBookingIds = (feedbackRes.data.results || feedbackRes.data || []).map(f => f.booking);
      const availableBookings = bookings.filter(b => !feedbackBookingIds.includes(b.id));
      setCompletedBookings(availableBookings);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Show error to user
      setAlert({ show: true, type: 'error', message: 'Failed to load feedback data. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!selectedBooking) {
      setAlert({ show: true, type: 'error', message: 'Please select a booking' });
      return;
    }

    try {
      setSubmitting(true);
      // Debug log to see what data we're sending
      const feedbackData = {
        booking: selectedBooking,
        ...feedbackForm,
      };
      console.log('Submitting feedback data:', feedbackData);

      await api.post('/feedback/', feedbackData);

      setAlert({ show: true, type: 'success', message: 'Feedback submitted successfully!' });
      setSelectedBooking('');
      setFeedbackForm({
        rating: 5,
        category: 'service_quality',
        review: '',
        suggestions: '',
      });
      // Reset selected booking
      setSelectedBooking('');
      fetchData();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      console.error('Error response:', error.response?.data);
      // Enhanced error handling with detailed messages
      const errorMessage = error.response?.data?.booking?.[0]
        || error.response?.data?.rating?.[0]
        || error.response?.data?.review?.[0]
        || error.response?.data?.detail
        || error.response?.data?.message
        || 'Failed to submit feedback. Please check your input and try again.';
      setAlert({ show: true, type: 'error', message: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating, interactive = false, onRate = null) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onRate && onRate(star)}
            disabled={!interactive}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          >
            <Star
              size={interactive ? 32 : 20}
              className={`${star <= rating
                  ? 'text-yellow-500 fill-yellow-500'
                  : 'text-gray-300'
                }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Review' },
      reviewed: { color: 'bg-blue-100 text-blue-800', label: 'Reviewed' },
      resolved: { color: 'bg-green-100 text-green-800', label: 'Resolved' },
    };
    return variants[status] || variants.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Component */}
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: '', message: '' })}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Feedback & Reviews</h1>
        <p className="text-gray-600 mt-1">Share your experience and help us improve</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Reviews</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{myFeedback.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Average Rating</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-2xl font-bold text-gray-900">
              {myFeedback.length > 0
                ? (myFeedback.reduce((sum, f) => sum + f.rating, 0) / myFeedback.length).toFixed(1)
                : '0'}
            </p>
            <Star size={20} className="text-yellow-500 fill-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Pending Feedback</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{completedBookings.length}</p>
        </div>
      </div>

      {/* Submit New Feedback */}
      {completedBookings && completedBookings.length > 0 && (
        <Card title="Submit New Feedback">
          <form onSubmit={handleSubmitFeedback} className="space-y-6 p-6">
            <Select
              label="Select Completed Service"
              value={selectedBooking}
              onChange={(e) => setSelectedBooking(e.target.value)}
              options={[
                { value: '', label: 'Choose a service...' },
                ...completedBookings.map(booking => ({
                  value: booking.id,
                  label: `Booking #${booking.id} - ${booking.packages_details?.[0]?.name || 'Service'} (${booking.vehicle_details?.registration_number || 'N/A'}) - ${new Date(booking.booking_datetime).toLocaleDateString()}`,
                }))
              ]}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Rating *
              </label>
              {renderStars(feedbackForm.rating, true, (rating) =>
                setFeedbackForm({ ...feedbackForm, rating })
              )}
              <p className="text-sm text-gray-600 mt-2">
                {feedbackForm.rating === 5 ? 'Excellent!' :
                  feedbackForm.rating === 4 ? 'Very Good' :
                    feedbackForm.rating === 3 ? 'Good' :
                      feedbackForm.rating === 2 ? 'Fair' : 'Poor'}
              </p>
            </div>

            <Select
              label="Category"
              value={feedbackForm.category}
              onChange={(e) => setFeedbackForm({ ...feedbackForm, category: e.target.value })}
              options={[
                { value: 'service_quality', label: 'Service Quality' },
                { value: 'staff_behavior', label: 'Staff Behavior' },
                { value: 'pricing', label: 'Pricing' },
                { value: 'timeliness', label: 'Timeliness' },
                { value: 'facility', label: 'Facility' },
              ]}
              required
            />

            <Textarea
              label="Your Review *"
              value={feedbackForm.review}
              onChange={(e) => setFeedbackForm({ ...feedbackForm, review: e.target.value })}
              placeholder="Share your experience with us..."
              rows={4}
              required
            />

            <Textarea
              label="Suggestions for Improvement (Optional)"
              value={feedbackForm.suggestions}
              onChange={(e) => setFeedbackForm({ ...feedbackForm, suggestions: e.target.value })}
              placeholder="How can we improve?"
              rows={3}
            />

            <Button type="submit" disabled={submitting} className="w-full">
              <Send size={18} className="mr-2" />
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </form>
        </Card>
      )}

      {/* My Feedback History */}
      <Card title="My Feedback History">
        {myFeedback.length > 0 ? (
          <div className="space-y-4 p-6">
            {myFeedback.map((feedback) => {
              const statusInfo = getStatusBadge(feedback.status);

              return (
                <div
                  key={feedback.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">
                          Booking #{feedback.booking}
                        </p>
                        <Badge variant="secondary">{feedback.category?.replace('_', ' ')}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {(feedback.booking_details?.packages_details?.map(p => p.name).join(', ')) || 'Service'} - {new Date(feedback.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Vehicle: {feedback.booking_details?.vehicle_details?.brand} {feedback.booking_details?.vehicle_details?.model}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="mb-3">
                    {renderStars(feedback.rating)}
                  </div>

                  <p className="text-gray-700 text-sm mb-3">{feedback.review}</p>

                  {feedback.suggestions && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
                      <p className="text-xs font-medium text-blue-900 mb-1">Suggestions:</p>
                      <p className="text-sm text-blue-700">{feedback.suggestions}</p>
                    </div>
                  )}

                  {feedback.admin_response && (
                    <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-green-600 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-green-900 mb-1">Admin Response:</p>
                          <p className="text-sm text-green-700">{feedback.admin_response}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <ThumbsUp size={14} />
                      <span>{feedback.helpful_count || 0} helpful</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageSquare size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No feedback submitted yet</p>
            {completedBookings && completedBookings.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                You have {completedBookings.length} completed service(s) waiting for feedback
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Helpful Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-3">Tips for Great Feedback</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>Be specific about what you liked or didn't like</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>Mention staff members who provided excellent service</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>Share constructive suggestions for improvement</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>Your feedback helps us serve you better!</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Feedback;