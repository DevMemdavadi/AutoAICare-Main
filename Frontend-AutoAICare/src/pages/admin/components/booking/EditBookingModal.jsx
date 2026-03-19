import api from '@/utils/api';
import {
    AlertCircle, Calendar, Car, CheckSquare, ChevronDown,
    Loader2, MapPin, MessageSquare, Save, Square, User, X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/* ─── helpers ──────────────────────────────────────────────────────────────── */
const toLocalInputValue = (isoString) => {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return ''; }
};

const VEHICLE_TYPES = [
    { value: 'hatchback', label: 'Hatchback' },
    { value: 'sedan', label: 'Sedan' },
    { value: 'suv', label: 'SUV' },
    { value: 'bike', label: 'Bike' },
];

const TABS = [
    { key: 'customer', label: 'Customer', icon: User },
    { key: 'vehicle', label: 'Vehicle', icon: Car },
    { key: 'bookingInfo', label: 'Booking Info', icon: Calendar },
];

/* ─── multi-select pill dropdown ──────────────────────────────────────────── */
function PillSelect({ items, selected, onToggle, label, emptyText = 'None available', vehicleType }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // close on outside click
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selectedItems = items.filter(i => selected.includes(i.id));

    const priceLabel = (pkg) => {
        if (!vehicleType) return '';
        const map = { hatchback: pkg.hatchback_price, sedan: pkg.sedan_price, suv: pkg.suv_price, bike: pkg.bike_price ?? pkg.sedan_price };
        const p = parseFloat(map[vehicleType] ?? 0);
        return p > 0 ? ` · ₹${p.toFixed(0)}` : '';
    };

    return (
        <div className="relative" ref={ref}>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-white hover:border-blue-400 transition-colors text-sm"
            >
                <span className="text-gray-700 truncate">
                    {selectedItems.length > 0 ? selectedItems.map(i => i.name).join(', ') : `Select ${label}…`}
                </span>
                <ChevronDown size={15} className={`text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
                    {items.length === 0
                        ? <p className="px-4 py-3 text-sm text-gray-400 text-center">{emptyText}</p>
                        : items.map(item => {
                            const isSel = selected.includes(item.id);
                            return (
                                <button key={item.id} type="button" onClick={() => onToggle(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors ${isSel ? 'bg-blue-50' : ''}`}>
                                    {isSel ? <CheckSquare size={15} className="text-blue-600 flex-shrink-0" /> : <Square size={15} className="text-gray-300 flex-shrink-0" />}
                                    <span className="flex-1 font-medium text-gray-800">{item.name}</span>
                                    <span className="text-xs text-gray-400">{priceLabel(item)}</span>
                                </button>
                            );
                        })
                    }
                </div>
            )}
        </div>
    );
}

/* ─── field component ─────────────────────────────────────────────────────── */
function Field({ label, children }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
            {children}
        </div>
    );
}

function TextInput({ value, onChange, placeholder, disabled = false, type = 'text' }) {
    return (
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-400"
        />
    );
}

function SelectInput({ value, onChange, options, placeholder, disabled = false }) {
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white disabled:bg-gray-50 disabled:text-gray-400"
        >
            <option value="">{placeholder}</option>
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
}

const TAB_COLORS = {
    customer: 'from-blue-600 to-blue-700',
    vehicle: 'from-purple-600 to-purple-700',
    bookingInfo: 'from-orange-500 to-orange-600',
};

