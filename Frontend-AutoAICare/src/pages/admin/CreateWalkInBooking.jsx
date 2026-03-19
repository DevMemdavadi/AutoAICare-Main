import { Alert, Button, Card, Input, Modal, Select, Textarea } from '@/components/ui';
import { useBranch } from '@/contexts/BranchContext';
import api from '@/utils/api';
import { Building2, Calendar, Car, Clock, Gift, Tag, Ticket, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Import sub-components
import AddBrandModal from './components/walkin/AddBrandModal';
import AddModelModal from './components/walkin/AddModelModal';
import BookingAdditionalDetails from './components/walkin/BookingAdditionalDetails';
import CustomerSelection from './components/walkin/CustomerSelection';
import PasswordModal from './components/walkin/PasswordModal';
import ServicePackageModal from './components/walkin/ServicePackageModal';
import ServiceSelection from './components/walkin/ServiceSelection';
import ServiceSuggestions from './components/walkin/ServiceSuggestions';
import UpdateBrandModal from './components/walkin/UpdateBrandModal';
import UpdateModelModal from './components/walkin/UpdateModelModal';
import VehicleSelection from './components/walkin/VehicleSelection';

// Service category options
const SERVICE_CATEGORIES = [
  { value: 'wash', label: 'Car Wash' },
  { value: 'interior', label: 'Interior Cleaning' },
  { value: 'exterior', label: 'Exterior Beautification' },
  { value: 'coating', label: 'Ceramic Coating' },
  { value: 'makeover', label: 'Car Makeover' },
  { value: 'mechanical', label: 'Mechanical Services' },
  { value: 'ac_service', label: 'AC Service' },
  { value: 'polish', label: 'Body Polish' },
  { value: 'bike_services', label: 'Bike Services' },
  { value: 'other', label: 'Other Services' },
];

const CreateWalkInBooking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isSuperAdmin, isCompanyAdmin, branches = [], selectedBranch, getCurrentBranchId } = useBranch();

  // Appointment pre-fill state
  const [prefilledAppointment, setPrefilledAppointment] = useState(null);

  // Form states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [customerPassword, setCustomerPassword] = useState(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [newBrandVehicleType, setNewBrandVehicleType] = useState(false);

  // Update states
  const [showUpdateBrandModal, setShowUpdateBrandModal] = useState(false);
  const [showUpdateModelModal, setShowUpdateModelModal] = useState(false);
  const [brandToEdit, setBrandToEdit] = useState(null);
  const [modelToEdit, setModelToEdit] = useState(null);

  // Service modal states
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    category: 'other',
    // Vehicle-type prices (always required)
    hatchback_price: '',
    sedan_price: '',
    suv_price: '',
    bike_price: '',
    // GST
    gst_applicable: true,
    gst_rate: '18.00',
    // Duration
    duration: '',
    duration_max: '',
    // Status
    is_active: true,
    is_global: true,
    branch: null,
  });  // Add branch state for super admin
  const [selectedBranchId, setSelectedBranchId] = useState('');

  // Brand and model modal states
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newModelBrand, setNewModelBrand] = useState('');
  const [newModelVehicleType, setNewModelVehicleType] = useState('');

  // Add-on modal states
  const [showAddAddonModal, setShowAddAddonModal] = useState(false);
  const [addonForm, setAddonForm] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    is_active: true,
    is_global: isSuperAdmin, // Default to global for super admin, branch-specific for branch admin
    branch: isSuperAdmin ? null : getCurrentBranchId(), // Set default branch for branch admins
  });
  const [addonFormErrors, setAddonFormErrors] = useState({});

  // Customer states
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerData, setCustomerData] = useState({
    id: null,
    name: '',
    phone: '',
    email: '',
    referral_code: ''
  });

  // Track if we're adding a new vehicle
  const [addingNewVehicle, setAddingNewVehicle] = useState(false);

  // Ref for focusing the first vehicle input field
  const registrationNumberRef = useRef(null);

  // Ref for scrolling to top when showing errors
  const topRef = useRef(null);

  // Refs for brand and model input fields
  const brandInputRef = useRef(null);
  const modelInputRef = useRef(null);



  // Vehicle states
  const [vehicleData, setVehicleData] = useState({
    id: null,
    registration_number: '',
    brand: '',
    model: '',
    year: '',
    color: ''
  });
  const [customerVehicles, setCustomerVehicles] = useState([]);

  // Vehicle data for autocomplete
  const [vehicleBrands, setVehicleBrands] = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);
  const [allVehicleModels, setAllVehicleModels] = useState([]); // Store all models
  const [selectedBrandIdFromData, setSelectedBrandIdFromData] = useState(null); // Renamed to avoid checking conflict if any

  // Years from 1990 to current year (automatically updates each year)
  const currentYear = new Date().getFullYear();
  const vehicleYears = Array.from(
    { length: currentYear - 1989 },
    (_, i) => (1990 + i).toString()
  ).reverse();

  // Service states
  const [packages, setPackages] = useState([]);
  const [addons, setAddons] = useState([]);
  const [selectedPackages, setSelectedPackages] = useState([]); // array of package ID strings
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [vehicleType, setVehicleType] = useState(''); // No default vehicle type

  // DateTime states
  const [bookingDateTime, setBookingDateTime] = useState(() => {
    // Initialize with current LOCAL date and time in YYYY-MM-DDTHH:mm format for datetime-local input
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });

  // Pickup states
  const [pickupRequired, setPickupRequired] = useState(false);
  const [pickupData, setPickupData] = useState({
    location: '',
    pickup_time: ''
  });

  // Notes states
  const [notes, setNotes] = useState({
    internal: '',
    customer: ''
  });

  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Direct discount states
  const [directDiscountType, setDirectDiscountType] = useState('percentage'); // 'percentage' or 'fixed'
  const [directDiscountValue, setDirectDiscountValue] = useState('');

  // Referral discount state
  const [referralDiscount, setReferralDiscount] = useState(null);

  // Handle referral discount change
  const handleReferralDiscountChange = useCallback((discountInfo) => {
    setReferralDiscount(discountInfo);
  }, []);

  // Membership benefits states
  const [customerMembership, setCustomerMembership] = useState(null);
  const [availableBenefits, setAvailableBenefits] = useState([]);
  const [loadingBenefits, setLoadingBenefits] = useState(false);

  // Service search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Load packages and addons for current branch
  useEffect(() => {
    const loadServices = async () => {
      try {
        const branchId = selectedBranchId || getCurrentBranchId();
        if (!branchId) {
          setPackages([]);
          setAddons([]);
          return;
        }

        // Load packages (fetch all without pagination)
        const packageResponse = await api.get('/services/packages/', {
          params: {
            branch: branchId,
            is_active: true,
            page_size: 1000  // Fetch all packages
          }
        });
        setPackages(packageResponse.data.results || []);

        // Load addons
        const addonResponse = await api.get('/services/addons/', {
          params: {
            branch: branchId,
            is_active: true
          }
        });
        setAddons(addonResponse.data.results || []);
      } catch (err) {
        console.error('Error loading services:', err);
      }
    };

    loadServices();
  }, [selectedBranch, getCurrentBranchId, selectedBranchId, isSuperAdmin, isCompanyAdmin]);

  // Load vehicle data (brands, models, colors) on component mount
  useEffect(() => {
    const loadVehicleData = async () => {
      try {
        // Load brands
        const brandsResponse = await api.get('/customers/vehicle-brands/');
        const brandsData = brandsResponse.data.results || brandsResponse.data || [];
        setVehicleBrands(brandsData);

        // Load all models (we'll filter by brand later)
        const modelsResponse = await api.get('/customers/vehicle-models/');
        const modelsData = modelsResponse.data.results || modelsResponse.data || [];
        setAllVehicleModels(modelsData);
        setVehicleModels(modelsData); // Initially show all


      } catch (err) {
        console.error('Error loading vehicle data:', err);
      }
    };

    loadVehicleData();
  }, []);

  // Pre-fill from appointment if appointmentId is provided in URL
  useEffect(() => {
    const appointmentId = searchParams.get('appointmentId');
    if (appointmentId) {
      loadAppointmentData(appointmentId);
    }
  }, [searchParams]);

  // Load appointment data for pre-filling
  const loadAppointmentData = async (appointmentId) => {
    try {
      setLoading(true);
      const response = await api.get(`/appointments/${appointmentId}/`);
      const appointment = response.data;

      setPrefilledAppointment(appointment);

      // Pre-fill customer data
      if (appointment.customer_details) {
        setCustomerData({
          id: appointment.customer_details.user?.id || appointment.customer,
          name: appointment.customer_details.user?.name || '',
          phone: appointment.customer_details.user?.phone || '',
          email: appointment.customer_details.user?.email || ''
        });

        // Load customer vehicles after setting customer
        if (appointment.customer_details.user?.id || appointment.customer) {
          loadCustomerVehicles(appointment.customer_details.user?.id || appointment.customer);
        }
      }

      // Pre-fill vehicle data
      if (appointment.vehicle_details) {
        setVehicleData({
          id: appointment.vehicle,
          registration_number: appointment.vehicle_details.registration_number || '',
          brand: appointment.vehicle_details.brand || '',
          model: appointment.vehicle_details.model || '',
          year: appointment.vehicle_details.year || '',
          color: appointment.vehicle_details.color || ''
        });
      }

      // Pre-fill vehicle type
      if (appointment.vehicle_type) {
        setVehicleType(appointment.vehicle_type);
      }

      // Pre-fill package(s)
      if (appointment.package) {
        setSelectedPackages([appointment.package.toString()]);
      }

      // Pre-fill addons
      if (appointment.addons && appointment.addons.length > 0) {
        setSelectedAddons(appointment.addons.map(a => a.toString()));
      }

      // Pre-fill datetime (use confirmed or preferred)
      if (appointment.confirmed_datetime) {
        setBookingDateTime(appointment.confirmed_datetime.slice(0, 16));
      } else if (appointment.preferred_datetime) {
        setBookingDateTime(appointment.preferred_datetime.slice(0, 16));
      }

      // Pre-fill pickup
      if (appointment.pickup_required) {
        setPickupRequired(true);
        // Use confirmed_datetime or preferred_datetime for pickup time
        const pickupTime = appointment.confirmed_datetime || appointment.preferred_datetime;
        setPickupData({
          location: appointment.location || '',
          pickup_time: pickupTime ? pickupTime.slice(0, 16) : ''
        });
      }

      // Pre-fill notes
      if (appointment.notes) {
        setNotes(prev => ({
          ...prev,
          customer: appointment.notes
        }));
      }

      setSuccess(`Pre-filled from Appointment #${appointmentId}`);
    } catch (error) {
      console.error('Error loading appointment:', error);
      setError('Failed to load appointment data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-select branch for super admin / company admin if only one branch exists
  useEffect(() => {
    if ((isSuperAdmin || isCompanyAdmin) && branches.length === 1 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id.toString());
    }
  }, [isSuperAdmin, isCompanyAdmin, branches, selectedBranchId]);

  // Load customer vehicles when customer is selected
  useEffect(() => {
    if (customerData.id) {
      setLoading(true);
      loadCustomerVehicles(customerData.id).then(() => {
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    } else {
      setCustomerVehicles([]);
    }
  }, [customerData.id]);

  // Focus the first vehicle input field when adding a new vehicle
  useEffect(() => {
    if ((addingNewVehicle || (!customerData.id && customerData.name && customerData.phone)) && registrationNumberRef.current) {
      // Small delay to ensure the DOM is updated
      setTimeout(() => {
        registrationNumberRef.current.focus();
        // Scroll to the vehicle details section
        registrationNumberRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [addingNewVehicle, customerData]);

  // Scroll to top when an error occurs
  useEffect(() => {
    if (error && topRef.current) {
      // Small delay to ensure the DOM is updated
      setTimeout(() => {
        topRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [error]);

  // Scroll to top when a success message occurs
  useEffect(() => {
    if (success && topRef.current) {
      // Small delay to ensure the DOM is updated
      setTimeout(() => {
        topRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [success]);

  // Clear applied coupon when service selection changes
  useEffect(() => {
    if (appliedCoupon && selectedPackages.length > 0) {
      let isValid = false;
      if (appliedCoupon.applicable_services && appliedCoupon.applicable_services.length > 0) {
        isValid = appliedCoupon.applicable_services.some(serviceId =>
          selectedPackages.includes(serviceId.toString())
        );
      } else if (appliedCoupon.applicable_categories && appliedCoupon.applicable_categories.length > 0) {
        const selectedPkgObjs = packages.filter(pkg => selectedPackages.includes(pkg.id.toString()));
        isValid = selectedPkgObjs.some(pkg => appliedCoupon.applicable_categories.includes(pkg.category));
      } else {
        isValid = true;
      }
      if (!isValid) {
        setAppliedCoupon(null);
        setCouponError('');
      }
    }
  }, [selectedPackages]);

  // Unified search for customer by phone or vehicle registration using bookings API
  const searchCustomer = async () => {
    if (!customerSearchQuery) return;

    try {
      setLoading(true);

      // Use bookings API to search by both phone number and vehicle registration
      const params = {
        search: customerSearchQuery,
        page_size: 100  // Get more results to increase chance of finding customer
      };

      // Add branch filtering if a specific branch is selected
      const branchId = getCurrentBranchId();
      if (branchId) {
        params.branch = branchId;
      }

      const response = await api.get('/bookings/', { params });

      // Extract unique customers from bookings
      const uniqueCustomers = [];
      const customerIds = new Set();

      const results = response.data.results || [];

      results.forEach(booking => {
        if (booking.customer_details && booking.customer_details.user && !customerIds.has(booking.customer_details.user.id)) {
          uniqueCustomers.push(booking.customer_details.user);
          customerIds.add(booking.customer_details.user.id);
        }
      });

      setSearchResults(uniqueCustomers);
      setShowCustomerSearch(true);

      // Detect if input is a phone number (only digits) or registration number
      const isPhoneNumber = /^\d+$/.test(customerSearchQuery);

      // If no customers found, show the vehicle form for manual entry
      if (uniqueCustomers.length === 0) {
        setAddingNewVehicle(true);

        if (isPhoneNumber) {
          // Populate customer data with the search phone number
          setCustomerData({
            id: null,
            name: '',
            phone: customerSearchQuery,
            email: ''
          });
        } else {
          // Populate vehicle data with the search registration number
          setVehicleData({
            id: null,
            registration_number: customerSearchQuery.toUpperCase(),
            brand: '',
            model: '',
            year: ''
          });
        }
      }
    } catch (err) {
      setError('Error searching for customer');
      console.error('Error searching for customer:', err);
      console.error('Error response:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  // Select existing customer
  const selectCustomer = (customer) => {
    setCustomerData({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || ''
    });

    // Reset vehicle selection but don't hide the form
    setVehicleData({
      id: null,
      registration_number: '',
      brand: '',
      model: '',
      year: '',
      color: ''
    });

    setShowCustomerSearch(false);

    // Clear search query to prevent confusion
    setCustomerSearchQuery('');

    // Load customer vehicles after selecting customer
    // After loading vehicles, we'll check if we can auto-select the vehicle by registration number
    loadCustomerVehicles(customer.id).then((loadedVehicles) => {
      // If we were searching by vehicle registration number and have a match, auto-select it
      const isPhoneNumber = /^\d+$/.test(customerSearchQuery);
      if (!isPhoneNumber && customerSearchQuery && loadedVehicles && loadedVehicles.length > 0) {
        const matchingVehicle = loadedVehicles.find(v =>
          v.registration_number.toLowerCase() === customerSearchQuery.toLowerCase()
        );
        if (matchingVehicle) {
          selectVehicle(matchingVehicle);
        }
      }
    });

    // Load customer membership benefits
    fetchCustomerMembership(customer.id);
  };

  // Fetch customer membership and available benefits
  const fetchCustomerMembership = async (userId) => {
    try {
      setLoadingBenefits(true);

      // Fetch active membership
      const membershipResponse = await api.get('/memberships/subscriptions/', {
        params: {
          customer: userId,
          status: 'active',
          page_size: 100
        }
      });

      const memberships = membershipResponse.data.results || [];

      if (memberships.length > 0) {
        const activeMembership = memberships[0]; // Get first active membership
        setCustomerMembership(activeMembership);

        // Fetch available coupons for THIS SPECIFIC customer only
        // The backend will filter coupons where customer_id matches
        const couponsResponse = await api.get('/memberships/coupons/', {
          params: {
            customer: userId,  // This filters coupons belonging to this customer
            status: 'active',
            page_size: 100
          }
        });

        const coupons = couponsResponse.data.results || [];
        console.log(`Fetched ${coupons.length} coupons for customer ${userId}`);
        setAvailableBenefits(coupons);
      } else {
        setCustomerMembership(null);
        setAvailableBenefits([]);
      }
    } catch (err) {
      console.error('Error fetching membership:', err);
      setCustomerMembership(null);
      setAvailableBenefits([]);
    } finally {
      setLoadingBenefits(false);
    }
  };

  // Load vehicles for selected customer
  const loadCustomerVehicles = async (userId) => {
    try {
      setLoading(true);
      // Use the new endpoint to get vehicles by user ID
      const response = await api.get('/customers/admin/vehicles/by-user/', {
        params: { user: userId }
      });
      // Handle paginated response format
      const vehicles = response.data.results || response.data || [];
      setCustomerVehicles(vehicles);

      // Auto-select first vehicle if available; otherwise show "Add New Vehicle" form
      if (vehicles && vehicles.length > 0) {
        selectVehicle(vehicles[0]);
        setAddingNewVehicle(false);
      } else {
        setAddingNewVehicle(true);
      }

      // Return vehicles for use in the calling function
      return vehicles;
    } catch (err) {
      console.error('Error loading vehicles:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Select existing vehicle
  const selectVehicle = (vehicle) => {
    setVehicleData({
      id: vehicle.id,
      registration_number: vehicle.registration_number,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year
    });

    // Auto-set vehicle type based on the selected vehicle's vehicle_type field
    if (vehicle.vehicle_type) {
      setVehicleType(vehicle.vehicle_type);
    }

    setAddingNewVehicle(false);
  };

  // Detect vehicle type based on brand and model
  const detectVehicleType = async (brand, model) => {
    if (!brand || !model) return;

    // First try to detect from local data for instant feedback
    const modelObj = allVehicleModels.find(m =>
      (m.brand_name === brand || m.brand === brand) && m.name === model
    );
    if (modelObj && modelObj.vehicle_type) {
      setVehicleType(modelObj.vehicle_type);
      return;
    }

    const brandObj = vehicleBrands.find(b => b.name === brand || b.id === brand);
    if (brandObj && brandObj.vehicle_type === 'bike') {
      setVehicleType('bike');
      return;
    }

    try {
      const response = await api.get('/customers/vehicle-models/detect-type/', {
        params: { brand, model }
      });

      if (response.data.matched && response.data.vehicle_type) {
        setVehicleType(response.data.vehicle_type);
        // Visual feedback is provided by the green badge in the UI
      } else {
        // No match found, keep default
        console.log('No vehicle type match found, using default:', response.data.message);
      }
    } catch (error) {
      console.error('Error detecting vehicle type:', error);
      // Silently fail - user can still manually select
    }
  };

  // Toggle addon selection
  const toggleAddon = (addonId) => {
    setSelectedAddons(prev =>
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  // Toggle package selection (multi-select)
  const togglePackage = (pkgId) => {
    setSelectedPackages(prev =>
      prev.includes(pkgId)
        ? prev.filter(id => id !== pkgId)
        : [...prev, pkgId]
    );
  };

  // Calculate total price with vehicle-type pricing and GST
  const calculateTotalPrice = () => {
    let subtotal = 0;
    let totalGst = 0;
    let gstRate = 0;

    // Sum price + GST for ALL selected packages
    selectedPackages.forEach(pkgId => {
      const pkg = packages.find(p => p.id === parseInt(pkgId));
      if (pkg) {
        const priceMap = {
          hatchback: pkg.hatchback_price,
          sedan: pkg.sedan_price,
          suv: pkg.suv_price,
          bike: pkg.bike_price || pkg.sedan_price,
        };
        const packagePrice = parseFloat(priceMap[vehicleType] || pkg.sedan_price) || 0;
        subtotal += packagePrice;
        if (pkg.gst_applicable) {
          const rate = parseFloat(pkg.gst_rate || 0);
          gstRate = rate; // last one wins (OK for display)
          totalGst += (packagePrice * rate) / 100;
        }
      }
    });

    // Add addons prices
    if (selectedAddons.length > 0) {
      selectedAddons.forEach(addonId => {
        const addon = addons.find(a => a.id === parseInt(addonId));
        if (addon) {
          const addonPrice = parseFloat(addon.price) || 0;
          subtotal += addonPrice;

          // Calculate GST for addon
          if (addon.gst_applicable) {
            totalGst += (addonPrice * parseFloat(addon.gst_rate || 0)) / 100;
          }
        }
      });
    }

    // Calculate coupon discount
    let couponDiscount = 0;

    // Auto-apply washing plan benefit if any selected package is a wash service
    const selectedPkgObjects = packages.filter(pkg => selectedPackages.includes(pkg.id.toString()));
    const isWashService = selectedPkgObjects.some(pkg => pkg.name.toLowerCase().includes('wash'));
    const hasWashingPlan = customerMembership && customerMembership.washes_remaining > 0;

    if (isWashService && hasWashingPlan && !appliedCoupon) {
      // Automatically apply 100% discount for washing plan
      couponDiscount = subtotal + totalGst; // Free wash (subtotal + GST = 0)
    } else if (appliedCoupon) {
      // Manual coupon applied
      if (appliedCoupon.coupon_type === 'free_service') {
        // Free service = completely free (covers subtotal + GST)
        couponDiscount = subtotal + totalGst;
      } else if (appliedCoupon.coupon_type === 'percentage') {
        const pct = parseFloat(appliedCoupon.discount_percentage) || 0;
        if (pct >= 100) {
          // 100% off = completely free (covers subtotal + GST)
          couponDiscount = subtotal + totalGst;
        } else {
          couponDiscount = (subtotal * pct) / 100;
          if (appliedCoupon.max_discount && couponDiscount > parseFloat(appliedCoupon.max_discount)) {
            couponDiscount = parseFloat(appliedCoupon.max_discount);
          }
        }
      } else if (appliedCoupon.coupon_type === 'fixed') {
        couponDiscount = Math.min(parseFloat(appliedCoupon.discount_amount) || 0, subtotal);
      }
    }

    // Calculate direct discount (admin override)
    let directDiscount = 0;
    if (directDiscountValue && parseFloat(directDiscountValue) > 0) {
      if (directDiscountType === 'percentage') {
        // Percentage discount on subtotal
        const percentage = Math.min(parseFloat(directDiscountValue), 100); // Cap at 100%
        directDiscount = (subtotal * percentage) / 100;
      } else if (directDiscountType === 'fixed') {
        // Fixed amount discount, cannot exceed subtotal
        directDiscount = Math.min(parseFloat(directDiscountValue), subtotal);
      }
    }

    // Calculate referral discount (only for new customers)
    let referralDiscountAmount = 0;
    if (referralDiscount && !customerData.id) {
      if (referralDiscount.type === 'percentage') {
        referralDiscountAmount = (subtotal * referralDiscount.value) / 100;
        // Apply cap if exists
        if (referralDiscount.max_cap) {
          referralDiscountAmount = Math.min(referralDiscountAmount, referralDiscount.max_cap);
        }
      } else {
        // Fixed amount
        referralDiscountAmount = Math.min(referralDiscount.amount, subtotal);
      }
    }

    // Total discount is coupon + direct discount + referral discount
    const totalDiscount = couponDiscount + directDiscount + referralDiscountAmount;

    const total = subtotal + totalGst - totalDiscount;

    return {
      subtotal: subtotal.toFixed(2),
      gst: totalGst.toFixed(2),
      gstRate: gstRate,
      discount: couponDiscount.toFixed(2),
      directDiscount: directDiscount.toFixed(2),
      referralDiscount: referralDiscountAmount.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
      total: Math.max(0, total).toFixed(2),
    };
  };

  // Apply coupon
  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    if (!selectedPackages.length) {
      setCouponError('Please select a service first');
      return;
    }

    setCouponLoading(true);
    setCouponError('');

    try {
      const response = await api.post('/memberships/coupons/validate/', {
        code: couponCode.toUpperCase(),
        order_value: parseFloat(calculateTotalPrice().subtotal),
        customer_id: customerData.id,
        vehicle_id: vehicleData.id || undefined,
      });

      if (response.data.valid) {
        const coupon = response.data.coupon;

        // Validate if coupon is applicable to ANY of the selected services
        let isApplicable = false;
        if (coupon.applicable_services && coupon.applicable_services.length > 0) {
          isApplicable = coupon.applicable_services.some(serviceId =>
            selectedPackages.includes(serviceId.toString())
          );
        } else if (coupon.applicable_categories && coupon.applicable_categories.length > 0) {
          const selectedPkgObjs = packages.filter(pkg => selectedPackages.includes(pkg.id.toString()));
          isApplicable = selectedPkgObjs.some(pkg =>
            coupon.applicable_categories.includes(pkg.category)
          );
        } else {
          isApplicable = true;
        }

        if (!isApplicable) {
          setCouponError('This coupon is not applicable to the selected service');
          return;
        }

        setAppliedCoupon(coupon);
        setCouponCode('');
        setSuccess('Coupon applied successfully!');
      } else {
        setCouponError(response.data.errors?.code || 'Invalid coupon code');
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      setCouponError(error.response?.data?.errors?.code || error.response?.data?.code?.[0] || 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  // Apply a specific coupon code (for membership benefits)
  const applySpecificCoupon = async (code) => {
    // Check if customer is selected
    if (!customerData.id) {
      setCouponError('Please select a customer first');
      return;
    }

    // Check if service is selected
    if (!selectedPackages.length) {
      setCouponError('Please select a service first');
      return;
    }

    setCouponLoading(true);
    setCouponError('');

    try {
      const totalPrice = calculateTotalPrice();
      const orderValue = parseFloat(totalPrice.subtotal);

      console.log('Applying coupon:', {
        code: code.toUpperCase(),
        order_value: orderValue,
        customer_id: customerData.id,
        customer_name: customerData.name
      });

      const response = await api.post('/memberships/coupons/validate/', {
        code: code.toUpperCase(),
        order_value: orderValue,
        customer_id: customerData.id,
        vehicle_id: vehicleData.id || undefined,
      });

      if (response.data.valid) {
        setAppliedCoupon(response.data.coupon);
        setCouponCode('');
        setSuccess(`Coupon ${code} applied successfully!`);
      } else {
        setCouponError(response.data.errors?.code || 'Invalid coupon code');
      }
    } catch (error) {
      console.error('Coupon validation error:', error.response?.data);
      setCouponError(error.response?.data?.errors?.code || error.response?.data?.code?.[0] || 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  // Remove applied coupon
  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  // Handle service creation
  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      // Prepare service data - always use vehicle-type pricing
      const serviceData = {
        name: serviceForm.name,
        description: serviceForm.description,
        category: serviceForm.category,
        // Vehicle-type prices (always required)
        hatchback_price: parseFloat(serviceForm.hatchback_price) || 0,
        sedan_price: parseFloat(serviceForm.sedan_price) || 0,
        suv_price: parseFloat(serviceForm.suv_price) || 0,
        bike_price: parseFloat(serviceForm.bike_price) || 0,
        // Set legacy price to sedan price for backward compatibility
        price: parseFloat(serviceForm.sedan_price) || 0,
        // GST
        gst_applicable: serviceForm.gst_applicable,
        gst_rate: parseFloat(serviceForm.gst_rate) || 18.00,
        // Duration
        duration: parseInt(serviceForm.duration) || 0,
        duration_max: serviceForm.duration_max ? parseInt(serviceForm.duration_max) : null,
        // Status
        is_active: serviceForm.is_active,
        is_global: serviceForm.is_global,
        branch: serviceForm.branch ? parseInt(serviceForm.branch) : null
      };

      // Auto-assign branch for branch admins
      if (!isSuperAdmin) {
        const currentBranchId = getCurrentBranchId();
        if (currentBranchId) {
          serviceData.branch = currentBranchId;
          serviceData.is_global = false; // Branch-specific
        }
      }

      await api.post('/services/packages/', serviceData);

      // Close modal and reset form
      setShowServiceModal(false);
      setServiceForm({
        name: '',
        description: '',
        category: 'other',
        hatchback_price: '',
        sedan_price: '',
        suv_price: '',
        bike_price: '',
        gst_applicable: true,
        gst_rate: '18.00',
        duration: '',
        duration_max: '',
        is_active: true,
        is_global: true,
        branch: null,
      });

      // Reload packages to show the new service
      const branchId = getCurrentBranchId();
      if (branchId) {
        const packageResponse = await api.get('/services/packages/', {
          params: {
            branch: branchId,
            is_active: true
          }
        });
        setPackages(packageResponse.data.results || []);
      }

      setSuccess('Service package created successfully!');
    } catch (error) {
      console.error('Error saving service:', error);
      setError('Failed to save service package');
    }
  };

  // Handle adding new brand
  const handleAddBrand = async () => {
    if (!newBrandName.trim()) {
      setError('Please enter a brand name');
      return;
    }

    try {
      const response = await api.post('/customers/vehicle-brands/', {
        name: newBrandName.trim(),
        vehicle_type: vehicleType || 'car', // Use selected vehicle type or default to car
        is_active: true
      });

      // Add new brand to the list
      setVehicleBrands(prev => [...prev, response.data]);

      // Set the new brand as selected
      setVehicleData(prev => ({
        ...prev,
        brand: response.data.name
      }));

      // Reset form and close modal
      setNewBrandName('');
      setShowAddBrandModal(false);

      setSuccess('Brand added successfully!');
    } catch (error) {
      console.error('Error adding brand:', error);
      console.error('Error response:', error.response?.data);

      // Get the most specific error message
      let errorMessage = 'Failed to add brand';

      if (error.response?.data?.name?.[0]) {
        errorMessage = error.response.data.name[0];
      } else if (error.response?.data?.non_field_errors?.[0]) {
        errorMessage = error.response.data.non_field_errors[0];
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (typeof error.response?.data === 'string') {
        errorMessage = error.response.data;
      }

      setError(errorMessage);
    }
  };

  // Handle adding new model
  const handleAddModel = async () => {
    if (!newModelName.trim()) {
      setError('Please enter a model name');
      return;
    }

    if (!newModelBrand) {
      setError('Please select a brand');
      return;
    }

    if (!newModelVehicleType) {
      setError('Please select a vehicle type');
      return;
    }

    try {
      // Find the brand object by name in vehicleBrands
      let brandObj = vehicleBrands.find(b => b.name === newModelBrand);

      // If brand was not found in current list, refresh the brands list
      if (!brandObj) {
        try {
          // Fetch all brands to ensure we have the latest data
          const brandResponse = await api.get('/customers/vehicle-brands/');
          const allBrands = brandResponse.data;
          brandObj = allBrands.find(b => b.name === newModelBrand);

          if (!brandObj) {
            throw new Error('Brand ' + newModelBrand + ' not found in the system');
          }

          // Update the local state with the refreshed brands list
          setVehicleBrands(allBrands);
        } catch (refreshError) {
          console.error('Error refreshing brands:', refreshError);
          throw new Error('Unable to find brand ' + newModelBrand + '. Please refresh the page and try again.');
        }
      }

      if (!brandObj || !brandObj.id) {
        throw new Error('Brand ' + newModelBrand + ' does not have a valid ID');
      }

      const response = await api.post('/customers/vehicle-models/', {
        name: newModelName.trim(),
        brand: brandObj.id,
        vehicle_type: newModelVehicleType,
        is_active: true
      });

      // Add new model to the list
      const updatedModels = [...allVehicleModels, response.data];
      setAllVehicleModels(updatedModels);

      // If the selected brand matches, update the filtered models
      if (vehicleData.brand === newModelBrand) {
        setVehicleModels(prev => [...prev, response.data]);
      }

      // Set the new model as selected
      setVehicleData(prev => ({
        ...prev,
        model: response.data.name
      }));

      // Set vehicle type based on the new model
      setVehicleType(response.data.vehicle_type);

      // Reset form and close modal
      setNewModelName('');
      setNewModelBrand('');
      setNewModelVehicleType('');
      setShowAddModelModal(false);

      setSuccess('Model added successfully!');
    } catch (error) {
      console.error('Error adding model:', error);
      console.error('Error response:', error.response?.data);

      // Get the most specific error message
      let errorMessage = 'Failed to add model';

      if (error.response?.data?.name?.[0]) {
        errorMessage = error.response.data.name[0];
      } else if (error.response?.data?.non_field_errors?.[0]) {
        errorMessage = error.response.data.non_field_errors[0];
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (typeof error.response?.data === 'string') {
        errorMessage = error.response.data;
      }

      setError(errorMessage);
    }
  };

  // Handle creating new addon
  const handleCreateAddon = async (e) => {
    if (e) e.preventDefault();

    try {
      // Validation
      const newErrors = {};
      if (!addonForm.name.trim()) {
        newErrors.name = 'Add-on name is required';
      }
      if (!addonForm.price || parseFloat(addonForm.price) <= 0) {
        newErrors.price = 'Valid price is required';
      }
      if (!addonForm.duration || parseInt(addonForm.duration) <= 0) {
        newErrors.duration = 'Valid duration is required';
      }

      if (Object.keys(newErrors).length > 0) {
        setAddonFormErrors(newErrors);
        return;
      }

      // Prepare addon data
      const addonData = {
        name: addonForm.name.trim(),
        description: addonForm.description.trim(),
        price: parseFloat(addonForm.price),
        duration: parseInt(addonForm.duration),
        is_active: addonForm.is_active,
        is_global: addonForm.is_global,
        branch: addonForm.is_global ? null : parseInt(addonForm.branch),
        // Default GST settings
        gst_applicable: true,
        gst_rate: 18.00,
      };

      // Create the addon
      const response = await api.post('/services/addons/', addonData);

      // Add the new addon to our local list
      setAddons(prev => [...prev, response.data]);

      // Reset form and close modal
      setAddonForm({
        name: '',
        description: '',
        price: '',
        duration: '',
        is_active: true,
        is_global: isSuperAdmin,
        branch: isSuperAdmin ? null : getCurrentBranchId(),
      });
      setAddonFormErrors({});
      setShowAddAddonModal(false);

      setSuccess('Add-on created successfully!');
    } catch (error) {
      console.error('Error creating addon:', error);
      console.error('Error response:', error.response?.data);

      const errorData = error.response?.data || {};
      const newErrors = {};

      if (errorData.name) {
        newErrors.name = Array.isArray(errorData.name) ? errorData.name.join(', ') : errorData.name;
      }
      if (errorData.price) {
        newErrors.price = Array.isArray(errorData.price) ? errorData.price.join(', ') : errorData.price;
      }
      if (errorData.duration) {
        newErrors.duration = Array.isArray(errorData.duration) ? errorData.duration.join(', ') : errorData.duration;
      }

      setAddonFormErrors(newErrors);

      // Show general error if no field-specific errors
      if (!errorData.name && !errorData.price && !errorData.duration) {
        setError(errorData.detail || 'Failed to create add-on');
      }
    }
  };

  const handleUpdateBrand = async () => {
    if (!brandToEdit?.name?.trim()) {
      setError('Please enter a brand name');
      return;
    }

    try {
      const response = await api.put(`/customers/vehicle-brands/${brandToEdit.id}/`, {
        name: brandToEdit.name.trim(),
        vehicle_type: brandToEdit.vehicle_type,
        is_active: brandToEdit.is_active
      });

      // Update the brand in the list
      setVehicleBrands(prev =>
        prev.map(brand =>
          brand.id === response.data.id ? response.data : brand
        )
      );

      // If the updated brand was the selected one, update vehicle data
      if (vehicleData.brand === brandToEdit.name) {
        setVehicleData(prev => ({
          ...prev,
          brand: response.data.name
        }));
      }

      // Reset and close modal
      setBrandToEdit(null);
      setShowUpdateBrandModal(false);

      setSuccess('Brand updated successfully!');
    } catch (error) {
      console.error('Error updating brand:', error);
      console.error('Error response:', error.response?.data);

      // Get the most specific error message
      let errorMessage = 'Failed to update brand';

      if (error.response?.data?.name?.[0]) {
        errorMessage = error.response.data.name[0];
      } else if (error.response?.data?.non_field_errors?.[0]) {
        errorMessage = error.response.data.non_field_errors[0];
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (typeof error.response?.data === 'string') {
        errorMessage = error.response.data;
      }

      setError(errorMessage);
    }
  };

  const handleUpdateModel = async () => {
    if (!modelToEdit?.name?.trim()) {
      setError('Please enter a model name');
      return;
    }

    if (!modelToEdit?.brand) {
      setError('Please select a brand');
      return;
    }

    if (!modelToEdit?.vehicle_type) {
      setError('Please select a vehicle type');
      return;
    }

    try {
      const response = await api.put(`/customers/vehicle-models/${modelToEdit.id}/`, {
        name: modelToEdit.name.trim(),
        brand: modelToEdit.brand,
        vehicle_type: modelToEdit.vehicle_type,
        is_active: modelToEdit.is_active
      });

      // Update the model in the list
      setAllVehicleModels(prev =>
        prev.map(model =>
          model.id === response.data.id ? response.data : model
        )
      );

      // Update filtered models
      setVehicleModels(prev =>
        prev.map(model =>
          model.id === response.data.id ? response.data : model
        )
      );

      // If the updated model was the selected one, update vehicle data
      if (vehicleData.model === modelToEdit.name) {
        setVehicleData(prev => ({
          ...prev,
          model: response.data.name
        }));
        setVehicleType(response.data.vehicle_type);
      }

      // Reset and close modal
      setModelToEdit(null);
      setShowUpdateModelModal(false);

      setSuccess('Model updated successfully!');
    } catch (error) {
      console.error('Error updating model:', error);
      console.error('Error response:', error.response?.data);

      // Get the most specific error message
      let errorMessage = 'Failed to update model';

      if (error.response?.data?.name?.[0]) {
        errorMessage = error.response.data.name[0];
      } else if (error.response?.data?.non_field_errors?.[0]) {
        errorMessage = error.response.data.non_field_errors[0];
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (typeof error.response?.data === 'string') {
        errorMessage = error.response.data;
      }

      setError(errorMessage);
    }
  };

  const openUpdateBrandModal = (brand) => {
    setBrandToEdit(brand);
    setShowUpdateBrandModal(true);
  };

  const openUpdateModelModal = (model) => {
    setModelToEdit(model);
    setShowUpdateModelModal(true);
  };



  // Handle form submission
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');      // Validate required fields
      if (!customerData.name || !customerData.phone) {
        setError('Please fill in customer name and phone');
        setLoading(false);
        return;
      }

      if (!vehicleData.registration_number || !vehicleData.brand || !vehicleData.model) {
        setError('Please fill in required vehicle details');
        setLoading(false);
        return;
      }

      if (!selectedPackages.length) {
        setError('Please select at least one service package');
        setLoading(false);
        return;
      }

      if (!bookingDateTime) {
        setError('Please select a date and time');
        setLoading(false);
        return;
      }

      if (pickupRequired && (!pickupData.location || !pickupData.pickup_time)) {
        setError('Please fill in pickup details');
        setLoading(false);
        return;
      }

      // Prepare data for submission
      // Generate placeholder email if not provided (for walk-in customers)
      const customerEmail = customerData.email?.trim() || `${customerData.phone}@walkin.local`;

      const bookingData = {
        customer: {
          ...(customerData.id ? { id: customerData.id } : {
            name: customerData.name,
            phone: customerData.phone,
            email: customerEmail,
            ...(customerData.referral_code && { referral_code: customerData.referral_code })
          })
        },
        vehicle: {
          ...(vehicleData.id ? { id: vehicleData.id } : {
            registration_number: vehicleData.registration_number,
            brand: vehicleData.brand,
            model: vehicleData.model,
            year: vehicleData.year ? parseInt(vehicleData.year) : null,
            color: vehicleData.color || null,
            // Include customer_id when creating new vehicle for existing customer
            ...(customerData.id && { customer: customerData.id })
          })
        },
        package_ids: selectedPackages.map(id => parseInt(id)),
        addon_ids: selectedAddons.map(id => parseInt(id)),
        vehicle_type: vehicleType,
        booking_datetime: bookingDateTime,
        pickup_required: pickupRequired,
        location: pickupData.location,
        ...(pickupRequired && pickupData.pickup_time && { pickup_time: pickupData.pickup_time }),
        notes: notes.internal,
        ...(appliedCoupon && { coupon_code: appliedCoupon.code }), // Add coupon if applied
        referral_code: customerData.referral_code || '', // Explicitly send referral code
        // Send the fully calculated discount amount from the form
        discount_amount: parseFloat(calculateTotalPrice().totalDiscount),
        // Add direct discount fields to booking data
        direct_discount_type: directDiscountType,
        direct_discount_value: directDiscountValue || 0,
        ...(prefilledAppointment && { appointment_id: prefilledAppointment.id }) // Link appointment if booking from appointment
      };


      // Add branch for all admin users (both admin and super_admin/company_admin)
      // For super admin/company admin, use the selected branch from dropdown
      // For branch admin, use their assigned branch
      if (isSuperAdmin || isCompanyAdmin) {
        if (!selectedBranchId) {
          setError('Please select a branch');
          setLoading(false);
          return;
        }
        bookingData.branch = parseInt(selectedBranchId);
      } else {
        // For branch admins, get their assigned branch
        const currentBranchId = getCurrentBranchId();
        if (!currentBranchId) {
          setError('Admin must be assigned to a branch to create bookings');
          setLoading(false);
          return;
        }
        bookingData.branch = currentBranchId;
      }

      const response = await api.post('/bookings/admin_create/', bookingData);

      // Check if a new customer was created (password is returned)
      // This works for both branch admin and super admin
      if (response.data && response.data.customer_password) {
        setCustomerPassword({
          password: response.data.customer_password,
          phone: response.data.customer_phone || customerData.phone,
          name: response.data.customer_name || customerData.name,
          bookingId: response.data.id
        });
        setShowPasswordModal(true);
      } else {
        // Success - show alert and redirect to booking details
        // This happens when an existing customer is used
        setSuccess('Booking created successfully!');
        setTimeout(() => {
          if (response.data && response.data.id) {
            // Redirect to bookings page with booking ID parameter to open check-in modal
            navigate(`/admin/bookings?openCheckIn=${response.data.id}`);
          }
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating booking');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  // Get selected packages details (multi-select)
  const selectedPackagesDetails = packages.filter(pkg => selectedPackages.includes(pkg.id.toString()));

  // Get selected addons details
  const selectedAddonsDetails = addons.filter(addon => selectedAddons.includes(addon.id.toString()));

  // Helper: Get price for specific vehicle type
  const getVehicleTypePrice = (pkg, type) => {
    const priceMap = {
      hatchback: pkg.hatchback_price,
      sedan: pkg.sedan_price,
      suv: pkg.suv_price,
      bike: pkg.bike_price,
    };
    return priceMap[type] || pkg.sedan_price || 0;
  };

  // Filter packages based on search and category
  const filteredPackages = packages.filter(pkg => {
    // Enhanced search filter - search in both name and description
    if (searchQuery) {
      const searchTerm = searchQuery.toLowerCase().trim();
      const nameMatch = pkg.name.toLowerCase().includes(searchTerm);
      const descriptionMatch = pkg.description.toLowerCase().includes(searchTerm);

      // Return true if either name or description matches
      if (!nameMatch && !descriptionMatch) {
        return false;
      }
    }

    // Category filter
    if (categoryFilter !== 'all' && pkg.category !== categoryFilter) {
      return false;
    }

    // Vehicle type compatibility - CRITICAL FILTER
    // Separate bike services from car services
    if (pkg.compatible_vehicle_types && pkg.compatible_vehicle_types.length > 0) {
      // Service has explicit compatibility list
      return pkg.compatible_vehicle_types.includes(vehicleType);
    } else {
      // Fallback: If no compatibility data, check category
      // Bike services should only show for bikes
      if (pkg.category === 'bike_services') {
        return vehicleType === 'bike';
      }
      // All other services are for cars (hatchback, sedan, SUV)
      return vehicleType !== 'bike';
    }
  });

  // Copy password to clipboard
  const copyPassword = async () => {
    if (customerPassword?.password) {
      try {
        await navigator.clipboard.writeText(customerPassword.password);
        setPasswordCopied(true);
        setTimeout(() => setPasswordCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy password:', err);
      }
    }
  };

  // Handle password modal close
  const handlePasswordModalClose = () => {
    const bookingId = customerPassword?.bookingId;
    setShowPasswordModal(false);
    setCustomerPassword(null);
    setPasswordCopied(false);
    // Redirect to bookings page with booking ID parameter to open check-in modal
    setSuccess('Booking created successfully!');
    setTimeout(() => {
      if (bookingId) {
        navigate(`/admin/bookings?openCheckIn=${bookingId}`);
      }
    }, 500);
  };

  return (
    <div ref={topRef} className="space-y-6">
      {/* Password Modal */}
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={handlePasswordModalClose}
        customerPassword={customerPassword}
        customerData={customerData}
        copyPassword={copyPassword}
        passwordCopied={passwordCopied}
      />

      {/* Success Alert */}
      {success && (
        <Alert
          type="success"
          message={success}
          onClose={() => setSuccess("")}
          duration={2000}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button variant="outline" onClick={() => navigate("/admin/bookings")}>
          ← Back to Bookings
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          {prefilledAppointment ? 'Create Booking from Appointment' : 'Create Walk-In Booking'}
        </h1>
      </div>

      {/* Appointment Pre-fill Banner */}
      {prefilledAppointment && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">Creating Booking from Appointment #{prefilledAppointment.id}</h3>
              <p className="text-sm text-blue-700 mt-1">
                Customer: {prefilledAppointment.customer_details?.user?.name || 'N/A'} •
                Vehicle: {prefilledAppointment.vehicle_details?.registration_number || 'N/A'} •
                Requested: {new Date(prefilledAppointment.preferred_datetime).toLocaleString()}
              </p>
              <p className="text-xs text-blue-600 mt-2">
                All fields have been pre-filled from the appointment. Review and modify if needed.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/appointments')}
            >
              View Appointments
            </Button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column - Form Sections (70%) */}
        <div className="lg:w-7/12 space-y-6">
          {/* Customer Information Section */}



          {/* Service Selection Section */}


          <CustomerSelection
            customerData={customerData}
            setCustomerData={setCustomerData}
            searchQuery={customerSearchQuery}
            setSearchQuery={setCustomerSearchQuery}
            searchCustomer={searchCustomer}
            loading={loading}
            searchResults={searchResults}
            showCustomerSearch={showCustomerSearch}
            setShowCustomerSearch={setShowCustomerSearch}
            selectCustomer={selectCustomer}
            setAddingNewVehicle={setAddingNewVehicle}
            customerVehicles={customerVehicles}
            vehicleData={vehicleData}
            setVehicleData={setVehicleData}
            selectVehicle={selectVehicle}
            bookingAmount={calculateTotalPrice().subtotal}
            onReferralDiscountChange={handleReferralDiscountChange}
          />

          <Card title="Schedule">
            <Input
              label="Booking Date & Time"
              type="datetime-local"
              value={bookingDateTime}
              onChange={(e) => setBookingDateTime(e.target.value)}
              prefix={<Calendar className="text-gray-400" size={18} />}
              required
            />
          </Card>

          <VehicleSelection
            vehicleData={vehicleData}
            setVehicleData={setVehicleData}
            addingNewVehicle={addingNewVehicle}
            customerData={customerData}
            registrationNumberRef={registrationNumberRef}
            brandInputRef={brandInputRef}
            modelInputRef={modelInputRef}
            setShowAddBrandModal={setShowAddBrandModal}
            setShowAddModelModal={setShowAddModelModal}
            setNewModelBrand={setNewModelBrand}
            vehicleBrands={vehicleBrands}
            vehicleModels={vehicleModels}
            allVehicleModels={allVehicleModels}
            setVehicleModels={setVehicleModels}
            setSelectedBrandId={setSelectedBrandIdFromData}
            detectVehicleType={detectVehicleType}
            vehicleYears={vehicleYears}
            // Update functionality props
            openUpdateBrandModal={openUpdateBrandModal}
            openUpdateModelModal={openUpdateModelModal}
          />

          <ServiceSuggestions
            customerId={customerData.id}
            branchId={selectedBranchId || getCurrentBranchId()}
            vehicleType={vehicleType}
            selectedPackages={selectedPackages}
            onToggle={togglePackage}
            packages={packages}
          />

          <ServiceSelection
            vehicleData={vehicleData}
            vehicleType={vehicleType}
            setVehicleType={setVehicleType}
            setShowServiceModal={setShowServiceModal}
            setShowAddAddonModal={setShowAddAddonModal}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            serviceCategories={SERVICE_CATEGORIES}
            filteredPackages={filteredPackages}
            packages={packages}
            getVehicleTypePrice={getVehicleTypePrice}
            selectedPackages={selectedPackages}
            togglePackage={togglePackage}
            addons={addons}
            selectedAddons={selectedAddons}
            toggleAddon={toggleAddon}
            isBranchSelected={!!(selectedBranchId || getCurrentBranchId())}
          />

          <BookingAdditionalDetails
            pickupRequired={pickupRequired}
            setPickupRequired={setPickupRequired}
            pickupData={pickupData}
            setPickupData={setPickupData}
            notes={notes}
            setNotes={setNotes}
          />
        </div>

        {/* Right Column - Booking Summary (30%) */}
        <div className="lg:w-5/12">
          <div className="sticky top-6 space-y-6">
            {/* Booking Summary Panel */}
            <Card title="Booking Summary">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">
                      {customerData.name || "Not selected"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">
                      {customerData.phone || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vehicle:</span>
                    <span className="font-medium">
                      {vehicleData.brand && vehicleData.model
                        ? `${vehicleData.brand} ${vehicleData.model}`
                        : "Not selected"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vehicle Type:</span>
                    <span className="font-medium capitalize bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                      {vehicleType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Registration:</span>
                    <span className="font-medium">
                      {vehicleData.registration_number || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service(s):</span>
                    <span className="font-medium text-right max-w-[180px]">
                      {selectedPackagesDetails.length > 0
                        ? selectedPackagesDetails.map(pkg => pkg.name).join(', ')
                        : 'Not selected'}
                    </span>
                  </div>
                  {selectedAddonsDetails.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Add-ons:</span>
                      <span className="font-medium text-right">
                        {selectedAddonsDetails
                          .map((addon) => addon.name)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date &amp; Time:</span>
                    <span className="font-medium">
                      {bookingDateTime
                        ? new Date(bookingDateTime).toLocaleString()
                        : "Not selected"}
                    </span>
                  </div>
                  {pickupRequired && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pickup:</span>
                      <span className="font-medium">Yes</span>
                    </div>
                  )}
                  {/* Coupon Section */}
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Ticket size={16} className="text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">
                        Discount Coupon
                      </span>
                    </div>

                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-green-50 rounded-lg p-2 border border-green-200">
                        <div>
                          <span className="font-mono font-bold text-green-600">
                            {appliedCoupon.code}
                          </span>
                          <span className="text-xs text-gray-600 ml-2">
                            {appliedCoupon.coupon_type === 'free_service' || parseFloat(appliedCoupon.discount_percentage) === 100
                              ? <span className="font-bold text-green-700">FREE — 100% off</span>
                              : appliedCoupon.coupon_type === "percentage"
                                ? `${appliedCoupon.discount_percentage}% off`
                                : `₹${parseFloat(appliedCoupon.discount_amount || 0).toFixed(0)} off`}
                          </span>
                        </div>
                        <button
                          onClick={removeCoupon}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          title="Remove coupon"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter code"
                          value={couponCode}
                          onChange={(e) =>
                            setCouponCode(e.target.value.toUpperCase())
                          }
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                        <Button
                          onClick={applyCoupon}
                          disabled={couponLoading}
                          variant="outline"
                          size="sm"
                        >
                          {couponLoading ? "..." : "Apply"}
                        </Button>
                      </div>
                    )}

                    {couponError && (
                      <p className="text-xs text-red-600 mt-1">{couponError}</p>
                    )}
                  </div>
                  {selectedPackagesDetails.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Services Total:</span>
                      <span className="font-medium">
                        ₹{selectedPackagesDetails.reduce((sum, pkg) => {
                          const priceMap = {
                            hatchback: pkg.hatchback_price,
                            sedan: pkg.sedan_price,
                            suv: pkg.suv_price,
                            bike: pkg.bike_price,
                          };
                          return sum + (parseFloat(priceMap[vehicleType] || pkg.sedan_price || 0));
                        }, 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {selectedAddonsDetails.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Add-ons Price:</span>
                      <span className="font-medium">
                        ₹
                        {selectedAddonsDetails
                          .reduce(
                            (total, addon) =>
                              total + (parseFloat(addon.price) || 0),
                            0
                          )
                          .toFixed(2)}
                      </span>
                    </div>
                  )}
                  {/* Price Breakdown with GST and Discount */}
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">
                        ₹{calculateTotalPrice().subtotal}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 flex items-center gap-1">
                        GST
                        {calculateTotalPrice().gstRate > 0 && (
                          <span className="text-xs text-gray-500">
                            ({calculateTotalPrice().gstRate}%)
                          </span>
                        )}
                        :
                      </span>
                      <span className="font-medium">
                        ₹{calculateTotalPrice().gst}
                      </span>
                    </div>
                    {appliedCoupon &&
                      parseFloat(calculateTotalPrice().discount) > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span className="flex items-center gap-1">
                            <Ticket size={14} />
                            Discount:
                          </span>
                          <span className="font-medium">
                            -₹{calculateTotalPrice().discount}
                          </span>
                        </div>
                      )}

                    {referralDiscount && !customerData.id && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span className="flex items-center gap-1">
                          <Gift size={14} />
                          Referral Discount ({referralDiscount.display_text}):
                        </span>
                        <span className="font-medium">
                          -₹{calculateTotalPrice().referralDiscount}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-900 font-medium">
                        Total Price:
                      </span>
                      <span className="text-lg font-bold text-green-600">
                        ₹{calculateTotalPrice().total}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Branch Selection for Super Admin / Company Admin */}
                {(isSuperAdmin || isCompanyAdmin) && (
                  <div className="pt-2">
                    <Select
                      label="Select Branch"
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      options={[
                        { value: "", label: "Please select a branch" },
                        ...branches.map((branch) => ({
                          value: branch.id.toString(),
                          label: branch.name,
                        })),
                      ]}
                      required
                    />
                    {(isSuperAdmin || isCompanyAdmin) && !selectedBranchId && (
                      <p className="text-sm text-red-600 mt-1">
                        Please select a branch to create the booking
                      </p>
                    )}
                  </div>
                )}

                {/* Create Booking Button */}
                <div className="pt-4">
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || ((isSuperAdmin || isCompanyAdmin) && !selectedBranchId)}
                    className="w-full"
                  >
                    {loading ? "Creating Booking..." : "Create Booking"}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Brand Modal */}
      <Modal
        isOpen={showAddBrandModal}
        onClose={() => {
          setShowAddBrandModal(false);
          setNewBrandName("");
          // Clear any previous errors when closing
          if (error && error.includes("not supported")) {
            setError("");
          }
        }}
        title="Add New Brand"
      >
        <div className="space-y-4">
          <Input
            label="Brand Name"
            placeholder="Enter brand name"
            value={newBrandName}
            onChange={(e) => setNewBrandName(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddBrandModal(false);
                setNewBrandName("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddBrand}>Add Brand</Button>
          </div>
        </div>
      </Modal>

      {/* Add Model Modal */}
      <Modal
        isOpen={showAddModelModal}
        onClose={() => {
          setShowAddModelModal(false);
          setNewModelName("");
          setNewModelBrand("");
          setNewModelVehicleType("");
          // Clear any previous errors when closing
          if (error && error.includes("not supported")) {
            setError("");
          }
        }}
        title="Add New Model"
      >
        <div className="space-y-4">
          <Select
            label="Brand"
            value={newModelBrand}
            onChange={(e) => setNewModelBrand(e.target.value)}
            options={[
              { value: "", label: "Select a brand" },
              ...vehicleBrands.map((brand) => ({
                value: brand.name,
                label: brand.name,
              })),
            ]}
            required
          />
          <Input
            label="Model Name"
            placeholder="Enter model name"
            value={newModelName}
            onChange={(e) => setNewModelName(e.target.value)}
            required
          />

          {/* Vehicle Type Selection */}
          <div>
            <label className="label">Vehicle Type *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {["hatchback", "sedan", "suv", "bike"].map((type) => (
                <label
                  key={type}
                  className={`flex flex-col items-center p-2 border-2 rounded-lg cursor-pointer transition-all ${newModelVehicleType === type
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                    }`}
                >
                  <input
                    type="radio"
                    name="newModelVehicleType"
                    value={type}
                    checked={newModelVehicleType === type}
                    onChange={(e) => setNewModelVehicleType(e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-lg">
                    {type === "hatchback" && "🚗"}
                    {type === "sedan" && "🚙"}
                    {type === "suv" && "🚐"}
                    {type === "bike" && "🏍️"}
                  </span>
                  <span className="text-xs font-medium capitalize mt-1">
                    {type}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModelModal(false);
                setNewModelName("");
                setNewModelBrand("");
                setNewModelVehicleType("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddModel} disabled={!newModelVehicleType}>
              Add Model
            </Button>
          </div>
        </div>
      </Modal>

      {/* Service Package Modal */}
      <Modal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        title="Add Service Package"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setShowServiceModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateService}>Create</Button>
          </>
        }
      >
        <form
          onSubmit={handleCreateService}
          className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
        >
          <Input
            label="Service Name"
            value={serviceForm.name}
            onChange={(e) =>
              setServiceForm({ ...serviceForm, name: e.target.value })
            }
            required
          />

          {/* Service Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Tag size={14} className="inline mr-1" />
              Service Category
            </label>
            <select
              value={serviceForm.category}
              onChange={(e) =>
                setServiceForm({ ...serviceForm, category: e.target.value })
              }
              className="input w-full"
              required
            >
              {SERVICE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <Textarea
            label="Description"
            value={serviceForm.description}
            onChange={(e) =>
              setServiceForm({ ...serviceForm, description: e.target.value })
            }
            required
            rows={3}
          />

          {/* Vehicle-Type Pricing (Always Required) */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Car size={16} className="text-blue-600" />
              Pricing by Vehicle Type
            </h4>
            <p className="text-xs text-gray-600 mb-3">
              Set prices for each vehicle type:
            </p>
            {serviceForm.category === 'bike_services' ? (
              // For bike services, only show bike pricing
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    🏍️ Bike
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="₹"
                    value={serviceForm.bike_price}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        bike_price: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
            ) : (
              // For non-bike services, show all vehicle type pricing
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    🏍️ Bike
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="₹"
                    value={serviceForm.bike_price}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        bike_price: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    🚗 Hatchback
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="₹"
                    value={serviceForm.hatchback_price}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        hatchback_price: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    🚙 Sedan
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="₹"
                    value={serviceForm.sedan_price}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        sedan_price: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    🚐 SUV
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="₹"
                    value={serviceForm.suv_price}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        suv_price: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* GST Configuration */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="gst_applicable"
                  checked={serviceForm.gst_applicable}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      gst_applicable: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label
                  htmlFor="gst_applicable"
                  className="text-sm font-medium text-gray-700"
                >
                  GST Applicable
                </label>
              </div>
              {serviceForm.gst_applicable && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">GST Rate:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={serviceForm.gst_rate}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        gst_rate: e.target.value,
                      })
                    }
                    className="input w-20 text-center"
                  />
                  <span className="text-sm text-gray-600">%</span>
                </div>
              )}
            </div>
          </div>

          {/* Duration */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duration (minutes)"
              type="number"
              step="5"
              value={serviceForm.duration}
              onChange={(e) =>
                setServiceForm({ ...serviceForm, duration: e.target.value })
              }
              required
              icon={<Clock size={16} />}
            />
            <Input
              label="Max Duration (optional)"
              type="number"
              step="5"
              placeholder="e.g., 50"
              value={serviceForm.duration_max}
              onChange={(e) =>
                setServiceForm({ ...serviceForm, duration_max: e.target.value })
              }
              helperText="For range like 40-50 mins"
            />
          </div>

          {/* Branch Info - Branch Admin */}
          {!isSuperAdmin && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 flex items-center gap-1">
                <Building2 size={14} />
                <strong>Branch:</strong>{" "}
                {branches.find((b) => b.id === getCurrentBranchId())?.name ||
                  "Current Branch"}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                This service will be assigned to your branch automatically.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={serviceForm.is_active}
              onChange={(e) =>
                setServiceForm({ ...serviceForm, is_active: e.target.checked })
              }
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              Active (Available for booking)
            </label>
          </div>
        </form>
      </Modal>

      <ServicePackageModal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        handleCreateService={handleCreateService}
        serviceForm={serviceForm}
        setServiceForm={setServiceForm}
        serviceCategories={SERVICE_CATEGORIES}
        isSuperAdmin={isSuperAdmin}
        branches={branches}
        getCurrentBranchId={getCurrentBranchId}
      />

      <AddBrandModal
        isOpen={showAddBrandModal}
        onClose={() => {
          setShowAddBrandModal(false);
          setNewBrandName("");
          setNewBrandVehicleType("");
        }}
        newBrandName={newBrandName}
        setNewBrandName={setNewBrandName}
        newBrandVehicleType={newBrandVehicleType}
        setNewBrandVehicleType={setNewBrandVehicleType}
        handleAddBrand={handleAddBrand}
      />

      <AddModelModal
        isOpen={showAddModelModal}
        onClose={() => {
          setShowAddModelModal(false);
          setNewModelName("");
          setNewModelBrand("");
          setNewModelVehicleType("");
        }}
        newModelBrand={newModelBrand}
        setNewModelBrand={setNewModelBrand}
        newModelName={newModelName}
        setNewModelName={setNewModelName}
        newModelVehicleType={newModelVehicleType}
        setNewModelVehicleType={setNewModelVehicleType}
        handleAddModel={handleAddModel}
        vehicleBrands={vehicleBrands}
      />

      <UpdateBrandModal
        isOpen={showUpdateBrandModal}
        onClose={() => {
          setShowUpdateBrandModal(false);
          setBrandToEdit(null);
        }}
        brandToEdit={brandToEdit}
        setBrandToEdit={setBrandToEdit}
        handleUpdateBrand={handleUpdateBrand}
      />

      <UpdateModelModal
        isOpen={showUpdateModelModal}
        onClose={() => {
          setShowUpdateModelModal(false);
          setModelToEdit(null);
        }}
        modelToEdit={modelToEdit}
        setModelToEdit={setModelToEdit}
        handleUpdateModel={handleUpdateModel}
        vehicleBrands={vehicleBrands}
      />

      {/* Add Addon Modal */}
      <Modal
        isOpen={showAddAddonModal}
        onClose={() => {
          setShowAddAddonModal(false);
          setAddonForm({
            name: '',
            description: '',
            price: '',
            duration: '',
            is_active: true,
            is_global: isSuperAdmin,
            branch: isSuperAdmin ? null : getCurrentBranchId(),
          });
          setAddonFormErrors({});
        }}
        title="Add Add-on"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddAddonModal(false);
                setAddonForm({
                  name: '',
                  description: '',
                  price: '',
                  duration: '',
                  is_active: true,
                  is_global: isSuperAdmin,
                  branch: isSuperAdmin ? null : getCurrentBranchId(),
                });
                setAddonFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateAddon}>
              Create
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateAddon} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Add-on Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={addonForm.name}
              onChange={(e) => {
                setAddonForm({ ...addonForm, name: e.target.value });
                if (addonFormErrors.name) {
                  setAddonFormErrors({ ...addonFormErrors, name: '' });
                }
              }}
              className={addonFormErrors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
            />
            {addonFormErrors.name && (
              <p className="text-sm text-red-600">{addonFormErrors.name}</p>
            )}
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <Textarea
              value={addonForm.description}
              onChange={(e) => {
                setAddonForm({ ...addonForm, description: e.target.value });
                if (addonFormErrors.description) {
                  setAddonFormErrors({ ...addonFormErrors, description: '' });
                }
              }}
              className={addonFormErrors.description ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
              rows={3}
            />
            {addonFormErrors.description && (
              <p className="text-sm text-red-600">{addonFormErrors.description}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Price ($) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                value={addonForm.price}
                onChange={(e) => {
                  setAddonForm({ ...addonForm, price: e.target.value });
                  if (addonFormErrors.price) {
                    setAddonFormErrors({ ...addonFormErrors, price: '' });
                  }
                }}
                className={addonFormErrors.price ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
                required
              />
              {addonFormErrors.price && (
                <p className="text-sm text-red-600">{addonFormErrors.price}</p>
              )}
            </div>
            <Input
              label="Duration (minutes)"
              type="number"
              step="5"
              value={addonForm.duration}
              onChange={(e) => {
                setAddonForm({ ...addonForm, duration: e.target.value });
                if (addonFormErrors.duration) {
                  setAddonFormErrors({ ...addonFormErrors, duration: '' });
                }
              }}
              required
            />
          </div>

          {/* Branch Selection - Super Admin Only */}
          {isSuperAdmin && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_global_addon"
                  checked={addonForm.is_global}
                  onChange={(e) =>
                    setAddonForm({
                      ...addonForm,
                      is_global: e.target.checked,
                      branch: e.target.checked ? null : addonForm.branch
                    })
                  }
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="is_global_addon" className="text-sm text-gray-700">
                  Global Add-on (Available to all branches)
                </label>
              </div>

              {!addonForm.is_global && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Branch
                  </label>
                  <select
                    value={addonForm.branch || ''}
                    onChange={(e) =>
                      setAddonForm({ ...addonForm, branch: e.target.value || null })
                    }
                    className="input w-full"
                    required={!addonForm.is_global}
                  >
                    <option value="">Choose a branch...</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Branch Info - Branch Admin */}
          {!isSuperAdmin && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 flex items-center gap-1">
                <Building2 size={14} />
                <strong>Branch:</strong> {branches.find(b => b.id === getCurrentBranchId())?.name || 'Current Branch'}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                This add-on will be assigned to your branch automatically.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="addon_active"
              checked={addonForm.is_active}
              onChange={(e) =>
                setAddonForm({ ...addonForm, is_active: e.target.checked })
              }
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="addon_active" className="text-sm text-gray-700">
              Active (Available for selection)
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CreateWalkInBooking;