import { Alert, Button, Input, Modal, Select, Textarea } from '@/components/ui';
import api from '@/utils/api';
import {
  AlertCircle,
  Award,
  Camera,
  CheckCircle,
  ClipboardCheck,
  DollarSign,
  Download,
  FileText,
  List,
  Play,
  Truck,
  Upload,
  UserCheck,
  Users,
  X,
  XCircle
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import InvoiceBreakdown from './InvoiceBreakdown';
import InvoiceItemEditor from './InvoiceItemEditor';


/**
 * WorkflowActions Component
 * Handles all workflow phase actions for job cards
 * Now supports dynamic workflow configuration from backend
 */
const WorkflowActions = ({ jobCard, onUpdate, userRole }) => {
  const [activeModal, setActiveModal] = useState(null);

  // Workflow info from backend (dynamic workflow engine)
  const [workflowInfo, setWorkflowInfo] = useState(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);

  // Fetch workflow info from the workflow engine
  const fetchWorkflowInfo = useCallback(async () => {
    if (!jobCard?.id) return;

    try {
      setWorkflowLoading(true);
      const response = await api.get(`/jobcards/${jobCard.id}/workflow/`);
      setWorkflowInfo(response.data);
    } catch (error) {
      // If workflow endpoint fails, we'll fall back to hardcoded logic
      console.log('Workflow info not available, using default logic');
      setWorkflowInfo(null);
    } finally {
      setWorkflowLoading(false);
    }
  }, [jobCard?.id]);

  // Track the last status+id we fetched workflow info for, to avoid redundant calls
  const lastFetchedRef = useRef({ id: null, status: null });

  // Fetch workflow info only when jobCard.id changes (new card) or status genuinely transitions
  useEffect(() => {
    if (!jobCard?.id) return;
    const { id, status } = jobCard;
    if (lastFetchedRef.current.id === id && lastFetchedRef.current.status === status) {
      return; // Status hasn't changed — skip redundant fetch
    }
    lastFetchedRef.current = { id, status };
    fetchWorkflowInfo();
  }, [fetchWorkflowInfo, jobCard?.id, jobCard?.status]);

  // State for applicator modal error
  const [applicatorModalError, setApplicatorModalError] = useState('');
  const [modalError, setModalError] = useState('');

  // Custom function to close modals
  const closeModal = () => {
    setActiveModal(null);
    setApplicatorModalError(''); // Clear applicator modal errors
    setModalError('');
  };
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000);
  };

  // Phase 3: Assign Floor Manager
  const [floorManagerData, setFloorManagerData] = useState({ floor_manager_id: '' });
  const [floorManagers, setFloorManagers] = useState([]);

  const fetchFloorManagers = async () => {
    try {
      let url = '/auth/users/?role=floor_manager';

      // If jobCard has a booking, pass the booking ID to filter by branch
      // The booking ID might be available as booking.id or booking_id
      let bookingId = null;
      if (jobCard && jobCard.booking) {
        // Check if booking is an object with id
        if (typeof jobCard.booking === 'object' && jobCard.booking.id) {
          bookingId = jobCard.booking.id;
        } else if (typeof jobCard.booking === 'number') {
          // booking might be just the ID
          bookingId = jobCard.booking;
        }
      }

      if (bookingId) {
        url += `&booking_id=${bookingId}`;
      }

      const response = await api.get(url);
      setFloorManagers(response.data.results || []);
    } catch (error) {
      console.error('Error fetching floor managers:', error);
    }
  };

  const handleAssignFloorManager = async () => {
    if (!floorManagerData.floor_manager_id) {
      setModalError('Please select a floor manager');
      return;
    }

    try {
      setModalError('');
      setLoading(true);
      await api.post(`/jobcards/${jobCard.id}/assign_floor_manager/`, floorManagerData);
      showAlert('success', 'Floor Manager assigned successfully!');
      setActiveModal(null);
      onUpdate();
    } catch (error) {
      showAlert('error', error.response?.data?.error || 'Failed to assign floor manager');
    } finally {
      setLoading(false);
    }
  };

  // Phase 4: Complete QC
  const [qcData, setQcData] = useState({
    scratches: '',
    dents: '',
    before_photos: [],
    checklist_points: [],
    required_parts: [],
    additional_tasks: '',
    additional_tasks_price: 0,
    notes: '',
    supervisor_id: '',
  });

  // Fetch supervisors for selection
  const [supervisors, setSupervisors] = useState([]);

  const fetchSupervisors = async () => {
    try {
      let url = '/auth/users/?role=supervisor';
      let bookingId = null;
      if (jobCard && jobCard.booking) {
        if (typeof jobCard.booking === 'object' && jobCard.booking.id) {
          bookingId = jobCard.booking.id;
        } else {
          bookingId = jobCard.booking;
        }
      }
      if (bookingId) {
        url += `&booking_id=${bookingId}`;
      }
      const response = await api.get(url);
      setSupervisors(response.data.results || []);
    } catch (error) {
      console.error('Error fetching supervisors:', error);
    }
  };

  const handleCompleteQC = async () => {
    try {
      setLoading(true);

      // Get before photos from multiple sources:
      // 1. From qc_report.before_photos (legacy approach)
      // 2. From jobcard photos with type 'before' (current approach)
      // 3. From jobcard before_photos (includes initial photos)
      const qcReportPhotos = jobCard.qc_report?.before_photos || [];
      const jobCardPhotos = jobCard.photos
        ?.filter(photo => photo.photo_type === 'before')
        ?.map(photo => photo.image) || [];
      const jobCardBeforePhotos = jobCard.before_photos
        ?.map(photoObj => photoObj.image) || [];

      // Combine all sources, removing duplicates
      const allBeforePhotos = [...new Set([...qcReportPhotos, ...jobCardPhotos, ...jobCardBeforePhotos])];

      // Filter out any corrupted photos that contain HTTP metadata
      const cleanBeforePhotos = allBeforePhotos.filter(photo => {
        if (typeof photo === 'string') {
          // If photo contains HTTP metadata, try to extract clean data
          if (photo.includes('Request URL') || photo.includes('HTTP') || photo.includes('Status Code')) {
            const dataUrlMatch = photo.match(/(data:image\/[^;]+;base64,[\w+/=]+)/);
            return dataUrlMatch && dataUrlMatch[1]; // Only include if we can extract clean data
          }
          // Otherwise, check if it's a valid data URL or HTTP URL
          return photo.startsWith('data:image/') || photo.startsWith('http');
        }
        return false;
      });

      // Include before photos in the QC data
      const qcDataWithPhotos = {
        ...qcData,
        before_photos: cleanBeforePhotos
      };
      // Include supervisor_id if selected
      const requestData = {
        ...qcDataWithPhotos,
        ...(qcData.supervisor_id && { supervisor_id: qcData.supervisor_id }),
        // Include applicator_ids if selected (allows skipping the assign team step)
        ...(applicatorIds.length > 0 && { applicator_ids: applicatorIds })
      };
      await api.post(`/jobcards/${jobCard.id}/complete_qc/`, requestData);
      showAlert('success', 'QC completed successfully! Waiting for supervisor review.');
      setActiveModal(null);
      setApplicatorIds([]);
      onUpdate();
    } catch (error) {
      showAlert('error', error.response?.data?.error || 'Failed to complete QC');
    } finally {
      setLoading(false);
    }
  };

  // Phase 5: Supervisor Review
  const [reviewData, setReviewData] = useState({
    action: 'approve',
    review_notes: '',
    stock_availability_checked: false,
    pricing_confirmed: false,
    rejection_reason: '',
  });

  const handleSupervisorReview = async () => {
    try {
      setLoading(true);
      if (reviewData.action === 'reject' && !reviewData.rejection_reason) {
        showAlert('error', 'Rejection reason is required');
        return;
      }
      await api.post(`/jobcards/${jobCard.id}/supervisor_review/`, reviewData);
      showAlert('success', `QC ${reviewData.action === 'approve' ? 'approved' : 'rejected'} successfully!`);
      setActiveModal(null);
      onUpdate();
    } catch (error) {
      showAlert('error', error.response?.data?.error || 'Failed to review QC');
    } finally {
      setLoading(false);
    }
  };

  // Phase 5: Assign Applicator Team
  const [applicatorIds, setApplicatorIds] = useState([]);
  const [applicators, setApplicators] = useState([]);


  const fetchApplicators = async () => {
    try {
      let url = '/auth/users/?role=applicator';
      let bookingId = null;
      if (jobCard && jobCard.booking) {
        if (typeof jobCard.booking === 'object' && jobCard.booking.id) {
          bookingId = jobCard.booking.id;
        } else {
          bookingId = jobCard.booking;
        }
      }
      if (bookingId) {
        url += `&booking_id=${bookingId}`;
      }
      const response = await api.get(url);
      setApplicators(response.data.results || []);
    } catch (error) {
      console.error('Error fetching applicators:', error);
    }
  };

  // Function to initialize applicator IDs based on current job card assignments
  const initializeApplicatorIds = () => {
    if (jobCard && jobCard.applicator_team_details) {
      const assignedIds = jobCard.applicator_team_details.map(member => member.id);
      setApplicatorIds(assignedIds);
    } else {
      setApplicatorIds([]);
    }
  };

  // State for loading applicators
  const [loadingApplicators, setLoadingApplicators] = useState(false);

  // Modified onClick handler for Assign Applicator Team action
  const handleOpenAssignApplicatorModal = () => {
    // Set loading state and fetch applicators
    setLoadingApplicators(true);
    setApplicatorModalError(''); // Clear any previous errors
    fetchApplicators().finally(() => {
      setLoadingApplicators(false);
      initializeApplicatorIds();
      setActiveModal('assign_applicator');
    });
  };

  // Handler for closing the assign applicator modal
  const handleCloseAssignApplicatorModal = () => {
    // Stop camera if active
    if (cameraActive && stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
    setActiveModal(null);
    // Reset applicator IDs when closing modal
    setApplicatorIds([]);
  };

  const handleAssignApplicatorTeam = async () => {
    try {
      setLoading(true);
      setApplicatorModalError(''); // Clear any previous errors

      if (applicatorIds.length === 0) {
        setApplicatorModalError('Please select at least one applicator from the list');
        setLoading(false);
        return;
      }
      // Send only the applicator_ids array
      await api.post(`/jobcards/${jobCard.id}/assign_applicator_team/`, {
        applicator_ids: applicatorIds
      });
      showAlert('success', 'Applicator team assigned successfully!');
      setActiveModal(null);
      // Reset applicator IDs after successful assignment
      setApplicatorIds([]);
      setApplicatorModalError('');
      onUpdate();
    } catch (error) {
      setApplicatorModalError(error.response?.data?.error || 'Failed to assign applicator team');
    } finally {
      setLoading(false);
    }
  };

  // Phase 5: Floor Manager Approval/Rejection (after supervisor approval)
  const [floorManagerApprovalData, setFloorManagerApprovalData] = useState({
    action: 'approve',
    approval_notes: '',
  });

  // Phase 7: Floor Manager Final QC Approval/Rejection (after final qc passed)
  const [floorManagerFinalQcApprovalData, setFloorManagerFinalQcApprovalData] = useState({
    action: 'approve',
    rejection_reason: '',
  });

  const handleFloorManagerApproval = async () => {
    try {
      setLoading(true);
      await api.post(`/jobcards/${jobCard.id}/floor_manager_approval/`, floorManagerApprovalData);
      showAlert('success', `Job ${floorManagerApprovalData.action === 'approve' ? 'approved' : 'rejected'} successfully!`);
      setActiveModal(null);
      onUpdate();
    } catch (error) {
      showAlert('error', error.response?.data?.error || 'Failed to process floor manager approval');
    } finally {
      setLoading(false);
    }
  };

  const handleFloorManagerFinalQcApproval = async () => {
    try {
      setLoading(true);
      await api.post(`/jobcards/${jobCard.id}/floor_manager_final_qc_approval/`, floorManagerFinalQcApprovalData);
      showAlert('success', `Job ${floorManagerFinalQcApprovalData.action === 'approve' ? 'approved' : 'rejected'} successfully!`);
      setActiveModal(null);
      onUpdate();
    } catch (error) {
      showAlert('error', error.response?.data?.error || 'Failed to process floor manager final QC approval');
    } finally {
      setLoading(false);
    }
  };

  // Phase 6: Start Work
  const handleStartWork = async () => {
    try {
      setLoading(true);
      await api.post(`/jobcards/${jobCard.id}/start_work/`);
      showAlert('success', 'Work started successfully!');
      onUpdate();
    } catch (error) {
      showAlert('error', error.response?.data?.error || 'Failed to start work');
    } finally {
      setLoading(false);
    }
  };

  // Phase 6: Complete Work
  const [workCompleteData, setWorkCompleteData] = useState({
    notes: '',
    after_photos: []
  });

  // State for handling photo uploads
  const [uploadingPhotos, setUploadingPhotos] = useState(false);



  // Handle after photo upload - store files locally, don't upload until Complete Work
  const handleAfterPhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPhotos(true);

    try {
      // Process each file and convert to data URL for local storage
      const photoPromises = files.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              file: file,
              dataUrl: event.target.result,
              name: file.name,
              type: 'local' // Mark as local until uploaded
            });
          };
          reader.readAsDataURL(file);
        });
      });

      const photoObjects = await Promise.all(photoPromises);

      // Update local state with local photos
      setWorkCompleteData(prev => ({
        ...prev,
        after_photos: [...prev.after_photos, ...photoObjects]
      }));

      showAlert('success', `${files.length} photo(s) added locally. Will be uploaded when work is completed.`);
    } catch (error) {
      console.error('Error processing photos:', error);
      showAlert('error', 'Failed to process photos');
    } finally {
      setUploadingPhotos(false);
    }
  };

  // Cleanup effect for camera




  // Remove after photo
  const removeAfterPhoto = (index) => {
    setWorkCompleteData(prev => ({
      ...prev,
      after_photos: prev.after_photos.filter((_, i) => i !== index)
    }));
  };

  const handleCompleteWork = async () => {
    try {
      setLoading(true);

      // Prepare the data to send
      let finalWorkData = { ...workCompleteData };

      // Separate local photos from already-uploaded photos
      const localPhotos = workCompleteData.after_photos.filter(photo => photo.type === 'local');
      const uploadedPhotos = workCompleteData.after_photos.filter(photo => photo.type !== 'local');

      // Upload local photos first if any
      if (localPhotos.length > 0) {
        const uploadedPhotoUrls = [];

        for (const localPhoto of localPhotos) {
          const formData = new FormData();
          formData.append('image', localPhoto.file, localPhoto.name);
          formData.append('photo_type', 'after');

          try {
            const response = await api.post(`/jobcards/${jobCard.id}/add_photo/`, formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });
            uploadedPhotoUrls.push(response.data.image);
          } catch (error) {
            console.error('Error uploading local photo:', error);
            console.error('Error response:', error.response?.data);

            // Extract specific error message from response
            let errorMessage = 'Failed to upload photo';
            if (error.response?.data) {
              const errorData = error.response.data;

              // Check for field-specific errors (e.g., {"image": ["error message"]})
              if (errorData.image && Array.isArray(errorData.image)) {
                errorMessage = errorData.image[0];
              } else if (errorData.error) {
                errorMessage = errorData.error;
              } else if (typeof errorData === 'string') {
                errorMessage = errorData;
              } else {
                // Try to extract first error from any field
                const firstError = Object.values(errorData).find(val => Array.isArray(val) && val.length > 0);
                if (firstError) {
                  errorMessage = firstError[0];
                }
              }
            }

            throw new Error(errorMessage);
          }
        }

        // Combine uploaded photo URLs with existing ones
        finalWorkData.after_photos = [...uploadedPhotos, ...uploadedPhotoUrls];
      } else {
        // If no local photos, just use the existing photo URLs
        finalWorkData.after_photos = workCompleteData.after_photos;
      }

      // Check if at least one after photo is available (either local or already uploaded)
      if (finalWorkData.after_photos.length === 0) {
        // Check if job card already has after photos
        const existingAfterPhotos = jobCard.photos?.filter(photo => photo.photo_type === 'after') || [];
        if (existingAfterPhotos.length === 0) {
          showAlert('error', 'Please upload at least one after photo before completing work');
          return;
        }
      }

      await api.post(`/jobcards/${jobCard.id}/complete_work/`, finalWorkData);
      showAlert('success', 'Work completed successfully!');
      setActiveModal(null);
      onUpdate();
    } catch (error) {
      // Improved error message extraction
      let errorMessage = 'Failed to complete work';

      if (error.message && error.message !== 'Failed to complete work') {
        // Use the error message from the photo upload catch block
        errorMessage = error.message;
      } else if (error.response?.data) {
        const errorData = error.response.data;

        // Check for various error formats
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else {
          // Try to extract first error from any field
          const firstError = Object.values(errorData).find(val =>
            (Array.isArray(val) && val.length > 0) || typeof val === 'string'
          );
          if (firstError) {
            errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
          }
        }
      }

      showAlert('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Phase 7: Final QC
  const [finalQcData, setFinalQcData] = useState({
    action: 'pass',
    after_photos: [],
    checklist_verified: false,
    parts_verified: false,
    quality_notes: '',
    failure_reason: '',
    issues_found: '',
  });

  const handleFinalQC = async () => {
    try {
      setLoading(true);
      if (finalQcData.action === 'fail' && !finalQcData.failure_reason) {
        showAlert('error', 'Failure reason is required');
        return;
      }
      await api.post(`/jobcards/${jobCard.id}/final_qc/`, finalQcData);
      showAlert('success', `Final QC ${finalQcData.action === 'pass' ? 'passed' : 'failed'}!`);
      setActiveModal(null);
      onUpdate();
    } catch (error) {
      showAlert('error', error.response?.data?.error || 'Failed to perform final QC');
    } finally {
      setLoading(false);
    }
  };

  // Phase 8: Customer Approval
  const [approvalData, setApprovalData] = useState({
    action: 'approve',
    approval_notes: '',
    photos_viewed: false,
    tasks_reviewed: false,
    qc_report_viewed: false,
    revision_notes: '',
  });

  const handleCustomerApproval = async () => {
    try {
      setLoading(true);
      if (approvalData.action === 'request_revision' && !approvalData.revision_notes) {
        showAlert('error', 'Revision notes are required');
        return;
      }
      await api.post(`/jobcards/${jobCard.id}/customer_approval/`, approvalData);
      showAlert('success', approvalData.action === 'approve' ? 'Approved successfully!' : 'Revision requested');
      setActiveModal(null);
      onUpdate();
    } catch (error) {
      showAlert('error', error.response?.data?.error || 'Failed to process approval');
    } finally {
      setLoading(false);
    }
  };

  // Phase 9: Mark Ready for Billing
  const handleMarkReadyForBilling = async () => {
    try {
      setLoading(true);
      await api.post(`/jobcards/${jobCard.id}/mark_ready_for_billing/`);
      showAlert('success', 'Job card marked as ready for billing!');
      onUpdate();
    } catch (error) {
      showAlert('error', error.response?.data?.error || 'Failed to mark ready for billing');
    } finally {
      setLoading(false);
    }
  };

  // Phase 11: Deliver Vehicle
  const [deliveryData, setDeliveryData] = useState({
    delivery_notes: '',
    customer_satisfaction_confirmed: false,
    keys_delivered: false,
    final_walkthrough_completed: false,
  });

  const handleDeliverVehicle = async () => {
    try {
      setLoading(true);
      await api.post(`/jobcards/${jobCard.id}/deliver_vehicle/`, deliveryData);
      showAlert('success', 'Vehicle delivered successfully!');
      setActiveModal(null);
      onUpdate();
    } catch (error) {
      showAlert('error', error.response?.data?.error || 'Failed to deliver vehicle');
    } finally {
      setLoading(false);
    }
  };

  // Phase 12: Close Job
  const handleCloseJob = async () => {
    try {
      setLoading(true);
      await api.post(`/jobcards/${jobCard.id}/close_job/`);
      showAlert('success', 'Job closed successfully!');
      onUpdate();
    } catch (error) {
      showAlert('error', error.response?.data?.error || 'Failed to close job');
    } finally {
      setLoading(false);
    }
  };

  // Generic Workflow Transition Handler
  const handleWorkflowTransition = async (targetStatus, actionName, data = {}) => {
    try {
      setLoading(true);
      await api.post(`/jobcards/${jobCard.id}/workflow/transition/`, {
        target_status: targetStatus,
        ...data
      });
      showAlert('success', `${actionName || 'Action'} successful!`);
      setActiveModal(null);
      onUpdate();
    } catch (error) {
      showAlert('error', error.response?.data?.error || `Failed to perform ${actionName || 'action'}`);
    } finally {
      setLoading(false);
    }
  };

  // Record Payment (Manual/Cash) with discount support
  const [paymentData, setPaymentData] = useState({
    payment_method: 'upi',
    amount: '',
    reference_number: '',
    notes: '',
    use_wallet_balance: false
  });

  // Discount state for payment modal
  const [showDiscountSection, setShowDiscountSection] = useState(false);
  const [discountData, setDiscountData] = useState({
    discount_type: 'none',
    discount_percentage: 0,
    discount_amount: 0,
    discount_reason: ''
  });

  // Local invoice state to prevent modal reload on discount apply
  const [localInvoice, setLocalInvoice] = useState(null);

  // Invoice items editor state (for Record Payment modal)
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [showEditItemsSection, setShowEditItemsSection] = useState(false);
  const [invoiceEditLoading, setInvoiceEditLoading] = useState(false);

  // Pre-fill payment amount when modal opens
  useEffect(() => {
    const fetchLatestInvoice = async () => {
      if (activeModal === 'record_payment' && jobCard?.invoice?.id) {
        try {
          const response = await api.get(`/billing/${jobCard.invoice.id}/`);
          const latestInvoice = response.data;

          setLocalInvoice(latestInvoice);
          setInvoiceItems(latestInvoice.items || []);
          setShowEditItemsSection(false);

          const amountToPay = latestInvoice.amount_remaining !== undefined
            ? latestInvoice.amount_remaining
            : latestInvoice.total_amount;

          setPaymentData(prev => ({
            ...prev,
            payment_method: 'upi',
            amount: amountToPay
          }));

          setDiscountData({
            discount_type: latestInvoice.additional_discount_type || 'none',
            discount_percentage: latestInvoice.additional_discount_percentage || 0,
            discount_amount: latestInvoice.additional_discount_amount || 0,
            discount_reason: latestInvoice.discount_reason || ''
          });
          setShowDiscountSection(false);
        } catch (error) {
          console.error('Error fetching latest invoice:', error);
          console.error('Job Card Data:', jobCard);
          showAlert('error', 'Failed to load invoice data');
          setActiveModal(null);
        }
      }
    };

    fetchLatestInvoice();
  }, [activeModal, jobCard?.id]);

  const handleApplyDiscount = async () => {
    try {
      setLoading(true);

      if (!localInvoice) {
        showAlert('error', 'No invoice found');
        return;
      }

      const response = await api.post(`/billing/${localInvoice.id}/apply_discount/`, {
        discount_type: discountData.discount_type,
        discount_percentage: discountData.discount_percentage,
        discount_amount: discountData.discount_amount,
        discount_reason: discountData.discount_reason
      });

      // Update local invoice state with new data from response
      const updatedInvoice = response.data.invoice;
      setLocalInvoice(updatedInvoice);

      // Update payment amount to reflect new remaining balance
      const newAmountToPay = updatedInvoice.amount_remaining !== undefined
        ? updatedInvoice.amount_remaining
        : updatedInvoice.total_amount;

      setPaymentData(prev => ({
        ...prev,
        amount: newAmountToPay
      }));

      showAlert('success', 'Discount applied successfully!');
      setShowDiscountSection(false);
    } catch (error) {
      showAlert('error', error.response?.data?.error || 'Failed to apply discount');
    } finally {
      setLoading(false);
    }
  };


  const extractApiError = (error) => {
    const data = error.response?.data;
    if (!data) return 'Something went wrong. Please try again.';
    if (typeof data === 'string') return data;
    if (data.error) return data.error;
    if (data.detail) return data.detail;
    // Field-level errors like { description: ["This field may not be blank."] }
    const fieldMessages = Object.entries(data)
      .filter(([, v]) => Array.isArray(v) || typeof v === 'string')
      .map(([k, v]) => {
        const label = k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ');
        const msg = Array.isArray(v) ? v[0] : v;
        return `${label}: ${msg}`;
      });
    return fieldMessages.length ? fieldMessages.join('. ') : 'Failed to save. Please check all fields and try again.';
  };

  const handleSaveInvoiceItems = async () => {
    if (!localInvoice) return;
    // Client-side validation: all items must have a description
    const emptyDesc = invoiceItems.findIndex(item => !String(item.description).trim());
    if (emptyDesc !== -1) {
      showAlert('error', `Item ${emptyDesc + 1} is missing a description. Please fill it in before saving.`);
      return;
    }
    setInvoiceEditLoading(true);
    try {
      await api.put(`/billing/${localInvoice.id}/update_bill_items/`, {
        tax_rate: localInvoice.tax_rate,
        discount_type: localInvoice.additional_discount_type || 'none',
        discount_percentage: localInvoice.additional_discount_percentage || 0,
        discount_amount: localInvoice.additional_discount_amount || 0,
        discount_reason: localInvoice.discount_reason || '',
        notes: localInvoice.notes || '',
        items: invoiceItems.map(item => ({
          item_type: item.item_type,
          description: item.description,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price)
        }))
      });
      // Re-fetch to refresh breakdown
      const response = await api.get(`/billing/${localInvoice.id}/`);
      const refreshed = response.data;
      setLocalInvoice(refreshed);
      setInvoiceItems(refreshed.items || []);
      const newAmount = refreshed.amount_remaining !== undefined
        ? refreshed.amount_remaining
        : refreshed.total_amount;
      setPaymentData(prev => ({ ...prev, amount: newAmount }));
      showAlert('success', 'Invoice items saved successfully!');
    } catch (error) {
      showAlert('error', extractApiError(error));
    } finally {
      setInvoiceEditLoading(false);
    }
  };

  const handleDownloadInvoiceFromPayment = async () => {
    if (!localInvoice) return;
    setInvoiceEditLoading(true);
    try {
      // Only save items if the invoice is still editable (not yet paid)
      if (localInvoice.status !== 'paid') {
        await api.put(`/billing/${localInvoice.id}/update_bill_items/`, {
          tax_rate: localInvoice.tax_rate,
          discount_type: localInvoice.additional_discount_type || 'none',
          discount_percentage: localInvoice.additional_discount_percentage || 0,
          discount_amount: localInvoice.additional_discount_amount || 0,
          discount_reason: localInvoice.discount_reason || '',
          notes: localInvoice.notes || '',
          items: invoiceItems.map(item => ({
            item_type: item.item_type,
            description: item.description,
            quantity: parseFloat(item.quantity),
            unit_price: parseFloat(item.unit_price)
          }))
        });
      }
      const pdfResponse = await api.get(`/billing/${localInvoice.id}/download/`, { responseType: 'blob' });
      const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const customerName = (localInvoice.customer_details?.user?.name || '').toLowerCase().replace(/\s+/g, '_');
      link.download = customerName
        ? `${localInvoice.invoice_number}-sales_invoice-${customerName}.pdf`
        : `${localInvoice.invoice_number}-sales_invoice.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showAlert('success', 'Invoice downloaded!');
    } catch (error) {
      showAlert('error', extractApiError(error));
    } finally {
      setInvoiceEditLoading(false);
    }
  };
  // --- End invoice items editor helpers ---

  const handleRecordPayment = async () => {
    try {
      setLoading(true);

      if (!localInvoice) {
        showAlert('error', 'No invoice found for this job card');
        return;
      }

      const invoiceId = localInvoice.id;
      if (!invoiceId) {
        showAlert('error', 'Invoice ID not found');
        return;
      }

      const cashAmount = parseFloat(paymentData.amount || 0);
      const walletAmountAvailable = localInvoice.wallet_balance || 0;
      const walletAmountToUse = paymentData.use_wallet_balance ? Math.min(walletAmountAvailable, localInvoice.amount_remaining || localInvoice.total_amount) : 0;

      // The total amount being settled in this transaction
      const totalAmountToSettle = cashAmount + walletAmountToUse;
      const remainingOnInvoice = localInvoice.amount_remaining !== undefined ? localInvoice.amount_remaining : localInvoice.total_amount;

      if (totalAmountToSettle <= 0) {
        showAlert('error', 'Please enter a valid payment amount.');
        setLoading(false);
        return;
      }

      if (totalAmountToSettle > remainingOnInvoice + 0.01) { // 0.01 buffer for float precision
        showAlert('error', `Total payment (₹${Math.round(totalAmountToSettle)}) exceeds remaining balance (₹${Math.round(remainingOnInvoice)})`);
        setLoading(false);
        return;
      }

      await api.post(`/billing/${invoiceId}/record_payment/`, {
        payment_method: paymentData.payment_method,
        amount: totalAmountToSettle,
        reference_number: paymentData.reference_number,
        notes: paymentData.notes,
        use_wallet_balance: paymentData.use_wallet_balance
      });

      showAlert('success', 'Payment recorded successfully!');

      // Re-fetch the invoice to update the Breakdown and Remaining Amount in UI
      const invoiceResponse = await api.get(`/billing/${invoiceId}/`);
      const updatedInvoice = invoiceResponse.data;
      setLocalInvoice(updatedInvoice);

      // Reset payment form for potentially more payments (if balance remains)
      setPaymentData({
        payment_method: paymentData.payment_method, // maintain choice
        amount: updatedInvoice.amount_remaining !== undefined ? updatedInvoice.amount_remaining : 0,
        reference_number: '',
        notes: '',
        use_wallet_balance: false
      });

      // If now fully paid, we can let user see the final state before they manually close
      // or we can auto-close if you prefer. User said "we have option to do more pay", 
      // which implies they want to stay here if balance is > 0.
      if (updatedInvoice.amount_remaining <= 0) {
        // Option to auto-close after a small delay, OR just let them see "Paid" status.
        // For now, let's keep it open so they see the breakdown showing ₹0.00 remaining.
      }

      onUpdate(); // Refresh parent job card data (status etc)
    } catch (error) {
      showAlert('error', error.response?.data?.error || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  // Map transition target status to modal/action handlers
  const getActionForTransition = (transition) => {
    const targetStatus = transition.to_status;
    const actionName = transition.action_name;

    // Map target statuses to existing modal handlers
    const transitionMappings = {
      'qc_pending': {
        label: actionName || 'Assign Floor Manager',
        icon: Users,
        onClick: () => {
          fetchFloorManagers();
          setActiveModal('assign_floor_manager');
        },
        variant: 'primary',
        description: transition.action_description || 'Assign a floor manager to perform QC',
      },
      'qc_completed': {
        label: actionName || 'Complete QC',
        icon: ClipboardCheck,
        onClick: () => {
          fetchSupervisors();
          fetchApplicators();
          setActiveModal('complete_qc');
        },
        variant: 'primary',
        description: transition.action_description || 'Perform QC inspection and document findings',
      },
      // 'qc_rejected': {
      //   label: actionName || 'Reject QC',
      //   icon: XCircle,
      //   onClick: () => setActiveModal('complete_qc'),
      //   variant: 'warning',
      //   description: transition.action_description || 'Reject due to issues',
      // },
      'supervisor_approved': {
        label: actionName || 'Approve QC',
        icon: CheckCircle,
        onClick: () => setActiveModal('supervisor_review'),
        variant: 'primary',
        description: transition.action_description || 'Approve the QC report',
      },
      'supervisor_rejected': {
        label: actionName || 'Reject QC',
        icon: XCircle,
        onClick: () => setActiveModal('supervisor_review'),
        variant: 'warning',
        description: transition.action_description || 'Reject the QC report',
      },
      'floor_manager_confirmed': {
        label: actionName || 'Confirm Approval',
        icon: CheckCircle,
        onClick: () => setActiveModal('floor_manager_approval'),
        variant: 'primary',
        description: transition.action_description || 'Confirm after supervisor approval',
      },
      'assigned_to_applicator': {
        label: actionName || 'Assign Team',
        icon: Users,
        onClick: handleOpenAssignApplicatorModal,
        variant: 'primary',
        description: transition.action_description || 'Assign supervisor and applicator team',
      },
      'work_in_progress': {
        label: actionName || 'Start Work',
        icon: Play,
        onClick: handleStartWork,
        variant: 'primary',
        description: transition.action_description || 'Start work and begin timer',
      },
      'work_completed': {
        label: actionName || 'Complete Work',
        icon: CheckCircle,
        onClick: () => setActiveModal('complete_work'),
        variant: 'primary',
        description: transition.action_description || 'Mark work as completed',
      },
      'final_qc_pending': {
        label: actionName || 'Submit for Final QC',
        icon: ClipboardCheck,
        onClick: () => setActiveModal('final_qc'),
        variant: 'primary',
        description: transition.action_description || 'Submit for final quality check',
      },
      'final_qc_passed': {
        label: actionName || 'Pass Final QC',
        icon: CheckCircle,
        onClick: () => setActiveModal('final_qc'),
        variant: 'success',
        description: transition.action_description || 'Mark final QC as passed',
      },
      // 'final_qc_failed': {
      //   label: actionName || 'Fail Final QC',
      //   icon: XCircle,
      //   onClick: () => setActiveModal('final_qc'),
      //   variant: 'destructive',
      //   description: transition.action_description || 'Mark final QC as failed',
      // },
      'floor_manager_final_qc_confirmed': {
        label: actionName || 'Confirm Final QC',
        icon: CheckCircle,
        onClick: () => setActiveModal('floor_manager_final_qc_approval'),
        variant: 'primary',
        description: transition.action_description || 'Confirm final QC',
      },
      'customer_approval_pending': {
        label: actionName || 'Send for Customer Approval',
        icon: UserCheck,
        onClick: async () => {
          try {
            setLoading(true);
            await handleWorkflowTransition('customer_approval_pending', actionName || 'Send for Customer Approval');
          } finally {
            setLoading(false);
          }
        },
        variant: 'primary',
        description: transition.action_description || 'Send job card for customer approval',
      },
      'customer_approved': {
        label: actionName || 'Customer Approve',
        icon: UserCheck,
        onClick: () => setActiveModal('customer_approval'),
        variant: 'success',
        description: transition.action_description || 'Customer approves the work',
      },
      'ready_for_billing': {
        label: actionName || 'Ready for Billing',
        icon: FileText,
        onClick: handleMarkReadyForBilling,
        variant: 'primary',
        description: transition.action_description || 'Mark ready for billing',
      },
      // 'billed': {
      //   label: actionName || 'Generate Invoice',
      //   icon: DollarSign,
      //   onClick: async () => {
      //     try {
      //       setLoading(true);
      //       await api.post('/billing/from_jobcard/', { jobcard_id: jobCard.id });
      //       showAlert('success', 'Invoice generated successfully!');
      //       onUpdate();
      //     } catch (error) {
      //       showAlert('error', error.response?.data?.error || 'Failed to generate invoice');
      //     } finally {
      //       setLoading(false);
      //     }
      //   },
      //   variant: 'primary',
      //   description: transition.action_description || 'Generate invoice for billing',
      // },
      'ready_for_delivery': {
        label: actionName || 'Payment Received',
        icon: CheckCircle,
        onClick: () => {
          // If invoice is already paid, just perform the workflow transition
          if (jobCard.invoice?.status === 'paid') {
            handleWorkflowTransition('ready_for_delivery', actionName || 'Payment Received');
          } else {
            // Otherwise, open the payment modal
            setActiveModal('record_payment');
          }
        },
        variant: 'success',
        description: transition.action_description || 'Confirm payment received and mark ready for delivery',
      },
      'delivered': {
        label: actionName || 'Deliver Vehicle',
        icon: Truck,
        onClick: () => setActiveModal('deliver_vehicle'),
        variant: 'primary',
        description: transition.action_description || 'Complete vehicle delivery',
      },
      'closed': {
        label: actionName || 'Close Job',
        icon: XCircle,
        onClick: handleCloseJob,
        variant: 'secondary',
        description: transition.action_description || 'Close the job',
      },
    };

    return transitionMappings[targetStatus] || null;
  };

  // Determine available actions based on workflow configuration ONLY
  // No hardcoded fallbacks - everything is driven by the workflow engine
  const getAvailableActions = () => {
    const actions = [];
    const role = userRole;

    console.log("workflowInfo", workflowInfo);
    console.log("userRole", userRole);


    // Only use dynamic transitions from workflow engine
    if (workflowInfo && workflowInfo.allowed_transitions) {
      workflowInfo.allowed_transitions.forEach(transition => {
        const action = getActionForTransition(transition);
        if (action) {
          actions.push(action);
        }
      });
    }

    // Payment action - special case, always available for admins with unpaid invoices
    // This is outside the workflow as it's handled by billing system
    if (['branch_admin', 'company_admin', 'super_admin'].includes(role) &&
      jobCard.invoice &&
      jobCard.invoice.status !== 'paid') {
      actions.push({
        label: 'Record Payment',
        icon: DollarSign,
        onClick: () => setActiveModal('record_payment'),
        variant: 'success',
        description: 'Record cash or manual payment for this invoice'
      });
    }

    return actions;
  };

  const availableActions = getAvailableActions();

  // Show loading state while fetching workflow info
  if (workflowLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-pulse flex items-center justify-center gap-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading workflow actions...</span>
        </div>
      </div>
    );
  }

  console.log("availableActions", availableActions);
  // Show message when no actions available
  if (availableActions.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">
          {workflowInfo?.current_status_display
            ? `Current status: ${workflowInfo.current_status_display}`
            : 'No actions available at this stage.'}
        </p>
        {workflowInfo?.template_name && (
          <p className="text-sm text-gray-400 mt-1">
            Workflow: {workflowInfo.template_name}
          </p>
        )}
        {!workflowInfo && (
          <p className="text-sm text-gray-400 mt-1">
            No workflow configuration found. Contact administrator.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: '', message: '' })}
        />
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {availableActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant={action.variant || 'primary'}
                size="sm"
                onClick={action.onClick}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Icon size={16} />
                {action.label}
              </Button>
            );
          })}
        </div>

        {/* Action Guidance for Floor Managers */}
        {userRole === 'floor_manager' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start">
              <AlertCircle size={16} className="text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">QC Process Guidance</p>
                <p className="text-xs text-blue-700 mt-1">
                  {jobCard.status === 'qc_pending'
                    ? "Click 'Complete QC' to start the inspection process. Make sure to document all findings thoroughly."
                    : jobCard.status === 'qc_rejected'
                      ? "Address the supervisor's feedback and re-submit your QC report using the 'Correct QC Issues' button."
                      : jobCard.status === 'qc_completed'
                        ? "Your QC report has been submitted. Please wait for supervisor review."
                        : "No QC actions available at this time."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals for each action */}
      {/* Assign Floor Manager Modal */}
      {activeModal === 'assign_floor_manager' && (
        <Modal
          isOpen={true}
          onClose={closeModal}
          title="Assign Floor Manager"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button onClick={handleAssignFloorManager} disabled={loading}>
                {loading ? 'Assigning...' : 'Assign'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {modalError}
              </div>
            )}
            <Select
              label="Select Floor Manager"
              value={floorManagerData.floor_manager_id}
              onChange={(e) => setFloorManagerData({ floor_manager_id: e.target.value })}
              options={[
                { value: '', label: 'Select Floor Manager' },
                ...floorManagers.map(fm => ({ value: fm.id, label: fm.name }))
              ]}
              required
            />
            <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
              <p>Assigning a floor manager will notify them to perform QC on this job card.</p>
            </div>
          </div>
        </Modal>
      )}

      {/* Complete QC Modal */}
      {activeModal === 'complete_qc' && (
        <Modal
          isOpen={true}
          onClose={closeModal}
          title={jobCard.status === 'qc_rejected' ? "Correct QC Issues" : "Complete QC Check"}
          size="lg"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button onClick={handleCompleteQC} disabled={loading}>
                {loading ? 'Saving...' : jobCard.status === 'qc_rejected' ? 'Resubmit QC' : 'Complete QC'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Textarea
                label="Scratches"
                placeholder="Note any scratches observed..."
                value={qcData.scratches}
                onChange={(e) => setQcData({ ...qcData, scratches: e.target.value })}
                rows="3"
              />
              <Textarea
                label="Dents"
                placeholder="Note any dents observed..."
                value={qcData.dents}
                onChange={(e) => setQcData({ ...qcData, dents: e.target.value })}
                rows="3"
              />
            </div>

            {/* <Input
              label="Additional Tasks (Optional)"
              placeholder="Additional tasks identified..."
              value={qcData.additional_tasks}
              onChange={(e) => setQcData({ ...qcData, additional_tasks: e.target.value })}
            /> */}

            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Additional Tasks Price"
                type="number"
                value={qcData.additional_tasks_price}
                onChange={(e) => setQcData({ ...qcData, additional_tasks_price: parseFloat(e.target.value) || 0 })}
              />
            </div> */}

            <Textarea
              label="Notes"
              placeholder="Additional notes about the vehicle condition..."
              value={qcData.notes}
              onChange={(e) => setQcData({ ...qcData, notes: e.target.value })}
              rows="3"
            />

            {/* Supervisor Assignment */}
            <div className="border border-gray-200 rounded-lg p-3">
              <h3 className="font-medium text-gray-900 mb-2">Assign Supervisor (Optional)</h3>
              <p className="text-sm text-gray-600 mb-3">Select a supervisor to handle this job card after QC completion. If not selected, any supervisor can claim this job.</p>
              <Select
                label="Select Supervisor"
                value={qcData.supervisor_id}
                onChange={(e) => setQcData({ ...qcData, supervisor_id: e.target.value })}
                options={[{ value: '', label: 'Select a Supervisor (Optional)' }, ...supervisors.map(sup => ({ value: sup.id, label: sup.name }))]}
                onFocus={fetchSupervisors}
              />
            </div>

            {/* Applicator Team Assignment */}
            <div className="border border-gray-200 rounded-lg p-3">
              <h3 className="font-medium text-gray-900 mb-2">Assign Applicator Team (Optional)</h3>
              <p className="text-sm text-gray-600 mb-3">Pre-assign applicators now so the supervisor can start work directly. If not selected, applicators can be assigned later.</p>
              {applicators.length > 0 ? (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {applicators.map(applicator => (
                    <div key={applicator.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={applicatorIds.includes(applicator.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setApplicatorIds([...applicatorIds, applicator.id]);
                          } else {
                            setApplicatorIds(applicatorIds.filter(id => id !== applicator.id));
                          }
                        }}
                        id={`qc-applicator-${applicator.id}`}
                      />
                      <label htmlFor={`qc-applicator-${applicator.id}`} className="flex items-center gap-2 cursor-pointer flex-1">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserCheck size={12} className="text-blue-600" />
                        </div>
                        {applicator.name}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No applicators available in this branch.</p>
              )}
              {applicatorIds.length > 0 && (
                <p className="text-xs text-blue-600 mt-2 font-medium">
                  {applicatorIds.length} applicator{applicatorIds.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start">
                <AlertCircle size={16} className="text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">QC Checklist Reminder</p>
                  <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                    <li className="flex items-start">
                      <List size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                      <span>Take clear before photos from multiple angles</span>
                    </li>
                    <li className="flex items-start">
                      <List size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                      <span>Document all damages thoroughly</span>
                    </li>
                    <li className="flex items-start">
                      <List size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                      <span>List all required parts accurately</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div> */}
          </div>
        </Modal>
      )}

      {/* Supervisor Review Modal */}
      {activeModal === 'supervisor_review' && (
        <Modal
          isOpen={true}
          onClose={closeModal}
          title="Supervisor Review"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                onClick={handleSupervisorReview}
                disabled={loading || (reviewData.action === 'reject' && !reviewData.rejection_reason)}
                variant={reviewData.action === 'approve' ? 'primary' : 'destructive'}
              >
                {loading ? 'Processing...' : reviewData.action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* <Select
              label="Action"
              value={reviewData.action}
              onChange={(e) => setReviewData({ ...reviewData, action: e.target.value, rejection_reason: '' })}
              options={[
                { value: 'approve', label: 'Approve' },
                // { value: 'reject', label: 'Reject' }
              ]} */}
            {/* /> */}
            {reviewData.action === 'approve' && (
              <>
                <div className="bg-green-50 p-3 rounded-lg">
                  <h3 className="font-medium text-green-800 mb-2">Approval Checklist</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={reviewData.stock_availability_checked}
                        onChange={(e) => setReviewData({ ...reviewData, stock_availability_checked: e.target.checked })}
                        id="stock-check"
                      />
                      <label htmlFor="stock-check">Stock Availability Checked</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={reviewData.pricing_confirmed}
                        onChange={(e) => setReviewData({ ...reviewData, pricing_confirmed: e.target.checked })}
                        id="pricing-check"
                      />
                      <label htmlFor="pricing-check">Pricing Confirmed</label>
                    </div>
                  </div>
                </div>
                <Textarea
                  label="Review Notes"
                  value={reviewData.review_notes}
                  onChange={(e) => setReviewData({ ...reviewData, review_notes: e.target.value })}
                  rows="3"
                  placeholder="Any additional notes about the review..."
                />
              </>
            )}
            {reviewData.action === 'reject' && (
              <div className="space-y-3">
                <Textarea
                  label="Rejection Reason *"
                  placeholder="Please provide detailed reason for rejection..."
                  value={reviewData.rejection_reason}
                  onChange={(e) => setReviewData({ ...reviewData, rejection_reason: e.target.value })}
                  rows="3"
                  required
                />
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle size={16} className="text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-sm text-red-700">
                      Be specific when rejecting a QC. Include actionable feedback for the floor manager to correct issues.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Assign Applicator Team Modal */}
      {activeModal === 'assign_applicator' && (
        <Modal
          isOpen={true}
          onClose={closeModal}
          title="Assign Applicator Team"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                onClick={handleAssignApplicatorTeam}
                disabled={loading || loadingApplicators || applicators.length === 0}
              >
                {loading ? 'Assigning...' : loadingApplicators ? 'Loading...' : 'Assign Team'}
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            {/* Instruction Header */}
            {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start">
                <AlertCircle size={16} className="text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">Select Applicator Team</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Please select at least one applicator to assign to this job. You can select multiple team members.
                  </p>
                </div>
              </div>
              {applicatorIds.length > 0 && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <p className="text-xs font-medium text-blue-800">
                    Selected: {applicatorIds.length} applicator{applicatorIds.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div> */}

            {/* Error Message */}
            {applicatorModalError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start">
                  <AlertCircle size={16} className="text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-xs text-red-700 mt-1">
                      {applicatorModalError}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Applicator List */}
            {loadingApplicators ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">Loading applicators...</span>
              </div>
            ) : applicators.length > 0 ? (
              <div className="space-y-1">
                {applicators.map(applicator => (
                  <div key={applicator.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={applicatorIds.includes(applicator.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setApplicatorIds([...applicatorIds, applicator.id]);
                        } else {
                          setApplicatorIds(applicatorIds.filter(id => id !== applicator.id));
                        }
                      }}
                      id={`applicator-${applicator.id}`}
                      disabled={loadingApplicators}
                    />
                    <label htmlFor={`applicator-${applicator.id}`} className="flex items-center gap-2 cursor-pointer flex-1">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserCheck size={12} className="text-blue-600" />
                      </div>
                      {applicator.name}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle size={16} className="text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-yellow-800">No Applicators Available</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      There are no applicators available in your branch. Please contact an administrator to create applicator accounts for this branch.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>        </Modal>
      )}


      {/* Complete Work Modal */}
      {activeModal === 'complete_work' && (
        <Modal
          isOpen={true}
          onClose={closeModal}
          title="Complete Work"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button onClick={handleCompleteWork} disabled={loading}>
                {loading ? 'Completing...' : 'Complete Work'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Textarea
              label="Notes"
              placeholder="Add any notes about the work completed..."
              value={workCompleteData.notes}
              onChange={(e) => setWorkCompleteData({ ...workCompleteData, notes: e.target.value })}
              rows="3"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">After Photos *</label>

              {/* Camera and Upload Options */}
              <div className="flex flex-wrap gap-2 mb-3">
                <label className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors cursor-pointer">
                  <Camera size={16} />
                  Take Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleAfterPhotoUpload}
                    className="hidden"
                    disabled={uploadingPhotos}
                  />
                </label>
                <label className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors cursor-pointer">
                  <Upload size={16} />
                  Upload Photos
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleAfterPhotoUpload}
                    className="hidden"
                    disabled={uploadingPhotos}
                  />
                </label>
              </div>



              {uploadingPhotos && (
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                  Uploading photos...
                </div>
              )}

              {workCompleteData.after_photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {workCompleteData.after_photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo.type === 'local' ? photo.dataUrl : photo}
                        alt={`After ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <button
                        onClick={() => removeAfterPhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                        title="Remove photo"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Show existing after photos from job card */}
              {jobCard.photos && jobCard.photos.filter(p => p.photo_type === 'after').length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">Existing After Photos:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {jobCard.photos.filter(p => p.photo_type === 'after').map((photo, index) => (
                      <div key={`existing-${index}`} className="relative">
                        <img
                          src={photo.image}
                          alt={`Existing After ${index + 1}`}
                          className="w-full h-24 object-cover rounded border"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show error message if no after photos are uploaded and none exist */}
              {workCompleteData.after_photos.length === 0 &&
                (!jobCard.photos || jobCard.photos.filter(p => p.photo_type === 'after').length === 0) && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">
                      <span className="font-medium">Required:</span> Please upload at least one after photo of the completed work
                    </p>
                  </div>
                )}
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-700">
                Make sure you've completed all checklist items, added all parts used, and uploaded after photos before completing the work.
              </p>
            </div>
          </div>
        </Modal>
      )}
      {/* Final QC Modal */}
      {activeModal === 'final_qc' && (
        <Modal
          isOpen={true}
          onClose={closeModal}
          title="Final QC"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                onClick={handleFinalQC}
                disabled={loading || (finalQcData.action === 'fail' && !finalQcData.failure_reason)}
                variant={finalQcData.action === 'pass' ? 'primary' : 'destructive'}
              >
                {loading ? 'Processing...' : finalQcData.action === 'pass' ? 'Pass' : 'Fail'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* <Select
              label="Action"
              value={finalQcData.action}
              onChange={(e) => setFinalQcData({ ...finalQcData, action: e.target.value, failure_reason: '' })}
              options={[
                { value: 'pass', label: 'Pass' },
                { value: 'fail', label: 'Fail' }
              ]}
            /> */}
            {finalQcData.action === 'pass' && (
              <>
                <div className="bg-green-50 p-3 rounded-lg">
                  <h3 className="font-medium text-green-800 mb-2">Final QC Checklist</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={finalQcData.checklist_verified}
                        onChange={(e) => setFinalQcData({ ...finalQcData, checklist_verified: e.target.checked })}
                        id="checklist-verify"
                      />
                      <label htmlFor="checklist-verify">Checklist Verified</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={finalQcData.parts_verified}
                        onChange={(e) => setFinalQcData({ ...finalQcData, parts_verified: e.target.checked })}
                        id="parts-verify"
                      />
                      <label htmlFor="parts-verify">Parts Verified</label>
                    </div>
                  </div>
                </div>
                <Textarea
                  label="Quality Notes"
                  value={finalQcData.quality_notes}
                  onChange={(e) => setFinalQcData({ ...finalQcData, quality_notes: e.target.value })}
                  rows="3"
                  placeholder="Any additional quality observations..."
                />
              </>
            )}
            {finalQcData.action === 'fail' && (
              <div className="space-y-3">
                <Textarea
                  label="Failure Reason *"
                  placeholder="Please provide detailed reason for failure..."
                  value={finalQcData.failure_reason}
                  onChange={(e) => setFinalQcData({ ...finalQcData, failure_reason: e.target.value })}
                  rows="3"
                  required
                />
                <Textarea
                  label="Issues Found"
                  value={finalQcData.issues_found}
                  onChange={(e) => setFinalQcData({ ...finalQcData, issues_found: e.target.value })}
                  rows="3"
                  placeholder="Describe specific issues that need correction..."
                />
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle size={16} className="text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-sm text-red-700">
                      When failing final QC, be specific about what needs to be corrected before re-submission.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Customer Approval Modal */}
      {activeModal === 'customer_approval' && (
        <Modal
          isOpen={true}
          onClose={closeModal}
          title="Review & Approve"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                onClick={handleCustomerApproval}
                disabled={loading || (approvalData.action === 'request_revision' && !approvalData.revision_notes)}
                variant={approvalData.action === 'approve' ? 'primary' : 'destructive'}
              >
                {loading ? 'Processing...' : approvalData.action === 'approve' ? 'Approve' : 'Request Revision'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Select
              label="Action"
              value={approvalData.action}
              onChange={(e) => setApprovalData({ ...approvalData, action: e.target.value, revision_notes: '' })}
              options={[
                { value: 'approve', label: 'Approve' },
                { value: 'request_revision', label: 'Request Revision' }
              ]}
            />
            {approvalData.action === 'approve' && (
              <>
                <div className="bg-green-50 p-3 rounded-lg">
                  <h3 className="font-medium text-green-800 mb-2">Approval Checklist</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={approvalData.photos_viewed}
                        onChange={(e) => setApprovalData({ ...approvalData, photos_viewed: e.target.checked })}
                        id="photos-viewed"
                      />
                      <label htmlFor="photos-viewed">Photos Viewed</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={approvalData.tasks_reviewed}
                        onChange={(e) => setApprovalData({ ...approvalData, tasks_reviewed: e.target.checked })}
                        id="tasks-reviewed"
                      />
                      <label htmlFor="tasks-reviewed">Tasks Reviewed</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={approvalData.qc_report_viewed}
                        onChange={(e) => setApprovalData({ ...approvalData, qc_report_viewed: e.target.checked })}
                        id="qc-report-viewed"
                      />
                      <label htmlFor="qc-report-viewed">QC Report Viewed</label>
                    </div>
                  </div>
                </div>
                <Textarea
                  label="Approval Notes"
                  value={approvalData.approval_notes}
                  onChange={(e) => setApprovalData({ ...approvalData, approval_notes: e.target.value })}
                  rows="3"
                  placeholder="Any additional notes about your approval..."
                />
              </>
            )}
            {approvalData.action === 'request_revision' && (
              <div className="space-y-3">
                <Textarea
                  label="Revision Notes *"
                  placeholder="Please specify what needs to be revised..."
                  value={approvalData.revision_notes}
                  onChange={(e) => setApprovalData({ ...approvalData, revision_notes: e.target.value })}
                  rows="3"
                  required
                />
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle size={16} className="text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-sm text-red-700">
                      Be specific when requesting revisions. Include clear instructions for what needs to be corrected.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Deliver Vehicle Modal */}
      {activeModal === 'deliver_vehicle' && (
        <Modal
          isOpen={true}
          onClose={closeModal}
          title="Deliver Vehicle"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button onClick={handleDeliverVehicle} disabled={loading}>
                {loading ? 'Delivering...' : 'Deliver Vehicle'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Textarea
              label="Delivery Notes"
              value={deliveryData.delivery_notes}
              onChange={(e) => setDeliveryData({ ...deliveryData, delivery_notes: e.target.value })}
              rows="3"
              placeholder="Any notes about the delivery process..."
            />
            <div className="bg-blue-50 p-3 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Delivery Checklist</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={deliveryData.customer_satisfaction_confirmed}
                    onChange={(e) => setDeliveryData({ ...deliveryData, customer_satisfaction_confirmed: e.target.checked })}
                    id="satisfaction-confirm"
                  />
                  <label htmlFor="satisfaction-confirm">Customer Satisfaction Confirmed</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={deliveryData.keys_delivered}
                    onChange={(e) => setDeliveryData({ ...deliveryData, keys_delivered: e.target.checked })}
                    id="keys-delivered"
                  />
                  <label htmlFor="keys-delivered">Keys Delivered</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={deliveryData.final_walkthrough_completed}
                    onChange={(e) => setDeliveryData({ ...deliveryData, final_walkthrough_completed: e.target.checked })}
                    id="walkthrough-complete"
                  />
                  <label htmlFor="walkthrough-complete">Final Walkthrough Completed</label>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Floor Manager Approval/Rejection Modal */}
      {activeModal === 'floor_manager_approval' && (
        <Modal
          isOpen={true}
          onClose={closeModal}
          title="Approve/Reject Job"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                onClick={handleFloorManagerApproval}
                disabled={loading || (floorManagerApprovalData.action === 'reject' && !floorManagerApprovalData.approval_notes)}
                variant={floorManagerApprovalData.action === 'approve' ? 'primary' : 'destructive'}
              >
                {loading ? 'Processing...' : floorManagerApprovalData.action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Select
              label="Action"
              value={floorManagerApprovalData.action}
              onChange={(e) => setFloorManagerApprovalData({ ...floorManagerApprovalData, action: e.target.value, approval_notes: '' })}
              options={[
                { value: 'approve', label: 'Approve' },
                { value: 'reject', label: 'Reject' }
              ]}
            />
            {floorManagerApprovalData.action === 'approve' && (
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle size={16} className="text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-sm text-green-700">
                    Approving this job confirms that you agree with the supervisor's approval and are ready to proceed with assigning an applicator team.
                  </p>
                </div>
              </div>
            )}
            {floorManagerApprovalData.action === 'reject' && (
              <div className="space-y-3">
                <Textarea
                  label="Rejection Reason *"
                  placeholder="Please provide detailed reason for rejection..."
                  value={floorManagerApprovalData.approval_notes}
                  onChange={(e) => setFloorManagerApprovalData({ ...floorManagerApprovalData, approval_notes: e.target.value })}
                  rows="3"
                  required
                />
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle size={16} className="text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-sm text-red-700">
                      Rejecting this job will send it back for re-review. Please provide a clear explanation for why you are rejecting it.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Floor Manager Final QC Approval/Rejection Modal */}
      {activeModal === 'floor_manager_final_qc_approval' && (
        <Modal
          isOpen={true}
          onClose={closeModal}
          title="Approve/Reject Final QC"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                onClick={handleFloorManagerFinalQcApproval}
                disabled={loading || (floorManagerFinalQcApprovalData.action === 'reject' && !floorManagerFinalQcApprovalData.rejection_reason)}
                variant={floorManagerFinalQcApprovalData.action === 'approve' ? 'primary' : 'destructive'}
              >
                {loading ? 'Processing...' : floorManagerFinalQcApprovalData.action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Select
              label="Action"
              value={floorManagerFinalQcApprovalData.action}
              onChange={(e) => setFloorManagerFinalQcApprovalData({ ...floorManagerFinalQcApprovalData, action: e.target.value, rejection_reason: '' })}
              options={[
                { value: 'approve', label: 'Approve' },
                { value: 'reject', label: 'Reject' }
              ]}
            />
            {floorManagerFinalQcApprovalData.action === 'approve' && (
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle size={16} className="text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-sm text-green-700">
                    Approving this job confirms that you agree with the final QC and are ready to proceed to customer approval.
                  </p>
                </div>
              </div>
            )}
            {floorManagerFinalQcApprovalData.action === 'reject' && (
              <div className="space-y-3">
                <Textarea
                  label="Rejection Reason *"
                  placeholder="Please provide detailed reason for rejection..."
                  value={floorManagerFinalQcApprovalData.rejection_reason}
                  onChange={(e) => setFloorManagerFinalQcApprovalData({ ...floorManagerFinalQcApprovalData, rejection_reason: e.target.value })}
                  rows="3"
                  required
                />
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle size={16} className="text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-sm text-red-700">
                      Rejecting this job will send it back for re-work. Please provide a clear explanation for why you are rejecting it.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}


      {/* Record Payment Modal */}
      {activeModal === 'record_payment' && (
        <Modal
          isOpen={true}
          onClose={closeModal}
          title="Record Payment"
          size="xl"
          footer={
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                onClick={handleDownloadInvoiceFromPayment}
                disabled={loading || invoiceEditLoading || !localInvoice}
              >
                <Download size={15} className="mr-1" />
                {invoiceEditLoading ? 'Saving...' : 'Download Invoice'}
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={closeModal}>
                  {localInvoice?.amount_remaining <= 0 ? 'Close' : 'Cancel'}
                </Button>
                {(!localInvoice || localInvoice.amount_remaining > 0) && (
                  <Button
                    onClick={handleRecordPayment}
                    disabled={loading}
                    variant="success"
                  >
                    {loading ? 'Recording...' : 'Record Payment'}
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Invoice Breakdown */}
            {localInvoice && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Invoice #{localInvoice.invoice_number}</h3>
                <InvoiceBreakdown
                  subtotal={parseFloat(localInvoice.subtotal || 0)}
                  taxRate={parseFloat(localInvoice.tax_rate || 0)}
                  taxAmount={parseFloat(localInvoice.tax_amount || 0)}
                  discountType={localInvoice.discount_type || 'none'}
                  discountPercentage={parseFloat(localInvoice.discount_percentage || 0)}
                  discountAmount={parseFloat(localInvoice.discount_amount || 0)}
                  system_discount_amount={parseFloat(localInvoice.system_discount_amount || 0)}
                  additional_discount_amount={parseFloat(localInvoice.additional_discount_amount || 0)}
                  discountReason={localInvoice.discount_reason || ''}
                  total={parseFloat(localInvoice.total_amount || 0)}
                  amountPaid={parseFloat(localInvoice.amount_paid || 0)}
                  amountRemaining={parseFloat(localInvoice.amount_remaining || 0)}
                  payments={localInvoice.payment_details || []}
                  compact={false}
                />
              </div>
            )}

            {/* Bill Items Editor (Collapsible) */}
            <div className="border-t pt-4">
              <button
                onClick={() => setShowEditItemsSection(!showEditItemsSection)}
                className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                <span>📋 Bill Items — Add / Edit</span>
                <span className="text-xs text-gray-500">
                  {showEditItemsSection ? '▼ Hide' : '▶ Show'}
                </span>
              </button>

              {showEditItemsSection && (
                <div className="mt-4">
                  <InvoiceItemEditor
                    items={invoiceItems}
                    setItems={setInvoiceItems}
                    onSave={handleSaveInvoiceItems}
                    saveLoading={invoiceEditLoading}
                  />
                </div>
              )}
            </div>

            {/* Apply Discount Section (Collapsible) */}
            <div className="border-t pt-4">
              <button
                onClick={() => setShowDiscountSection(!showDiscountSection)}
                className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                <span>💰 Apply Discount (Optional)</span>
                <span className="text-xs text-gray-500">
                  {showDiscountSection ? '▼ Hide' : '▶ Show'}
                </span>
              </button>

              {showDiscountSection && (
                <div className="mt-4 space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Discount Type
                      </label>
                      <select
                        value={discountData.discount_type}
                        onChange={(e) => setDiscountData({ ...discountData, discount_type: e.target.value })}
                        className="input w-full"
                      >
                        <option value="none">No Discount</option>
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed Amount</option>
                      </select>
                    </div>

                    {discountData.discount_type === 'percentage' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Discount Percentage (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={discountData.discount_percentage}
                          onChange={(e) => setDiscountData({ ...discountData, discount_percentage: e.target.value })}
                          className="input w-full"
                          placeholder="e.g., 10 for 10%"
                        />
                      </div>
                    )}

                    {discountData.discount_type === 'fixed' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Discount Amount (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={discountData.discount_amount}
                          onChange={(e) => setDiscountData({ ...discountData, discount_amount: e.target.value })}
                          className="input w-full"
                          placeholder="e.g., 500"
                        />
                      </div>
                    )}
                  </div>

                  {discountData.discount_type !== 'none' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Discount Reason (Required)
                      </label>
                      <input
                        type="text"
                        value={discountData.discount_reason}
                        onChange={(e) => setDiscountData({ ...discountData, discount_reason: e.target.value })}
                        className="input w-full"
                        placeholder="e.g., Loyal customer, Service recovery"
                      />
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      onClick={handleApplyDiscount}
                      disabled={loading || discountData.discount_type === 'none'}
                      size="sm"
                      variant="primary"
                    >
                      {loading ? 'Applying...' : 'Apply Discount'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Wallet Balance Integration */}
            {localInvoice && localInvoice.wallet_balance > 0 && (
              <div className="border-t pt-4">
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-purple-700">
                      <Award size={18} />
                      <span className="font-semibold">Customer Wallet Balance</span>
                    </div>
                    <span className="text-xl font-bold text-purple-700">₹{localInvoice.wallet_balance.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between mt-3 p-2 bg-white rounded border border-purple-100">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                        checked={paymentData.use_wallet_balance}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          const fullAmount = localInvoice.amount_remaining !== undefined ? localInvoice.amount_remaining : localInvoice.total_amount;
                          const walletBalance = localInvoice.wallet_balance || 0;

                          setPaymentData({
                            ...paymentData,
                            use_wallet_balance: isChecked,
                            // If checking wallet, set amount to the remaining cash needed
                            // If unchecking, set back to full amount
                            amount: isChecked ? Math.max(0, fullAmount - walletBalance) : fullAmount
                          });
                        }}
                      />
                      Use Wallet Balance for this payment
                    </label>
                  </div>

                  {paymentData.use_wallet_balance && (
                    <div className="mt-2 text-xs text-purple-600 flex justify-between px-1">
                      <span>Will deduct: ₹{Math.min(localInvoice.wallet_balance, paymentData.amount || (localInvoice.amount_remaining !== undefined ? localInvoice.amount_remaining : localInvoice.total_amount)).toFixed(2)}</span>
                      <span>Remaining Balance: ₹{Math.max(0, localInvoice.wallet_balance - (paymentData.amount || (localInvoice.amount_remaining !== undefined ? localInvoice.amount_remaining : localInvoice.total_amount))).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Details */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Payment Details</h3>

              <div className="space-y-4">
                <Select
                  label="Payment Method"
                  value={paymentData.payment_method}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                  options={[
                    { value: 'cash', label: 'Cash' },
                    { value: 'card', label: 'Card' },
                    { value: 'upi', label: 'UPI' },
                    { value: 'bank_transfer', label: 'Bank Transfer' },
                    { value: 'cheque', label: 'Cheque' },
                  ]}
                />

                <Input
                  label={paymentData.use_wallet_balance ? "Additional Payment (Cash/UPI/etc.)" : "Amount"}
                  type="number"
                  placeholder={paymentData.use_wallet_balance
                    ? `Remaining: ₹${Math.max(0, (localInvoice?.amount_remaining !== undefined ? localInvoice.amount_remaining : (localInvoice?.total_amount ?? 0)) - localInvoice.wallet_balance).toFixed(2)}`
                    : `Full: ₹${localInvoice?.amount_remaining !== undefined ? localInvoice.amount_remaining : (localInvoice?.total_amount ?? 0)}`
                  }
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  helperText={paymentData.use_wallet_balance
                    ? `Wallet covers ₹${Math.min(localInvoice.wallet_balance, localInvoice.amount_remaining !== undefined ? localInvoice.amount_remaining : localInvoice.total_amount).toFixed(2)}. This box is for the cash you collect.`
                    : "Enter the amount to be paid. Default is the remaining balance."
                  }
                />

                <Input
                  label="Reference Number (Optional)"
                  type="text"
                  placeholder="Transaction ID, Cheque number, etc."
                  value={paymentData.reference_number || ''}
                  onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <div className="flex items-start">
                <AlertCircle size={16} className="text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-sm text-green-700">
                  Recording this payment will create a transaction record and update the invoice status accordingly.
                  {localInvoice && (localInvoice.amount_remaining !== undefined ? localInvoice.amount_remaining : localInvoice.total_amount) > 0 && (
                    <span className="block mt-1 font-medium">
                      Remaining to pay: ₹{(localInvoice.amount_remaining !== undefined ? localInvoice.amount_remaining : localInvoice.total_amount).toFixed(2)}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default WorkflowActions;
