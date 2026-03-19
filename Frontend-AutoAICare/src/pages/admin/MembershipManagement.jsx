/**
 * Membership Management Page (Admin)
 * Manage membership plans, view subscriptions, and create coupons
 */

import { Badge, Button, Card, Input, Modal, Textarea, Select } from '@/components/ui';
import Alert from '@/components/ui/Alert';
import { useBranch } from '@/contexts/BranchContext';
import api from '@/utils/api';
import {
    Award,
    Calendar,
    Car,
    Check,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Clock,
    Crown,
    Edit2,
    Eye,
    Gift,
    Globe,
    IndianRupee,
    Percent,
    Plus,
    Search,
    Star,
    Tag,
    Ticket,
    Trash2,
    UserPlus,
    Users,
    X,
    Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';

// Tier colors
const TIER_COLORS = {
    bronze: 'bg-amber-100 text-amber-800',
    silver: 'bg-gray-200 text-gray-800',
    gold: 'bg-yellow-100 text-yellow-800',
    platinum: 'bg-purple-100 text-purple-800',
    diamond: 'bg-blue-100 text-blue-800',
};

const TIER_ICONS = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎',
    diamond: '👑',
};

const MembershipManagement = () => {
    const { isSuperAdmin, isCompanyAdmin, branches, getCurrentBranchId, getCurrentBranchName } = useBranch();
    const [activeTab, setActiveTab] = useState('plans'); // plans, subscriptions, coupons, usage-reports
    const [plans, setPlans] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [usageReports, setUsageReports] = useState([]);
    const [usageStats, setUsageStats] = useState({ total_redemptions: 0, total_discounts: 0, average_discount: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    // Usage report filters
    const [usageFilters, setUsageFilters] = useState({
        customer_id: '',
        start_date: '',
        end_date: '',
        branch: ''
    });

    // Modal states
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [showCreateMembershipModal, setShowCreateMembershipModal] = useState(false);
    const [createMembershipStep, setCreateMembershipStep] = useState(1); // 1-4
    const [editingPlan, setEditingPlan] = useState(null);

    // Subscription detail modal
    const [showSubDetailModal, setShowSubDetailModal] = useState(false);
    const [selectedSub, setSelectedSub] = useState(null);

    // Create Membership for Customer state
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerResults, setCustomerResults] = useState([]);
    const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerVehicles, setCustomerVehicles] = useState([]);
    const [createMembershipForm, setCreateMembershipForm] = useState({
        plan: '',
        vehicle: '',
        vehicle_type: 'sedan',
        payment_method: 'cash',
        payment_reference: '',
        notes: '',
    });
    const [voucherCoupons, setVoucherCoupons] = useState([]);
    const [createMembershipLoading, setCreateMembershipLoading] = useState(false);

    // Plan form
    const [planForm, setPlanForm] = useState({
        name: '',
        tier: 'silver',
        description: '',
        hatchback_price: '',
        sedan_price: '',
        suv_price: '',
        gst_applicable: true,
        gst_rate: '18.00',
        duration_value: '12',
        duration_unit: 'months',
        is_active: true,
        is_popular: false,
        is_global: true,
        branch: null,
    });

    // Company services (for benefit form service picker)
    const [companyServices, setCompanyServices] = useState([]);

    // Benefit management
    const [benefitPlan, setBenefitPlan] = useState(null);
    const [showBenefitModal, setShowBenefitModal] = useState(false);
    const [planBenefits, setPlanBenefits] = useState([]);
    const [benefitsLoading, setBenefitsLoading] = useState(false);
    const [showBenefitFormModal, setShowBenefitFormModal] = useState(false);
    const [editingBenefit, setEditingBenefit] = useState(null);
    const [benefitForm, setBenefitForm] = useState({
        benefit_type: 'discount',
        title: '',
        description: '',
        discount_percentage: '0',
        discount_fixed_amount: '0',
        coupon_count: '1',
        applicable_categories: [],  // array of category slugs
        is_one_time: false,
        is_active: true,
    });
    const [selectedServiceIds, setSelectedServiceIds] = useState([]);  // individual service IDs for UI
    const [serviceSearch, setServiceSearch] = useState('');
    const [benefitSaving, setBenefitSaving] = useState(false);

    // Coupon form
    const [couponForm, setCouponForm] = useState({
        coupon_type: 'percentage',
        discount_percentage: '10',
        discount_amount: '0',
        max_discount: '',
        min_order_value: '0',
        valid_from: '',
        valid_until: '',
        usage_limit: '1',
        is_single_user: false,
        customer: '',
        is_global: true,
        branch: null,
        description: '',
        terms_conditions: '',
    });

    useEffect(() => {
        fetchData();
    }, [activeTab, getCurrentBranchId()]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (getCurrentBranchId()) {
                params.branch = getCurrentBranchId();
            }

            if (activeTab === 'plans') {
                const response = await api.get('/memberships/plans/', { params });
                setPlans(response.data.results || response.data);
            } else if (activeTab === 'subscriptions') {
                const response = await api.get('/memberships/subscriptions/', { params });
                setSubscriptions(response.data.results || response.data);
            } else if (activeTab === 'coupons') {
                const response = await api.get('/memberships/coupons/', { params });
                setCoupons(response.data.results || response.data);
            } else if (activeTab === 'usage-reports') {
                await fetchUsageReports();
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setAlert({ show: true, type: 'error', message: 'Failed to load data' });
        } finally {
            setLoading(false);
        }
    };

    const fetchUsageReports = async () => {
        try {
            const params = {};
            if (usageFilters.customer_id) params.customer_id = usageFilters.customer_id;
            if (usageFilters.start_date) params.start_date = usageFilters.start_date;
            if (usageFilters.end_date) params.end_date = usageFilters.end_date;
            if (getCurrentBranchId()) params.branch = getCurrentBranchId();
            else if (usageFilters.branch) params.branch = usageFilters.branch;

            const response = await api.get('/memberships/coupons/usage_report/', { params });
            setUsageReports(response.data.usages || []);
            setUsageStats(response.data.statistics || { total_redemptions: 0, total_discounts: 0, average_discount: 0 });
        } catch (error) {
            console.error('Error fetching usage reports:', error);
            setAlert({ show: true, type: 'error', message: 'Failed to load usage reports' });
        }
    };

    const handleCreatePlan = async (e) => {
        e.preventDefault();
        try {
            const planData = {
                ...planForm,
                hatchback_price: planForm.hatchback_price !== '' ? parseFloat(planForm.hatchback_price) : null,
                sedan_price: planForm.sedan_price !== '' ? parseFloat(planForm.sedan_price) : null,
                suv_price: planForm.suv_price !== '' ? parseFloat(planForm.suv_price) : null,
                gst_rate: parseFloat(planForm.gst_rate) || 18,
                duration_value: parseInt(planForm.duration_value) || 12,
                discount_percentage: parseFloat(planForm.discount_percentage) || 0,
                free_washes_count: parseInt(planForm.free_washes_count) || 0,
                free_interior_cleaning_count: parseInt(planForm.free_interior_cleaning_count) || 0,
                coupons_per_month: parseInt(planForm.coupons_per_month) || 0,
                coupon_discount_percentage: parseFloat(planForm.coupon_discount_percentage) || 10,
                branch: planForm.branch ? parseInt(planForm.branch) : null,
            };

            if (editingPlan) {
                await api.put(`/memberships/plans/${editingPlan.id}/`, planData);
                setAlert({ show: true, type: 'success', message: 'Plan updated successfully' });
            } else {
                await api.post('/memberships/plans/', planData);
                setAlert({ show: true, type: 'success', message: 'Plan created successfully' });
            }

            setShowPlanModal(false);
            setEditingPlan(null);
            resetPlanForm();
            fetchData();
        } catch (error) {
            console.error('Error saving plan:', error);
            setAlert({ show: true, type: 'error', message: 'Failed to save plan' });
        }
    };

    const handleCreateCoupon = async (e) => {
        e.preventDefault();
        try {
            const couponData = {
                coupon_type: couponForm.coupon_type,
                discount_percentage: parseFloat(couponForm.discount_percentage) || 0,
                discount_amount: parseFloat(couponForm.discount_amount) || 0,
                max_discount: couponForm.max_discount ? parseFloat(couponForm.max_discount) : null,
                min_order_value: parseFloat(couponForm.min_order_value) || 0,
                valid_until: couponForm.valid_until,
                usage_limit: parseInt(couponForm.usage_limit) || 1,
                is_single_user: couponForm.is_single_user,
                customer: couponForm.customer ? parseInt(couponForm.customer) : null,
                is_global: couponForm.is_global,
                branch: couponForm.branch ? parseInt(couponForm.branch) : null,
                description: couponForm.description,
                terms_conditions: couponForm.terms_conditions,
            };

            // Only include valid_from if explicitly set, otherwise backend defaults to now
            if (couponForm.valid_from) {
                couponData.valid_from = couponForm.valid_from;
            }

            await api.post('/memberships/coupons/', couponData);
            setAlert({ show: true, type: 'success', message: 'Coupon created successfully' });
            setShowCouponModal(false);
            resetCouponForm();
            fetchData();
        } catch (error) {
            console.error('Error creating coupon:', error);
            setAlert({ show: true, type: 'error', message: 'Failed to create coupon' });
        }
    };

    const handleDeletePlan = async (planId) => {
        if (!confirm('Are you sure you want to delete this plan?')) return;
        try {
            await api.delete(`/memberships/plans/${planId}/`);
            setAlert({ show: true, type: 'success', message: 'Plan deleted successfully' });
            fetchData();
        } catch (error) {
            console.error('Error deleting plan:', error);
            setAlert({ show: true, type: 'error', message: 'Failed to delete plan' });
        }
    };

    const openEditPlan = (plan) => {
        setEditingPlan(plan);
        setPlanForm({
            name: plan.name,
            tier: plan.tier,
            description: plan.description || '',
            hatchback_price: plan.hatchback_price?.toString() || '',
            sedan_price: plan.sedan_price?.toString() || '',
            suv_price: plan.suv_price?.toString() || '',
            gst_applicable: plan.gst_applicable,
            gst_rate: plan.gst_rate?.toString() || '18.00',
            duration_value: plan.duration_value?.toString() || '12',
            duration_unit: plan.duration_unit || 'months',
            is_active: plan.is_active,
            is_popular: plan.is_popular,
            is_global: plan.is_global,
            branch: plan.branch?.toString() || null,
        });
        setShowPlanModal(true);
    };

    const resetPlanForm = () => {
        setPlanForm({
            name: '',
            tier: 'silver',
            description: '',
            hatchback_price: '',
            sedan_price: '',
            suv_price: '',
            gst_applicable: true,
            gst_rate: '18.00',
            duration_value: '12',
            duration_unit: 'months',
            is_active: true,
            is_popular: false,
            is_global: !getCurrentBranchId(),
            branch: getCurrentBranchId() || null,
        });
    };

    const resetCouponForm = () => {
        setCouponForm({
            coupon_type: 'percentage',
            discount_percentage: '10',
            discount_amount: '0',
            max_discount: '',
            min_order_value: '0',
            valid_from: '',
            valid_until: '',
            usage_limit: '1',
            is_single_user: false,
            customer: '',
            is_global: !getCurrentBranchId(),
            branch: getCurrentBranchId() || null,
            description: '',
            terms_conditions: '',
        });
    };

    // ── Create Membership for Customer handlers ──────────────────────────────
    const searchCustomers = async (query) => {
        if (!query || query.trim().length < 2) {
            setCustomerResults([]);
            return;
        }
        setCustomerSearchLoading(true);
        try {
            // Search by phone or name using UserListView
            const res = await api.get('/auth/users/', {
                params: { role: 'customer', phone: query.trim() }
            });
            let results = res.data.results || res.data || [];
            // If no results by phone, try by name (if backend supports it)
            if (!results.length) {
                const res2 = await api.get('/auth/users/', {
                    params: { role: 'customer', search: query.trim() }
                });
                results = res2.data.results || res2.data || [];
            }
            setCustomerResults(results.slice(0, 10));
        } catch (e) {
            console.error('Customer search error:', e);
            setCustomerResults([]);
        } finally {
            setCustomerSearchLoading(false);
        }
    };

    const fetchCustomerVehicles = async (userId) => {
        try {
            console.log('[fetchCustomerVehicles] fetching for user id:', userId);
            const res = await api.get('/customers/admin/vehicles/by-user/', {
                params: { user: userId }
            });
            console.log('[fetchCustomerVehicles] raw response:', res.data);
            // Handle both paginated { results: [] } and plain array responses
            const vehicles = Array.isArray(res.data)
                ? res.data
                : (res.data?.results ?? []);
            console.log('[fetchCustomerVehicles] vehicles found:', vehicles.length, vehicles);
            setCustomerVehicles(vehicles);
        } catch (e) {
            console.error('[fetchCustomerVehicles] error:', e?.response?.status, e?.response?.data, e);
            setCustomerVehicles([]);
            setAlert({
                show: true,
                type: 'error',
                message: `Could not load vehicles (${e?.response?.status ?? 'network error'}): ${JSON.stringify(e?.response?.data ?? e?.message)}`
            });
        }
    };

    const selectCustomerForMembership = (cust) => {
        setSelectedCustomer(cust);
        setCustomerResults([]);
        setCustomerSearch(cust.phone || cust.email || `${cust.first_name} ${cust.last_name}`);
        setCreateMembershipForm(f => ({ ...f, vehicle: '' }));
        fetchCustomerVehicles(cust.id);
    };

    const addVoucherRow = () => {
        setVoucherCoupons(v => [
            ...v,
            { coupon_type: 'percentage', discount_percentage: '10', discount_amount: '0', max_discount: '', min_order_value: '0', valid_days: '30', count: '1', description: '' }
        ]);
    };

    const updateVoucherRow = (idx, field, value) => {
        setVoucherCoupons(v => v.map((row, i) => i === idx ? { ...row, [field]: value } : row));
    };

    const removeVoucherRow = (idx) => {
        setVoucherCoupons(v => v.filter((_, i) => i !== idx));
    };

    const resetCreateMembershipModal = () => {
        setCreateMembershipStep(1);
        setSelectedCustomer(null);
        setCustomerSearch('');
        setCustomerResults([]);
        setCustomerVehicles([]);
        setCreateMembershipForm({ plan: '', vehicle: '', vehicle_type: 'sedan', payment_method: 'cash', payment_reference: '', notes: '' });
        setVoucherCoupons([]);
    };

    const handleCreateMembership = async () => {
        if (!selectedCustomer) { setAlert({ show: true, type: 'error', message: 'Please select a customer.' }); return; }
        if (!createMembershipForm.plan) { setAlert({ show: true, type: 'error', message: 'Please select a membership plan.' }); return; }
        if (!createMembershipForm.vehicle) { setAlert({ show: true, type: 'error', message: 'Please select a vehicle.' }); return; }
        setCreateMembershipLoading(true);
        try {
            const payload = {
                customer_id: selectedCustomer.id,
                plan: parseInt(createMembershipForm.plan),
                vehicle: parseInt(createMembershipForm.vehicle),
                vehicle_type: createMembershipForm.vehicle_type,
                payment_method: createMembershipForm.payment_method,
                payment_reference: createMembershipForm.payment_reference,
                notes: createMembershipForm.notes,
                voucher_coupons: voucherCoupons.map(v => ({
                    coupon_type: v.coupon_type,
                    discount_percentage: parseFloat(v.discount_percentage) || 0,
                    discount_amount: parseFloat(v.discount_amount) || 0,
                    max_discount: v.max_discount ? parseFloat(v.max_discount) : null,
                    min_order_value: parseFloat(v.min_order_value) || 0,
                    valid_days: parseInt(v.valid_days) || 30,
                    count: parseInt(v.count) || 1,
                    description: v.description || '',
                })),
            };
            await api.post('/memberships/subscriptions/', payload);
            setAlert({ show: true, type: 'success', message: `Membership created successfully for ${selectedCustomer.name || selectedCustomer.phone}!` });
            setShowCreateMembershipModal(false);
            resetCreateMembershipModal();
            fetchData();
        } catch (error) {
            console.error('Create membership error:', error);
            const errMsg = error.response?.data ? JSON.stringify(error.response.data) : 'Failed to create membership';
            setAlert({ show: true, type: 'error', message: errMsg });
        } finally {
            setCreateMembershipLoading(false);
        }
    };
    // ─────────────────────────────────────────────────────────────────────────


    // ── Benefit management handlers ───────────────────────────────────────────
    const openBenefitManager = async (plan) => {
        setBenefitPlan(plan);
        setShowBenefitModal(true);
        await refreshBenefits(plan.id);
        // Fetch company services for the benefit form picker (if not already loaded)
        if (companyServices.length === 0) {
            try {
                const res = await api.get('/services/packages/', { params: { is_active: true } });
                setCompanyServices(res.data.results || res.data || []);
            } catch {
                setCompanyServices([]);
            }
        }
    };

    const refreshBenefits = async (planId) => {
        setBenefitsLoading(true);
        try {
            const res = await api.get('/memberships/benefits/', { params: { plan: planId } });
            setPlanBenefits(res.data.results || res.data || []);
        } catch (e) {
            setAlert({ show: true, type: 'error', message: 'Failed to load benefits' });
        } finally {
            setBenefitsLoading(false);
        }
    };

    const openAddBenefit = () => {
        setEditingBenefit(null);
        setBenefitForm({
            benefit_type: 'discount',
            title: '',
            description: '',
            discount_percentage: '0',
            discount_fixed_amount: '0',
            coupon_count: '1',
            applicable_categories: [],
            is_one_time: false,
            is_active: true,
        });
        setSelectedServiceIds([]);
        setServiceSearch('');
        setShowBenefitFormModal(true);
    };

    const openEditBenefit = (benefit) => {
        setEditingBenefit(benefit);
        const cats = Array.isArray(benefit.applicable_categories) ? benefit.applicable_categories : [];
        setBenefitForm({
            benefit_type: benefit.benefit_type || 'discount',
            title: benefit.title || '',
            description: benefit.description || '',
            discount_percentage: benefit.discount_percentage?.toString() || '0',
            discount_fixed_amount: benefit.discount_fixed_amount?.toString() || '0',
            coupon_count: benefit.coupon_count?.toString() || '1',
            applicable_categories: cats,
            is_one_time: benefit.is_one_time || false,
            is_active: benefit.is_active !== false,
        });
        // Pre-select services whose category is in the saved cats
        const preSelected = companyServices
            .filter(s => cats.includes(s.category))
            .map(s => s.id);
        setSelectedServiceIds(preSelected);
        setServiceSearch('');
        setShowBenefitFormModal(true);
    };

    const toggleService = (svc) => {
        setSelectedServiceIds(prev => {
            const next = prev.includes(svc.id)
                ? prev.filter(id => id !== svc.id)
                : [...prev, svc.id];
            // Keep applicable_categories in sync (unique category slugs)
            const uniqueCats = [...new Set(
                companyServices
                    .filter(s => next.includes(s.id))
                    .map(s => s.category)
                    .filter(Boolean)
            )];
            setBenefitForm(f => ({ ...f, applicable_categories: uniqueCats }));
            return next;
        });
    };

    const handleSaveBenefit = async (e) => {
        e.preventDefault();
        if (!benefitPlan) return;
        setBenefitSaving(true);
        try {
            const payload = {
                plan: benefitPlan.id,
                benefit_type: benefitForm.benefit_type,
                title: benefitForm.title,
                description: benefitForm.description,
                discount_percentage: parseFloat(benefitForm.discount_percentage) || 0,
                discount_fixed_amount: parseFloat(benefitForm.discount_fixed_amount) || 0,
                coupon_count: parseInt(benefitForm.coupon_count) || 0,
                applicable_categories: benefitForm.applicable_categories,  // already an array
                is_one_time: benefitForm.is_one_time,
                is_active: benefitForm.is_active,
            };
            if (editingBenefit) {
                await api.put(`/memberships/benefits/${editingBenefit.id}/`, payload);
                setAlert({ show: true, type: 'success', message: 'Benefit updated!' });
            } else {
                await api.post('/memberships/benefits/', payload);
                setAlert({ show: true, type: 'success', message: 'Benefit added!' });
            }
            setShowBenefitFormModal(false);
            await refreshBenefits(benefitPlan.id);
        } catch (err) {
            const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save benefit';
            setAlert({ show: true, type: 'error', message: msg });
        } finally {
            setBenefitSaving(false);
        }
    };

    const handleDeleteBenefit = async (benefitId) => {
        if (!confirm('Delete this benefit? Coupons already issued will remain.')) return;
        try {
            await api.delete(`/memberships/benefits/${benefitId}/`);
            setAlert({ show: true, type: 'success', message: 'Benefit deleted' });
            await refreshBenefits(benefitPlan.id);
        } catch {
            setAlert({ show: true, type: 'error', message: 'Failed to delete benefit' });
        }
    };
    // ─────────────────────────────────────────────────────────────────────────

    // Filter data based on search
    const filteredPlans = plans.filter(plan =>
        plan.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredSubscriptions = subscriptions.filter(sub =>
        sub.membership_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredCoupons = coupons.filter(coupon =>
        coupon.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                        {/* <Crown className="text-yellow-500" size={28} /> */}
                        Membership Management
                    </h1>
                    <p className="text-sm md:text-base text-gray-600 mt-1">
                        Manage Membership plans, subscriptions, and coupons
                    </p>
                </div>
                {(activeTab === 'plans' || activeTab === 'coupons' || activeTab === 'subscriptions') && (
                    <Button
                        onClick={() => {
                            if (activeTab === 'plans') {
                                setEditingPlan(null);
                                resetPlanForm();
                                setShowPlanModal(true);
                            } else if (activeTab === 'coupons') {
                                resetCouponForm();
                                setShowCouponModal(true);
                            } else if (activeTab === 'subscriptions') {
                                resetCreateMembershipModal();
                                setShowCreateMembershipModal(true);
                            }
                        }}
                        className="flex items-center justify-center gap-1 md:gap-2 text-xs md:text-base px-2 md:px-4 py-2 whitespace-nowrap w-full md:w-auto"
                    >
                        <Plus size={16} className="md:hidden" />
                        <Plus size={18} className="hidden md:block" />
                        <span>{activeTab === 'plans' ? 'Add Plan' : activeTab === 'coupons' ? 'Create Coupon' : 'Create Membership'}</span>
                    </Button>
                )}
            </div>

            {/* Alert */}
            {alert.show && (
                <Alert
                    type={alert.type}
                    message={alert.message}
                    onClose={() => setAlert({ show: false, type: '', message: '' })}
                />
            )}

            {/* Tabs */}
            <div className="flex border-b border-gray-200 overflow-x-auto scroll-smooth">
                {[
                    { key: 'plans', label: 'Membership Plans', icon: Crown },
                    { key: 'subscriptions', label: 'Subscriptions', icon: Users },
                    { key: 'coupons', label: 'Coupons', icon: Ticket },
                    { key: 'usage-reports', label: 'Usage Reports', icon: Award },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-3 font-medium text-xs md:text-sm border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab.key
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        <tab.icon size={16} className="md:hidden" />
                        <tab.icon size={18} className="hidden md:block" />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder={`Search ${activeTab}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="animate-pulse">
                    {activeTab === 'plans' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
                                    {/* Plan header */}
                                    <div className="p-4 bg-gray-100 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-200 rounded-full" />
                                        <div className="space-y-1.5">
                                            <div className="h-4 bg-gray-200 rounded w-28" />
                                            <div className="h-4 bg-gray-200 rounded-full w-16" />
                                        </div>
                                    </div>
                                    {/* Pricing row */}
                                    <div className="p-4 border-b bg-gray-50 flex justify-center gap-6">
                                        {[...Array(3)].map((_, j) => (
                                            <div key={j} className="text-center space-y-1.5">
                                                <div className="h-2.5 bg-gray-200 rounded w-16 mx-auto" />
                                                <div className="h-4 bg-gray-200 rounded w-14 mx-auto" />
                                            </div>
                                        ))}
                                    </div>
                                    {/* Benefits */}
                                    <div className="p-4 space-y-2.5">
                                        {[...Array(3)].map((_, j) => (
                                            <div key={j} className="flex items-center gap-2">
                                                <div className="w-4 h-4 bg-gray-200 rounded-full flex-shrink-0" />
                                                <div className="h-3 bg-gray-200 rounded w-full" />
                                            </div>
                                        ))}
                                    </div>
                                    {/* Actions */}
                                    <div className="p-4 border-t flex gap-2">
                                        <div className="h-8 bg-gray-200 rounded-lg flex-1" />
                                        <div className="h-8 bg-gray-200 rounded-lg flex-1" />
                                        <div className="h-8 w-8 bg-gray-200 rounded-lg flex-shrink-0" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {activeTab === 'subscriptions' && (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b bg-gray-50">
                                <div className="h-4 bg-gray-200 rounded w-40" />
                            </div>
                            <div className="divide-y divide-gray-100">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="px-5 py-4 flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3.5 bg-gray-200 rounded w-36" />
                                            <div className="h-2.5 bg-gray-200 rounded w-24" />
                                        </div>
                                        <div className="h-5 bg-gray-200 rounded-full w-20" />
                                        <div className="h-3.5 bg-gray-200 rounded w-24" />
                                        <div className="h-7 bg-gray-200 rounded-lg w-16" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeTab === 'coupons' && (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b bg-gray-50">
                                <div className="h-4 bg-gray-200 rounded w-32" />
                            </div>
                            <div className="divide-y divide-gray-100">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="px-5 py-4 flex items-center gap-4">
                                        <div className="h-5 bg-gray-200 rounded w-28" />
                                        <div className="flex-1 h-3 bg-gray-200 rounded w-32" />
                                        <div className="h-5 bg-gray-200 rounded-full w-16" />
                                        <div className="h-3.5 bg-gray-200 rounded w-20" />
                                        <div className="h-3.5 bg-gray-200 rounded w-20" />
                                        <div className="h-7 bg-gray-200 rounded-full w-12" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeTab === 'usage-reports' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
                                        <div className="h-3 bg-gray-200 rounded w-24" />
                                        <div className="h-7 bg-gray-200 rounded w-20" />
                                    </div>
                                ))}
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="divide-y divide-gray-100">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="px-5 py-4 flex items-center gap-4">
                                            <div className="h-3.5 bg-gray-200 rounded flex-1" />
                                            <div className="h-3.5 bg-gray-200 rounded w-24" />
                                            <div className="h-3.5 bg-gray-200 rounded w-20" />
                                            <div className="h-3.5 bg-gray-200 rounded w-16" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* Plans Tab */}
                    {activeTab === 'plans' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredPlans.length > 0 ? (
                                filteredPlans.map((plan) => (
                                    <div
                                        key={plan.id}
                                        className={`bg-white rounded-xl border-2 ${plan.is_popular ? 'border-yellow-400 shadow-lg' : 'border-gray-200'
                                            } overflow-hidden relative`}
                                    >
                                        {plan.is_popular && (
                                            <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg">
                                                ⭐ Popular
                                            </div>
                                        )}

                                        {/* Header */}
                                        <div className={`p-4 ${TIER_COLORS[plan.tier]} bg-opacity-50`}>
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">{TIER_ICONS[plan.tier]}</span>
                                                <div>
                                                    <h3 className="font-bold text-lg">{plan.name}</h3>
                                                    <Badge variant="outline" className="text-xs">
                                                        {plan.tier_display || plan.tier}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pricing */}
                                        <div className="p-4 border-b bg-gray-50">
                                            <div className="flex justify-center gap-6">
                                                {plan.hatchback_price !== null && (
                                                    <div className="text-center">
                                                        <span className="block text-xs text-gray-500 mb-1">🚗 Hatchback</span>
                                                        <span className="font-bold text-green-600 block">₹{plan.hatchback_price}</span>
                                                    </div>
                                                )}
                                                {plan.sedan_price !== null && (
                                                    <div className="text-center">
                                                        <span className="block text-xs text-gray-500 mb-1">🚙 Sedan</span>
                                                        <span className="font-bold text-green-600 block">₹{plan.sedan_price}</span>
                                                    </div>
                                                )}
                                                {plan.suv_price !== null && (
                                                    <div className="text-center">
                                                        <span className="block text-xs text-gray-500 mb-1">🚐 SUV</span>
                                                        <span className="font-bold text-green-600 block">₹{plan.suv_price}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {plan.gst_applicable && (
                                                <p className="text-xs text-center text-gray-500 mt-3">+ {plan.gst_rate}% GST</p>
                                            )}
                                        </div>

                                        {/* Benefits */}
                                        <div className="p-4 space-y-2">

                                            <div className="flex items-center gap-2 text-sm">
                                                <Check size={16} className="text-green-500" />
                                                <span>{plan.description}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Clock size={16} className="text-blue-500" />
                                                <span>Duration: {plan.duration_value} {plan.duration_unit}</span>
                                            </div>
                                            {plan.discount_percentage > 0 && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Percent size={16} className="text-green-500" />
                                                    <span>{plan.discount_percentage}% discount on services</span>
                                                </div>
                                            )}
                                            {plan.free_washes_count > 0 && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Check size={16} className="text-green-500" />
                                                    <span>{plan.free_washes_count} free washes</span>
                                                </div>
                                            )}
                                            {plan.free_interior_cleaning_count > 0 && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Check size={16} className="text-green-500" />
                                                    <span>{plan.free_interior_cleaning_count} free interior cleanings</span>
                                                </div>
                                            )}
                                            {plan.coupons_per_month > 0 && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Gift size={16} className="text-purple-500" />
                                                    <span>{plan.coupons_per_month} coupons/month ({plan.coupon_discount_percentage}% off)</span>
                                                </div>
                                            )}
                                            {plan.priority_booking && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Zap size={16} className="text-yellow-500" />
                                                    <span>Priority booking</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Status & Actions */}
                                        <div className="p-4 border-t">
                                            <div className="flex items-center justify-between mb-3">
                                                <Badge variant={plan.is_active ? 'success' : 'warning'}>
                                                    {plan.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => openEditPlan(plan)}
                                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                                        title="Edit plan"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePlan(plan.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                        title="Delete plan"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Manage Benefits button */}
                                            <button
                                                onClick={() => openBenefitManager(plan)}
                                                className="w-full flex items-center justify-between px-3 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-sm text-purple-700 font-medium transition-colors"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Gift size={15} />
                                                    Manage Benefits
                                                    {plan.benefits?.length > 0 && (
                                                        <span className="bg-purple-200 text-purple-800 text-xs font-bold px-1.5 py-0.5 rounded-full">
                                                            {plan.benefits.length}
                                                        </span>
                                                    )}
                                                </span>
                                                <ChevronRight size={15} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12 text-gray-500">
                                    No membership plans found
                                </div>
                            )}
                        </div>
                    )}

                    {/* Subscriptions Tab */}
                    {activeTab === 'subscriptions' && (
                        <div className="bg-white rounded-lg border overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[750px]">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Membership ID</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Customer</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Plan</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Vehicle</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Validity</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Usage</th>
                                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Info</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredSubscriptions.length > 0 ? (
                                            filteredSubscriptions.map((sub) => (
                                                <tr key={sub.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-mono text-sm">{sub.membership_id}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium">{sub.customer_name}</div>
                                                        <div className="text-xs text-gray-500">{sub.customer_phone}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge className={TIER_COLORS[sub.plan_tier]}>
                                                            {TIER_ICONS[sub.plan_tier]} {sub.plan_name}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {sub.vehicle_brand} {sub.vehicle_model}
                                                        <div className="text-xs text-gray-500">{sub.vehicle_registration}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant={sub.status === 'active' ? 'success' : 'warning'}>
                                                            {sub.status_display || sub.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <div>{sub.start_date} - {sub.end_date}</div>
                                                        {sub.days_remaining > 0 && (
                                                            <div className="text-xs text-green-600">{sub.days_remaining} days left</div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <div>Washes: {sub.washes_used}/{sub.washes_remaining + sub.washes_used}</div>
                                                        <div>Interior: {sub.interior_cleanings_used}/{sub.interior_cleanings_remaining + sub.interior_cleanings_used}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => { setSelectedSub(sub); setShowSubDetailModal(true); }}
                                                            className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                            title="View Details"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="8" className="px-4 py-12 text-center text-gray-500">
                                                    No subscriptions found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Coupons Tab */}
                    {activeTab === 'coupons' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredCoupons.length > 0 ? (
                                filteredCoupons.map((coupon) => (
                                    <div
                                        key={coupon.id}
                                        className={`bg-white rounded-lg border-2 p-4 ${coupon.status === 'active' ? 'border-green-200' : 'border-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <div className="font-mono font-bold text-lg text-primary">{coupon.code}</div>
                                                <div className="text-sm text-gray-600">{coupon.coupon_type_display}</div>
                                            </div>
                                            <Badge variant={coupon.status === 'active' ? 'success' : 'warning'}>
                                                {coupon.status_display || coupon.status}
                                            </Badge>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            {coupon.coupon_type === 'percentage' && (
                                                <div className="flex items-center gap-2">
                                                    <Percent size={16} className="text-green-500" />
                                                    <span>{coupon.discount_percentage}% off</span>
                                                    {coupon.max_discount && (
                                                        <span className="text-gray-500">(max ₹{coupon.max_discount})</span>
                                                    )}
                                                </div>
                                            )}
                                            {coupon.coupon_type === 'fixed' && (
                                                <div className="flex items-center gap-2">
                                                    <IndianRupee size={16} className="text-green-500" />
                                                    <span>₹{coupon.discount_amount} off</span>
                                                </div>
                                            )}
                                            {coupon.min_order_value > 0 && (
                                                <div className="text-gray-500">Min order: ₹{coupon.min_order_value}</div>
                                            )}
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Calendar size={14} />
                                                <span>Valid until: {new Date(coupon.valid_until).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Users size={14} />
                                                <span>Used: {coupon.times_used}/{coupon.usage_limit || '∞'}</span>
                                            </div>
                                            {coupon.is_membership_coupon && (
                                                <Badge variant="purple" className="text-xs">
                                                    Membership Coupon
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12 text-gray-500">
                                    No coupons found
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Plan Modal */}
            <Modal
                isOpen={showPlanModal}
                onClose={() => {
                    setShowPlanModal(false);
                    setEditingPlan(null);
                }}
                title={editingPlan ? 'Edit Membership Plan' : 'Create Membership Plan'}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setShowPlanModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreatePlan}>
                            {editingPlan ? 'Update' : 'Create'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleCreatePlan} className="space-y-4">
                    {/* Basic Info */}
                    <Input
                        label="Plan Name"
                        placeholder="e.g., Gold Membership"
                        value={planForm.name}
                        onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                        required
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                        <select
                            value={planForm.tier}
                            onChange={(e) => setPlanForm({ ...planForm, tier: e.target.value })}
                            className="input w-full"
                        >
                            <option value="bronze">🥉 Bronze</option>
                            <option value="silver">🥈 Silver</option>
                            <option value="gold">🥇 Gold</option>
                            <option value="platinum">💎 Platinum</option>
                            <option value="diamond">👑 Diamond</option>
                        </select>
                    </div>

                    <Textarea
                        label="Description"
                        placeholder="Describe the membership benefits..."
                        value={planForm.description}
                        onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                        rows={2}
                    />

                    {/* Vehicle-Type Pricing */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <Car size={16} className="text-blue-600" />
                            Pricing by Vehicle Type
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">🚗 Hatchback</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="₹"
                                    value={planForm.hatchback_price}
                                    onChange={(e) => setPlanForm({ ...planForm, hatchback_price: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">🚙 Sedan</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="₹"
                                    value={planForm.sedan_price}
                                    onChange={(e) => setPlanForm({ ...planForm, sedan_price: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">🚐 SUV</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="₹"
                                    value={planForm.suv_price}
                                    onChange={(e) => setPlanForm({ ...planForm, suv_price: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Duration Value"
                            type="number"
                            value={planForm.duration_value}
                            onChange={(e) => setPlanForm({ ...planForm, duration_value: e.target.value })}
                            required
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Duration Unit</label>
                            <select
                                value={planForm.duration_unit}
                                onChange={(e) => setPlanForm({ ...planForm, duration_unit: e.target.value })}
                                className="input w-full"
                            >
                                <option value="days">Days</option>
                                <option value="months">Months</option>
                                <option value="years">Years</option>
                            </select>
                        </div>
                    </div>

                    {/* Benefits note */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                        <Gift size={15} className="text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-700">
                            Configure individual benefits (discounts, free services, coupons) after creating the plan using the <strong>Manage Benefits</strong> button on the plan card.
                        </p>
                    </div>

                    {/* Status */}
                    <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={planForm.is_active}
                                onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })}
                                className="w-4 h-4"
                            />
                            <span className="text-sm">Active</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={planForm.is_popular}
                                onChange={(e) => setPlanForm({ ...planForm, is_popular: e.target.checked })}
                                className="w-4 h-4"
                            />
                            <span className="text-sm">Mark as Popular</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={planForm.is_global}
                                onChange={(e) => setPlanForm({ ...planForm, is_global: e.target.checked })}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-medium">Available at all branches</span>
                        </label>

                        {!planForm.is_global && (isSuperAdmin || isCompanyAdmin) && (
                            <div className="mt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Target Branch</label>
                                <select
                                    value={planForm.branch || ''}
                                    onChange={(e) => setPlanForm({ ...planForm, branch: e.target.value })}
                                    className="input w-full"
                                    required={!planForm.is_global}
                                >
                                    <option value="">Select Branch</option>
                                    {branches.map((branch) => (
                                        <option key={branch.id} value={branch.id}>
                                            {branch.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </form>
            </Modal>

            {/* Usage Reports Tab */}
            {activeTab === 'usage-reports' && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Search size={20} className="text-primary" />
                            Filters
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Customer ID
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter customer ID..."
                                    value={usageFilters.customer_id}
                                    onChange={(e) => setUsageFilters({ ...usageFilters, customer_id: e.target.value })}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={usageFilters.start_date}
                                    onChange={(e) => setUsageFilters({ ...usageFilters, start_date: e.target.value })}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={usageFilters.end_date}
                                    onChange={(e) => setUsageFilters({ ...usageFilters, end_date: e.target.value })}
                                    className="input w-full"
                                />
                            </div>
                            {(isSuperAdmin || isCompanyAdmin) && !getCurrentBranchId() && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Branch
                                    </label>
                                    <select
                                        value={usageFilters.branch}
                                        onChange={(e) => setUsageFilters({ ...usageFilters, branch: e.target.value })}
                                        className="input w-full"
                                    >
                                        <option value="">All Branches</option>
                                        {branches.map((branch) => (
                                            <option key={branch.id} value={branch.id}>
                                                {branch.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 flex gap-3">
                            <Button onClick={fetchUsageReports} className="flex items-center gap-2">
                                <Search size={16} />
                                Apply Filters
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setUsageFilters({ customer_id: '', start_date: '', end_date: '', branch: '' });
                                    fetchUsageReports();
                                }}
                            >
                                Clear Filters
                            </Button>
                        </div>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-2 border-blue-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-blue-700 font-medium">Total Redemptions</p>
                                    <p className="text-3xl font-bold text-blue-900 mt-2">
                                        {usageStats.total_redemptions}
                                    </p>
                                </div>
                                <Ticket className="text-blue-600" size={40} />
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-2 border-green-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-700 font-medium">Total Discounts Given</p>
                                    <p className="text-3xl font-bold text-green-900 mt-2">
                                        ₹{usageStats.total_discounts.toFixed(0)}
                                    </p>
                                </div>
                                <IndianRupee className="text-green-600" size={40} />
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-2 border-purple-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-purple-700 font-medium">Average Discount</p>
                                    <p className="text-3xl font-bold text-purple-900 mt-2">
                                        ₹{usageStats.average_discount.toFixed(0)}
                                    </p>
                                </div>
                                <Award className="text-purple-600" size={40} />
                            </div>
                        </div>
                    </div>

                    {/* Usage Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Coupon Code
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Customer
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Service
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Booking
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Discount
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Used At
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {usageReports.length > 0 ? (
                                        usageReports.map((usage) => (
                                            <tr key={usage.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="font-mono font-bold text-primary">
                                                        {usage.coupon_code}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="font-medium text-gray-900">{usage.customer_name}</div>
                                                        <div className="text-sm text-gray-500">{usage.customer_phone}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-900">{usage.service_name || 'N/A'}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-600">#{usage.booking_id}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="font-bold text-green-600">
                                                        ₹{parseFloat(usage.discount_applied).toFixed(0)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(usage.used_at).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                                <Award size={48} className="mx-auto mb-3 text-gray-300" />
                                                <p className="text-lg font-medium">No coupon usage found</p>
                                                <p className="text-sm mt-1">Try adjusting your filters</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Coupon Modal */}
            <Modal
                isOpen={showCouponModal}
                onClose={() => setShowCouponModal(false)}
                title="Create Coupon"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setShowCouponModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateCoupon}>
                            Create Coupon
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleCreateCoupon} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Type</label>
                        <select
                            value={couponForm.coupon_type}
                            onChange={(e) => setCouponForm({ ...couponForm, coupon_type: e.target.value })}
                            className="input w-full"
                        >
                            <option value="percentage">Percentage Discount</option>
                            <option value="fixed">Fixed Amount Discount</option>
                            <option value="free_service">Free Service</option>
                        </select>
                    </div>

                    {couponForm.coupon_type === 'percentage' && (
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Discount Percentage"
                                type="number"
                                step="0.01"
                                value={couponForm.discount_percentage}
                                onChange={(e) => setCouponForm({ ...couponForm, discount_percentage: e.target.value })}
                                required
                            />
                            <Input
                                label="Max Discount (₹)"
                                type="number"
                                step="0.01"
                                placeholder="Optional"
                                value={couponForm.max_discount}
                                onChange={(e) => setCouponForm({ ...couponForm, max_discount: e.target.value })}
                            />
                        </div>
                    )}

                    {couponForm.coupon_type === 'fixed' && (
                        <Input
                            label="Discount Amount (₹)"
                            type="number"
                            step="0.01"
                            value={couponForm.discount_amount}
                            onChange={(e) => setCouponForm({ ...couponForm, discount_amount: e.target.value })}
                            required
                        />
                    )}

                    <Input
                        label="Minimum Order Value (₹)"
                        type="number"
                        step="0.01"
                        value={couponForm.min_order_value}
                        onChange={(e) => setCouponForm({ ...couponForm, min_order_value: e.target.value })}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Valid From <span className="text-gray-400 font-normal">(blank = now)</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={couponForm.valid_from}
                                onChange={(e) => setCouponForm({ ...couponForm, valid_from: e.target.value })}
                                className="input w-full"
                            />
                        </div>
                        <Input
                            label="Valid Until"
                            type="datetime-local"
                            value={couponForm.valid_until}
                            onChange={(e) => setCouponForm({ ...couponForm, valid_until: e.target.value })}
                            required
                        />
                    </div>

                    <Input
                        label="Usage Limit (0 = unlimited)"
                        type="number"
                        value={couponForm.usage_limit}
                        onChange={(e) => setCouponForm({ ...couponForm, usage_limit: e.target.value })}
                    />

                    <Textarea
                        label="Description"
                        placeholder="Describe the coupon..."
                        value={couponForm.description}
                        onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                        rows={2}
                    />

                    <div>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={couponForm.is_global}
                                onChange={(e) => setCouponForm({ ...couponForm, is_global: e.target.checked })}
                                className="w-4 h-4"
                            />
                            <span className="text-sm font-medium">Available at all branches</span>
                        </label>

                        {!couponForm.is_global && (isSuperAdmin || isCompanyAdmin) && (
                            <div className="mt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Target Branch</label>
                                <select
                                    value={couponForm.branch || ''}
                                    onChange={(e) => setCouponForm({ ...couponForm, branch: e.target.value })}
                                    className="input w-full"
                                    required={!couponForm.is_global}
                                >
                                    <option value="">Select Branch</option>
                                    {branches.map((branch) => (
                                        <option key={branch.id} value={branch.id}>
                                            {branch.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </form>
            </Modal>

            {/* ── Subscription Detail Modal ─────────────────────── */}
            <Modal
                isOpen={showSubDetailModal}
                onClose={() => { setShowSubDetailModal(false); setSelectedSub(null); }}
                title="Membership Details"
                size="large"
            >
                {selectedSub && (() => {
                    const plan = plans.find(p => p.id === selectedSub.plan_id || p.name === selectedSub.plan_name);
                    const priceKey = `${selectedSub.vehicle_type || 'sedan'}_price`;
                    const basePrice = parseFloat(plan?.[priceKey] || selectedSub.amount_paid || 0);
                    const gstRate = plan?.gst_applicable ? parseFloat(plan?.gst_rate || 18) : 0;
                    const gstAmount = (basePrice * gstRate) / 100;
                    const totalPrice = basePrice + gstAmount;

                    const totalWashes = (selectedSub.washes_used || 0) + (selectedSub.washes_remaining || 0);
                    const totalInterior = (selectedSub.interior_cleanings_used || 0) + (selectedSub.interior_cleanings_remaining || 0);
                    const washPct = totalWashes > 0 ? Math.round(((selectedSub.washes_used || 0) / totalWashes) * 100) : 0;
                    const interiorPct = totalInterior > 0 ? Math.round(((selectedSub.interior_cleanings_used || 0) / totalInterior) * 100) : 0;
                    const validityPct = selectedSub.total_days > 0
                        ? Math.min(100, Math.round(((selectedSub.total_days - (selectedSub.days_remaining || 0)) / selectedSub.total_days) * 100))
                        : 0;

                    return (
                        <div className="space-y-4">
                            {/* Status Banner */}
                            <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${selectedSub.status === 'active' ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${selectedSub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        <Check size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
                                        <p className={`font-bold text-sm capitalize ${selectedSub.status === 'active' ? 'text-green-800' : 'text-yellow-800'}`}>
                                            {selectedSub.status_display || selectedSub.status}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Membership ID</p>
                                    <p className="font-mono font-bold text-gray-800">{selectedSub.membership_id}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Customer */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Users size={12} /> Customer</p>
                                    </div>
                                    <div className="p-4 space-y-1">
                                        <p className="font-bold text-gray-900">{selectedSub.customer_name}</p>
                                        <p className="text-sm text-gray-500">{selectedSub.customer_phone}</p>
                                        {selectedSub.customer_email && <p className="text-sm text-gray-500">{selectedSub.customer_email}</p>}
                                    </div>
                                </div>

                                {/* Vehicle */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Car size={12} /> Vehicle</p>
                                    </div>
                                    <div className="p-4 space-y-1">
                                        <p className="font-bold text-gray-900">{selectedSub.vehicle_brand} {selectedSub.vehicle_model}</p>
                                        <p className="text-sm font-mono text-primary font-bold tracking-wider">{selectedSub.vehicle_registration}</p>
                                        {selectedSub.vehicle_type && (
                                            <p className="text-xs text-gray-500 capitalize">{selectedSub.vehicle_type}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Plan */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Star size={12} /> Plan</p>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{TIER_ICONS[selectedSub.plan_tier]}</span>
                                            <p className="font-bold text-gray-900">{selectedSub.plan_name}</p>
                                        </div>
                                        <Badge className={TIER_COLORS[selectedSub.plan_tier]}>{selectedSub.plan_tier} tier</Badge>
                                    </div>
                                </div>

                                {/* Validity */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Calendar size={12} /> Validity</p>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        <p className="text-sm text-gray-700">{selectedSub.start_date} → {selectedSub.end_date}</p>
                                        {selectedSub.days_remaining > 0 ? (
                                            <p className="text-sm font-semibold text-green-600">{selectedSub.days_remaining} days remaining</p>
                                        ) : (
                                            <p className="text-sm font-semibold text-red-500">Expired</p>
                                        )}
                                        {selectedSub.total_days > 0 && (
                                            <div>
                                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                    <span>Elapsed</span>
                                                    <span>{validityPct}%</span>
                                                </div>
                                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${validityPct}%` }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Usage Breakdown */}
                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Zap size={12} /> Usage Breakdown</p>
                                </div>
                                <div className="p-4 space-y-4">
                                    {/* Washes */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-sm font-medium text-gray-700">Washes</span>
                                            <span className="text-sm font-bold text-gray-900">
                                                {selectedSub.washes_used} <span className="text-gray-400 font-normal">/ {totalWashes}</span>
                                                <span className="ml-2 text-xs text-green-600 font-semibold">({selectedSub.washes_remaining} left)</span>
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${washPct >= 100 ? 'bg-red-500' : washPct >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                style={{ width: `${washPct}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Interior */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-sm font-medium text-gray-700">Interior Cleanings</span>
                                            <span className="text-sm font-bold text-gray-900">
                                                {selectedSub.interior_cleanings_used} <span className="text-gray-400 font-normal">/ {totalInterior}</span>
                                                <span className="ml-2 text-xs text-green-600 font-semibold">({selectedSub.interior_cleanings_remaining} left)</span>
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${interiorPct >= 100 ? 'bg-red-500' : interiorPct >= 80 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                                                style={{ width: `${interiorPct}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Price Breakdown */}
                            <div className="rounded-xl border border-gray-200 overflow-hidden">
                                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><IndianRupee size={12} /> Pricing</p>
                                </div>
                                <div className="p-4 space-y-2 text-sm">
                                    {basePrice > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Base Price</span>
                                            <span className="font-semibold text-gray-800">₹{basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    {gstRate > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">GST ({gstRate}%)</span>
                                            <span className="font-semibold text-gray-800">+ ₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    {selectedSub.amount_paid > 0 && (
                                        <div className="flex justify-between text-green-700 pt-2 border-t border-dashed border-gray-200 font-bold">
                                            <span>Amount Paid</span>
                                            <span>₹{parseFloat(selectedSub.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    {selectedSub.payment_method && (
                                        <div className="flex justify-between text-xs text-gray-400">
                                            <span>Payment via</span>
                                            <span className="capitalize">{selectedSub.payment_method}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* ── Create Membership for Customer Modal ─────────────────────── */}
            <Modal
                isOpen={showCreateMembershipModal}
                onClose={() => { setShowCreateMembershipModal(false); resetCreateMembershipModal(); }}
                title="Create Membership for Customer"
                footer={
                    <div className="flex items-center justify-between w-full">
                        <div className="flex gap-2">
                            {createMembershipStep > 1 && (
                                <Button variant="outline" onClick={() => setCreateMembershipStep(s => s - 1)}>
                                    Back
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => { setShowCreateMembershipModal(false); resetCreateMembershipModal(); }}>
                                Cancel
                            </Button>
                            {createMembershipStep < 4 ? (
                                <Button
                                    onClick={() => {
                                        if (createMembershipStep === 1 && !selectedCustomer) {
                                            setAlert({ show: true, type: 'error', message: 'Please select a customer to continue.' });
                                            return;
                                        }
                                        if (createMembershipStep === 2) {
                                            const eligibleVehicles = customerVehicles.filter(v => v.vehicle_type !== 'bike');
                                            if (customerVehicles.length > 0 && eligibleVehicles.length === 0) {
                                                setAlert({ show: true, type: 'error', message: 'Membership plans are not available for bikes.' });
                                                return;
                                            }
                                            if (!createMembershipForm.plan || !createMembershipForm.vehicle) {
                                                setAlert({ show: true, type: 'error', message: 'Please select plan and vehicle.' });
                                                return;
                                            }
                                        }
                                        setCreateMembershipStep(s => s + 1);
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    Next <ChevronRight size={16} />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleCreateMembership}
                                    disabled={createMembershipLoading}
                                    className="flex items-center gap-2"
                                >
                                    {createMembershipLoading ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                    ) : (
                                        <UserPlus size={16} />
                                    )}
                                    Create Membership
                                </Button>
                            )}
                        </div>
                    </div>
                }
            >
                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    {['Customer', 'Plan & Vehicle', 'Payment', 'Vouchers'].map((label, i) => (
                        <div key={label} className="flex items-center gap-2">
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors ${createMembershipStep === i + 1
                                ? 'bg-primary text-white'
                                : createMembershipStep > i + 1
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-500'
                                }`}>
                                {createMembershipStep > i + 1 ? <Check size={14} /> : <span>{i + 1}</span>}
                                <span className="hidden sm:inline">{label}</span>
                            </div>
                            {i < 3 && <ChevronRight size={14} className="text-gray-300" />}
                        </div>
                    ))}
                </div>

                {/* Step 1: Customer Search */}
                {createMembershipStep === 1 && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">Search for a customer by phone number or name.</p>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by phone or name..."
                                value={customerSearch}
                                onChange={(e) => {
                                    setCustomerSearch(e.target.value);
                                    setSelectedCustomer(null);
                                    searchCustomers(e.target.value);
                                }}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                            {customerSearchLoading && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                                </div>
                            )}
                        </div>

                        {/* Search Results */}
                        {customerResults.length > 0 && !selectedCustomer && (
                            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                {customerResults.map(cust => (
                                    <button
                                        key={cust.id}
                                        onClick={() => selectCustomerForMembership(cust)}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b last:border-0 transition-colors"
                                    >
                                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                                            {(cust.first_name?.[0] || cust.phone?.[0] || '?').toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium text-gray-900">{cust.first_name} {cust.last_name}</div>
                                            <div className="text-sm text-gray-500">{cust.phone} · {cust.email}</div>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-400" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Selected Customer Card */}
                        {selectedCustomer && (
                            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="h-10 w-10 rounded-full bg-green-200 flex items-center justify-center text-green-800 font-bold">
                                    {(selectedCustomer.first_name?.[0] || '?').toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-gray-900">{selectedCustomer.first_name} {selectedCustomer.last_name}</div>
                                    <div className="text-sm text-gray-600">{selectedCustomer.phone} · {selectedCustomer.email}</div>
                                </div>
                                <div className="flex items-center gap-1 text-green-600">
                                    <Check size={16} />
                                    <span className="text-sm font-medium">Selected</span>
                                </div>
                                <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); setCustomerVehicles([]); }} className="ml-2 p-1 text-gray-400 hover:text-gray-600">
                                    <X size={16} />
                                </button>
                            </div>
                        )}

                        {customerSearch.length >= 2 && !customerSearchLoading && customerResults.length === 0 && !selectedCustomer && (
                            <p className="text-sm text-gray-500 text-center py-4">No customers found. Try a different search term.</p>
                        )}
                    </div>
                )}

                {/* Step 2: Plan & Vehicle */}
                {createMembershipStep === 2 && (() => {
                    const eligibleVehicles = customerVehicles.filter(v => v.vehicle_type !== 'bike');
                    const allBikes = customerVehicles.length > 0 && eligibleVehicles.length === 0;

                    return (
                        <div className="space-y-5">
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                                Creating membership for: <strong>{selectedCustomer?.first_name} {selectedCustomer?.last_name}</strong>
                            </div>

                            {/* Bike-only warning */}
                            {allBikes && (
                                <div className="flex flex-col items-center gap-3 p-6 bg-orange-50 border-2 border-orange-200 rounded-xl text-center">
                                    <span className="text-4xl">🏍️</span>
                                    <div>
                                        <p className="font-bold text-orange-800 text-base">Membership Not Available for Bikes</p>
                                        <p className="text-sm text-orange-700 mt-1">
                                            We currently do not offer membership plans for bikes.<br />
                                            Memberships are available for <strong>Hatchbacks, Sedans, and SUVs</strong> only.
                                        </p>
                                    </div>
                                    <div className="flex gap-3 mt-1 text-sm">
                                        <span className="flex items-center gap-1 text-orange-600">🚗 Hatchback</span>
                                        <span className="flex items-center gap-1 text-orange-600">🚙 Sedan</span>
                                        <span className="flex items-center gap-1 text-orange-600">🚐 SUV / MUV</span>
                                    </div>
                                </div>
                            )}

                            {/* Only show plan + vehicle selectors if there are eligible vehicles */}
                            {!allBikes && (
                                <>
                                    {/* Plan select */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Membership Plan *</label>
                                        <select
                                            value={createMembershipForm.plan}
                                            onChange={e => setCreateMembershipForm(f => ({ ...f, plan: e.target.value }))}
                                            className="input w-full"
                                        >
                                            <option value="">-- Select a plan --</option>
                                            {plans.filter(p => p.is_active).map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {TIER_ICONS[p.tier]} {p.name} — {p.duration_value} {p.duration_unit}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Vehicle select — bikes excluded */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle *</label>
                                        {eligibleVehicles.length > 0 ? (
                                            <select
                                                value={createMembershipForm.vehicle}
                                                onChange={e => {
                                                    const vid = e.target.value;
                                                    const v = eligibleVehicles.find(v => v.id === parseInt(vid));
                                                    const vt = v?.vehicle_type || 'sedan';
                                                    setCreateMembershipForm(f => ({ ...f, vehicle: vid, vehicle_type: vt }));
                                                }}
                                                className="input w-full"
                                            >
                                                <option value="">-- Select a vehicle --</option>
                                                {eligibleVehicles.map(v => (
                                                    <option key={v.id} value={v.id}>
                                                        {v.brand_name || v.brand} {v.model_name || v.model} — {v.registration_number}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <p className="text-sm text-gray-500 py-2">No eligible vehicles found for this customer.</p>
                                        )}
                                        {/* Inform if some vehicles were excluded */}
                                        {customerVehicles.length > eligibleVehicles.length && eligibleVehicles.length > 0 && (
                                            <p className="text-xs text-orange-600 mt-1.5 flex items-center gap-1">
                                                🏍️ {customerVehicles.length - eligibleVehicles.length} bike(s) hidden — memberships not available for bikes.
                                            </p>
                                        )}
                                    </div>

                                    {/* Vehicle type (manual override) */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type (for pricing)</label>
                                        <select
                                            value={createMembershipForm.vehicle_type}
                                            onChange={e => setCreateMembershipForm(f => ({ ...f, vehicle_type: e.target.value }))}
                                            className="input w-full"
                                        >
                                            <option value="hatchback">🚗 Hatchback</option>
                                            <option value="sedan">🚙 Sedan</option>
                                            <option value="suv">🚐 SUV / MUV</option>
                                        </select>
                                    </div>

                                    {/* Price preview */}
                                    {createMembershipForm.plan && (() => {
                                        const p = plans.find(p => p.id === parseInt(createMembershipForm.plan));
                                        const priceKey = `${createMembershipForm.vehicle_type}_price`;
                                        const price = p?.[priceKey];
                                        return price != null ? (
                                            <div className="p-3 bg-gray-50 border rounded-lg text-sm">
                                                <span className="text-gray-600">Price: </span>
                                                <span className="font-bold text-green-700">₹{price}</span>
                                                {p.gst_applicable && <span className="text-gray-500"> + {p.gst_rate}% GST</span>}
                                            </div>
                                        ) : null;
                                    })()}
                                </>
                            )}
                        </div>
                    );
                })()}

                {/* Step 3: Payment */}
                {createMembershipStep === 3 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                            <select
                                value={createMembershipForm.payment_method}
                                onChange={e => setCreateMembershipForm(f => ({ ...f, payment_method: e.target.value }))}
                                className="input w-full"
                            >
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="upi">UPI</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="wallet">Wallet</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <Input
                            label="Payment Reference / Transaction ID"
                            placeholder="e.g., UPI ref, cheque no..."
                            value={createMembershipForm.payment_reference}
                            onChange={e => setCreateMembershipForm(f => ({ ...f, payment_reference: e.target.value }))}
                        />
                        <Textarea
                            label="Notes (optional)"
                            placeholder="Any additional notes..."
                            value={createMembershipForm.notes}
                            onChange={e => setCreateMembershipForm(f => ({ ...f, notes: e.target.value }))}
                            rows={3}
                        />
                    </div>
                )}

                {/* Step 4: Voucher Coupons */}
                {createMembershipStep === 4 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-semibold text-gray-800">Issue Voucher Coupons</h4>
                                <p className="text-sm text-gray-500 mt-0.5">Optionally issue welcome coupons to this customer at membership creation.</p>
                            </div>
                            <Button onClick={addVoucherRow} variant="outline" className="flex items-center gap-2 text-sm">
                                <Plus size={15} /> Add Voucher
                            </Button>
                        </div>

                        {voucherCoupons.length === 0 && (
                            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                                <Gift size={32} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-sm text-gray-500">No vouchers added. Click "Add Voucher" to issue coupons.</p>
                                <p className="text-xs text-gray-400 mt-1">You can also skip this step and create the membership without coupons.</p>
                            </div>
                        )}

                        {voucherCoupons.map((v, idx) => (
                            <div key={idx} className="p-4 border border-purple-200 bg-purple-50 rounded-lg space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-purple-800 text-sm">Voucher #{idx + 1}</span>
                                    <button onClick={() => removeVoucherRow(idx)} className="p-1 text-red-500 hover:text-red-700">
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                                        <select
                                            value={v.coupon_type}
                                            onChange={e => updateVoucherRow(idx, 'coupon_type', e.target.value)}
                                            className="input w-full text-sm"
                                        >
                                            <option value="percentage">% Percentage</option>
                                            <option value="fixed">₹ Fixed Amount</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            {v.coupon_type === 'percentage' ? 'Discount %' : 'Discount ₹'}
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={v.coupon_type === 'percentage' ? v.discount_percentage : v.discount_amount}
                                            onChange={e => updateVoucherRow(idx, v.coupon_type === 'percentage' ? 'discount_percentage' : 'discount_amount', e.target.value)}
                                            className="input w-full text-sm"
                                        />
                                    </div>
                                    {v.coupon_type === 'percentage' && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Max Discount ₹ (optional)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="No limit"
                                                value={v.max_discount}
                                                onChange={e => updateVoucherRow(idx, 'max_discount', e.target.value)}
                                                className="input w-full text-sm"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Validity (days)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={v.valid_days}
                                            onChange={e => updateVoucherRow(idx, 'valid_days', e.target.value)}
                                            className="input w-full text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Count (# to generate)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={v.count}
                                            onChange={e => updateVoucherRow(idx, 'count', e.target.value)}
                                            className="input w-full text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Welcome bonus coupon"
                                        value={v.description}
                                        onChange={e => updateVoucherRow(idx, 'description', e.target.value)}
                                        className="input w-full text-sm"
                                    />
                                </div>
                            </div>
                        ))}

                        {/* Summary before submit */}
                        {(() => {
                            const selectedPlan = plans.find(p => p.id === parseInt(createMembershipForm.plan));
                            const priceKey = `${createMembershipForm.vehicle_type}_price`;
                            const basePrice = parseFloat(selectedPlan?.[priceKey] || 0);
                            const gstRate = selectedPlan?.gst_applicable ? parseFloat(selectedPlan?.gst_rate || 18) : 0;
                            const gstAmount = (basePrice * gstRate) / 100;
                            const totalPrice = basePrice + gstAmount;
                            const selectedVehicle = customerVehicles.find(v => v.id === parseInt(createMembershipForm.vehicle));
                            const totalVouchers = voucherCoupons.reduce((s, v) => s + (parseInt(v.count) || 1), 0);

                            return (
                                <div className="mt-4 rounded-xl border border-gray-200 overflow-hidden text-sm">
                                    {/* Header */}
                                    <div className="px-4 py-2.5 bg-gray-800 flex items-center justify-between">
                                        <span className="font-semibold text-white tracking-wide uppercase text-xs">Membership Summary</span>
                                        {selectedPlan && (
                                            <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium capitalize">
                                                {selectedPlan.tier} · {selectedPlan.duration_value} {selectedPlan.duration_unit}
                                            </span>
                                        )}
                                    </div>

                                    <div className="divide-y divide-gray-100">
                                        {/* Customer & Plan */}
                                        <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 bg-white">
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-0.5">Customer</p>
                                                <p className="font-semibold text-gray-800">{selectedCustomer?.first_name} {selectedCustomer?.last_name}</p>
                                                <p className="text-xs text-gray-500">{selectedCustomer?.phone}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-0.5">Plan</p>
                                                <p className="font-semibold text-gray-800">{selectedPlan?.name || '—'}</p>
                                                <p className="text-xs text-gray-500 capitalize">{selectedPlan?.tier} tier</p>
                                            </div>
                                        </div>

                                        {/* Vehicle & Payment */}
                                        <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 bg-white">
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-0.5">Vehicle</p>
                                                {selectedVehicle ? (
                                                    <>
                                                        <p className="font-semibold text-gray-800">{selectedVehicle.brand_name || selectedVehicle.brand} {selectedVehicle.model_name || selectedVehicle.model}</p>
                                                        <p className="text-xs font-mono text-primary font-bold">{selectedVehicle.registration_number}</p>
                                                    </>
                                                ) : (
                                                    <p className="text-gray-500 capitalize">{createMembershipForm.vehicle_type}</p>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-0.5">Payment Method</p>
                                                <p className="font-semibold text-gray-800 capitalize">{createMembershipForm.payment_method || '—'}</p>
                                                {createMembershipForm.payment_reference && (
                                                    <p className="text-xs text-gray-500 truncate">Ref: {createMembershipForm.payment_reference}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Price Breakdown */}
                                        <div className="px-4 py-3 bg-white space-y-1.5">
                                            <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-2">Price Breakdown</p>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Base Price <span className="capitalize">({createMembershipForm.vehicle_type})</span></span>
                                                <span className="font-semibold text-gray-800">
                                                    {basePrice > 0 ? `₹${basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                                </span>
                                            </div>
                                            {gstRate > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">GST ({gstRate}%)</span>
                                                    <span className="font-semibold text-gray-800">+ ₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            {selectedPlan && !selectedPlan.gst_applicable && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">GST</span>
                                                    <span className="text-gray-400 italic">Not applicable</span>
                                                </div>
                                            )}
                                            {totalVouchers > 0 && (
                                                <div className="flex justify-between text-purple-700">
                                                    <span>Vouchers to issue</span>
                                                    <span className="font-semibold">{totalVouchers} coupon{totalVouchers !== 1 ? 's' : ''}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Total Row */}
                                        <div className="px-4 py-3 bg-green-600 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-green-100">Total Amount</p>
                                                <p className="text-xs text-green-200">Inclusive of all taxes</p>
                                            </div>
                                            <p className="text-xl font-black text-white">
                                                {totalPrice > 0
                                                    ? `₹${totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                    : '—'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </Modal>

            {/* ═══════════════ Benefit Manager Modal ═══════════════ */}
            {showBenefitModal && benefitPlan && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 py-6 px-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
                        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-600 to-purple-800 rounded-t-2xl">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Gift size={22} /> Plan Benefits
                                </h2>
                                <p className="text-purple-200 text-sm mt-0.5">{benefitPlan.name}</p>
                            </div>
                            <button onClick={() => setShowBenefitModal(false)} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mx-6 mt-5 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
                            💡 Benefits with <strong>Coupon Count &gt; 0</strong> will auto-generate individual coupons for each customer when a membership is created for them.
                        </div>

                        <div className="p-6 space-y-3 max-h-[55vh] overflow-y-auto">
                            {benefitsLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin h-8 w-8 border-b-2 border-purple-600 rounded-full" />
                                </div>
                            ) : planBenefits.length === 0 ? (
                                <div className="text-center py-10 text-gray-500 space-y-2">
                                    <Gift size={36} className="mx-auto text-gray-300" />
                                    <p className="font-medium">No benefits configured yet</p>
                                    <p className="text-sm">Click "Add Benefit" to define what coupons customers get with this plan.</p>
                                </div>
                            ) : (
                                planBenefits.map((b) => (
                                    <div key={b.id} className={`flex items-start gap-3 p-4 rounded-xl border ${b.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                                        <div className={`mt-0.5 p-2 rounded-lg flex-shrink-0 ${b.benefit_type === 'discount' ? 'bg-green-100 text-green-700' :
                                            b.benefit_type === 'free_service' ? 'bg-blue-100 text-blue-700' :
                                                'bg-orange-100 text-orange-700'
                                            }`}>
                                            {b.benefit_type === 'discount' ? <Percent size={16} /> :
                                                b.benefit_type === 'free_service' ? <Check size={16} /> :
                                                    <Gift size={16} />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-gray-800 text-sm">{b.title}</span>
                                                {b.is_one_time && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">One-time</span>}
                                                {!b.is_active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                                            </div>
                                            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
                                                {parseFloat(b.discount_percentage) > 0 && (
                                                    <span className="flex items-center gap-1 text-green-700 font-medium"><Percent size={11} />{b.discount_percentage}% OFF</span>
                                                )}
                                                {parseFloat(b.discount_fixed_amount) > 0 && (
                                                    <span className="flex items-center gap-1 text-green-700 font-medium"><IndianRupee size={11} />{b.discount_fixed_amount} OFF</span>
                                                )}
                                                {b.coupon_count > 0 && (
                                                    <span className="flex items-center gap-1 text-purple-700 font-medium"><Ticket size={11} />{b.coupon_count} coupon{b.coupon_count > 1 ? 's' : ''}</span>
                                                )}
                                                {b.applicable_categories?.length > 0 && (
                                                    <span className="flex items-center gap-1"><Tag size={11} />{b.applicable_categories.join(', ')}</span>
                                                )}
                                            </div>
                                            {b.description && <p className="text-xs text-gray-400 mt-1 truncate">{b.description}</p>}
                                        </div>

                                        <div className="flex gap-1 flex-shrink-0">
                                            <button onClick={() => openEditBenefit(b)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Edit">
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => handleDeleteBenefit(b.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-6 border-t flex items-center justify-between">
                            <span className="text-sm text-gray-500">{planBenefits.length} benefit{planBenefits.length !== 1 ? 's' : ''} configured</span>
                            <div className="flex gap-3">
                                <button onClick={() => setShowBenefitModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                                    Close
                                </button>
                                <button onClick={openAddBenefit} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
                                    <Plus size={16} /> Add Benefit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════ Benefit Form Modal ═══════════════ */}
            {showBenefitFormModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-5 border-b">
                            <h3 className="font-bold text-lg text-gray-800">
                                {editingBenefit ? 'Edit Benefit' : 'Add New Benefit'}
                            </h3>
                            <button onClick={() => setShowBenefitFormModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Benefit Title <span className="text-red-500">*</span></label>
                                <input
                                    type="text" required
                                    placeholder='e.g. "Normal Car Wash 30% OFF"'
                                    value={benefitForm.title}
                                    onChange={e => setBenefitForm(f => ({ ...f, title: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                />
                            </div>

                            {/* Benefit Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Benefit Type</label>
                                <select
                                    value={benefitForm.benefit_type}
                                    onChange={e => setBenefitForm(f => ({ ...f, benefit_type: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="discount">Discount</option>
                                    <option value="free_service">Free Service</option>
                                    <option value="addon">Free Add-on</option>
                                    <option value="priority">Priority Access</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            {/* Discount fields — shown for discount / other */}
                            {['discount', 'other'].includes(benefitForm.benefit_type) && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Discount % <span className="text-gray-400">(e.g. 30)</span></label>
                                            <input
                                                type="number" min="0" max="100" step="0.01"
                                                value={benefitForm.discount_percentage}
                                                onChange={e => setBenefitForm(f => ({ ...f, discount_percentage: e.target.value }))}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Fixed ₹ Discount <span className="text-gray-400">(e.g. 400)</span></label>
                                            <input
                                                type="number" min="0" step="0.01"
                                                value={benefitForm.discount_fixed_amount}
                                                onChange={e => setBenefitForm(f => ({ ...f, discount_fixed_amount: e.target.value }))}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 -mt-2">Use % OR fixed ₹ — whichever is &gt; 0 will be applied when issuing coupons.</p>
                                </>
                            )}

                            {/* Coupon count — not shown for priority */}
                            {benefitForm.benefit_type !== 'priority' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Coupons to Issue <span className="text-gray-400 font-normal">(per membership)</span>
                                    </label>
                                    <input
                                        type="number" min="0" max="100"
                                        value={benefitForm.coupon_count}
                                        onChange={e => setBenefitForm(f => ({ ...f, coupon_count: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Set to 0 if no physical coupons needed.</p>
                                </div>
                            )}

                            {/* Service picker — shown for all types except priority */}
                            {benefitForm.benefit_type !== 'priority' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Applicable Services
                                        <span className="text-gray-400 font-normal ml-1">(leave empty = all services)</span>
                                    </label>

                                    {companyServices.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">No services found — loading or none configured.</p>
                                    ) : (
                                        <>
                                            {/* Search box */}
                                            <input
                                                type="text"
                                                placeholder="Search services..."
                                                value={serviceSearch}
                                                onChange={e => setServiceSearch(e.target.value)}
                                                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs mb-1 focus:ring-2 focus:ring-purple-400 focus:outline-none"
                                            />

                                            {/* Flat service list */}
                                            <div className="border border-gray-200 rounded-lg max-h-44 overflow-y-auto divide-y divide-gray-50">
                                                {companyServices
                                                    .filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()))
                                                    .map(svc => (
                                                        <label
                                                            key={svc.id}
                                                            className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none hover:bg-purple-50 transition-colors ${selectedServiceIds.includes(svc.id) ? 'bg-purple-50' : ''
                                                                }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedServiceIds.includes(svc.id)}
                                                                onChange={() => toggleService(svc)}
                                                                className="w-3.5 h-3.5 accent-purple-600 shrink-0"
                                                            />
                                                            <span className="text-xs text-gray-800 flex-1">{svc.name}</span>
                                                            <span className="text-[10px] text-gray-400 capitalize shrink-0">{svc.category_display || svc.category}</span>
                                                        </label>
                                                    ))
                                                }
                                                {companyServices.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase())).length === 0 && (
                                                    <p className="text-xs text-gray-400 px-3 py-2 italic">No matching services</p>
                                                )}
                                            </div>

                                            {/* Selected pills */}
                                            {selectedServiceIds.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {companyServices
                                                        .filter(s => selectedServiceIds.includes(s.id))
                                                        .map(s => (
                                                            <span key={s.id} className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                {s.name}
                                                                <button type="button" onClick={() => toggleService(s)} className="hover:text-red-500 leading-none">&times;</button>
                                                            </span>
                                                        ))
                                                    }
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Brief description shown on the coupon..."
                                    value={benefitForm.description}
                                    onChange={e => setBenefitForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 resize-none"
                                />
                            </div>

                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input type="checkbox" checked={benefitForm.is_one_time}
                                        onChange={e => setBenefitForm(f => ({ ...f, is_one_time: e.target.checked }))}
                                        className="w-4 h-4 accent-purple-600" />
                                    <span className="text-sm text-gray-700">One-time only</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input type="checkbox" checked={benefitForm.is_active}
                                        onChange={e => setBenefitForm(f => ({ ...f, is_active: e.target.checked }))}
                                        className="w-4 h-4 accent-purple-600" />
                                    <span className="text-sm text-gray-700">Active</span>
                                </label>
                            </div>
                        </div>

                        <div className="p-5 border-t flex justify-end gap-3">
                            <button type="button" onClick={() => setShowBenefitFormModal(false)}
                                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                                Cancel
                            </button>
                            <button onClick={handleSaveBenefit} disabled={benefitSaving}
                                className="px-5 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
                                {benefitSaving
                                    ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
                                    : <><Check size={16} /> {editingBenefit ? 'Update Benefit' : 'Add Benefit'}</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default MembershipManagement;