/* ─── main modal ──────────────────────────────────────────────────────────── */
export default function EditBookingModal({ booking, branchId, defaultTab = 'customer', hideTabs = false, onClose, onSaved }) {
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [savingTab, setSavingTab] = useState(null);
    const [errors, setErrors] = useState({});
    const [successes, setSuccesses] = useState({});

    /* ── Customer form ── */
    const custUser = booking.customer_details?.user || {};
    const [custForm, setCustForm] = useState({
        name: custUser.name || '',
        phone: custUser.phone || '',
        email: (custUser.email || '').endsWith('@walkin.local') ? '' : (custUser.email || ''),
    });

    /* ── Vehicle form ── */
    const veh = booking.vehicle_details || {};
    const [vehForm, setVehForm] = useState({
        registration_number: veh.registration_number || '',
        brand: veh.brand || '',
        model: veh.model || '',
        year: veh.year || '',
        vehicle_type: veh.vehicle_type || booking.vehicle_type || 'sedan',
    });

    /* ── Booking Info form ── */
    const [bookForm, setBookForm] = useState({
        booking_datetime: toLocalInputValue(booking.booking_datetime),
        vehicle_type: booking.vehicle_type || 'sedan',
        notes: booking.notes || '',
        pickup_required: booking.pickup_required || false,
        location: booking.location || '',
        branch_id: booking.branch_details?.id || booking.branch || '',
    });
    const [selectedPackages, setSelectedPackages] = useState((booking.packages_details || []).map(p => p.id));
    const [selectedAddons, setSelectedAddons] = useState((booking.addon_details || []).map(a => a.id));
    const [packages, setPackages] = useState([]);
    const [addons, setAddons] = useState([]);
    const [loadingSvc, setLoadingSvc] = useState(true);

    /* ── Vehicle brands/models ── */
    const [brands, setBrands] = useState([]);
    const [allModels, setAllModels] = useState([]);
    const [filteredModels, setFilteredModels] = useState([]);
    const [branches, setBranches] = useState([]);

    /* load packages, addons, brands, models, branches */
    useEffect(() => {
        const load = async () => {
            setLoadingSvc(true);
            try {
                const bid = branchId || booking.branch_details?.id;
                const params = { is_active: true, page_size: 500, ...(bid ? { branch: bid } : {}) };
                const [pkgRes, addonRes, brandRes, modelRes, branchRes] = await Promise.all([
                    api.get('/services/packages/', { params }),
                    api.get('/services/addons/', { params }),
                    api.get('/customers/vehicle-brands/'),
                    api.get('/customers/vehicle-models/'),
                    api.get('/branches/'),
                ]);
                setPackages(pkgRes.data.results || []);
                setAddons(addonRes.data.results || []);
                setBrands(brandRes.data.results || brandRes.data || []);
                setAllModels(modelRes.data.results || modelRes.data || []);
                setBranches(branchRes.data.results || branchRes.data || []);
            } catch { /* silent */ } finally { setLoadingSvc(false); }
        };
        load();
    }, [branchId, booking.branch_details?.id]);

    /* Filter models when brand changes */
    useEffect(() => {
        if (!vehForm.brand) {
            setFilteredModels([]);
            return;
        }
        // Find brand object to get ID if brand name is what we have
        const brandObj = brands.find(b => b.name === vehForm.brand || b.id.toString() === vehForm.brand);
        if (brandObj) {
            const filtered = allModels.filter(m => m.brand === brandObj.id || m.brand_name === brandObj.name);
            setFilteredModels(filtered);
        } else {
            setFilteredModels([]);
        }
    }, [vehForm.brand, brands, allModels]);

    const toggle = (setter) => (id) =>
        setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const setErr = (tab, msg) => setErrors(e => ({ ...e, [tab]: msg }));
    const setOk = (tab, msg) => setSuccesses(s => ({ ...s, [tab]: msg }));
    const clearMsg = (tab) => { setErrors(e => ({ ...e, [tab]: '' })); setSuccesses(s => ({ ...s, [tab]: '' })); };

    /* ── Save: Customer ── */
    const saveCustomer = async () => {
        if (!custForm.name.trim()) { setErr('customer', 'Name is required.'); return; }
        if (!custForm.phone.trim()) { setErr('customer', 'Phone is required.'); return; }
        clearMsg('customer');
        setSavingTab('customer');
        try {
            const userId = custUser.id;
            const payload = { name: custForm.name, phone: custForm.phone };
            if (custForm.email.trim()) payload.email = custForm.email;
            await api.patch(`/auth/users/${userId}/`, payload);
            setOk('customer', 'Customer details saved successfully.');
            // reflect change in parent without full reload
            onSaved({
                ...booking,
                customer_details: {
                    ...booking.customer_details,
                    user: { ...custUser, ...payload },
                },
            });
        } catch (e) {
            setErr('customer', e.response?.data?.error || e.response?.data?.detail || JSON.stringify(e.response?.data) || 'Failed to save customer.');
        } finally { setSavingTab(null); }
    };

    /* ── Save: Vehicle ── */
    const saveVehicle = async () => {
        if (!vehForm.registration_number.trim()) { setErr('vehicle', 'Registration number is required.'); return; }
        clearMsg('vehicle');
        setSavingTab('vehicle');
        try {
            const vid = veh.id || booking.vehicle;
            const res = await api.patch(`/customers/admin/vehicles/${vid}/`, { ...vehForm });
            setOk('vehicle', 'Vehicle details saved successfully.');
            onSaved({
                ...booking,
                vehicle_details: { ...booking.vehicle_details, ...res.data },
            });
        } catch (e) {
            setErr('vehicle', e.response?.data?.error || e.response?.data?.detail || JSON.stringify(e.response?.data) || 'Failed to save vehicle.');
        } finally { setSavingTab(null); }
    };

    /* ── Save: Booking Info ── */
    const saveBookingInfo = async () => {
        if (!bookForm.booking_datetime) { setErr('bookingInfo', 'Date & time is required.'); return; }
        if (selectedPackages.length === 0) { setErr('bookingInfo', 'At least one service is required.'); return; }
        clearMsg('bookingInfo');
        setSavingTab('bookingInfo');
        try {
            const res = await api.patch(`/bookings/${booking.id}/admin_update/`, {
                booking_datetime: bookForm.booking_datetime,
                vehicle_type: bookForm.vehicle_type,
                notes: bookForm.notes,
                pickup_required: bookForm.pickup_required,
                location: bookForm.location,
                package_ids: selectedPackages,
                addon_ids: selectedAddons,
                branch_id: bookForm.branch_id,
            });
            setOk('bookingInfo', 'Booking info saved successfully.');
            onSaved(res.data.booking);
        } catch (e) {
            setErr('bookingInfo', e.response?.data?.error || 'Failed to save booking info.');
        } finally { setSavingTab(null); }
    };

    /* ── save dispatcher ── */
    const handleSave = () => {
        if (activeTab === 'customer') saveCustomer();
        else if (activeTab === 'vehicle') saveVehicle();
        else saveBookingInfo();
    };

    const isSaving = savingTab === activeTab;

    return (
        <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* ── Header ── */}
                <div className={`flex items-center justify-between px-6 py-4  rounded-t-2xl flex-shrink-0 transition-colors duration-500`}>
                    <div>
                        <h2 className="text-lg font-bold text-black">
                            {hideTabs
                                ? `Edit ${TABS.find(t => t.key === activeTab)?.label}`
                                : 'Edit Booking'}
                        </h2>
                        <p className="text-black text-xs mt-0.5">Booking #{booking.id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                    >
                        <X size={16} className='text-black' />
                    </button>
                </div>
                <hr />
                {/* ── Tabs ── */}
                {!hideTabs && (
                    <div className="flex border-b border-gray-100 bg-gray-50 flex-shrink-0">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.key;
                            const hasError = !!errors[tab.key];
                            const hasSuccess = !!successes[tab.key];
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all relative ${isActive
                                        ? 'text-blue-600 bg-white border-b-2 border-blue-600'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <Icon size={15} />
                                    {tab.label}
                                    {hasError && (
                                        <span className="absolute top-1.5 right-2.5 w-2 h-2 rounded-full bg-red-500" />
                                    )}
                                    {hasSuccess && !hasError && (
                                        <span className="absolute top-1.5 right-2.5 w-2 h-2 rounded-full bg-green-500" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto px-6 py-5">

                    {/* error / success banner for active tab */}
                    {errors[activeTab] && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
                            <AlertCircle size={15} className="mt-0.5 flex-shrink-0 text-red-500" />
                            <span>{errors[activeTab]}</span>
                        </div>
                    )}
                    {successes[activeTab] && !errors[activeTab] && (
                        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 mb-4">
                            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                            {successes[activeTab]}
                        </div>
                    )}

                    {/* ─── CUSTOMER TAB ─── */}
                    {activeTab === 'customer' && (
                        <div className="space-y-4">
                            {/* <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <User size={18} className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Customer Details</p>
                                    <p className="text-xs text-gray-400">Edit name, phone and email</p>
                                </div>
                            </div> */}

                            <Field label="Full Name">
                                <TextInput
                                    value={custForm.name}
                                    onChange={v => setCustForm(f => ({ ...f, name: v }))}
                                    placeholder="Customer full name"
                                />
                            </Field>

                            <Field label="Phone Number">
                                <TextInput
                                    value={custForm.phone}
                                    onChange={v => setCustForm(f => ({ ...f, phone: v }))}
                                    placeholder="10-digit phone number"
                                    type="tel"
                                />
                            </Field>

                            <Field label="Email Address">
                                <TextInput
                                    value={custForm.email}
                                    onChange={v => setCustForm(f => ({ ...f, email: v }))}
                                    placeholder="customer@example.com (optional)"
                                    type="email"
                                />
                            </Field>

                            <p className="text-xs text-gray-400 pt-1">
                                * Phone number changes will affect login credentials.
                            </p>
                        </div>
                    )}

                    {/* ─── VEHICLE TAB ─── */}
                    {activeTab === 'vehicle' && (
                        <div className="space-y-4">
                            {/* <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                                    <Car size={18} className="text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Vehicle Details</p>
                                    <p className="text-xs text-gray-400">Edit vehicle registration and specifications</p>
                                </div>
                            </div> */}

                            <Field label="Registration Number">
                                <TextInput
                                    value={vehForm.registration_number}
                                    onChange={v => setVehForm(f => ({ ...f, registration_number: v.toUpperCase() }))}
                                    placeholder="e.g. MH02AB1234"
                                />
                            </Field>

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Brand">
                                    <SelectInput
                                        value={vehForm.brand}
                                        onChange={v => {
                                            const brandObj = brands.find(b => b.name === v);
                                            const isBike = brandObj?.vehicle_type === 'bike';
                                            setVehForm(f => ({
                                                ...f,
                                                brand: v,
                                                model: '',
                                                ...(isBike ? { vehicle_type: 'bike' } : {})
                                            }));
                                            if (isBike) {
                                                setBookForm(b => ({ ...b, vehicle_type: 'bike' }));
                                            }
                                        }}
                                        placeholder="Select Brand"
                                        options={brands.map(b => ({ value: b.name, label: b.name }))}
                                    />
                                </Field>
                                <Field label="Model">
                                    <SelectInput
                                        value={vehForm.model}
                                        onChange={v => {
                                            const modelObj = filteredModels.find(m => m.name === v);
                                            const newType = modelObj?.vehicle_type;
                                            setVehForm(f => ({
                                                ...f,
                                                model: v,
                                                ...(newType ? { vehicle_type: newType } : {})
                                            }));
                                            if (newType) {
                                                setBookForm(b => ({ ...b, vehicle_type: newType }));
                                            }
                                        }}
                                        placeholder="Select Model"
                                        options={filteredModels.map(m => ({ value: m.name, label: m.name }))}
                                        disabled={!vehForm.brand}
                                    />
                                </Field>
                            </div>

                            <Field label="Year">
                                <TextInput
                                    value={vehForm.year}
                                    onChange={v => setVehForm(f => ({ ...f, year: v }))}
                                    placeholder="e.g. 2022"
                                    type="number"
                                />
                            </Field>

                            <Field label="Vehicle Type">
                                <div className="grid grid-cols-4 gap-2">
                                    {VEHICLE_TYPES.map(vt => (
                                        <button
                                            key={vt.value}
                                            type="button"
                                            onClick={() => {
                                                setVehForm(f => ({ ...f, vehicle_type: vt.value }));
                                                setBookForm(b => ({ ...b, vehicle_type: vt.value }));
                                            }}
                                            className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${vehForm.vehicle_type === vt.value
                                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                : 'border-gray-200 text-gray-500 hover:border-purple-200'
                                                }`}
                                        >
                                            {vt.label}
                                        </button>
                                    ))}
                                </div>
                            </Field>
                        </div>
                    )}

                    {/* ─── BOOKING INFO TAB ─── */}
                    {activeTab === 'bookingInfo' && (
                        <div className="space-y-4">
                            {/* <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                                    <Calendar size={18} className="text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Booking Information</p>
                                    <p className="text-xs text-gray-400">Edit schedule, services and details</p>
                                </div>
                            </div> */}

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Booking Date & Time">
                                    <input
                                        type="datetime-local"
                                        value={bookForm.booking_datetime}
                                        onChange={e => setBookForm(f => ({ ...f, booking_datetime: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                                    />
                                </Field>

                                <Field label="Branch">
                                    <SelectInput
                                        value={bookForm.branch_id}
                                        onChange={v => setBookForm(f => ({ ...f, branch_id: v }))}
                                        placeholder="Select Branch"
                                        options={branches.map(b => ({ value: b.id, label: b.name }))}
                                    />
                                </Field>
                            </div>

                            <Field label="Vehicle Type (for pricing)">
                                <div className="grid grid-cols-4 gap-2">
                                    {VEHICLE_TYPES.map(vt => (
                                        <button
                                            key={vt.value}
                                            type="button"
                                            onClick={() => {
                                                setBookForm(f => ({ ...f, vehicle_type: vt.value }));
                                                setVehForm(v => ({ ...v, vehicle_type: vt.value }));
                                            }}
                                            className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${bookForm.vehicle_type === vt.value
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 text-gray-500 hover:border-blue-200'
                                                }`}
                                        >
                                            {vt.label}
                                        </button>
                                    ))}
                                </div>
                            </Field>

                            {loadingSvc ? (
                                <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                                    <Loader2 size={15} className="animate-spin" /> Loading services…
                                </div>
                            ) : (
                                <>
                                    <PillSelect
                                        label="Services"
                                        items={packages}
                                        selected={selectedPackages}
                                        onToggle={toggle(setSelectedPackages)}
                                        emptyText="No packages available for this branch"
                                        vehicleType={bookForm.vehicle_type}
                                    />
                                    <PillSelect
                                        label="Add-ons (optional)"
                                        items={addons}
                                        selected={selectedAddons}
                                        onToggle={toggle(setSelectedAddons)}
                                        emptyText="No add-ons available"
                                        vehicleType={null}
                                    />
                                </>
                            )}

                            <Field label="Notes (optional)">
                                <textarea
                                    value={bookForm.notes}
                                    onChange={e => setBookForm(f => ({ ...f, notes: e.target.value }))}
                                    rows={3}
                                    placeholder="Internal notes about this booking…"
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 resize-none"
                                />
                            </Field>

                            {/* Pickup toggle */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div
                                        onClick={() => setBookForm(f => ({ ...f, pickup_required: !f.pickup_required }))}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${bookForm.pickup_required ? 'bg-blue-500' : 'bg-gray-200'}`}
                                    >
                                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${bookForm.pickup_required ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </div>
                                    <span className="text-sm font-semibold text-gray-700 select-none">
                                        <MapPin size={12} className="inline mr-1 text-orange-500" />
                                        Pickup Required
                                    </span>
                                </label>

                                {bookForm.pickup_required && (
                                    <Field label="Pickup Address">
                                        <TextInput
                                            value={bookForm.location}
                                            onChange={v => setBookForm(f => ({ ...f, location: v }))}
                                            placeholder="e.g. 12 MG Road, Andheri West"
                                        />
                                    </Field>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between flex-shrink-0">
                    {/* tab navigation dots */}
                    {!hideTabs ? (
                        <div className="flex items-center gap-1.5">
                            {TABS.map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => setActiveTab(t.key)}
                                    className={`w-2 h-2 rounded-full transition-all ${activeTab === t.key ? 'bg-blue-600 w-5' : 'bg-gray-300 hover:bg-gray-400'}`}
                                />
                            ))}
                        </div>
                    ) : <div />}

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            disabled={!!savingTab}
                            className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                            Close
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!!savingTab || (activeTab === 'bookingInfo' && loadingSvc)}
                            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60 shadow-sm"
                        >
                            {isSaving
                                ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                                : <><Save size={15} /> Save {TABS.find(t => t.key === activeTab)?.label}</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
