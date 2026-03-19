import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Alert } from '@/components/ui';
import { Save, X, RotateCcw, Award } from 'lucide-react';
import api from '@/utils/api';

const ServiceRewardConfig = ({ serviceId, serviceName, isOpen, onClose, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [config, setConfig] = useState({
        has_custom_rewards: false,
        tier_1_minutes: 15,
        tier_1_amount: '100.00',
        tier_2_minutes: 30,
        tier_2_amount: '200.00',
        tier_3_minutes: 45,
        tier_3_amount: '300.00',
        deduction_enabled: true,
        deduction_threshold_minutes: 15,
        deduction_per_minute: '5.00',
        max_deduction_per_job: '500.00'
    });

    useEffect(() => {
        if (isOpen && serviceId) {
            fetchServiceConfig();
        }
    }, [isOpen, serviceId]);

    const fetchServiceConfig = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get(`/services/packages/${serviceId}/`);

            // If service has custom rewards, populate the form
            if (response.data.has_custom_rewards) {
                setConfig({
                    has_custom_rewards: response.data.has_custom_rewards,
                    tier_1_minutes: response.data.tier_1_minutes || 15,
                    tier_1_amount: response.data.tier_1_amount || '100.00',
                    tier_2_minutes: response.data.tier_2_minutes || 30,
                    tier_2_amount: response.data.tier_2_amount || '200.00',
                    tier_3_minutes: response.data.tier_3_minutes || 45,
                    tier_3_amount: response.data.tier_3_amount || '300.00',
                    deduction_enabled: response.data.deduction_enabled !== null ? response.data.deduction_enabled : true,
                    deduction_threshold_minutes: response.data.deduction_threshold_minutes || 15,
                    deduction_per_minute: response.data.deduction_per_minute || '5.00',
                    max_deduction_per_job: response.data.max_deduction_per_job || '500.00'
                });
            }
        } catch (err) {
            setError('Failed to load service configuration');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            await api.patch(`/services/packages/${serviceId}/`, config);

            setSuccess('Service reward configuration saved successfully!');
            setTimeout(() => {
                onSave && onSave();
                onClose();
            }, 1000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!window.confirm('Reset to global settings? This will disable custom rewards for this service.')) {
            return;
        }

        try {
            setSaving(true);
            setError(null);

            await api.patch(`/services/packages/${serviceId}/`, {
                has_custom_rewards: false,
                tier_1_minutes: null,
                tier_1_amount: null,
                tier_2_minutes: null,
                tier_2_amount: null,
                tier_3_minutes: null,
                tier_3_amount: null,
                deduction_enabled: null,
                deduction_threshold_minutes: null,
                deduction_per_minute: null,
                max_deduction_per_job: null
            });

            setSuccess('Reset to global settings successfully!');
            setTimeout(() => {
                onSave && onSave();
                onClose();
            }, 1000);
        } catch (err) {
            setError('Failed to reset configuration');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field, value) => {
        setConfig(prev => ({
            ...prev,
            [field]: value
        }));
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Reward Configuration - ${serviceName}`} size="lg">
            <div className="space-y-6">
                {/* Alerts */}
                {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
                {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <>
                        {/* Enable Custom Rewards Toggle */}
                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-3">
                                <Award className="text-blue-600" size={24} />
                                <div>
                                    <h4 className="font-semibold text-blue-900">Custom Reward Settings</h4>
                                    <p className="text-sm text-blue-700">Override global settings for this service</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.has_custom_rewards}
                                    onChange={(e) => handleChange('has_custom_rewards', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {config.has_custom_rewards && (
                            <>
                                {/* Reward Tiers */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        🏆 Reward Tiers (Early Completion)
                                    </h3>

                                    {/* Tier 1 */}
                                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                                        <p className="text-sm font-medium text-amber-900 mb-3">Tier 1 - Bronze</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input
                                                label="Minutes Early"
                                                type="number"
                                                value={config.tier_1_minutes}
                                                onChange={(e) => handleChange('tier_1_minutes', parseInt(e.target.value))}
                                                placeholder="15"
                                            />
                                            <Input
                                                label="Reward Amount (₹)"
                                                type="number"
                                                value={config.tier_1_amount}
                                                onChange={(e) => handleChange('tier_1_amount', e.target.value)}
                                                placeholder="100"
                                            />
                                        </div>
                                    </div>

                                    {/* Tier 2 */}
                                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-300">
                                        <p className="text-sm font-medium text-gray-900 mb-3">Tier 2 - Silver</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input
                                                label="Minutes Early"
                                                type="number"
                                                value={config.tier_2_minutes}
                                                onChange={(e) => handleChange('tier_2_minutes', parseInt(e.target.value))}
                                                placeholder="30"
                                            />
                                            <Input
                                                label="Reward Amount (₹)"
                                                type="number"
                                                value={config.tier_2_amount}
                                                onChange={(e) => handleChange('tier_2_amount', e.target.value)}
                                                placeholder="200"
                                            />
                                        </div>
                                    </div>

                                    {/* Tier 3 */}
                                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-300">
                                        <p className="text-sm font-medium text-yellow-900 mb-3">Tier 3 - Gold</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input
                                                label="Minutes Early"
                                                type="number"
                                                value={config.tier_3_minutes}
                                                onChange={(e) => handleChange('tier_3_minutes', parseInt(e.target.value))}
                                                placeholder="45"
                                            />
                                            <Input
                                                label="Reward Amount (₹)"
                                                type="number"
                                                value={config.tier_3_amount}
                                                onChange={(e) => handleChange('tier_3_amount', e.target.value)}
                                                placeholder="300"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Deduction Rules */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        ⚠️ Deduction Rules (Late Completion)
                                    </h3>

                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={config.deduction_enabled}
                                            onChange={(e) => handleChange('deduction_enabled', e.target.checked)}
                                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Enable Deductions</span>
                                    </label>

                                    {config.deduction_enabled && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <Input
                                                label="Deduction Threshold (min)"
                                                type="number"
                                                value={config.deduction_threshold_minutes}
                                                onChange={(e) => handleChange('deduction_threshold_minutes', parseInt(e.target.value))}
                                                placeholder="15"
                                            />
                                            <Input
                                                label="Deduction Per Minute (₹)"
                                                type="number"
                                                value={config.deduction_per_minute}
                                                onChange={(e) => handleChange('deduction_per_minute', e.target.value)}
                                                placeholder="5"
                                            />
                                            <Input
                                                label="Max Deduction Per Job (₹)"
                                                type="number"
                                                value={config.max_deduction_per_job}
                                                onChange={(e) => handleChange('max_deduction_per_job', e.target.value)}
                                                placeholder="500"
                                            />
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={handleReset}
                                disabled={saving || !config.has_custom_rewards}
                                className="flex items-center gap-2"
                            >
                                <RotateCcw size={16} />
                                Reset to Global
                            </Button>

                            <div className="flex gap-2">
                                <Button variant="outline" onClick={onClose} disabled={saving}>
                                    <X size={16} className="mr-2" />
                                    Cancel
                                </Button>
                                <Button onClick={handleSave} disabled={saving}>
                                    <Save size={16} className="mr-2" />
                                    {saving ? 'Saving...' : 'Save Configuration'}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default ServiceRewardConfig;
