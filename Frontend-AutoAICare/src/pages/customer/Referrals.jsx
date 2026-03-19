import { useState, useEffect } from 'react';
import { Gift, Copy, Share2, Users, TrendingUp, Award, CheckCircle, Clock, Wallet } from 'lucide-react';
import { Card, Button, Input } from '../../components/ui';
import api from '../../utils/api';

const Referrals = () => {
    const [referralCode, setReferralCode] = useState(null);
    const [stats, setStats] = useState(null);
    const [referrals, setReferrals] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [customCode, setCustomCode] = useState('');
    const [showCustomCodeInput, setShowCustomCodeInput] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);

    useEffect(() => {
        fetchReferralData();
    }, []);

    const fetchReferralData = async () => {
        try {
            setLoading(true);

            // Fetch referral code
            try {
                const codeResponse = await api.get('/customers/referral-codes/my_code/');
                setReferralCode(codeResponse.data);
            } catch (error) {
                if (error.response?.status === 404) {
                    setReferralCode(null);
                }
            }

            // Fetch stats
            const statsResponse = await api.get('/customers/referral-codes/my_stats/');
            setStats(statsResponse.data);

            // Fetch referrals list
            const referralsResponse = await api.get('/customers/referrals/');
            setReferrals(referralsResponse.data.results || referralsResponse.data || []);

            // Fetch referral settings
            const settingsResponse = await api.get('/settings/referral/');
            setSettings(settingsResponse.data);

            // Fetch wallet balance
            try {
                const walletResponse = await api.get('/payments/wallet/my_balance/');
                setWalletBalance(walletResponse.data.balance || 0);
            } catch (error) {
                console.error('Error fetching wallet balance:', error);
                setWalletBalance(0);
            }

        } catch (error) {
            console.error('Error fetching referral data:', error);
            alert('Failed to load referral data');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCode = () => {
        if (referralCode?.code) {
            navigator.clipboard.writeText(referralCode.code);
            alert('Referral code copied to clipboard!');
        }
    };

    const handleShareWhatsApp = () => {
        if (referralCode?.code) {
            const message = `Hey! Join ${settings?.business_name || 'our car detailing service'} using my referral code ${referralCode.code} and get ${settings?.referee_reward_text || 'amazing rewards'}! 🚗✨`;
            const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
        }
    };

    const handleCreateCustomCode = async () => {
        try {
            const response = await api.post('/customers/referral-codes/create_code/', {
                custom_code: customCode
            });

            if (response.data.status === 'success') {
                alert('Referral code created successfully!');
                setReferralCode(response.data.code);
                setShowCustomCodeInput(false);
                setCustomCode('');
                fetchReferralData();
            }
        } catch (error) {
            alert(error.response?.data?.custom_code?.[0] || 'Failed to create referral code');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending' },
            completed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, text: 'Completed' },
            rewarded: { color: 'bg-green-100 text-green-800', icon: Award, text: 'Rewarded' }
        };

        const badge = badges[status] || badges.pending;
        const Icon = badge.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                <Icon className="w-3 h-3" />
                {badge.text}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Referral Program</h1>
                    <p className="text-gray-600 mt-1">Refer friends and earn rewards together!</p>
                </div>
                <Gift className="w-12 h-12 text-primary" />
            </div>

            {/* Referral Code Card */}
            {!referralCode ? (
                <Card className="bg-gradient-to-br from-primary-50 to-secondary-50 border-2 border-primary-200">
                    <div className="text-center py-8">
                        <Gift className="w-16 h-16 text-primary mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            Complete Your First Job to Get Started!
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Once you complete your first service, you'll receive a unique referral code to share with friends.
                        </p>
                        {showCustomCodeInput ? (
                            <div className="max-w-md mx-auto space-y-3">
                                <Input
                                    placeholder="Enter custom code (e.g., JOHN2026)"
                                    value={customCode}
                                    onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                                    maxLength={20}
                                />
                                <div className="flex gap-2">
                                    <Button onClick={handleCreateCustomCode} className="flex-1">
                                        Create Code
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowCustomCodeInput(false);
                                            setCustomCode('');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <Button onClick={() => setShowCustomCodeInput(true)}>
                                Create Custom Referral Code
                            </Button>
                        )}
                    </div>
                </Card>
            ) : (
                <Card className="bg-gradient-to-br from-primary-500 to-secondary-500 text-white">
                    <div className="text-center py-8">
                        <h3 className="text-lg font-medium mb-2 opacity-90">Your Referral Code</h3>
                        <div className="text-5xl font-bold mb-6 tracking-wider">
                            {referralCode.code}
                        </div>
                        <div className="flex gap-3 justify-center">
                            <Button
                                variant="outline"
                                className="bg-white text-primary hover:bg-gray-100"
                                onClick={handleCopyCode}
                            >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Code
                            </Button>
                            <Button
                                variant="outline"
                                className="bg-white text-primary hover:bg-gray-100"
                                onClick={handleShareWhatsApp}
                            >
                                <Share2 className="w-4 h-4 mr-2" />
                                Share on WhatsApp
                            </Button>
                        </div>
                        <p className="mt-4 text-sm opacity-90">
                            Used {referralCode.times_used} times
                        </p>
                    </div>
                </Card>
            )}

            {/* Rewards Info */}
            {settings && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-green-500 rounded-lg">
                                <Gift className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-1">You Get</h4>
                                <p className="text-2xl font-bold text-green-600">
                                    {settings.referrer_reward_text}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    When your friend completes their first job
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-500 rounded-lg">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-1">Your Friend Gets</h4>
                                <p className="text-2xl font-bold text-blue-600">
                                    {settings.referee_reward_text}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    On their first completed service
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary-100 rounded-lg">
                                <Users className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Referrals</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total_referrals}</p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-yellow-100 rounded-lg">
                                <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Pending</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.pending_referrals}</p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-100 rounded-lg">
                                <Award className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Rewarded</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.rewarded_referrals}</p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-100 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Earned</p>
                                <p className="text-2xl font-bold text-gray-900">₹{stats.total_rewards_earned}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-500 rounded-lg">
                                <Wallet className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Wallet Balance</p>
                                <p className="text-2xl font-bold text-purple-600">₹{walletBalance.toFixed(2)}</p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Referrals List */}
            {referrals.length > 0 && (
                <Card>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Referrals</h3>
                    <div className="space-y-3">
                        {referrals.map((referral) => (
                            <div
                                key={referral.id}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                        <Users className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{referral.referee_name}</p>
                                        <p className="text-sm text-gray-600">{referral.referee_phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {(referral.status === 'rewarded' || referral.status === 'completed') && referral.referrer_points_awarded > 0 && (
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600">
                                                {referral.status === 'completed' ? 'Pending reward' : 'You earned'}
                                            </p>
                                            <p className={`font-semibold ${referral.status === 'rewarded' ? 'text-green-600' : 'text-blue-600'}`}>
                                                ₹{referral.referrer_points_awarded}
                                            </p>
                                        </div>
                                    )}
                                    {getStatusBadge(referral.status)}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Status explanation */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800">
                            <strong>Status Guide:</strong> <span className="text-blue-700">Pending</span> = Friend signed up •
                            <span className="text-blue-700"> Completed</span> = Friend finished first job, reward processing •
                            <span className="text-blue-700"> Rewarded</span> = Money in your wallet!
                        </p>
                    </div>
                </Card>
            )}

            {/* How It Works */}
            <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-white font-bold text-xl">1</span>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-2">Share Your Code</h4>
                        <p className="text-sm text-gray-600">
                            Share your unique referral code with friends and family
                        </p>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-white font-bold text-xl">2</span>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-2">They Sign Up</h4>
                        <p className="text-sm text-gray-600">
                            Your friend registers using your referral code
                        </p>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-white font-bold text-xl">3</span>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-2">Both Get Rewarded</h4>
                        <p className="text-sm text-gray-600">
                            When they complete their first job, you both receive rewards!
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Referrals;
