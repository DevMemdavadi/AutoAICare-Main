import { Alert, Badge, Button, Card, Input, Textarea } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import api from '@/utils/api';
import { AlertCircle, Calendar, Car, CheckCircle, ChevronRight, Clock, Package, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

/**
 * Fast & Selective Appointment Request Flow
 * Simplified 3-step process for quick customer appointment submission
 */
const AppointmentRequest = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { getCurrentBranchId } = useBranch();
    const { user } = useAuth();

    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Data states
    const [vehicles, setVehicles] = useState([]);
    const [packages, setPackages] = useState([]);
    const [availableSlots, setAvailableSlots] = useState([]);

    // Form state - minimal required fields
    const [formData, setFormData] = useState({
        vehicle: location.state?.vehicleId || '',
        vehicle_type: 'sedan',
        package: location.state?.packageId || '',
        preferred_datetime: '',
        alternate_datetime: '',
        pickup_required: false,
        location: '',
        notes: '',
    });

    // Load initial data
    useEffect(() => {
        fetchInitialData();
    }, []);

    // Fetch available slots when date changes
    useEffect(() => {
        if (formData.preferred_datetime) {
            fetchAvailableSlots(formData.preferred_datetime.split('T')[0]);
        }
    }, [formData.preferred_datetime]);

    const fetchInitialData = async () => {
        try {
            const branchId = getCurrentBranchId();
            const params = branchId ? { branch: branchId } : {};

            const [vehiclesRes, packagesRes] = await Promise.all([
                api.get('/customers/vehicles/'),
                api.get('/services/packages/', { params }),
            ]);

            const vehicleList = vehiclesRes.data.results || vehiclesRes.data || [];
            setVehicles(vehicleList);
            setPackages(packagesRes.data.results || packagesRes.data || []);

            // Auto-select first vehicle if only one
            if (vehicleList.length === 1) {
                setFormData(prev => ({
                    ...prev,
                    vehicle: vehicleList[0].id,
                    vehicle_type: vehicleList[0].vehicle_type || 'sedan'
                }));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Failed to load data');
        }
    };

    const fetchAvailableSlots = async (date) => {
        try {
            const branchId = getCurrentBranchId();
            const response = await api.get('/appointments/slots/available/', {
                params: { branch_id: branchId, date }
            });
            setAvailableSlots(response.data || []);
        } catch (error) {
            // Slots endpoint is optional - gracefully handle if not configured
            console.log('No pre-defined slots available');
        }
    };

    const handleVehicleSelect = (vehicleId) => {
        const selectedVehicle = vehicles.find(v => v.id === vehicleId);
        setFormData(prev => ({
            ...prev,
            vehicle: vehicleId,
            vehicle_type: selectedVehicle?.vehicle_type || 'sedan'
        }));
    };

    const handlePackageSelect = (packageId) => {
        setFormData(prev => ({ ...prev, package: packageId }));
    };

    const validateStep = (step) => {
        switch (step) {
            case 1:
                if (!formData.vehicle || !formData.package) {
                    setError('Please select a vehicle and service');
                    return false;
                }
                break;
            case 2:
                if (!formData.preferred_datetime) {
                    setError('Please select your preferred date & time');
                    return false;
                }
                break;
        }
        setError('');
        return true;
    };

    const handleNext = () => {
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
                vehicle: formData.vehicle,
                vehicle_type: formData.vehicle_type,
                package: formData.package,
                preferred_datetime: formData.preferred_datetime,
                alternate_datetime: formData.alternate_datetime || null,
                pickup_required: formData.pickup_required,
                location: formData.location || '',
                notes: formData.notes || '',
            };

            await api.post('/appointments/', payload);
            setSuccess(true);

            // Redirect after 2 seconds
            setTimeout(() => {
                navigate('/customer/appointments', {
                    state: { message: 'Appointment request submitted successfully!' }
                });
            }, 2000);
        } catch (error) {
            console.error('Error creating appointment:', error);
            setError(error.response?.data?.message || error.response?.data?.detail || 'Failed to submit appointment');
        } finally {
            setLoading(false);
        }
    };

    const selectedVehicle = vehicles.find(v => v.id === formData.vehicle);
    const selectedPackage = packages.find(p => p.id === formData.package);

    // Get price based on vehicle type
    const getPackagePrice = (pkg) => {
        const priceMap = {
            hatchback: pkg?.hatchback_price,
            sedan: pkg?.sedan_price,
            suv: pkg?.suv_price,
            bike: pkg?.bike_price,
        };
        return priceMap[formData.vehicle_type] || pkg?.sedan_price || pkg?.price || 0;
    };

    // Success screen
    if (success) {
        return (
            <div className="max-w-2xl mx-auto py-12">
                <Card>
                    <div className="text-center p-12">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="text-green-600" size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">
                            Appointment Request Submitted! 🎉
                        </h2>
                        <p className="text-gray-600 mb-6">
                            We'll review your request and notify you within 24 hours.
                            <br />
                            You can track the status in your appointments page.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button onClick={() => navigate('/customer/appointments')}>
                                View My Appointments
                            </Button>
                            <Button variant="outline" onClick={() => navigate('/customer/dashboard')}>
                                Go to Dashboard
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
                    <Sparkles className="text-primary" size={28} />
                    Request Appointment
                </h1>
                <p className="text-gray-600 mt-2">Quick 3-step process • Admin reviews within 24 hours</p>
            </div>

            {/* Branch Warning */}
            {!user?.branch && (
                <Alert type="warning" message="Please set your preferred branch in profile for better service." />
            )}

            {/* Progress Indicator */}
            <div className="flex items-center justify-center gap-2">
                {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
              ${currentStep >= step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {currentStep > step ? <CheckCircle size={20} /> : step}
                        </div>
                        {step < 3 && (
                            <div className={`w-16 h-1 mx-1 ${currentStep > step ? 'bg-primary' : 'bg-gray-200'}`} />
                        )}
                    </div>
                ))}
            </div>

            {/* Error Message */}
            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            {/* Step 1: Select Vehicle & Service (Combined for speed) */}
            {currentStep === 1 && (
                <Card>
                    <div className="p-6 space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Car className="text-primary" size={24} />
                            Select Vehicle & Service
                        </h2>

                        {/* Vehicle Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Your Vehicle
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {vehicles.map((vehicle) => (
                                    <button
                                        key={vehicle.id}
                                        type="button"
                                        onClick={() => handleVehicleSelect(vehicle.id)}
                                        className={`p-4 rounded-lg border-2 text-left transition-all ${formData.vehicle === vehicle.id
                                            ? 'border-primary bg-primary-50 ring-2 ring-primary/20'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Car className="text-gray-400" size={24} />
                                            <div>
                                                <p className="font-bold text-gray-900">{vehicle.registration_number}</p>
                                                <p className="text-sm text-gray-600">
                                                    {vehicle.brand} {vehicle.model}
                                                </p>
                                                {vehicle.vehicle_type && (
                                                    <Badge variant="info" size="sm" className="mt-1">
                                                        {vehicle.vehicle_type_display || vehicle.vehicle_type}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            {vehicles.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    <Car className="mx-auto mb-2 opacity-50" size={32} />
                                    <p>No vehicles found. <Link to="/customer/profile" className="text-primary hover:underline">Add a vehicle</Link></p>
                                </div>
                            )}
                        </div>

                        {/* Vehicle Type Selection (if applicable) */}
                        {formData.vehicle && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Vehicle Type (affects pricing)
                                </label>
                                <div className="flex gap-2">
                                    {['hatchback', 'sedan', 'suv', 'bike'].map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, vehicle_type: type })}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${formData.vehicle_type === type
                                                ? 'bg-primary text-white'
                                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {type === 'hatchback' ? '🚗 Hatchback' : type === 'sedan' ? '🚙 Sedan' : type === 'suv' ? '🚐 SUV' : '🚲 Bike'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Service Package Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Service Package
                            </label>
                            <div className="grid grid-cols-1 gap-3">
                                {packages.filter(p => p.is_active && (!p.compatible_vehicle_types || p.compatible_vehicle_types.length === 0 || p.compatible_vehicle_types.includes(formData.vehicle_type))).map((pkg) => (
                                    <button
                                        key={pkg.id}
                                        type="button"
                                        onClick={() => handlePackageSelect(pkg.id)}
                                        className={`p-4 rounded-lg border-2 text-left transition-all ${formData.package === pkg.id
                                            ? 'border-primary bg-primary-50 ring-2 ring-primary/20'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Package className="text-gray-400" size={24} />
                                                <div>
                                                    <p className="font-bold text-gray-900">{pkg.name}</p>
                                                    <p className="text-sm text-gray-600 line-clamp-1">{pkg.description}</p>
                                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                        <Clock size={12} />
                                                        <span>{pkg.duration_hours}h</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-xl font-bold text-green-600">
                                                ₹{getPackagePrice(pkg)}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Step 2: Select Date & Time */}
            {currentStep === 2 && (
                <Card>
                    <div className="p-6 space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Calendar className="text-primary" size={24} />
                            Choose Your Schedule
                        </h2>

                        {/* Preferred Date/Time */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Preferred Date & Time *
                            </label>
                            <Input
                                type="datetime-local"
                                value={formData.preferred_datetime}
                                onChange={(e) => setFormData({ ...formData, preferred_datetime: e.target.value })}
                                min={new Date().toISOString().slice(0, 16)}
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">Pick your ideal appointment time</p>
                        </div>

                        {/* Alternate Date/Time */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Alternate Date & Time (Optional)
                            </label>
                            <Input
                                type="datetime-local"
                                value={formData.alternate_datetime}
                                onChange={(e) => setFormData({ ...formData, alternate_datetime: e.target.value })}
                                min={new Date().toISOString().slice(0, 16)}
                            />
                            <div className="flex items-start gap-2 mt-2 p-3 bg-blue-50 rounded-lg">
                                <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
                                <p className="text-sm text-blue-700">
                                    Providing an alternate time increases approval chances if your preferred slot is unavailable.
                                </p>
                            </div>
                        </div>

                        {/* Available Slots (if configured) */}
                        {availableSlots.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Available Time Slots
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {availableSlots.map((slot) => (
                                        <button
                                            key={slot.id}
                                            type="button"
                                            className={`p-2 rounded-lg border text-sm ${slot.is_slot_available
                                                ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                                                : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
                                            disabled={!slot.is_slot_available}
                                        >
                                            {slot.start_time} - {slot.end_time}
                                            <span className="block text-xs opacity-75">
                                                {slot.available_slots} available
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pickup Option */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.pickup_required}
                                    onChange={(e) => setFormData({ ...formData, pickup_required: e.target.checked })}
                                    className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                                />
                                <div>
                                    <p className="font-medium text-gray-900">Request Pickup & Drop Service</p>
                                    <p className="text-sm text-gray-600">We'll pick up your vehicle and deliver it back</p>
                                </div>
                            </label>

                            {formData.pickup_required && (
                                <div className="mt-3">
                                    <Textarea
                                        placeholder="Enter your pickup address..."
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        rows={2}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Additional Notes (Optional)
                            </label>
                            <Textarea
                                placeholder="Any special requests or instructions..."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={2}
                            />
                        </div>
                    </div>
                </Card>
            )}

            {/* Step 3: Review & Submit */}
            {currentStep === 3 && (
                <Card>
                    <div className="p-6 space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <CheckCircle className="text-primary" size={24} />
                            Review & Submit
                        </h2>

                        {/* Summary */}
                        <div className="space-y-4">
                            {/* Vehicle */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Car className="text-gray-400" size={20} />
                                    <div>
                                        <p className="text-sm text-gray-600">Vehicle</p>
                                        <p className="font-bold text-gray-900">{selectedVehicle?.registration_number}</p>
                                        <p className="text-xs text-gray-500">{selectedVehicle?.brand} {selectedVehicle?.model}</p>
                                    </div>
                                </div>
                                <Badge variant="info">{formData.vehicle_type}</Badge>
                            </div>

                            {/* Service */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Package className="text-gray-400" size={20} />
                                    <div>
                                        <p className="text-sm text-gray-600">Service</p>
                                        <p className="font-bold text-gray-900">{selectedPackage?.name}</p>
                                        <p className="text-xs text-gray-500">Duration: {selectedPackage?.duration_hours}h</p>
                                    </div>
                                </div>
                                <span className="text-xl font-bold text-green-600">
                                    ₹{getPackagePrice(selectedPackage)}
                                </span>
                            </div>

                            {/* Schedule */}
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3 mb-3">
                                    <Calendar className="text-gray-400" size={20} />
                                    <p className="text-sm text-gray-600">Requested Schedule</p>
                                </div>
                                <div className="space-y-2 ml-8">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="info" size="sm">PREFERRED</Badge>
                                        <span className="font-medium text-gray-900">
                                            {new Date(formData.preferred_datetime).toLocaleString()}
                                        </span>
                                    </div>
                                    {formData.alternate_datetime && (
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" size="sm">ALTERNATE</Badge>
                                            <span className="text-gray-700">
                                                {new Date(formData.alternate_datetime).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Pickup */}
                            {formData.pickup_required && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm font-medium text-blue-900">🚗 Pickup & Drop Requested</p>
                                    <p className="text-sm text-blue-700 mt-1">{formData.location}</p>
                                </div>
                            )}

                            {/* Notes */}
                            {formData.notes && (
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-600">Notes</p>
                                    <p className="text-gray-900">{formData.notes}</p>
                                </div>
                            )}
                        </div>

                        {/* Important Notice */}
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                                <div>
                                    <h4 className="font-semibold text-yellow-900 mb-1">What happens next?</h4>
                                    <ul className="text-sm text-yellow-800 space-y-1">
                                        <li>• Our team reviews your request within 24 hours</li>
                                        <li>• You'll receive a notification once approved</li>
                                        <li>• Final price may include GST and will be confirmed</li>
                                        <li>• You can cancel or reschedule pending appointments</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
                <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={loading}
                >
                    Back
                </Button>

                {currentStep < 3 ? (
                    <Button onClick={handleNext} disabled={loading}>
                        Next
                        <ChevronRight size={18} className="ml-1" />
                    </Button>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="min-w-[180px]"
                    >
                        {loading ? 'Submitting...' : 'Submit Appointment Request'}
                    </Button>
                )}
            </div>
        </div>
    );
};

export default AppointmentRequest;
