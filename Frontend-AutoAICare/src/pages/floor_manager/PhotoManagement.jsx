import { Alert, Badge, Button, Card, Input, SkeletonLoader } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import {
  Camera,
  Eye,
  RefreshCw,
  Search,
  ZoomIn,
  Upload,
  Edit3,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PhotoManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  useEffect(() => {
    fetchPhotos();
  }, []);

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
  };

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      // For now, we'll fetch all jobs and extract photos
      // In a real implementation, this would be a specific endpoint for photos
      const res = await api.get('/jobcards/floor-manager/jobs/', {
        params: { bucket: 'all_my' },
      });

      // Extract photos from jobs
      const allPhotos = [];
      (res.data || []).forEach(job => {
        // Add before photos
        if (job.photos) {
          job.photos.forEach(photo => {
            if (photo.photo_type === 'before' || photo.photo_type === 'initial') {
              allPhotos.push({
                ...photo,
                job_id: job.id,
                customer_name: job.booking_details?.customer_name ||
                  job.booking_details?.vehicle_details?.customer?.name ||
                  'N/A',
                vehicle_reg: job.booking_details?.vehicle_details?.registration_number || 'N/A',
                type: 'Before Photo',
                job_status: job.status
              });
            }
          });
        }

        // Add in-progress photos
        if (job.photos) {
          job.photos.forEach(photo => {
            if (photo.photo_type === 'in_progress') {
              allPhotos.push({
                ...photo,
                job_id: job.id,
                customer_name: job.booking_details?.customer_name ||
                  job.booking_details?.vehicle_details?.customer?.name ||
                  'N/A',
                vehicle_reg: job.booking_details?.vehicle_details?.registration_number || 'N/A',
                type: 'In Progress',
                job_status: job.status
              });
            }
          });
        }

        // Add after photos
        if (job.photos) {
          job.photos.forEach(photo => {
            if (photo.photo_type === 'after') {
              allPhotos.push({
                ...photo,
                job_id: job.id,
                customer_name: job.booking_details?.customer_name ||
                  job.booking_details?.vehicle_details?.customer?.name ||
                  'N/A',
                vehicle_reg: job.booking_details?.vehicle_details?.registration_number || 'N/A',
                type: 'After Photo',
                job_status: job.status
              });
            }
          });
        }
      });

      setPhotos(allPhotos);
    } catch (err) {
      console.error('Error fetching photos:', err);
      setPhotos([]);
      showAlert('error', 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const filteredPhotos = photos.filter((photo) => {
    if (!search) return true;

    const term = search.toLowerCase().trim();

    const idMatch = photo.job_id?.toString().includes(term);
    const regMatch = photo.vehicle_reg?.toLowerCase().includes(term);
    const customerMatch = photo.customer_name?.toLowerCase().includes(term);
    const typeMatch = photo.type?.toLowerCase().includes(term);

    return idMatch || regMatch || customerMatch || typeMatch;
  });

  const handleRefresh = () => {
    fetchPhotos();
  };

  const openPhotoModal = (photo) => {
    setSelectedPhoto(photo);
  };

  const closePhotoModal = () => {
    setSelectedPhoto(null);
  };

  const getStatusBadgeVariant = (status) => {
    const map = {
      qc_pending: 'warning',
      qc_rejected: 'destructive',
      qc_completed: 'info',
      supervisor_approved: 'success',
      work_in_progress: 'warning',
      work_completed: 'success',
      final_qc_pending: 'warning',
      final_qc_passed: 'success',
      final_qc_failed: 'destructive',
      customer_approved: 'success',
      ready_for_billing: 'info',
      billed: 'default',
      delivered: 'default',
      closed: 'default'
    };
    return map[status] || 'default';
  };

  const getPhotoTypeLabel = (type) => {
    if (!type) return 'N/A';
    const cleanType = type.replace(' Photo', '').toLowerCase();
    const labelMap = {
      'initial': 'BEFORE',
      'before': 'BEFORE',
      'after': 'AFTER',
      'qc': 'QC',
      'in_progress': 'IN PROGRESS'
    };
    return labelMap[cleanType] || type.replace(/_/g, ' ').toUpperCase();
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Photo Management</h1>
          <p className="text-gray-600 mt-1">
            Manage and review all job-related photos
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-sm text-gray-600">
              Logged in as <span className="font-semibold">{user.name}</span>
            </span>
          )}
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleRefresh}
          >
            <RefreshCw size={16} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Photo Categories */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {loading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <SkeletonLoader key={i} type="card" />
            ))}
          </>
        ) : (
          <>
            <Card className="p-4 text-center">
              <div className="flex justify-center mb-2">
                <div className="p-3 rounded-full bg-blue-100">
                  <Camera className="w-6 h-6 text-blue-700" />
                </div>
              </div>
              <h3 className="font-medium text-gray-900">Before Photos</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {photos.filter(p => p.type === 'Before Photo').length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Initial inspection</p>
            </Card>

            <Card className="p-4 text-center">
              <div className="flex justify-center mb-2">
                <div className="p-3 rounded-full bg-yellow-100">
                  <Camera className="w-6 h-6 text-yellow-700" />
                </div>
              </div>
              <h3 className="font-medium text-gray-900">Damage Photos</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {photos.filter(p => p.type === 'Damage').length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Scratches & dents</p>
            </Card>

            <Card className="p-4 text-center">
              <div className="flex justify-center mb-2">
                <div className="p-3 rounded-full bg-purple-100">
                  <Camera className="w-6 h-6 text-purple-700" />
                </div>
              </div>
              <h3 className="font-medium text-gray-900">In-Progress</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {photos.filter(p => p.type === 'In Progress').length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Work updates</p>
            </Card>

            <Card className="p-4 text-center">
              <div className="flex justify-center mb-2">
                <div className="p-3 rounded-full bg-green-100">
                  <Camera className="w-6 h-6 text-green-700" />
                </div>
              </div>
              <h3 className="font-medium text-gray-900">After Photos</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {photos.filter(p => p.type === 'After Photo').length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Final results</p>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="w-80">
            <Input
              placeholder="Search by job ID, vehicle reg, customer, or photo type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<Search size={18} className="text-gray-400" />}
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Upload size={16} />
            Upload Photos
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Edit3 size={16} />
            Annotate
          </Button>
        </div>
      </Card>

      {/* Photos Grid */}
      {loading ? (
        <SkeletonLoader type="photo-grid" count={15} />
      ) : filteredPhotos.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          No photos found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredPhotos.map((photo) => (
            <Card key={`${photo.id}-${photo.job_id}`} className="overflow-hidden">
              <div className="relative">
                <img
                  src={photo.image}
                  alt={`${photo.type} for job ${photo.job_id}`}
                  className="w-full h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => openPhotoModal(photo)}
                />
                <button
                  className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75"
                  onClick={() => openPhotoModal(photo)}
                >
                  <ZoomIn size={16} />
                </button>
              </div>
              <div className="p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-sm">Job #{photo.job_id}</h4>
                    <p className="text-xs text-gray-600 mt-1">{photo.vehicle_reg}</p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(photo.job_status)}>
                    {photo.job_status?.replace(/_/g, ' ') || 'N/A'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">{photo.type}</span>
                  <Button
                    size="xs"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => navigate(`/floor-manager/job/${photo.job_id}`)}
                  >
                    <Eye size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
          onClick={closePhotoModal}
        >
          <div
            className="bg-white rounded-lg max-w-5xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                {getPhotoTypeLabel(selectedPhoto.type)} - Job Card #{selectedPhoto.job_id}
              </h3>
              <button
                onClick={closePhotoModal}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <img
                src={selectedPhoto.image}
                alt={selectedPhoto.type}
                className="max-w-full max-h-[60vh] mx-auto rounded-lg shadow-lg"
              />
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Job Details</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-900">Customer:</span>{' '}
                      {selectedPhoto.customer_name || 'N/A'}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-900">Registration:</span>{' '}
                      {selectedPhoto.vehicle_reg || 'N/A'}
                    </p>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="font-medium text-gray-900">Status:</span>{' '}
                      <Badge variant={getStatusBadgeVariant(selectedPhoto.job_status)}>
                        {selectedPhoto.job_status?.replace(/_/g, ' ') || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Photo Details</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-900">Type:</span>{' '}
                      {getPhotoTypeLabel(selectedPhoto.type)}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium text-gray-900">Uploaded:</span>{' '}
                      {selectedPhoto.created_at
                        ? new Date(selectedPhoto.created_at).toLocaleString()
                        : 'N/A'}
                    </p>
                    {selectedPhoto.uploaded_by_details && (
                      <p className="text-gray-600">
                        <span className="font-medium text-gray-900">Uploaded by:</span>{' '}
                        {selectedPhoto.uploaded_by_details.name || 'N/A'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoManagement;