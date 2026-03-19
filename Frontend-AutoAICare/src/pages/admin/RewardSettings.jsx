import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Alert, Loader } from '@/components/ui';
import { Save, RefreshCw, Play, Info, Settings, RotateCcw, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '@/utils/api';
import { useBranch } from '@/contexts/BranchContext';
import ServiceRewardConfig from '@/components/admin/ServiceRewardConfig';

// ─── Tier colour tokens ──────────────────────────────────────────────────────
const TIERS = [
    { key: 1, label: 'Tier 1 — Bronze', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900', badge: 'bg-amber-100 text-amber-800' },
    { key: 2, label: 'Tier 2 — Silver', bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-900', badge: 'bg-gray-200 text-gray-700' },
    { key: 3, label: 'Tier 3 — Gold', bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-900', badge: 'bg-yellow-100 text-yellow-800' },
    { key: 4, label: 'Tier 4 — Diamond', bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-900', badge: 'bg-blue-100 text-blue-700' },
];

const DEFAULT_SETTINGS = {
    use_percentage_based_rewards: true,
    // Percentage tiers
    tier_1_job_value_min: '5000.00',
    tier_1_reward_percentage: '1.00',
    tier_2_job_value_min: '10000.00',
    tier_2_reward_percentage: '1.50',
    tier_3_job_value_min: '12000.00',
    tier_3_reward_percentage: '1.80',
    tier_4_job_value_min: '15000.00',
    tier_4_reward_percentage: '2.00',
    // Time bonus
    apply_time_bonus: true,
    time_bonus_percentage: '0.50',
    time_bonus_interval_minutes: 15,
    // Deductions
    deduction_enabled: true,
    deduction_threshold_minutes: 15,
    deduction_per_minute: '5.00',
    max_deduction_per_job: '500.00',
    apply_deduction_to_applicators: true,
    // Distribution
    applicator_share_percentage: '50.00',
    is_active: true,
};

// ─── Recalculate Confirmation Modal ─────────────────────────────────────────
const RecalculateModal = ({ onConfirm, onSkip, loading, result }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            {!result ? (
                <>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                            <AlertTriangle className="text-amber-600" size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Settings Saved</h3>
                            <p className="text-sm text-gray-500">Recalculate existing rewards?</p>
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-6">
                        Your new tier percentages are saved. Would you like to <strong>recalculate all pending reward records</strong> for your team using the updated rates?
                        <br /><br />
                        <span className="text-xs text-gray-400">⚠ Only <em>pending</em> records are updated — approved and paid rewards remain unchanged.</span>
                    </p>
                    <div className="flex gap-3">
                        <Button onClick={onConfirm} disabled={loading} className="flex-1 flex items-center justify-center gap-2">
                            <RotateCcw size={16} />
                            {loading ? 'Recalculating…' : 'Recalculate Pending'}
                        </Button>
                        <Button variant="outline" onClick={onSkip} disabled={loading} className="flex-1">
                            Skip
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="text-green-600" size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Recalculation Complete</h3>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        {[
                            { label: 'Updated', value: result.updated, color: 'text-green-600' },
                            { label: 'Skipped', value: result.skipped, color: 'text-gray-500' },
                            { label: 'Errors', value: result.errors?.length ?? 0, color: 'text-red-500' },
                        ].map(s => (
                            <div key={s.label} className="text-center p-3 bg-gray-50 rounded-lg">
                                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                            </div>
                        ))}
                    </div>
                    <Button onClick={onSkip} className="w-full">Done</Button>
                </>
            )}
        </div>
    </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
const RewardSettings = () => {
    const { getCurrentBranchId, getCurrentBranchName } = useBranch();
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [activeTab, setActiveTab] = useState('global');
    const [services, setServices] = useState([]);
    const [servicesLoading, setServicesLoading] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [showServiceConfig, setShowServiceConfig] = useState(false);

    // Recalculate modal state
    const [showRecalcModal, setShowRecalcModal] = useState(false);
    const [recalcLoading, setRecalcLoading] = useState(false);
    const [recalcResult, setRecalcResult] = useState(null);

    // Simulation state
    const [simulating, setSimulating] = useState(false);
    const [simResult, setSimResult] = useState(null);
    const [simJobValue, setSimJobValue] = useState('12000');
    const [simAllowed, setSimAllowed] = useState('60');
    const [simActual, setSimActual] = useState('45');

    // ── Fetch ────────────────────────────────────────────────────────────────
    useEffect(() => {
        fetchSettings();
        if (activeTab === 'services') fetchServices();
    }, [getCurrentBranchId()]);

    useEffect(() => {
        if (activeTab === 'services' && services.length === 0) fetchServices();
    }, [activeTab]);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            setError(null);
            const params = {};
            if (getCurrentBranchId()) params.branch = getCurrentBranchId();

            const res = await api.get('/jobcards/reward-settings/active_settings/', { params });
            setSettings(res.data);
        } catch (err) {
            if (err.response?.status === 404) {
                setSettings({ ...DEFAULT_SETTINGS });
            } else {
                setError(err.response?.data?.error || 'Failed to load settings');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchServices = async () => {
        try {
            setServicesLoading(true);
            const params = {};
            if (getCurrentBranchId()) params.branch = getCurrentBranchId();

            const res = await api.get('/services/packages/', { params });
            const data = res.data.results || res.data;
            setServices(Array.isArray(data) ? data : []);
        } catch { setServices([]); }
        finally { setServicesLoading(false); }
    };


    // ── Save ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            if (settings.id) {
                await api.put(`/jobcards/reward-settings/${settings.id}/`, settings);
                setSuccess('Settings saved!');
                // Prompt recalculate only when editing existing settings
                setRecalcResult(null);
                setShowRecalcModal(true);
            } else {
                const payload = {
                    ...settings,
                    branch: getCurrentBranchId() || null
                };
                const res = await api.post('/jobcards/reward-settings/', payload);
                setSettings(res.data);
                setSuccess('Settings created successfully!');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    // ── Recalculate ──────────────────────────────────────────────────────────
    const handleRecalculate = async () => {
        try {
            setRecalcLoading(true);
            const res = await api.post(`/jobcards/reward-settings/${settings.id}/recalculate_rewards/`);
            setRecalcResult(res.data);
        } catch (err) {
            setRecalcResult({ updated: 0, skipped: 0, errors: [{ error: err.response?.data?.error || 'Failed' }] });
        } finally {
            setRecalcLoading(false);
        }
    };

    // ── Simulate ─────────────────────────────────────────────────────────────
    const handleSimulate = async () => {
        if (!settings?.id) { setError('Save settings first before simulating'); return; }
        try {
            setSimulating(true);
            setError(null);
            const res = await api.post(`/jobcards/reward-settings/${settings.id}/simulate/`, {
                job_value: parseFloat(simJobValue) || 0,
                allowed_minutes: parseInt(simAllowed) || 60,
                actual_minutes: parseInt(simActual) || 60,
            });
            setSimResult(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Simulation failed');
        } finally {
            setSimulating(false);
        }
    };

    const handleChange = (field, value) =>
        setSettings(prev => ({ ...prev, [field]: value }));

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="space-y-6 animate-pulse">
            {/* Header skeleton */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-8 bg-gray-200 rounded w-64" />
                    <div className="h-4 bg-gray-200 rounded w-80" />
                </div>
                <div className="flex gap-2">
                    <div className="h-9 bg-gray-200 rounded-lg w-24" />
                    <div className="h-9 bg-gray-200 rounded-lg w-32" />
                </div>
            </div>
            {/* Tab bar skeleton */}
            <div className="border-b border-gray-200 pb-0">
                <div className="flex gap-8">
                    <div className="h-4 bg-gray-200 rounded w-28 mb-4" />
                    <div className="h-4 bg-gray-200 rounded w-44 mb-4" />
                </div>
            </div>
            {/* Reward Mode card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="flex items-center gap-3">
                    <div className="w-12 h-6 bg-gray-200 rounded-full" />
                    <div className="h-4 bg-gray-200 rounded w-48" />
                </div>
            </div>
            {/* Tier cards */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <div className="h-4 bg-gray-200 rounded w-56" />
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="h-5 bg-gray-200 rounded w-32" />
                            <div className="h-9 bg-gray-200 rounded-lg" />
                            <div className="h-9 bg-gray-200 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
            {/* Distribution card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <div className="h-4 bg-gray-200 rounded w-44" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-9 bg-gray-200 rounded-lg" />
                    <div className="h-9 bg-gray-200 rounded-lg" />
                </div>
            </div>
        </div>
    );

    const isPercentage = settings?.use_percentage_based_rewards;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Reward &amp; Deduction Settings</h1>
                    <p className="text-sm text-gray-500 mt-1">Configure reward tiers and deduction rules for supervisors and applicators</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchSettings} className="flex items-center gap-2">
                        <RefreshCw size={15} /> Refresh
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                        <Save size={15} /> {saving ? 'Saving…' : 'Save Settings'}
                    </Button>
                </div>
            </div>

            {/* Alerts */}
            {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
            {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

            {/* Tab bar */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {['global', 'services'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab === 'global' ? 'Global Settings' : 'Service-Specific Settings'}
                        </button>
                    ))}
                </nav>
            </div>

            {/* ── GLOBAL TAB ─────────────────────────────────────────────── */}
            {activeTab === 'global' && (
                <>
                    {/* Reward Mode Toggle */}
                    <Card title="⚙️ Reward Mode">
                        <div className="flex items-start gap-4 p-1">
                            <div className="flex-1">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div
                                        onClick={() => handleChange('use_percentage_based_rewards', !isPercentage)}
                                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${isPercentage ? 'bg-primary' : 'bg-gray-300'}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${isPercentage ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </div>
                                    <span className="font-semibold text-gray-800">Percentage-Based Rewards</span>
                                </label>
                                <p className="text-sm text-gray-500 mt-1 ml-15">
                                    {isPercentage
                                        ? 'Rewards are calculated as a % of job value, tiered by invoice amount.'
                                        : 'Using legacy fixed-amount tiers (based on minutes saved).'}
                                </p>
                            </div>
                            {isPercentage && (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 self-center">Active</span>
                            )}
                        </div>
                    </Card>

                    {/* ── Percentage Tiers ─────────────────────────────────── */}
                    {isPercentage && (
                        <Card title="🏆 Revenue-Based Reward Tiers">
                            <div className="space-y-3">
                                <p className="text-xs text-gray-500 mb-4 flex items-start gap-2">
                                    <Info size={13} className="mt-0.5 shrink-0" />
                                    Each tier is triggered when the job invoice value meets or exceeds the minimum. The highest matching tier wins.
                                </p>

                                {/* Header row */}
                                <div className="hidden md:grid grid-cols-3 gap-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    <span>Tier</span>
                                    <span>Min Job Value (₹)</span>
                                    <span>Reward %</span>
                                </div>

                                {TIERS.map(({ key, label, bg, border, text, badge }) => (
                                    <div key={key} className={`p-4 rounded-xl border ${bg} ${border}`}>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge}`}>T{key}</span>
                                                <span className={`text-sm font-semibold ${text}`}>{label}</span>
                                            </div>
                                            <Input
                                                label={<span className="md:hidden text-xs">Min Job Value (₹)</span>}
                                                type="number"
                                                value={settings?.[`tier_${key}_job_value_min`] ?? ''}
                                                onChange={e => handleChange(`tier_${key}_job_value_min`, e.target.value)}
                                                placeholder="e.g. 5000"
                                                step="500"
                                            />
                                            <div>
                                                <Input
                                                    label={<span className="md:hidden text-xs">Reward %</span>}
                                                    type="number"
                                                    value={settings?.[`tier_${key}_reward_percentage`] ?? ''}
                                                    onChange={e => handleChange(`tier_${key}_reward_percentage`, e.target.value)}
                                                    placeholder="e.g. 1.50"
                                                    step="0.10"
                                                />
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    = {((parseFloat(settings?.[`tier_${key}_reward_percentage`]) || 0) * 1).toFixed(2)}% of invoice
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* ── Time Bonus ───────────────────────────────────────── */}
                    {isPercentage && (
                        <Card title="⏱ Time Bonus">
                            <div className="space-y-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div
                                        onClick={() => handleChange('apply_time_bonus', !settings?.apply_time_bonus)}
                                        className={`relative w-11 h-5 rounded-full transition-colors ${settings?.apply_time_bonus ? 'bg-primary' : 'bg-gray-300'}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${settings?.apply_time_bonus ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">Enable Time Bonus</span>
                                </label>

                                {settings?.apply_time_bonus && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                        <div>
                                            <Input
                                                label="Bonus % per interval"
                                                type="number"
                                                value={settings?.time_bonus_percentage ?? ''}
                                                onChange={e => handleChange('time_bonus_percentage', e.target.value)}
                                                placeholder="0.50"
                                                step="0.10"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">Extra % of job value per interval saved</p>
                                        </div>
                                        <div>
                                            <Input
                                                label="Interval (minutes)"
                                                type="number"
                                                value={settings?.time_bonus_interval_minutes ?? ''}
                                                onChange={e => handleChange('time_bonus_interval_minutes', parseInt(e.target.value))}
                                                placeholder="15"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">
                                                e.g. +{settings?.time_bonus_percentage || '0.50'}% for every {settings?.time_bonus_interval_minutes || 15} min saved
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* ── Deductions ───────────────────────────────────────── */}
                    <Card title="⚠️ Deduction Rules (Late Completion)">
                        <div className="space-y-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div
                                    onClick={() => handleChange('deduction_enabled', !settings?.deduction_enabled)}
                                    className={`relative w-11 h-5 rounded-full transition-colors ${settings?.deduction_enabled ? 'bg-red-500' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${settings?.deduction_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                                <span className="text-sm font-medium text-gray-700">Enable Deductions</span>
                            </label>

                            {settings?.deduction_enabled && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Input
                                        label="Grace Period (min)"
                                        type="number"
                                        value={settings?.deduction_threshold_minutes ?? ''}
                                        onChange={e => handleChange('deduction_threshold_minutes', parseInt(e.target.value))}
                                        placeholder="15"
                                    />
                                    <Input
                                        label="Deduction Per Minute (₹)"
                                        type="number"
                                        value={settings?.deduction_per_minute ?? ''}
                                        onChange={e => handleChange('deduction_per_minute', e.target.value)}
                                        placeholder="5"
                                    />
                                    <Input
                                        label="Max Deduction Per Job (₹)"
                                        type="number"
                                        value={settings?.max_deduction_per_job ?? ''}
                                        onChange={e => handleChange('max_deduction_per_job', e.target.value)}
                                        placeholder="500"
                                    />
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* ── Distribution ─────────────────────────────────────── */}
                    <Card title="👥 Distribution Settings">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Input
                                    label="Applicator Share (%)"
                                    type="number"
                                    value={settings?.applicator_share_percentage ?? ''}
                                    onChange={e => handleChange('applicator_share_percentage', e.target.value)}
                                    placeholder="50"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Supervisor gets {100 - (parseFloat(settings?.applicator_share_percentage) || 50)}%
                                    · Applicators share {parseFloat(settings?.applicator_share_percentage) || 50}%
                                </p>
                            </div>
                            <div>
                                <label className="flex items-center gap-3 cursor-pointer mt-6">
                                    <input
                                        type="checkbox"
                                        checked={settings?.apply_deduction_to_applicators || false}
                                        onChange={e => handleChange('apply_deduction_to_applicators', e.target.checked)}
                                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Apply Deductions to Applicators</span>
                                </label>
                                <p className="text-xs text-gray-400 mt-1">If off, only the supervisor receives deductions.</p>
                            </div>
                        </div>
                    </Card>

                    {/* ── Simulation Tool ──────────────────────────────────── */}
                    <Card title="🧪 Simulation Tool">
                        <div className="space-y-4">
                            <div className={`grid gap-4 ${isPercentage ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
                                {isPercentage && (
                                    <Input
                                        label="Job Value (₹)"
                                        type="number"
                                        value={simJobValue}
                                        onChange={e => setSimJobValue(e.target.value)}
                                        placeholder="12000"
                                    />
                                )}
                                <Input
                                    label="Allowed (min)"
                                    type="number"
                                    value={simAllowed}
                                    onChange={e => setSimAllowed(e.target.value)}
                                    placeholder="60"
                                />
                                <Input
                                    label="Actual (min)"
                                    type="number"
                                    value={simActual}
                                    onChange={e => setSimActual(e.target.value)}
                                    placeholder="45"
                                />
                                <div className="flex items-end">
                                    <Button onClick={handleSimulate} disabled={simulating || !settings?.id} className="w-full flex items-center justify-center gap-2">
                                        <Play size={15} />
                                        {simulating ? 'Running…' : 'Simulate'}
                                    </Button>
                                </div>
                            </div>

                            {simResult && (
                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 mt-2">
                                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                        Simulation Result
                                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${simResult.transaction_type === 'reward' ? 'bg-green-100 text-green-700' :
                                            simResult.transaction_type === 'deduction' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                            {simResult.transaction_type ? simResult.transaction_type.toUpperCase() : 'NO RESULT'}
                                        </span>
                                    </h4>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-xs text-blue-600">Tier</p>
                                            <p className="text-lg font-bold text-blue-900">{simResult.tier || '—'}</p>
                                        </div>
                                        {isPercentage && (
                                            <>
                                                <div>
                                                    <p className="text-xs text-blue-600">Reward %</p>
                                                    <p className="text-lg font-bold text-blue-900">
                                                        {simResult.reward_percentage != null ? `${simResult.reward_percentage}%` : '—'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-blue-600">Base Reward</p>
                                                    <p className="text-lg font-bold text-blue-900">₹{simResult.base_reward?.toFixed(2) ?? 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-blue-600">Time Bonus</p>
                                                    <p className="text-lg font-bold text-green-700">+₹{simResult.time_bonus?.toFixed(2) ?? 0}</p>
                                                </div>
                                            </>
                                        )}
                                        <div>
                                            <p className="text-xs text-blue-600">Total</p>
                                            <p className="text-xl font-bold text-blue-900">₹{(simResult.total_amount || 0).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-blue-600">Supervisor</p>
                                            <p className="text-sm font-semibold text-blue-900">₹{(simResult.supervisor_amount || 0).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-blue-600">Applicator Pool</p>
                                            <p className="text-sm font-semibold text-blue-900">₹{(simResult.applicator_pool || 0).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-blue-600">Time Saved</p>
                                            <p className="text-sm font-semibold text-blue-900">
                                                {Math.abs(simResult.time_difference_minutes)} min {simResult.status}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </>
            )}

            {/* ── SERVICES TAB ───────────────────────────────────────────── */}
            {activeTab === 'services' && (
                <Card title="Service-Specific Reward Configuration">
                    {servicesLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="p-4 border rounded-xl space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1.5">
                                            <div className="h-4 bg-gray-200 rounded w-32" />
                                            <div className="h-3 bg-gray-200 rounded w-20" />
                                        </div>
                                        <div className="h-5 bg-gray-200 rounded-full w-14" />
                                    </div>
                                    <div className="h-8 bg-gray-200 rounded-lg w-full mt-3" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500">
                                Configure custom reward settings for individual services. Services without custom settings use the global configuration above.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {services.map(service => (
                                    <div key={service.id} className="p-4 border rounded-xl hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-gray-900">{service.name}</h4>
                                                <p className="text-xs text-gray-500 mt-1">{service.category_display}</p>
                                            </div>
                                            <span className={`px-2 py-1 text-xs rounded-full ${service.reward_status === 'custom'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {service.reward_status === 'custom' ? 'Custom' : 'Global'}
                                            </span>
                                        </div>
                                        <Button
                                            variant="outline" size="sm"
                                            onClick={() => { setSelectedService(service); setShowServiceConfig(true); }}
                                            className="w-full flex items-center justify-center gap-2 mt-3"
                                        >
                                            <Settings size={13} /> Configure Rewards
                                        </Button>
                                    </div>
                                ))}
                                {services.length === 0 && (
                                    <div className="col-span-3 text-center py-12 text-gray-400">No services found</div>
                                )}
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {/* Recalculate modal */}
            {showRecalcModal && (
                <RecalculateModal
                    loading={recalcLoading}
                    result={recalcResult}
                    onConfirm={handleRecalculate}
                    onSkip={() => { setShowRecalcModal(false); setRecalcResult(null); }}
                />
            )}

            {/* Service config modal */}
            {selectedService && (
                <ServiceRewardConfig
                    serviceId={selectedService.id}
                    serviceName={selectedService.name}
                    isOpen={showServiceConfig}
                    onClose={() => { setShowServiceConfig(false); setSelectedService(null); }}
                    onSave={() => {
                        fetchServices();
                        setShowServiceConfig(false);
                        setSelectedService(null);
                        setSuccess('Service reward configuration updated!');
                    }}
                />
            )}
        </div>
    );
};

export default RewardSettings;
