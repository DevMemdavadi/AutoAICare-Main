import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, Button, Card, Input } from '@/components/ui';
import api from '@/utils/api';
import { User, Mail, Phone, Save, Eye, EyeOff, Lock } from 'lucide-react';

const AdminProfile = () => {
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const [activeTab, setActiveTab] = useState('personal');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone: '',
    });

    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
        new_password2: '',
    });

    useEffect(() => {
        if (user) {
            setProfileData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
            });
        }
    }, [user]);

    const showAlertMessage = (type, message) => {
        setAlert({ show: true, type, message });
        setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000);
    };

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await api.put('/auth/me/', profileData);

            // Update user context with new data
            updateUser(response.data);

            showAlertMessage('success', 'Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);

            // Handle validation errors
            if (error.response?.data) {
                const errorData = error.response.data;

                // Check for field-specific errors
                if (errorData.phone) {
                    showAlertMessage('error', `Phone: ${errorData.phone[0]}`);
                } else if (errorData.name) {
                    showAlertMessage('error', `Name: ${errorData.name[0]}`);
                } else if (errorData.message) {
                    showAlertMessage('error', errorData.message);
                } else {
                    showAlertMessage('error', 'Failed to update profile. Please check your input.');
                }
            } else {
                showAlertMessage('error', 'Failed to update profile. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        // Validate passwords
        if (passwordData.new_password !== passwordData.new_password2) {
            showAlertMessage('error', 'New passwords do not match');
            return;
        }

        if (passwordData.new_password.length < 8) {
            showAlertMessage('error', 'Password must be at least 8 characters long');
            return;
        }

        setLoading(true);

        try {
            await api.post('/auth/change-password/', {
                old_password: passwordData.old_password,
                new_password: passwordData.new_password,
                new_password2: passwordData.new_password2,
            });

            showAlertMessage('success', 'Password changed successfully!');

            // Clear password fields
            setPasswordData({
                old_password: '',
                new_password: '',
                new_password2: '',
            });
        } catch (error) {
            console.error('Error changing password:', error);

            // Handle validation errors
            if (error.response?.data) {
                const errorData = error.response.data;

                // Check for specific error messages
                if (errorData.old_password) {
                    showAlertMessage('error', `Current Password: ${errorData.old_password[0]}`);
                } else if (errorData.new_password) {
                    showAlertMessage('error', `New Password: ${errorData.new_password[0]}`);
                } else if (errorData.new_password2) {
                    showAlertMessage('error', `Confirm Password: ${errorData.new_password2[0]}`);
                } else if (errorData.message || errorData.error) {
                    showAlertMessage('error', errorData.message || errorData.error);
                } else {
                    showAlertMessage('error', 'Failed to change password. Please check your input.');
                }
            } else {
                showAlertMessage('error', 'Failed to change password. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Get role display name
    const getRoleDisplayName = () => {
        const roleMap = {
            'super_admin': 'Super Admin',
            'branch_admin': 'Branch Admin',
            'admin': 'Admin'
        };
        return roleMap[user?.role] || user?.role?.replace(/_/g, ' ');
    };

    return (
        <div className="space-y-6">
            {alert.show && (
                <Alert
                    type={alert.type}
                    message={alert.message}
                    onClose={() => setAlert({ show: false, type: '', message: '' })}
                />
            )}

            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Profile Settings</h1>
                <p className="text-gray-600 mt-1">Manage your personal information and account settings</p>
            </div>

            {/* Profile Header Card */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-3xl font-bold">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
                            <p className="text-gray-600">{user?.email}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                    {getRoleDisplayName()}
                                </span>
                                {user?.branch && (
                                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                        {user.branch_name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('personal')}
                        className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'personal'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Personal Information
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'security'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Security
                    </button>
                </div>
            </div>

            {/* Personal Information Tab */}
            {activeTab === 'personal' && (
                <Card>
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Personal Information</h3>
                        <form onSubmit={handleProfileSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Full Name *
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <Input
                                            type="text"
                                            name="name"
                                            value={profileData.name}
                                            onChange={handleProfileChange}
                                            // className="pl-10"
                                            placeholder="Enter your full name"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Email (Read-only) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <Input
                                            type="email"
                                            value={profileData.email}
                                            className="bg-gray-50 cursor-not-allowed"
                                            disabled
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Phone Number
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        <Input
                                            type="tel"
                                            name="phone"
                                            value={profileData.phone}
                                            onChange={handleProfileChange}
                                            // className="pl-10"
                                            placeholder="1234567890"
                                            pattern="[0-9]{10}"
                                            maxLength={10}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Enter 10-digit phone number without country code</p>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={loading}
                                    className="flex items-center gap-2"
                                >
                                    <Save size={18} />
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </Card>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
                <Card>
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Change Password</h3>
                        <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-md">
                            {/* Current Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Current Password *
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <Input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        name="old_password"
                                        value={passwordData.old_password}
                                        onChange={handlePasswordChange}
                                        className=" pr-10"
                                        placeholder="Enter current password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    New Password *
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <Input
                                        type={showNewPassword ? 'text' : 'password'}
                                        name="new_password"
                                        value={passwordData.new_password}
                                        onChange={handlePasswordChange}
                                        className="pr-10"
                                        placeholder="Enter new password"
                                        required
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm New Password *
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <Input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="new_password2"
                                        value={passwordData.new_password2}
                                        onChange={handlePasswordChange}
                                        className="pr-10"
                                        placeholder="Confirm new password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={loading}
                                    className="flex items-center gap-2"
                                >
                                    <Lock size={18} />
                                    {loading ? 'Changing...' : 'Change Password'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default AdminProfile;
