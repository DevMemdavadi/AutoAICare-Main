import { Alert, Badge, Button, Card, Input, Textarea, Autocomplete } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import api from '@/utils/api';
import { AlertCircle, Building2, Calendar, Car, CheckCircle, ChevronLeft, ChevronRight, Clock, Package, Plus, Ticket, X, Search } from 'lucide-react';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const BookingFlow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getCurrentBranchId } = useBranch();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const [vehicles, setVehicles] = useState([]);
  const [packages, setPackages] = useState([]);
  const [addons, setAddons] = useState([]);

  const [bookingData, setBookingData] = useState({
    vehicle: '',
    vehicle_type: 'sedan', // Default to sedan
    package: location.state?.packageId || '',
    selectedAddons: [],
    booking_datetime: '',
    pickup_required: false,
    pickup_address: '',
    notes: '',
  });

  const [newVehicle, setNewVehicle] = useState({
    registration_number: '',
    brand: '',
    model: '',
    year: '',
    color: 'Standard',
    vehicle_type: 'sedan',
  });

  const [showAddVehicle, setShowAddVehicle] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Membership state for auto-applying discounts
  const [membership, setMembership] = useState(null);

  // Vehicle data for autocomplete
  const [vehicleBrands, setVehicleBrands] = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);
  const [allVehicleModels, setAllVehicleModels] = useState([]);

  const currentYear = new Date().getFullYear();
  const vehicleYears = Array.from(
    { length: currentYear - 1989 },
    (_, i) => (1990 + i).toString()
  ).reverse();

  const registrationNumberRef = useRef(null);
  const brandInputRef = useRef(null);
  const modelInputRef = useRef(null);

  // Filter vehicles based on selected package (if any)
  const filteredVehiclesDisplay = useMemo(() => {
    if (!bookingData.package || packages.length === 0) return vehicles;

    const selectedPkg = packages.find(p => String(p.id) === String(bookingData.package));
    if (!selectedPkg) return vehicles;

    const isBikeService = selectedPkg.category === 'bike_services';
    return vehicles.filter(v => {
      const isBike = v.vehicle_type === 'bike';
      return isBikeService ? isBike : !isBike;
    });
  }, [vehicles, bookingData.package, packages]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch available coupons when package changes
  useEffect(() => {
    if (bookingData.package && currentStep >= 2) {
      fetchAvailableCoupons();
    }
  }, [bookingData.package, bookingData.vehicle_type]);

  const fetchAvailableCoupons = async () => {
    try {
      const selectedPackage = packages.find(p => p.id === parseInt(bookingData.package));
      if (!selectedPackage) return;

      const priceMap = {
        hatchback: selectedPackage.hatchback_price,
        sedan: selectedPackage.sedan_price,
        suv: selectedPackage.suv_price,
        bike: selectedPackage.bike_price,
      };
      const amount = priceMap[bookingData.vehicle_type] || selectedPackage.sedan_price || selectedPackage.price;

      const response = await api.get('/memberships/coupons/available_for_service/', {
        params: {
          service_id: bookingData.package,
          booking_amount: amount
        }
      });

      // Backend returns { coupons: [...], total_coupons: N }
      const coupons = response.data.coupons || response.data.results || [];
      setAvailableCoupons(coupons);

      // Auto-apply the best coupon if none applied yet
      if (coupons.length > 0 && !appliedCoupon) {
        setAppliedCoupon(coupons[0]); // Backend returns them sorted by discount
      }
    } catch (error) {
      console.error('Error fetching available coupons:', error);
    }
  };

  const formatDuration = (min, max) => {
    if (!min) return '30m';
    const hours = Math.floor(min / 60);
    const minutes = min % 60;

    if (max && max !== min) {
      const maxHours = Math.floor(max / 60);
      const maxMinutes = max % 60;
      if (hours === maxHours) {
        return minutes === maxMinutes ? `${hours}h ${minutes}m` : `${hours}h ${minutes}-${maxMinutes}m`;
      }
      return `${hours}-${maxHours} hrs`;
    }
    return hours > 0 ? `${hours}h ${minutes > 0 ? minutes + 'm' : ''}` : `${minutes}m`;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      wash: 'Wash',
      interior: 'Interior',
      exterior: 'Exterior',
      coating: 'Coating',
      makeover: 'Makeover',
      mechanical: 'Mechanical',
      ac_service: 'AC Service',
      polish: 'Polish',
      bike_services: 'Bike',
      other: 'Other',
    };
    return labels[category] || 'Service';
  };

  const fetchInitialData = async () => {
    try {
      const branchId = getCurrentBranchId();
      const params = branchId ? { branch: branchId } : {};

      const [vehiclesRes, packagesRes, addonsRes] = await Promise.all([
        api.get('/customers/vehicles/'),
        api.get('/services/packages/', { params }),
        api.get('/services/addons/', { params }),
      ]);
      setVehicles(vehiclesRes.data.results || vehiclesRes.data || []);
      setPackages(packagesRes.data.results || packagesRes.data || []);
      setAddons(addonsRes.data.results || addonsRes.data || []);

      // Load vehicle data
      const [brandsRes, modelsRes] = await Promise.all([
        api.get('/customers/vehicle-brands/'),
        api.get('/customers/vehicle-models/'),
      ]);
      setVehicleBrands(brandsRes.data.results || brandsRes.data || []);
      const modelsData = modelsRes.data.results || modelsRes.data || [];
      setAllVehicleModels(modelsData);
      setVehicleModels(modelsData);

      // Fetch user's active membership for auto-applying discount
      try {
        const membershipRes = await api.get('/memberships/subscriptions/my_active_membership/');
        const data = membershipRes.data;
        setMembership(data.has_membership === false ? null : data);
      } catch (e) {
        setMembership(null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load booking data');
    }
  };

  const detectVehicleType = async (brand, model) => {
    if (!brand || !model) return;

    // First try to detect from local data for instant feedback
    const modelObj = allVehicleModels.find(m =>
      (m.brand_name === brand || m.brand === brand) && m.name === model
    );
    if (modelObj && modelObj.vehicle_type) {
      setBookingData(prev => ({ ...prev, vehicle_type: modelObj.vehicle_type }));
      setNewVehicle(prev => ({ ...prev, vehicle_type: modelObj.vehicle_type }));
      return;
    }

    const brandObj = vehicleBrands.find(b => b.name === brand || b.id === brand);
    if (brandObj && brandObj.vehicle_type === 'bike') {
      setBookingData(prev => ({ ...prev, vehicle_type: 'bike' }));
      setNewVehicle(prev => ({ ...prev, vehicle_type: 'bike' }));
      return;
    }

    // Fallback to API
    try {
      const response = await api.get('/customers/vehicle-models/detect-type/', {
        params: { brand, model }
      });
      if (response.data.matched && response.data.vehicle_type) {
        setBookingData(prev => ({ ...prev, vehicle_type: response.data.vehicle_type }));
        setNewVehicle(prev => ({ ...prev, vehicle_type: response.data.vehicle_type }));
      }
    } catch (error) {
      console.error('Error detecting vehicle type:', error);
    }
  };

  const handleToggleAddon = (addonId) => {
    setBookingData(prev => ({
      ...prev,
      selectedAddons: prev.selectedAddons.includes(addonId)
        ? prev.selectedAddons.filter(id => id !== addonId)
        : [...prev.selectedAddons, addonId]
    }));
  };

  const calculateTotal = () => {
    const selectedPackage = packages.find(p => p.id === parseInt(bookingData.package));
    const selectedAddonsList = addons.filter(a => bookingData.selectedAddons.includes(a.id));

    // Always get package price based on vehicle type
    const priceMap = {
      hatchback: selectedPackage?.hatchback_price,
      sedan: selectedPackage?.sedan_price,
      suv: selectedPackage?.suv_price,
      bike: selectedPackage?.bike_price,
    };
    const vehiclePrice = priceMap[bookingData.vehicle_type];
    const packagePrice = parseFloat(vehiclePrice != null ? vehiclePrice : (selectedPackage?.price || 0));

    // Calculate addons
    const addonsPrice = selectedAddonsList.reduce((sum, addon) => sum + parseFloat(addon.price || 0), 0);
    const subtotal = packagePrice + addonsPrice;

    // Calculate GST
    const packageGst = selectedPackage?.gst_applicable ? (packagePrice * parseFloat(selectedPackage.gst_rate || 0)) / 100 : 0;
    const addonsGst = selectedAddonsList.reduce((sum, addon) => {
      if (addon.gst_applicable) {
        return sum + (parseFloat(addon.price || 0) * parseFloat(addon.gst_rate || 0)) / 100;
      }
      return sum;
    }, 0);
    const totalGst = packageGst + addonsGst;

    // Calculate membership discount (auto-applied BASE discount)
    let membershipDiscount = 0;
    if (membership && membership.discount_percentage) {
      membershipDiscount = (subtotal * parseFloat(membership.discount_percentage)) / 100;
    }

    // Calculate coupon discount (membership benefit or manual code)
    let couponDiscount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.calculated_discount !== undefined && appliedCoupon.calculated_discount !== null) {
        // Use the backend-calculated discount for this specific service
        couponDiscount = parseFloat(appliedCoupon.calculated_discount);
      } else {
        // Fallback to manual calculation for code-based coupons
        const afterMembershipSubtotal = subtotal - membershipDiscount;
        if (appliedCoupon.coupon_type === 'free_service') {
          // Free service = full subtotal discount
          couponDiscount = afterMembershipSubtotal;
        } else if (appliedCoupon.coupon_type === 'percentage') {
          const pct = parseFloat(appliedCoupon.discount_percentage) || 0;
          couponDiscount = (afterMembershipSubtotal * pct) / 100;
          if (appliedCoupon.max_discount && couponDiscount > parseFloat(appliedCoupon.max_discount)) {
            couponDiscount = parseFloat(appliedCoupon.max_discount);
          }
        } else if (appliedCoupon.coupon_type === 'fixed') {
          couponDiscount = Math.min(parseFloat(appliedCoupon.discount_amount) || 0, afterMembershipSubtotal);
        }
      }

      // If it's a specific membership benefit (has a benefit_usage or source_benefit), 
      // it might replace the general membership discount for this service.
      // For now, let's assume we take the BETTER of the two or the coupon if it's a benefit.
      if (appliedCoupon.benefit_usage && couponDiscount > membershipDiscount) {
        // Use only the coupon discount if it's better than the general membership discount
        membershipDiscount = 0;
      }
    }

    const totalDiscount = membershipDiscount + couponDiscount;
    const total = subtotal + totalGst - totalDiscount;

    return {
      packagePrice: packagePrice.toFixed(2),
      addonsPrice: addonsPrice.toFixed(2),
      subtotal: subtotal.toFixed(2),
      packageGst: packageGst.toFixed(2),
      addonsGst: addonsGst.toFixed(2),
      gst: totalGst.toFixed(2),
      membershipDiscount: membershipDiscount.toFixed(2),
      couponDiscount: couponDiscount.toFixed(2),
      discount: totalDiscount.toFixed(2),
      total: Math.max(0, total).toFixed(2),
      hasMembership: !!membership,
      membershipPlanName: membership?.plan_name || '',
      membershipDiscountPercent: membership?.discount_percentage || 0,
    };
  };

  // Apply coupon
  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    setCouponLoading(true);
    setCouponError('');

    try {
      const response = await api.post('/memberships/coupons/validate/', {
        code: couponCode.toUpperCase(),
        order_value: parseFloat(calculateTotal().subtotal),
        vehicle_id: bookingData.vehicle || undefined,
      });

      if (response.data.valid) {
        setAppliedCoupon(response.data.coupon);
        setCouponCode('');
        setAlert({ show: true, type: 'success', message: 'Coupon applied successfully!' });
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

  // Remove applied coupon
  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!bookingData.vehicle) {
          setError('Please select a vehicle');
          return false;
        }
        break;
      case 2:
        if (!bookingData.package) {
          setError('Please select a service package');
          return false;
        }
        break;
      case 3:
        if (!bookingData.booking_datetime) {
          setError('Please select date and time');
          return false;
        }
        if (bookingData.pickup_required && !bookingData.pickup_address) {
          setError('Please enter pickup address');
          return false;
        }
        break;
    }
    setError('');
    return true;
  };

  const handleNext = async () => {
    if (currentStep === 1 && showAddVehicle) {
      if (!newVehicle.registration_number || !newVehicle.brand || !newVehicle.model || !newVehicle.year) {
        setError('Please fill in all vehicle details');
        return;
      }
      setLoading(true);
      try {
        const vehicleToSave = {
          ...newVehicle,
          year: parseInt(newVehicle.year) || null,
          color: newVehicle.color || 'Standard'
        };
        const response = await api.post('/customers/vehicles/', vehicleToSave);
        const newVehicleData = response.data;
        setVehicles(prev => [...prev, newVehicleData]);
        setBookingData(prev => ({
          ...prev,
          vehicle: String(newVehicleData.id),
          vehicle_type: newVehicleData.vehicle_type || prev.vehicle_type
        }));
        setShowAddVehicle(false);
        setNewVehicle({
          registration_number: '',
          brand: '',
          model: '',
          year: '',
          color: 'Standard',
          vehicle_type: 'sedan',
        });
        // Clear error and proceed to next step immediately
        setError('');
        setCurrentStep(currentStep + 1);
        return;
      } catch (error) {
        console.error('Error adding vehicle:', error);
        setError(error.response?.data?.registration_number?.[0] || 'Failed to save vehicle. Please check all details.');
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    } else {
      navigate('/customer/appointments');
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    try {
      setLoading(true);
      const payload = {
        vehicle: bookingData.vehicle,
        vehicle_type: bookingData.vehicle_type,
        package: bookingData.package,
        preferred_datetime: bookingData.booking_datetime,
        pickup_required: bookingData.pickup_required,
        location: bookingData.pickup_address || '',
        notes: bookingData.notes || '',
        addon_ids: bookingData.selectedAddons,
        coupon: appliedCoupon ? appliedCoupon.id : null
      };

      await api.post('/appointments/', payload);
      setAlert({
        show: true,
        type: 'success',
        message: 'Appointment request submitted successfully! Redirecting...'
      });

      setTimeout(() => {
        navigate('/customer/appointments');
      }, 2000);
    } catch (error) {
      console.error('Error creating appointment:', error);
      setError(error.response?.data?.message || error.response?.data?.detail || 'Failed to submit appointment request');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, name: 'Vehicle', icon: Car },
    { number: 2, name: 'Service', icon: Package },
    { number: 3, name: 'Schedule', icon: Calendar },
    { number: 4, name: 'Review', icon: CheckCircle },
  ];

  const selectedPackage = packages.find(p => p.id === parseInt(bookingData.package));
  const selectedVehicle = vehicles.find(v => v.id === parseInt(bookingData.vehicle));
  const selectedAddonsList = addons.filter(a => bookingData.selectedAddons.includes(a.id));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Alert Component */}
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: '', message: '' })}
        />
      )}

      {/* Branch Not Set Warning */}
      {!user?.branch && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 mb-1">Branch Not Set</h3>
              <p className="text-sm text-yellow-700 mb-2">
                You haven't selected a preferred branch yet. Please update your profile with your nearest branch before booking.
              </p>
              <Button
                size="sm"
                onClick={() => navigate('/customer/profile')}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Go to Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900">Request Appointment</h1>

      {/* Progress Steps */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[320px]">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 ${currentStep > step.number
                  ? 'bg-green-500 border-green-500 text-white'
                  : currentStep === step.number
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                  {currentStep > step.number ? (
                    <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />
                  ) : (
                    <step.icon className="w-5 h-5 md:w-6 md:h-6" />
                  )}
                </div>
                <p className={`text-[10px] md:text-sm font-medium mt-2 whitespace-nowrap ${currentStep >= step.number ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                  {step.name}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-0.5 md:h-1 flex-1 mx-2 md:mx-4 ${currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Step 1: Select Vehicle */}
      {currentStep === 1 && (
        <Card title="Vehicle Details">
          <div className="space-y-6 p-6">
            {!showAddVehicle ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredVehiclesDisplay.map((vehicle) => (
                    <label
                      key={vehicle.id}
                      className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${String(bookingData.vehicle) === String(vehicle.id)
                        ? 'border-primary bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <input
                        type="radio"
                        name="vehicle"
                        value={vehicle.id}
                        checked={String(bookingData.vehicle) === String(vehicle.id)}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const selectedObj = vehicles.find(v => String(v.id) === String(selectedId));

                          setBookingData(prev => ({
                            ...prev,
                            vehicle: String(selectedId),
                            vehicle_type: selectedObj?.vehicle_type || 'sedan'
                          }));
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{vehicle.registration_number}</p>
                        <p className="text-sm text-gray-600">
                          {vehicle.brand} {vehicle.model} ({vehicle.year})
                        </p>
                        {vehicle.vehicle_type && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {vehicle.vehicle_type_display || vehicle.vehicle_type}
                            </span>
                          </div>
                        )}
                      </div>
                      <Car className="text-gray-400" size={24} />
                    </label>
                  ))}
                  {/* Show "No vehicles found" message if filtered results are empty */}
                  {filteredVehiclesDisplay.length === 0 && vehicles.length > 0 && (
                    <div className="col-span-full p-6 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                      <Car size={32} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">
                        {packages.find(p => String(p.id) === String(bookingData.package))?.category === 'bike_services'
                          ? "You don't have any bikes added. Please add your bike to continue."
                          : "You don't have any cars added for this car service. Please add your car to continue."}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      // Set the correct default type for the new vehicle form
                      const selectedPkg = packages.find(p => String(p.id) === String(bookingData.package));
                      if (selectedPkg) {
                        setNewVehicle(prev => ({
                          ...prev,
                          vehicle_type: selectedPkg.category === 'bike_services' ? 'bike' : 'sedan'
                        }));
                      }
                      setShowAddVehicle(true);
                    }}
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary-50 transition-all group aspect-video md:aspect-auto"
                  >
                    <Plus className="text-gray-400 group-hover:text-primary mb-2" size={32} />
                    <span className="text-sm font-medium text-gray-500 group-hover:text-primary">Add New Vehicle</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="transition-all duration-300 ring-2 ring-blue-500 ring-opacity-50 rounded-lg p-1 -m-1">
                <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <Plus className="h-5 w-5 text-blue-500" size={20} />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-semibold text-blue-800">
                        Adding New Vehicle
                      </h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Enter details for the new vehicle below
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-3 pb-4">
                  <Input
                    ref={registrationNumberRef}
                    label="Registration Number"
                    placeholder="Registration number"
                    value={newVehicle.registration_number}
                    onChange={(e) => setNewVehicle({ ...newVehicle, registration_number: e.target.value })}
                    required
                  />
                  <Autocomplete
                    label="Year*"
                    placeholder="Select year..."
                    options={vehicleYears}
                    value={newVehicle.year}
                    onChange={(value) => setNewVehicle({ ...newVehicle, year: value })}
                    required
                  />

                  <div className="space-y-2">
                    <label className="label text-sm font-medium text-gray-700">Brand*</label>
                    <Autocomplete
                      ref={brandInputRef}
                      placeholder="Search brand..."
                      options={vehicleBrands.map(b => b.name)}
                      value={newVehicle.brand}
                      onChange={(value) => {
                        setNewVehicle({ ...newVehicle, brand: value, model: '' });
                        const brandObj = vehicleBrands.find(b => b.name === value);
                        if (brandObj) {
                          setVehicleModels(allVehicleModels.filter(m => m.brand === brandObj.id || m.brand_name === brandObj.name));
                          if (brandObj.vehicle_type === 'bike') {
                            setBookingData(prev => ({ ...prev, vehicle_type: 'bike' }));
                            setNewVehicle(prev => ({ ...prev, vehicle_type: 'bike' }));
                          }
                        }
                      }}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="label text-sm font-medium text-gray-700">Model*</label>
                    <Autocomplete
                      ref={modelInputRef}
                      placeholder="Search model..."
                      options={vehicleModels.map(m => m.name)}
                      value={newVehicle.model}
                      onChange={(value) => {
                        setNewVehicle({ ...newVehicle, model: value });
                        detectVehicleType(newVehicle.brand, value);
                      }}
                      disabled={!newVehicle.brand}
                      required
                    />
                  </div>

                </div>

                <div className="flex justify-end p-2 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddVehicle(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Vehicle Type Selection - Show if vehicle selected or adding new one */}
            {(bookingData.vehicle || showAddVehicle) && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5 mt-6">
                <p className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Car size={18} className="text-blue-600" />
                  Vehicle Type
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { value: 'hatchback', label: 'Hatchback', icon: '🚗' },
                    { value: 'sedan', label: 'Sedan', icon: '🚙' },
                    { value: 'suv', label: 'SUV', icon: '🚐' },
                    { value: 'bike', label: 'Bike', icon: '🏍️' },
                  ].map((type) => (
                    <label
                      key={type.value}
                      className={`flex flex-col items-center p-3 border-2 rounded-xl cursor-pointer transition-all ${bookingData.vehicle_type === type.value
                        ? 'border-primary bg-white shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                    >
                      <input
                        type="radio"
                        name="vehicle_type"
                        value={type.value}
                        checked={bookingData.vehicle_type === type.value}
                        onChange={(e) => {
                          setBookingData({ ...bookingData, vehicle_type: e.target.value });
                          setNewVehicle(prev => ({ ...prev, vehicle_type: e.target.value }));
                        }}
                        className="sr-only"
                      />
                      <span className="text-xl md:text-2xl mb-1">{type.icon}</span>
                      <span className="text-[10px] md:text-xs font-semibold text-gray-900">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}


      {/* Step 2: Select Service Package */}
      {currentStep === 2 && (
        <>
          <Card title="Select Service Package">
            <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
              {bookingData.vehicle_type === 'bike' ? <div className="text-xl">🏍️</div> : <Car size={18} className="text-blue-600" />}
              <span className="text-sm text-blue-800">
                Showing <strong>{bookingData.vehicle_type === 'bike' ? 'bike' : 'car'} services</strong> for <strong className="capitalize">{bookingData.vehicle_type}</strong>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {packages
                .filter(p => {
                  if (!p.is_active) return false;
                  const isBikeService = p.category === 'bike_services';
                  const isUserOnBike = bookingData.vehicle_type === 'bike';

                  // Filter by category
                  if (isUserOnBike) {
                    if (!isBikeService) return false;
                  } else {
                    if (isBikeService) return false;
                  }

                  // Filter by price availability
                  const priceMap = {
                    hatchback: p.hatchback_price,
                    sedan: p.sedan_price,
                    suv: p.suv_price,
                    bike: p.bike_price,
                  };
                  const price = parseFloat(priceMap[bookingData.vehicle_type] || 0);
                  return price > 0;
                })
                .map((pkg) => {
                  const priceMap = {
                    hatchback: pkg.hatchback_price,
                    sedan: pkg.sedan_price,
                    suv: pkg.suv_price,
                    bike: pkg.bike_price,
                  };
                  const displayPrice = priceMap[bookingData.vehicle_type];
                  const isSelected = bookingData.package === pkg.id;

                  return (
                    <div
                      key={pkg.id}
                      className={`relative border-2 rounded-xl p-5 cursor-pointer transition-all ${isSelected
                        ? "border-primary bg-primary-50 shadow-md"
                        : "border-gray-200 hover:border-primary/50 hover:shadow-sm"
                        }`}
                      onClick={() => setBookingData({ ...bookingData, package: pkg.id })}
                    >
                      {/* Category Badge & Selected Check */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                          {getCategoryLabel(pkg.category)}
                        </span>
                        {isSelected && (
                          <CheckCircle className="text-primary" size={20} />
                        )}
                      </div>

                      {/* Package Name */}
                      <h4 className="font-bold text-lg text-gray-900 mb-1 leading-tight">
                        {pkg.name}
                      </h4>

                      {/* Description */}
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[2.5rem]">
                        {pkg.description}
                      </p>

                      {/* Price & Duration */}
                      <div className="flex items-end justify-between mb-4">
                        <div>
                          <div className="text-2xl font-black text-green-600">
                            ₹{parseFloat(displayPrice || 0).toFixed(0)}
                          </div>
                          {pkg.gst_applicable && (
                            <div className="text-xs font-medium text-gray-500">
                              +{parseFloat(pkg.gst_rate || 0).toFixed(0)}% GST
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                          <Clock size={14} />
                          <span>{formatDuration(pkg.duration || pkg.duration_hours * 60, pkg.duration_max)}</span>
                        </div>
                      </div>

                      {/* Expandable: Other Vehicle Type Prices */}
                      <details className="group border-t border-gray-100 pt-3">
                        <summary className="cursor-pointer text-xs text-primary hover:text-primary-600 font-bold list-none flex items-center gap-1">
                          <span>View other prices</span>
                          <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        <div className="mt-3 space-y-2">
                          {[
                            { key: 'hatchback', label: 'Hatchback', icon: '🚗' },
                            { key: 'sedan', label: 'Sedan', icon: '🚙' },
                            { key: 'suv', label: 'SUV', icon: '🚐' },
                            { key: 'bike', label: 'Bike', icon: '🏍️' },
                          ].map((type) => {
                            const price = parseFloat(pkg[`${type.key}_price`] || 0);
                            if (price <= 0) return null;
                            return (
                              <div key={type.key} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-100">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{type.icon}</span>
                                  <span className="text-xs font-bold text-gray-700">{type.label}</span>
                                </div>
                                <span className="text-xs font-black text-green-600">₹{price.toFixed(0)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    </div>
                  );
                })}
            </div>
          </Card>

          <Card title="Select Add-ons (Optional)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
              {addons.filter(a => a.is_active).map((addon) => (
                <label
                  key={addon.id}
                  className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${bookingData.selectedAddons.includes(addon.id)
                    ? 'border-primary bg-primary-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={bookingData.selectedAddons.includes(addon.id)}
                    onChange={() => handleToggleAddon(addon.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-bold text-gray-900">{addon.name}</p>
                      <span className="font-black text-green-600">+₹{addon.price}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{addon.description}</p>
                    {addon.duration > 0 && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-md shadow-sm">
                        <Clock size={12} />
                        <span>+{formatDuration(addon.duration)}</span>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Step 3: Schedule */}
      {currentStep === 3 && (
        <Card title="Schedule Your Service">
          <div className="space-y-6 p-6">
            <Input
              label="Select Date & Time"
              type="datetime-local"
              value={bookingData.booking_datetime}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) => setBookingData({ ...bookingData, booking_datetime: e.target.value })}
              required
            />

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="pickup_required"
                checked={bookingData.pickup_required}
                onChange={(e) => setBookingData({ ...bookingData, pickup_required: e.target.checked })}
                className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="pickup_required" className="flex-1">
                <p className="font-medium text-gray-900">Request Pickup & Drop Service</p>
                <p className="text-sm text-gray-600">We'll pick up your vehicle and deliver it back to you</p>
              </label>
            </div>

            {bookingData.pickup_required && (
              <Textarea
                label="Pickup Address"
                value={bookingData.pickup_address}
                onChange={(e) => setBookingData({ ...bookingData, pickup_address: e.target.value })}
                placeholder="Enter your pickup address..."
                rows={3}
                required
              />
            )}

            <Textarea
              label="Additional Notes (Optional)"
              value={bookingData.notes}
              onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
              placeholder="Any special requests or instructions..."
              rows={3}
            />
          </div>
        </Card>
      )}

      {/* Step 4: Review & Request */}
      {currentStep === 4 && (
        <Card title="Review Your Appointment Request">
          <div className="space-y-6 p-6">
            {/* Vehicle */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600 mb-2">Vehicle</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">{selectedVehicle?.registration_number}</p>
                  <p className="text-sm text-gray-600">
                    {selectedVehicle?.brand} {selectedVehicle?.model} ({selectedVehicle?.year})
                  </p>
                </div>
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold capitalize">
                  {bookingData.vehicle_type}
                </div>
              </div>
            </div>

            {/* Service Package */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600 mb-2">Service Package</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">{selectedPackage?.name}</p>
                  <p className="text-sm text-gray-600">Duration: {selectedPackage?.duration} mins</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Price for {bookingData.vehicle_type}
                  </p>
                </div>
                <span className="text-xl font-bold text-green-600">
                  ₹{(() => {
                    const priceMap = {
                      hatchback: selectedPackage?.hatchback_price,
                      sedan: selectedPackage?.sedan_price,
                      suv: selectedPackage?.suv_price,
                      bike: selectedPackage?.bike_price,
                    };
                    return priceMap[bookingData.vehicle_type] || selectedPackage?.bike_price || 0;
                  })()}
                </span>
              </div>
            </div>

            {/* Add-ons */}
            {selectedAddonsList.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600 mb-2">Add-ons</p>
                <div className="space-y-2">
                  {selectedAddonsList.map(addon => (
                    <div key={addon.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-900">{addon.name}</p>
                        {addon.duration > 0 && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock size={10} />
                            {addon.duration} mins
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-bold text-green-600">+₹{addon.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Schedule */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600 mb-2">Scheduled For</p>
              <p className="font-bold text-gray-900">
                {new Date(bookingData.booking_datetime).toLocaleString()}
              </p>
              {bookingData.pickup_required && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-600">Pickup Address</p>
                  <p className="text-sm text-gray-900">{bookingData.pickup_address}</p>
                </div>
              )}
            </div>

            {/* Membership Discount Banner (if member) */}
            {/* {calculateTotal().hasMembership && (
              <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-400 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-900"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" /></svg>
                  </div>
                  <div>
                    <p className="font-bold">{calculateTotal().membershipPlanName} Member</p>
                    <p className="text-sm opacity-90">{calculateTotal().membershipDiscountPercent}% discount auto-applied!</p>
                  </div>
                </div>
              </div>
            )} */}

            {/* Coupon & Benefits Section */}
            {/* <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Ticket size={18} className="text-purple-600" />
                <p className="font-medium text-gray-900">Apply Membership Benefit or Coupon</p>
              </div>

              {availableCoupons.length > 0 && !appliedCoupon && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Available Membership Benefits</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableCoupons.map((coupon) => (
                      <button
                        key={coupon.id}
                        onClick={() => setAppliedCoupon(coupon)}
                        className="flex flex-col items-start p-3 bg-white border-2 border-purple-100 rounded-lg hover:border-purple-300 transition-all text-left group"
                      >
                        <span className="font-bold text-purple-700 group-hover:text-purple-800">
                          {coupon.coupon_type === 'free_service' || parseFloat(coupon.discount_percentage) === 100
                            ? 'FREE'
                            : coupon.coupon_type === 'percentage'
                              ? `${coupon.discount_percentage}% OFF`
                              : `₹${coupon.discount_amount} OFF`}
                        </span>
                        <span className="text-xs text-gray-500 line-clamp-1">
                          {coupon.benefit_name || 'Membership Perk'}
                        </span>
                        <span className="text-[10px] text-purple-400 mt-1">Click to apply</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-white rounded-lg p-3 border-2 border-green-300">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono font-bold text-green-600">{appliedCoupon.code}</p>
                      <Badge variant="success" size="sm">Applied</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {appliedCoupon.coupon_type === 'free_service' || parseFloat(appliedCoupon.discount_percentage) === 100
                        ? <span className="font-bold text-green-700">FREE — 100% off this service</span>
                        : appliedCoupon.coupon_type === 'percentage'
                          ? `${appliedCoupon.discount_percentage}% off`
                          : `₹${appliedCoupon.discount_amount} off`}
                      {appliedCoupon.benefit_name && <span className="ml-1 text-purple-600">• {appliedCoupon.benefit_name}</span>}
                    </p>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove coupon"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter manual coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono uppercase text-sm"
                  />
                  <Button
                    onClick={applyCoupon}
                    disabled={couponLoading}
                    variant="outline"
                    className="whitespace-nowrap"
                  >
                    {couponLoading ? 'Checking...' : 'Apply'}
                  </Button>
                </div>
              )}

              {couponError && (
                <p className="text-sm text-red-600 mt-2">{couponError}</p>
              )}
            </div> */}

            {/* Detailed Price Breakdown with GST and Discounts */}
            <div className="p-4 bg-gradient-to-r from-primary-50 to-green-50 border-2 border-primary rounded-lg">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 18V6" /></svg>
                Price Breakdown
              </h4>
              <div className="space-y-3">
                {/* Package Price */}
                <div className="flex items-center justify-between text-gray-700">
                  <span className="flex items-center gap-2">
                    <Package size={16} className="text-blue-500" />
                    Service Package
                  </span>
                  <span className="font-medium">₹{calculateTotal().packagePrice}</span>
                </div>

                {/* Addons */}
                {parseFloat(calculateTotal().addonsPrice) > 0 && (
                  <div className="flex items-center justify-between text-gray-700">
                    <span className="ml-6">+ Add-ons</span>
                    <span className="font-medium">₹{calculateTotal().addonsPrice}</span>
                  </div>
                )}

                {/* Subtotal */}
                <div className="flex items-center justify-between text-gray-900 font-medium border-t border-gray-200 pt-2">
                  <span>Subtotal</span>
                  <span>₹{calculateTotal().subtotal}</span>
                </div>

                {/* GST */}
                <div className="flex items-center justify-between text-gray-600 text-sm">
                  <span className="flex items-center gap-1">
                    GST
                    <span className="text-xs px-2 py-0.5 bg-gray-200 rounded">
                      {selectedPackage?.gst_rate || 18}%
                    </span>
                  </span>
                  <span>₹{calculateTotal().gst}</span>
                </div>

                {/* Membership Discount */}
                {parseFloat(calculateTotal().membershipDiscount) > 0 && (
                  <div className="flex items-center justify-between text-purple-600 bg-purple-50 px-3 py-2 rounded-lg -mx-2">
                    <span className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" /></svg>
                      Member Discount ({calculateTotal().membershipDiscountPercent}%)
                    </span>
                    <span className="font-bold">-₹{calculateTotal().membershipDiscount}</span>
                  </div>
                )}

                {/* Coupon Discount */}
                {appliedCoupon && parseFloat(calculateTotal().couponDiscount) > 0 && (
                  <div className="flex items-center justify-between text-green-600 bg-green-50 px-3 py-2 rounded-lg -mx-2">
                    <span className="flex items-center gap-2">
                      <Ticket size={16} />
                      Coupon Discount
                    </span>
                    <span className="font-bold">-₹{calculateTotal().couponDiscount}</span>
                  </div>
                )}

                {/* Total */}
                <div className="border-t-2 border-gray-300 pt-4 mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-gray-900">Total Amount</p>
                    <p className="text-xs text-gray-500">Inclusive of all taxes</p>
                  </div>
                  <span className="text-3xl font-bold text-primary">₹{calculateTotal().total}</span>
                </div>

                {/* Savings Badge */}
                {parseFloat(calculateTotal().discount) > 0 && (
                  <div className="text-center">
                    <span className="inline-block bg-green-100 text-green-800 text-sm font-medium px-4 py-1 rounded-full">
                      🎉 You save ₹{calculateTotal().discount}!
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
        <Button
          onClick={handleBack}
          variant="outline"
          disabled={loading}
          className="w-full sm:w-auto"
        >
          Back
        </Button>

        {currentStep < 4 ? (
          <Button onClick={handleNext} className="w-full sm:w-auto">
            Next
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Submitting...' : 'Request Appointment'}
          </Button>
        )}
      </div>

    </div>
  );
};

export default BookingFlow;