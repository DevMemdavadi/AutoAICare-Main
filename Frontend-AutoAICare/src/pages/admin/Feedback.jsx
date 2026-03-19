import { Badge, Button, Card, Modal, Select } from '@/components/ui';
import Alert from '@/components/ui/Alert';
import { useBranch } from '@/contexts/BranchContext';
import api from '@/utils/api';
import { Building2, Eye, MessageSquare, RefreshCw, Star, ThumbsUp } from 'lucide-react';
import { useEffect, useState } from 'react';

const AdminFeedback = () => {
  const { isSuperAdmin, getBranchFilterParams, branches, selectedBranch } = useBranch();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState({
    rating: '',
    category: '',
    branch: 'all',
  });
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [stats, setStats] = useState({
    average_rating: 0,
    total_feedback: 0,
    by_rating: {},
  });

  useEffect(() => {
    fetchFeedback();
    fetchStats();
  }, [selectedBranch]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const params = getBranchFilterParams();
      const response = await api.get('/feedback/', { params });
      setFeedbacks(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = getBranchFilterParams();
      const response = await api.get('/feedback/summary/', { params });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleMarkHelpful = async (id) => {
    try {
      await api.post(`/feedback/${id}/helpful/`);
      fetchFeedback();
    } catch (error) {
      console.error('Error marking as helpful:', error);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.patch(`/feedback/${id}/`, { status });
      fetchFeedback();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error updating status:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to update status' });
    }
  };

  const openDetailsModal = (feedback) => {
    setSelectedFeedback(feedback);
    setShowDetailsModal(true);
  };

  const filteredFeedback = feedbacks.filter(fb => {
    if (filters.rating && fb.rating !== parseInt(filters.rating)) return false;
    if (filters.category && fb.category !== filters.category) return false;
    // Branch filter for Super Admin
    if (isSuperAdmin && filters.branch !== 'all') {
      if (fb.booking_details?.branch !== parseInt(filters.branch)) return false;
    }
    return true;
  });

  const getRatingColor = (rating) => {
    if (rating >= 4) return 'text-green-500';
    if (rating >= 3) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      reviewed: 'info',
      resolved: 'success',
    };
    return variants[status] || 'default';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-80 mt-2 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Average Rating Skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:col-span-2">
            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-6 animate-pulse"></div>
            </div>
            <div className="h-3 bg-gray-200 rounded w-32 mt-2 animate-pulse"></div>
          </div>

          {/* Rating Distribution Skeleton */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-4 animate-pulse"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-8 animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Feedback List Skeleton */}
        <div className="grid grid-cols-1 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="space-y-4">
                {/* Header Skeleton */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse"></div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-24 mt-2 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-20 mt-2 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                    <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
                  </div>
                </div>

                {/* Rating Skeleton */}
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="h-5 bg-gray-200 rounded w-5 animate-pulse"></div>
                  ))}
                  <div className="h-4 bg-gray-200 rounded w-12 ml-2 animate-pulse"></div>
                </div>

                {/* Comment Skeleton */}
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-4/6 animate-pulse"></div>
                </div>

                {/* Actions Skeleton */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: '', message: '' })}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Customer Feedback
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor and respond to customer reviews
          </p>
        </div>
        <Button
          onClick={fetchFeedback}
          className="btn btn-outline flex items-center gap-2"
          variant="outline"
        >
          <RefreshCw size={18} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 md:col-span-2">
          <p className="text-sm text-gray-600">Average Rating</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-3xl font-bold text-gray-900">
              {stats.average_rating?.toFixed(1) || 0}
            </p>
            <Star className="text-yellow-500 fill-yellow-500" size={24} />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Based on {stats.total_feedback || 0} reviews
          </p>
        </div>

        {[5, 4, 3, 2, 1].map((rating) => (
          <div
            key={rating}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center gap-1 mb-2">
              <Star
                className={`${getRatingColor(rating)} fill-current`}
                size={16}
              />
              <p className="text-sm font-medium text-gray-700">
                {rating} Stars
              </p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.by_rating?.[rating] || 0}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            value={filters.rating}
            onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
            options={[
              { value: "", label: "All Ratings" },
              { value: "5", label: "5 Stars" },
              { value: "4", label: "4 Stars" },
              { value: "3", label: "3 Stars" },
              { value: "2", label: "2 Stars" },
              { value: "1", label: "1 Star" },
            ]}
          />
          <Select
            value={filters.category}
            onChange={(e) =>
              setFilters({ ...filters, category: e.target.value })
            }
            options={[
              { value: "", label: "All Categories" },
              { value: "service_quality", label: "Service Quality" },
              { value: "staff_behavior", label: "Staff Behavior" },
              { value: "pricing", label: "Pricing" },
              { value: "timeliness", label: "Timeliness" },
              { value: "facility", label: "Facility" },
            ]}
          />
          {/* Branch Filter - Super Admin Only */}
          {isSuperAdmin && (
            <Select
              value={filters.branch}
              onChange={(e) =>
                setFilters({ ...filters, branch: e.target.value })
              }
              options={[
                { value: "all", label: "All Branches" },
                ...branches.map((branch) => ({
                  value: branch.id.toString(),
                  label: branch.name,
                })),
              ]}
            />
          )}
          {/* <Button variant="outline">
            <Filter size={18} className="mr-2" />
            More Filters
          </Button> */}
        </div>
      </Card>

      {/* Feedback List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredFeedback.length > 0 ? (
          filteredFeedback.map((feedback) => (
            <Card key={feedback.id}>
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                      {feedback.customer_details?.name?.charAt(0) || "C"}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {feedback.customer_details?.user?.name ||
                          feedback.booking_details?.customer_name ||
                          "Anonymous"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {feedback.booking_details?.package_details?.name ||
                          "Service"}
                      </p>
                      {isSuperAdmin && feedback.booking_details?.branch && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Building2 size={12} />
                          {branches.find(
                            (b) => b.id === feedback.booking_details.branch
                          )?.name || "Unknown Branch"}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(feedback.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadge(feedback.status)}>
                      {feedback.status}
                    </Badge>
                    <Badge variant="secondary">
                      {feedback.category?.replaceAll("_", " ").split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </Badge>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={20}
                      className={`${star <= feedback.rating
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-gray-300"
                        }`}
                    />
                  ))}
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {feedback.rating}/5
                  </span>
                </div>

                {/* Comment */}
                <p className="text-gray-700 text-sm leading-relaxed">
                  {feedback.review || feedback.comment}
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleMarkHelpful(feedback.id)}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary"
                    >
                      <ThumbsUp size={16} />
                      <span>Helpful ({feedback.helpful_count || 0})</span>
                    </button>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <MessageSquare size={16} />
                      <span>Response</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => openDetailsModal(feedback)}
                    variant="outline"
                    size="sm"
                  >
                    {/* <Eye size={16} className="mr-1" /> */}
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card>
            <div className="text-center py-12">
              <MessageSquare size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No feedback found</p>
            </div>
          </Card>
        )}
      </div>

      {/* Feedback Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Feedback Details"
      >
        {selectedFeedback && (
          <div className="space-y-4">
            <div className="flex items-start gap-4 pb-4 border-b border-gray-200">
              <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center font-bold text-2xl">
                {selectedFeedback.customer_details?.user?.name?.charAt(0) ||
                  selectedFeedback.booking_details?.customer_name?.charAt(0) ||
                  "C"}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-lg text-gray-900">
                  {selectedFeedback.customer_details?.user?.name ||
                    selectedFeedback.booking_details?.customer_name ||
                    "Anonymous"}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedFeedback.customer_details?.user?.email || "No email"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Submitted on{" "}
                  {new Date(selectedFeedback.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Service</p>
              <p className="font-medium">
                {selectedFeedback.booking_details?.package_details?.name ||
                  "N/A"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Category</p>
              <Badge variant="secondary">
                {selectedFeedback.category?.replaceAll("_", " ").split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || "General"}
              </Badge>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Rating</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={24}
                    className={`${star <= selectedFeedback.rating
                        ? "text-yellow-500 fill-yellow-500"
                        : "text-gray-300"
                      }`}
                  />
                ))}
                <span className="ml-2 text-lg font-medium text-gray-700">
                  {selectedFeedback.rating}/5
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Comment</p>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                {selectedFeedback.review ||
                  selectedFeedback.comment ||
                  "No comment provided"}
              </p>
            </div>

            {selectedFeedback.suggestions && (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Suggestions for Improvement
                </p>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                  {selectedFeedback.suggestions}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-600 mb-2">Status</p>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusBadge(selectedFeedback.status)}>
                  {selectedFeedback.status || "pending"}
                </Badge>
                <div className="flex gap-2 ml-auto">
                  {selectedFeedback.status === "pending" && (
                    <button
                      onClick={() =>
                        handleUpdateStatus(selectedFeedback.id, "reviewed")
                      }
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Mark as Reviewed
                    </button>
                  )}
                  {selectedFeedback.status === "reviewed" && (
                    <button
                      onClick={() =>
                        handleUpdateStatus(selectedFeedback.id, "resolved")
                      }
                      className="text-sm text-green-600 hover:underline"
                    >
                      Mark as Resolved
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <ThumbsUp size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600">
                  {selectedFeedback.helpful_count || 0} people found this
                  helpful
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminFeedback;
