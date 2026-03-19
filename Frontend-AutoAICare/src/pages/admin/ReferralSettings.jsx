import { useState, useEffect } from 'react';
import { Settings, Gift, Users, DollarSign, Percent, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, Button, Input, Select } from '../../components/ui';
import api from '../../utils/api';
import { useBranch } from '@/contexts/BranchContext';

const ReferralSettings = () => {
    const { getCurrentBranchId, getCurrentBranchName } = useBranch();
    const [settings, setSettings] = useState({
        is_enabled: true,
        referrer_reward_type: 'fixed',
        referrer_reward_value: 100.00,
        referee_reward_type: 'fixed',
        referee_reward_value: 100.00,
        minimum_job_amount: 0.00,
        max_referrer_reward_cap: null,
        max_referee_reward_cap: null
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchSettings();
        fetchStats();
    }, [getCurrentBranchId()]);

    const fetchSettings = async () => {
        try {
            const params = {};
            if (getCurrentBranchId()) params.branch = getCurrentBranchId();
            const response = await api.get('/settings/referral/', { params });
            setSettings(response.data);
        } catch (error) {
            console.error('Error fetching settings:', error);
            alert('Failed to load referral settings');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const params = {};
            if (getCurrentBranchId()) params.branch = getCurrentBranchId();
            const response = await api.get('/customers/referrals/', { params });
            const referrals = response.data.results || response.data || [];

            const totalReferrals = referrals.length;
            const activeReferrals = referrals.filter(r => r.status === 'rewarded').length;
            const totalRewardsGiven = referrals
                .filter(r => r.status === 'rewarded')
                .reduce((sum, r) => sum + parseFloat(r.referrer_points_awarded) + parseFloat(r.referee_points_awarded), 0);

            setStats({
                totalReferrals,
                activeReferrals,
                totalRewardsGiven
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            // Prepare data
            const data = {
                ...settings,
                referrer_reward_value: parseFloat(settings.referrer_reward_value),
                referee_reward_value: parseFloat(settings.referee_reward_value),
                minimum_job_amount: parseFloat(settings.minimum_job_amount || 0),
                max_referrer_reward_cap: settings.max_referrer_reward_cap ? parseFloat(settings.max_referrer_reward_cap) : null,
                max_referee_reward_cap: settings.max_referee_reward_cap ? parseFloat(settings.max_referee_reward_cap) : null
            };

            const params = {};
            if (getCurrentBranchId()) params.branch = getCurrentBranchId();

            if (settings.id) {
                await api.patch(`/settings/referral/${settings.id}/`, data, { params });
            } else {
                const payload = { ...data, branch: getCurrentBranchId() || null };
                await api.post('/settings/referral/', payload);
            }
            alert('Referral settings updated successfully!');
            fetchSettings();
        } catch (error) {
            console.error('Error saving settings:', error);
            alert(error.response?.data?.error || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const getPreviewText = (type, value, cap) => {
        if (type === 'percentage') {
            const text = `${value}% off`;
            return cap ? `${text} (max ₹${cap})` : text;
        }
        return `₹${value}`;
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-9 bg-gray-200 rounded w-72" />
                        <div className="h-4 bg-gray-200 rounded w-56" />
                    </div>
                    <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                </div>
                {/* Stats cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                                <div className="space-y-1.5">
                                    <div className="h-3 bg-gray-200 rounded w-24" />
                                    <div className="h-7 bg-gray-200 rounded w-16" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {/* Toggle card */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-200 rounded" />
                            <div className="space-y-1.5">
                                <div className="h-4 bg-gray-200 rounded w-44" />
                                <div className="h-3 bg-gray-200 rounded w-36" />
                            </div>
                        </div>
                        <div className="w-14 h-7 bg-gray-200 rounded-full" />
                    </div>
                </div>
                {/* Referrer + Referee reward cards */}
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                            <div className="space-y-1.5">
                                <div className="h-4 bg-gray-200 rounded w-36" />
                                <div className="h-3 bg-gray-200 rounded w-52" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="h-10 bg-gray-200 rounded-lg" />
                            <div className="h-10 bg-gray-200 rounded-lg" />
                        </div>
                        <div className="h-16 bg-gray-100 rounded-lg" />
                    </div>
                ))}
                {/* Additional settings */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-36" />
                    <div className="h-10 bg-gray-200 rounded-lg w-1/2" />
                </div>
                {/* Save row */}
                <div className="flex justify-end gap-3">
                    <div className="h-10 bg-gray-200 rounded-lg w-20" />
                    <div className="h-10 bg-gray-200 rounded-lg w-36" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Referral Program Settings</h1>
                    <p className="text-gray-600 mt-1">Configure rewards and manage the referral program</p>
                </div>
                <Settings className="w-12 h-12 text-primary" />
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-500 rounded-lg">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Referrals</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalReferrals}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-500 rounded-lg">
                                <Gift className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Active Referrals</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.activeReferrals}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-500 rounded-lg">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Rewards Given</p>
                                <p className="text-2xl font-bold text-gray-900">₹{stats.totalRewardsGiven.toFixed(2)}</p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Program Status */}
            <Card>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {settings.is_enabled ? (
                            <ToggleRight className="w-8 h-8 text-green-500" />
                        ) : (
                            <ToggleLeft className="w-8 h-8 text-gray-400" />
                        )}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Referral Program Status</h3>
                            <p className="text-sm text-gray-600">
                                {settings.is_enabled ? 'Program is currently active' : 'Program is currently disabled'}
                            </p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            name="is_enabled"
                            checked={settings.is_enabled}
                            onChange={handleChange}
                            className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>
            </Card>

            {/* Referrer Rewards */}
            <Card>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-green-100 rounded-lg">
                        <Gift className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Referrer Rewards</h3>
                        <p className="text-sm text-gray-600">Rewards for customers who refer others</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label="Reward Type"
                        name="referrer_reward_type"
                        value={settings.referrer_reward_type}
                        onChange={handleChange}
                        options={[
                            { value: 'fixed', label: 'Fixed Amount (₹)' },
                            { value: 'percentage', label: 'Percentage (%)' }
                        ]}
                    />

                    <Input
                        label={settings.referrer_reward_type === 'percentage' ? 'Percentage Value' : 'Fixed Amount (₹)'}
                        type="number"
                        name="referrer_reward_value"
                        value={settings.referrer_reward_value}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        required
                    />

                    {settings.referrer_reward_type === 'percentage' && (
                        <Input
                            label="Maximum Reward Cap (₹) - Optional"
                            type="number"
                            name="max_referrer_reward_cap"
                            value={settings.max_referrer_reward_cap || ''}
                            onChange={handleChange}
                            min="0"
                            step="0.01"
                            placeholder="No cap"
                        />
                    )}
                </div>

                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-600">Preview:</p>
                    <p className="text-lg font-semibold text-green-600">
                        Referrer gets: {getPreviewText(settings.referrer_reward_type, settings.referrer_reward_value, settings.max_referrer_reward_cap)}
                    </p>
                </div>
            </Card>

            {/* Referee Rewards */}
            <Card>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-100 rounded-lg">
                        <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Referee Rewards</h3>
                        <p className="text-sm text-gray-600">Rewards for new customers who were referred</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label="Reward Type"
                        name="referee_reward_type"
                        value={settings.referee_reward_type}
                        onChange={handleChange}
                        options={[
                            { value: 'fixed', label: 'Fixed Amount (₹)' },
                            { value: 'percentage', label: 'Percentage (%)' }
                        ]}
                    />

                    <Input
                        label={settings.referee_reward_type === 'percentage' ? 'Percentage Value' : 'Fixed Amount (₹)'}
                        type="number"
                        name="referee_reward_value"
                        value={settings.referee_reward_value}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        required
                    />

                    {settings.referee_reward_type === 'percentage' && (
                        <Input
                            label="Maximum Reward Cap (₹) - Optional"
                            type="number"
                            name="max_referee_reward_cap"
                            value={settings.max_referee_reward_cap || ''}
                            onChange={handleChange}
                            min="0"
                            step="0.01"
                            placeholder="No cap"
                        />
                    )}
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600">Preview:</p>
                    <p className="text-lg font-semibold text-blue-600">
                        Referee gets: {getPreviewText(settings.referee_reward_type, settings.referee_reward_value, settings.max_referee_reward_cap)}
                    </p>
                </div>
            </Card>

            {/* Additional Settings */}
            <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Minimum Job Amount (₹) - Optional"
                        type="number"
                        name="minimum_job_amount"
                        value={settings.minimum_job_amount}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        placeholder="0 = No minimum"
                        helperText="Minimum job amount to qualify for referral rewards"
                    />
                </div>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
                <Button
                    variant="outline"
                    onClick={fetchSettings}
                    disabled={saving}
                >
                    Reset
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="min-w-[150px]"
                >
                    {saving ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Settings
                        </>
                    )}
                </Button>
            </div>

            {/* Info Box */}
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-500 rounded-lg">
                        <Gift className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">How Referral Rewards Work</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Referral codes are auto-generated after a customer's first completed job</li>
                            <li>• New customers can enter a referral code during registration</li>
                            <li>• Rewards are automatically credited to wallets when the referee completes their first job</li>
                            <li>• Percentage rewards are calculated based on the job amount</li>
                            <li>• Customers can use wallet balance for future purchases</li>
                        </ul>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ReferralSettings;
