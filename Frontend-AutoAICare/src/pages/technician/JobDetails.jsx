import { Alert, Badge, Button, Card, Input, Modal, Textarea } from '@/components/ui';
import api from '@/utils/api';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Car,
  CheckCircle,
  CheckSquare,
  Clock,
  FileText,
  Image as ImageIcon,
  Package,
  Pause,
  Play,
  Plus,
  Save,
  Trash2,
  Upload,
  User,
  Wrench,
  X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const cameraInputRefBefore = useRef(null);
  const fileInputRefBefore = useRef(null);
  const cameraInputRefAfter = useRef(null);
  const fileInputRefAfter = useRef(null);
  const signatureCanvasRef = useRef(null);

  const [jobCard, setJobCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('overview'); // overview, checklist, photos, forms, parts
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showPartsModal, setShowPartsModal] = useState(false);
  const [showCompleteJobModal, setShowCompleteJobModal] = useState(false);
  const [showDeletePartModal, setShowDeletePartModal] = useState(false);
  const [showDeletePhotoModal, setShowDeletePhotoModal] = useState(false);
  const [pendingDeletePartId, setPendingDeletePartId] = useState(null);
  const [pendingDeletePhoto, setPendingDeletePhoto] = useState({ id: null, type: null });
  const [uploadType, setUploadType] = useState(''); // before, after
  const [beforeDescription, setBeforeDescription] = useState('');
  const [afterDescription, setAfterDescription] = useState('');
  const [partsUsed, setPartsUsed] = useState([]);
  const [availableParts, setAvailableParts] = useState([]);
  const [partForm, setPartForm] = useState({ part_name: '', quantity: 1, price: 0 });

  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState([]);
  const [photos, setPhotos] = useState({ before: [], after: [] });
  const [damageChecklist, setDamageChecklist] = useState([]);
  const [intakeForm, setIntakeForm] = useState({
    mileage: '',
    fuel_level: '',
    exterior_condition: '',
    interior_condition: '',
    additional_notes: '',
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  useEffect(() => {
    fetchJobDetails();
    fetchAvailableParts();
  }, [id]);

  const fetchAvailableParts = async () => {
    try {
      // Fetch inventory from current branch
      const response = await api.get('/store/products/', {
        params: { branch: jobCard?.branch?.id, page_size: 100 }
      });
      setAvailableParts(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/jobcards/${id}/`);
      const job = response.data;
      setJobCard(job);
      setNotes(job.technician_notes || '');

      // Initialize checklist
      const initialChecklist = job.service_checklist || [
        { id: 1, item: 'Check engine oil level', completed: false },
        { id: 2, item: 'Inspect brake pads', completed: false },
        { id: 3, item: 'Check tire pressure', completed: false },
        { id: 4, item: 'Inspect battery', completed: false },
        { id: 5, item: 'Check coolant level', completed: false },
        { id: 6, item: 'Test lights and signals', completed: false },
      ];
      setChecklist(initialChecklist);

      // Initialize damage checklist
      const initialDamage = job.damage_checklist || [
        { id: 1, area: 'Front Bumper', damage: 'None', severity: 'none' },
        { id: 2, area: 'Rear Bumper', damage: 'None', severity: 'none' },
        { id: 3, area: 'Left Door', damage: 'None', severity: 'none' },
        { id: 4, area: 'Right Door', damage: 'None', severity: 'none' },
        { id: 5, area: 'Hood', damage: 'None', severity: 'none' },
        { id: 6, area: 'Roof', damage: 'None', severity: 'none' },
        { id: 7, area: 'Windshield', damage: 'None', severity: 'none' },
      ];
      setDamageChecklist(initialDamage);

      // Fetch photos
      if (job.photos && job.photos.length > 0) {
        const beforePhotos = job.photos.filter(p => p.photo_type === 'before');
        const afterPhotos = job.photos.filter(p => p.photo_type === 'after');
        setPhotos({ before: beforePhotos, after: afterPhotos });
      }

      // Add initial photos from job card (transferred from booking)
      if (job.before_photos && job.before_photos.length > 0) {
        // Check if we already have before photos from job card
        const hasJobCardBeforePhotos = job.photos && job.photos.some(p => p.photo_type === 'before');

        // If no job card before photos, use initial photos as before photos
        if (!hasJobCardBeforePhotos) {
          setPhotos(prev => ({
            ...prev,
            before: [...prev.before, ...job.before_photos]
          }));
        }
      }

      // Load intake form if exists
      if (job.intake_form) {
        setIntakeForm(job.intake_form);
      }

      // Load parts used
      setPartsUsed(job.parts_used || []);
    } catch (error) {
      console.error('Error fetching job details:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to load job details' });
    } finally {
      setLoading(false);
    }
  };

  const handleStartJob = async () => {
    try {
      await api.put(`/jobcards/${id}/start/`);
      fetchJobDetails();
    } catch (error) {
      console.error('Error starting job:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to start job' });
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      await api.put(`/jobcards/${id}/update_status/`, { status: newStatus });
      fetchJobDetails();
    } catch (error) {
      console.error('Error updating status:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to update status' });
    }
  };

  const handleCompleteJob = async () => {
    // Validate required items
    if (photos.after.length === 0) {
      setAlert({ show: true, type: 'error', message: 'Please upload at least one after photo before completing the job' });
      return;
    }

    // Show confirmation modal instead of browser confirm
    setShowCompleteJobModal(true);
  };

  const handleConfirmCompleteJob = async () => {
    setShowCompleteJobModal(false);

    try {
      await api.post(`/jobcards/${id}/complete/`);
      setAlert({ show: true, type: 'success', message: 'Job completed successfully! Customer notification sent.' });
      navigate('/technician');
    } catch (error) {
      console.error('Error completing job:', error);
      if (error.response?.data?.error) {
        setAlert({ show: true, type: 'error', message: error.response.data.error });
      } else {
        setAlert({ show: true, type: 'error', message: 'Failed to complete job' });
      }
    }
  };

  const handleAddPart = async () => {
    if (!partForm.part_name || partForm.quantity <= 0 || partForm.price <= 0) {
      setAlert({ show: true, type: 'error', message: 'Please fill all part details correctly' });
      return;
    }

    try {
      const response = await api.post(`/jobcards/${id}/add_part/`, partForm);

      // Check if the part already exists in the list
      const existingPartIndex = partsUsed.findIndex(p => p.id === response.data.id);

      if (existingPartIndex !== -1) {
        // Part exists, update it
        const updatedParts = [...partsUsed];
        updatedParts[existingPartIndex] = response.data;
        setPartsUsed(updatedParts);
      } else {
        // New part, add it to the list
        setPartsUsed([...partsUsed, response.data]);
      }

      setPartForm({ part_name: '', quantity: 1, price: 0 });
      setShowPartsModal(false);
      setAlert({ show: true, type: 'success', message: 'Part added successfully' });
    } catch (error) {
      console.error('Error adding part:', error);
      if (error.response?.data?.error) {
        setAlert({ show: true, type: 'error', message: error.response.data.error });
      } else {
        setAlert({ show: true, type: 'error', message: 'Failed to add part' });
      }
    }
  };

  const handleDeletePart = async (partId) => {
    // Store the part ID to be deleted and show confirmation modal
    setPendingDeletePartId(partId);
    setShowDeletePartModal(true);
  };

  const handleConfirmDeletePart = async () => {
    setShowDeletePartModal(false);

    try {
      await api.delete(`/jobcards/${id}/parts/${pendingDeletePartId}/`);
      setPartsUsed(partsUsed.filter(p => p.id !== pendingDeletePartId));
      setAlert({ show: true, type: 'success', message: 'Part removed successfully' });
    } catch (error) {
      console.error('Error deleting part:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to remove part' });
    }
  };

  const handleSaveNotes = async () => {
    try {
      setSaving(true);
      await api.patch(`/jobcards/${id}/`, {
        technician_notes: notes,
        service_checklist: checklist,
      });
      setAlert({ show: true, type: 'success', message: 'Notes saved successfully!' });
    } catch (error) {
      console.error('Error saving notes:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to save notes' });
    } finally {
      setSaving(false);
    }
  };

  const handleChecklistToggle = (itemId) => {
    setChecklist(prev => prev.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
  };

  const handlePhotoUpload = async (event, type) => {
    const files = Array.from(event.target.files);

    // Check if trying to upload 'after' photos without 'before' photos
    if (type === 'after') {
      const hasBeforePhotos = photos.before.length > 0;
      if (!hasBeforePhotos) {
        setAlert({ show: true, type: 'error', message: 'Please upload before photos first before adding after photos.' });
        return;
      }
    }

    for (const file of files) {
      try {
        // Compress image
        const compressedFile = await compressImage(file);

        // Upload to server
        const formData = new FormData();
        formData.append('image', compressedFile);
        formData.append('photo_type', type);
        formData.append('jobcard', id);
        if (type === 'before' && beforeDescription) {
          formData.append('description', beforeDescription);
        } else if (type === 'after' && afterDescription) {
          formData.append('description', afterDescription);
        }

        const response = await api.post(`/jobcards/${id}/add_photo/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setPhotos(prev => ({
          ...prev,
          [type]: [...prev[type], response.data]
        }));
      } catch (error) {
        console.error('Error uploading photo:', error);
        if (error.response && error.response.data && error.response.data.detail) {
          setAlert({ show: true, type: 'error', message: `Failed to upload photo: ${error.response.data.detail}` });
        } else {
          setAlert({ show: true, type: 'error', message: 'Failed to upload photo' });
        }
      }
    }

    // Clear description after upload
    if (type === 'before') {
      setBeforeDescription('');
    } else if (type === 'after') {
      setAfterDescription('');
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.85);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDeletePhoto = async (photoId, type) => {
    // Check if this is an initial photo (from booking)
    if (typeof photoId === 'string' && photoId.startsWith('initial-')) {
      setAlert({ show: true, type: 'error', message: 'Cannot delete initial check-in photos' });
      return;
    }

    // Store the photo ID and type to be deleted and show confirmation modal
    setPendingDeletePhoto({ id: photoId, type });
    setShowDeletePhotoModal(true);
  };

  const handleConfirmDeletePhoto = async () => {
    setShowDeletePhotoModal(false);

    try {
      await api.delete(`/jobcards/${id}/photos/${pendingDeletePhoto.id}/`);
      setPhotos(prev => ({
        ...prev,
        [pendingDeletePhoto.type]: prev[pendingDeletePhoto.type].filter(p => p.id !== pendingDeletePhoto.id)
      }));
      setAlert({ show: true, type: 'success', message: 'Photo deleted successfully' });
    } catch (error) {
      console.error('Error deleting photo:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to delete photo' });
    }
  };

  const handleSaveDamageChecklist = async () => {
    try {
      await api.patch(`/jobcards/${id}/`, {
        damage_checklist: damageChecklist,
      });
      setShowDamageModal(false);
      setAlert({ show: true, type: 'success', message: 'Damage checklist saved!' });
    } catch (error) {
      console.error('Error saving damage checklist:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to save damage checklist' });
    }
  };

  const handleSaveIntakeForm = async () => {
    try {
      await api.patch(`/jobcards/${id}/`, {
        intake_form: intakeForm,
      });
      setShowIntakeModal(false);
      setAlert({ show: true, type: 'success', message: 'Intake form saved!' });
    } catch (error) {
      console.error('Error saving intake form:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to save intake form' });
    }
  };

  const handleClearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSaveSignature = async () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      try {
        const formData = new FormData();
        formData.append('signature', blob, 'signature.png');
        formData.append('jobcard', id);

        await api.post('/jobcards/signature/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setShowSignatureModal(false);
        setAlert({ show: true, type: 'success', message: 'Signature saved!' });
        fetchJobDetails();
      } catch (error) {
        console.error('Error saving signature:', error);
        setAlert({ show: true, type: 'error', message: 'Failed to save signature' });
      }
    });
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = signatureCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const triggerPhotoUpload = (type) => {
    setUploadType(type);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const checklistProgress = checklist.length > 0
    ? Math.round((checklist.filter(item => item.completed).length / checklist.length) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!jobCard) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Job not found</p>
        <Button onClick={() => navigate('/technician')} className="mt-4">
          Back to Jobs
        </Button>
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
          onClose={() => setAlert({ show: false, type: "", message: "" })}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/technician")}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Job Card #{jobCard.id}
            </h1>
            <p className="text-gray-600 mt-1">
              {jobCard.booking_details?.package_details?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={jobCard.status === "completed" ? "success" : "warning"}
          >
            {jobCard.status?.replaceAll("_", " ").split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </Badge>
          {jobCard.status === "assigned" && (
            <Button onClick={handleStartJob}>
              <Play size={18} className="mr-2" />
              Start Job
            </Button>
          )}
          {(jobCard.status === "started" ||
            jobCard.status === "in_progress") && (
              <>
                <Button
                  onClick={() => handleUpdateStatus("in_progress")}
                  variant="outline"
                >
                  <Pause size={18} className="mr-2" />
                  Mark In Progress
                </Button>
                <Button onClick={handleCompleteJob} variant="success">
                  <CheckCircle size={18} className="mr-2" />
                  Complete Job
                </Button>
              </>
            )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { key: "overview", label: "Overview", icon: FileText },
            { key: "checklist", label: "Checklist", icon: CheckSquare },
            { key: "photos", label: "Photos", icon: ImageIcon },
            { key: "parts", label: "Parts Used", icon: Package },
            { key: "forms", label: "Forms", icon: FileText },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeSection === key
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Section */}
      {activeSection === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer & Vehicle Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Customer Details">
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Customer Name</p>
                    <p className="font-medium text-gray-900">
                      {jobCard.booking_details.customer_name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Contact</p>
                    <p className="font-medium text-gray-900">
                      {jobCard.booking_details.customer_details.user.phone ||
                        "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Email</p>
                    <p className="font-medium text-gray-900">
                      {jobCard.booking_details.customer_details.user.email &&
                        !jobCard.booking_details.customer_details.user.email.endsWith('@walkin.local')
                        ? jobCard.booking_details.customer_details.user.email
                        : "Not provided"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Vehicle Details">
              <div className="p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Car size={18} className="text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {jobCard.booking_details?.vehicle_details?.make}{" "}
                    {jobCard.booking_details?.vehicle_details?.model}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Registration</p>
                    <p className="font-medium text-gray-900">
                      {
                        jobCard.booking_details?.vehicle_details
                          ?.registration_number
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Year</p>
                    <p className="font-medium text-gray-900">
                      {jobCard.booking_details?.vehicle_details?.year}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Color</p>
                    <p className="font-medium text-gray-900">
                      {jobCard.booking_details?.vehicle_details?.color}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Service Details">
              <div className="p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Wrench size={18} className="text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {jobCard.booking_details?.package_details?.name}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {jobCard.booking_details?.package_details?.description}
                </p>
                {jobCard.booking_details?.addons?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Add-ons:
                    </p>
                    <ul className="space-y-1">
                      {jobCard.booking_details.addon_details.map(
                        (addon, idx) => (
                          <li key={idx} className="text-sm text-gray-600">
                            • {addon.name}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Timeline & Notes */}
          <div className="space-y-6">
            <Card title="Timeline">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Assigned</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(jobCard.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {jobCard.started_at && (
                  <div className="flex items-center gap-3">
                    <Play size={16} className="text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Started</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(jobCard.started_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                {jobCard.estimated_delivery_time && (
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={16} className="text-yellow-600" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Due By</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(
                          jobCard.estimated_delivery_time
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Technician Notes">
              <div className="p-6 space-y-4">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about the service, issues found, recommendations..."
                  rows={8}
                />
                <Button
                  onClick={handleSaveNotes}
                  disabled={saving}
                  className="w-full"
                >
                  {/* <Save size={18} className="mr-2" /> */}
                  {saving ? "Saving..." : "Save Notes"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Checklist Section */}
      {activeSection === "checklist" && (
        <Card title="Service Checklist">
          <div className="p-6 space-y-4">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Progress
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {checklistProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{ width: `${checklistProgress}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {checklist.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleChecklistToggle(item.id)}
                    className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <div className="flex-1">
                    <p
                      className={`font-medium ${item.completed
                        ? "text-gray-500 line-through"
                        : "text-gray-900"
                        }`}
                    >
                      {item.item}
                    </p>
                  </div>
                  {item.completed && (
                    <CheckCircle size={20} className="text-green-600" />
                  )}
                </label>
              ))}
            </div>

            <Button
              onClick={handleSaveNotes}
              disabled={saving}
              className="w-full mt-6"
            >
              <Save size={18} className="mr-2" />
              Save Checklist
            </Button>
          </div>
        </Card>
      )}

      {/* Photos Section */}
      {activeSection === "photos" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Before Photos */}
          <Card title="Before Photos">
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {photos.before.map((photo) => {
                  // Validate photo data
                  if (!photo.image || typeof photo.image !== 'string') {
                    return null;
                  }

                  // Check if it's a valid data URL or HTTP URL
                  if (!(photo.image.startsWith('data:image/') || photo.image.startsWith('http'))) {
                    return null;
                  }

                  return (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.image}
                        alt="Before"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => handleDeletePhoto(photo.id, "before")}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={16} />
                      </button>
                      {photo.description && (
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                          {photo.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2">
                <Input
                  label="Description (Optional)"
                  value={beforeDescription}
                  onChange={(e) => setBeforeDescription(e.target.value)}
                  placeholder="Add a description for the photo..."
                />
                {/* Hidden inputs */}
                <input
                  ref={cameraInputRefBefore}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handlePhotoUpload(e, "before")}
                  className="hidden"
                />
                <input
                  ref={fileInputRefBefore}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoUpload(e, "before")}
                  className="hidden"
                />

                {/* Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => cameraInputRefBefore.current?.click()}
                    variant="outline"
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Camera size={18} />
                    <span>Take Photo</span>
                  </Button>
                  <Button
                    onClick={() => fileInputRefBefore.current?.click()}
                    variant="outline"
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Upload size={18} />
                    <span>Upload Photos</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* After Photos */}
          <Card title="After Photos">
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {photos.after.map((photo) => {
                  // Validate photo data
                  if (!photo.image || typeof photo.image !== 'string') {
                    return null;
                  }

                  // Check if it's a valid data URL or HTTP URL
                  if (!(photo.image.startsWith('data:image/') || photo.image.startsWith('http'))) {
                    return null;
                  }

                  return (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.image}
                        alt="After"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => handleDeletePhoto(photo.id, "after")}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={16} />
                      </button>
                      {photo.description && (
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                          {photo.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2">
                <Input
                  label="Description (Optional)"
                  value={afterDescription}
                  onChange={(e) => setAfterDescription(e.target.value)}
                  placeholder="Add a description for the photo..."
                />
                {/* Hidden inputs */}
                <input
                  ref={cameraInputRefAfter}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handlePhotoUpload(e, "after")}
                  className="hidden"
                />
                <input
                  ref={fileInputRefAfter}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoUpload(e, "after")}
                  className="hidden"
                />

                {/* Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => cameraInputRefAfter.current?.click()}
                    variant="outline"
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Camera size={18} />
                    <span>Take Photo</span>
                  </Button>
                  <Button
                    onClick={() => fileInputRefAfter.current?.click()}
                    variant="outline"
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Upload size={18} />
                    <span>Upload Photos</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Forms Section */}
      {activeSection === "parts" && (
        <Card title="Parts Used">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Manage Parts
              </h3>
              <Button
                onClick={() => setShowPartsModal(true)}
                disabled={jobCard.status === "completed"}
              >
                <Plus size={18} className="mr-2" />
                Add Part
              </Button>
            </div>

            {partsUsed.length > 0 ? (
              <div className="space-y-3">
                {partsUsed.map((part) => (
                  <div
                    key={part.id}
                    className="p-4 border border-gray-200 rounded-lg flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Package size={18} className="text-gray-400" />
                        <p className="font-medium text-gray-900">
                          {part.part_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span>Quantity: {part.quantity}</span>
                        <span>•</span>
                        <span>Price: ₹{part.price}</span>
                        <span>•</span>
                        <span className="font-semibold text-gray-900">
                          Total: ₹{(part.quantity * part.price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {jobCard.status !== "completed" && (
                      <button
                        onClick={() => handleDeletePart(part.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Remove part"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total Parts Cost:</span>
                    <span className="text-green-600">
                      ₹
                      {partsUsed
                        .reduce(
                          (sum, part) => sum + part.quantity * part.price,
                          0
                        )
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Package size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No parts used yet</p>
                <p className="text-sm mt-2">
                  Add parts from your branch inventory
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Forms Section */}
      {activeSection === "forms" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="p-6 space-y-4 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <FileText size={32} className="text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900">Intake Form</h3>
              <p className="text-sm text-gray-600">
                Record vehicle condition on arrival
              </p>
              <Button
                onClick={() => setShowIntakeModal(true)}
                className="w-full"
              >
                {intakeForm.mileage ? "Edit Form" : "Fill Form"}
              </Button>
            </div>
          </Card>

          <Card>
            <div className="p-6 space-y-4 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={32} className="text-yellow-600" />
              </div>
              <h3 className="font-bold text-gray-900">Damage Checklist</h3>
              <p className="text-sm text-gray-600">Document existing damages</p>
              <Button
                onClick={() => setShowDamageModal(true)}
                className="w-full"
              >
                View Checklist
              </Button>
            </div>
          </Card>

          <Card>
            <div className="p-6 space-y-4 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <User size={32} className="text-green-600" />
              </div>
              <h3 className="font-bold text-gray-900">Customer Signature</h3>
              <p className="text-sm text-gray-600">Get customer approval</p>
              <Button
                onClick={() => setShowSignatureModal(true)}
                className="w-full"
              >
                Capture Signature
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Damage Checklist Modal */}
      <Modal
        isOpen={showDamageModal}
        onClose={() => setShowDamageModal(false)}
        title="Vehicle Damage Checklist"
        size="large"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDamageModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDamageChecklist}>
              <Save size={18} className="mr-2" />
              Save Checklist
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {damageChecklist.map((item, index) => (
            <div
              key={item.id}
              className="p-4 border border-gray-200 rounded-lg"
            >
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Area</p>
                  <p className="font-medium text-gray-900">{item.area}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Damage Type
                  </label>
                  <select
                    value={item.damage}
                    onChange={(e) => {
                      const updated = [...damageChecklist];
                      updated[index].damage = e.target.value;
                      setDamageChecklist(updated);
                    }}
                    className="input"
                  >
                    <option value="None">None</option>
                    <option value="Scratch">Scratch</option>
                    <option value="Dent">Dent</option>
                    <option value="Crack">Crack</option>
                    <option value="Rust">Rust</option>
                    <option value="Paint Damage">Paint Damage</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Severity
                  </label>
                  <select
                    value={item.severity}
                    onChange={(e) => {
                      const updated = [...damageChecklist];
                      updated[index].severity = e.target.value;
                      setDamageChecklist(updated);
                    }}
                    className="input"
                  >
                    <option value="none">None</option>
                    <option value="minor">Minor</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Intake Form Modal */}
      <Modal
        isOpen={showIntakeModal}
        onClose={() => setShowIntakeModal(false)}
        title="Vehicle Intake Form"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowIntakeModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveIntakeForm}>
              <Save size={18} className="mr-2" />
              Save Form
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Current Mileage"
            type="number"
            value={intakeForm.mileage}
            onChange={(e) =>
              setIntakeForm({ ...intakeForm, mileage: e.target.value })
            }
            placeholder="Enter mileage"
          />
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Fuel Level
            </label>
            <select
              value={intakeForm.fuel_level}
              onChange={(e) =>
                setIntakeForm({ ...intakeForm, fuel_level: e.target.value })
              }
              className="input w-full"
            >
              <option value="">Select fuel level</option>
              <option value="empty">Empty</option>
              <option value="quarter">1/4 Tank</option>
              <option value="half">1/2 Tank</option>
              <option value="three_quarter">3/4 Tank</option>
              <option value="full">Full</option>
            </select>
          </div>
          <Textarea
            label="Exterior Condition"
            value={intakeForm.exterior_condition}
            onChange={(e) =>
              setIntakeForm({
                ...intakeForm,
                exterior_condition: e.target.value,
              })
            }
            placeholder="Describe exterior condition..."
            rows={3}
          />
          <Textarea
            label="Interior Condition"
            value={intakeForm.interior_condition}
            onChange={(e) =>
              setIntakeForm({
                ...intakeForm,
                interior_condition: e.target.value,
              })
            }
            placeholder="Describe interior condition..."
            rows={3}
          />
          <Textarea
            label="Additional Notes"
            value={intakeForm.additional_notes}
            onChange={(e) =>
              setIntakeForm({ ...intakeForm, additional_notes: e.target.value })
            }
            placeholder="Any other observations..."
            rows={3}
          />
        </div>
      </Modal>

      {/* Signature Modal */}
      <Modal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        title="Customer Signature"
        footer={
          <>
            <Button variant="outline" onClick={handleClearSignature}>
              Clear
            </Button>
            <Button onClick={() => setShowSignatureModal(false)}>Cancel</Button>
            <Button onClick={handleSaveSignature}>
              {/* <Save size={18} className="mr-2" /> */}
              Save Signature
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Please ask the customer to sign below to confirm the service
            completion.
          </p>
          <div className="border-2 border-gray-300 rounded-lg bg-white">
            <canvas
              ref={signatureCanvasRef}
              width={500}
              height={200}
              className="w-full cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>
          <p className="text-xs text-gray-500 text-center">
            Draw signature with mouse or touch
          </p>
        </div>
      </Modal>

      {/* Add Part Modal */}
      <Modal
        isOpen={showPartsModal}
        onClose={() => setShowPartsModal(false)}
        title="Add Part Used"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowPartsModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPart}>
              <Save size={18} className="mr-2" />
              Add Part
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Part Name"
            value={partForm.part_name}
            onChange={(e) =>
              setPartForm({ ...partForm, part_name: e.target.value })
            }
            placeholder="Enter part name"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              min="1"
              value={partForm.quantity}
              onChange={(e) =>
                setPartForm({
                  ...partForm,
                  quantity: parseInt(e.target.value) || 1,
                })
              }
              required
            />
            <Input
              label="Price (₹)"
              type="number"
              min="0"
              step="0.01"
              value={partForm.price}
              onChange={(e) =>
                setPartForm({
                  ...partForm,
                  price: parseFloat(e.target.value) || 0,
                })
              }
              required
            />
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total Cost:</span>
              <span className="font-bold text-lg text-gray-900">
                ₹{(partForm.quantity * partForm.price).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> Parts can only be added from your branch
              inventory. Stock levels will be checked automatically.
            </p>
          </div>
        </div>
      </Modal>

      {/* Complete Job Confirmation Modal */}
      <Modal
        isOpen={showCompleteJobModal}
        onClose={() => setShowCompleteJobModal(false)}
        title="Complete Job"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCompleteJobModal(false)}>
              Cancel
            </Button>
            <Button variant="success" onClick={handleConfirmCompleteJob}>
              <CheckCircle size={18} className="mr-2" />
              Complete Job
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to mark this job as completed? This action will notify the customer and cannot be undone.
          </p>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Please ensure all required information, photos, and forms have been completed before proceeding.
            </p>
          </div>
        </div>
      </Modal>

      {/* Delete Part Confirmation Modal */}
      <Modal
        isOpen={showDeletePartModal}
        onClose={() => setShowDeletePartModal(false)}
        title="Delete Part"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeletePartModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDeletePart}>
              <Trash2 size={18} className="mr-2" />
              Delete Part
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to remove this part? This action cannot be undone.
          </p>
        </div>
      </Modal>

      {/* Delete Photo Confirmation Modal */}
      <Modal
        isOpen={showDeletePhotoModal}
        onClose={() => setShowDeletePhotoModal(false)}
        title="Delete Photo"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeletePhotoModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDeletePhoto}>
              {/* <Trash2 size={18} className="mr-2" /> */}
              Delete Photo
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete this photo? This action cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default JobDetails;