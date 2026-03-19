import React, { useState } from 'react';
import {
    Calculator,
    DollarSign,
    Clock,
    Info,
    X,
} from 'lucide-react';
import api from '@/utils/api';

const RewardCalculator = ({ isOpen, onClose }) => {
    const [jobValue, setJobValue] = useState('');
    const [timeSaved, setTimeSaved] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleCalculate = async () => {
        // Validation
        if (!jobValue || parseFloat(jobValue) <= 0) {
            setError('Please enter a valid job value');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await api.post('/jobcards/performance/calculate-potential-reward/', {
                job_value: parseFloat(jobValue),
                time_saved_minutes: parseInt(timeSaved) || 0,
            });

            setResult(response.data);
        } catch (err) {
            console.error('Error calculating reward:', err);
            setError(err.response?.data?.error || 'Failed to calculate reward');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setJobValue('');
        setTimeSaved('');
        setResult(null);
        setError(null);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    // Format currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value || 0);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose}></div>

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Calculator className="w-5 h-5 text-blue-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">Reward Calculator</h2>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Input Section */}
                        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                            <p className="text-sm font-medium text-gray-700">Enter Job Details</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Job Value
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <DollarSign className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="number"
                                            value={jobValue}
                                            onChange={(e) => setJobValue(e.target.value)}
                                            placeholder="12000"
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">Total job value (package + add-ons + parts)</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Time Saved (minutes)
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Clock className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="number"
                                            value={timeSaved}
                                            onChange={(e) => setTimeSaved(e.target.value)}
                                            placeholder="30"
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">Minutes saved (optional, 0 if on-time)</p>
                                </div>
                            </div>

                            <button
                                onClick={handleCalculate}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Calculating...
                                    </>
                                ) : (
                                    <>
                                        <Calculator className="w-5 h-5" />
                                        Calculate Reward
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-sm text-red-800">{error}</p>
                                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Results Section */}
                        {result && (
                            <div className="space-y-4">
                                {/* Total Reward Card */}
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-500 rounded-lg p-6 text-center">
                                    <p className="text-sm text-gray-600 mb-2">Total Estimated Reward</p>
                                    <p className="text-4xl font-bold text-green-600 mb-3">{formatCurrency(result.total_reward)}</p>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500 text-white">
                                        Tier: {result.tier?.replace('tier_', '').toUpperCase()}
                                    </span>
                                </div>

                                {/* Breakdown */}
                                <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Reward Breakdown</h3>

                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Job Value</span>
                                        <span className="text-base font-semibold text-gray-900">{formatCurrency(result.job_value)}</span>
                                    </div>

                                    <div className="border-t border-gray-200 pt-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm text-gray-600">Base Reward</p>
                                                <p className="text-xs text-gray-500">{result.base_percentage}% of job value</p>
                                            </div>
                                            <span className="text-base font-semibold text-blue-600">{formatCurrency(result.base_reward)}</span>
                                        </div>

                                        {result.time_bonus_amount > 0 && (
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-sm text-gray-600">Time Bonus</p>
                                                    <p className="text-xs text-gray-500">
                                                        {result.time_bonus_percentage}% for {result.time_saved_minutes} min saved
                                                    </p>
                                                </div>
                                                <span className="text-base font-semibold text-green-600">
                                                    +{formatCurrency(result.time_bonus_amount)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                                        <span className="text-base font-semibold text-gray-900">Total Reward</span>
                                        <span className="text-xl font-bold text-green-600">{formatCurrency(result.total_reward)}</span>
                                    </div>
                                </div>

                                {/* Distribution */}
                                <div className="bg-white border border-gray-200 rounded-lg p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Reward Distribution</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                                            <p className="text-sm text-blue-700 mb-2">Supervisor Share</p>
                                            <p className="text-2xl font-bold text-blue-600">{formatCurrency(result.supervisor_share)}</p>
                                            <p className="text-xs text-blue-600 mt-1">50%</p>
                                        </div>
                                        <div className="bg-purple-50 rounded-lg p-4 text-center">
                                            <p className="text-sm text-purple-700 mb-2">Applicator Pool</p>
                                            <p className="text-2xl font-bold text-purple-600">{formatCurrency(result.applicator_pool)}</p>
                                            <p className="text-xs text-purple-600 mt-1">50%</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Calculation Notes */}
                                {result.calculation_notes && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="flex gap-2">
                                            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-blue-800">{result.calculation_notes}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Info Box */}
                        {!result && !loading && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex gap-2">
                                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-blue-800">
                                        <p className="font-semibold mb-2">Reward Tiers:</p>
                                        <ul className="space-y-1 text-xs">
                                            <li>• Tier 1: ₹5,000+ → 1.0% reward</li>
                                            <li>• Tier 2: ₹10,000+ → 1.5% reward</li>
                                            <li>• Tier 3: ₹12,000+ → 1.8% reward</li>
                                            <li>• Tier 4: ₹15,000+ → 2.0% reward</li>
                                        </ul>
                                        <p className="font-semibold mt-3 mb-1">Time Bonus:</p>
                                        <p className="text-xs">+0.5% for every 15 minutes saved</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                        {result && (
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                            >
                                Reset
                            </button>
                        )}
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RewardCalculator;
