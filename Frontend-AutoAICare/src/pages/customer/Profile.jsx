import { Button, Card, Input, Modal, Select } from '@/components/ui';
import Alert from '@/components/ui/Alert';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import { Award, Building2, Calendar, Car, Edit2, Eye, EyeOff, Mail, Phone, Plus, Trash2, User } from 'lucide-react';
import { useEffect, useState } from 'react';

const Profile = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // profile, vehicles, history
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [customerData, setCustomerData] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showDeleteVehicleModal, setShowDeleteVehicleModal] = useState(false); // Add this new state
  const [pendingDeleteVehicleId, setPendingDeleteVehicleId] = useState(null); // Add this new state
  const [editingVehicle, setEditingVehicle] = useState(null);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    branch: user?.branch || '',  // Add branch field
  });

  const [vehicleForm, setVehicleForm] = useState({
    registration_number: '',
    brand: '',  // Changed from 'make' to 'brand' to match backend
    model: '',
    year: '',
    color: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    new_password2: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchCustomerData();
    fetchVehicles();
    fetchBookingHistory();
    fetchBranches();
  }, []);

  // Sync form with user data when user changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        branch: user.branch || null,
      });
    }
  }, [user]);

  const fetchCustomerData = async () => {
    try {
      const response = await api.get('/customers/me/');
      setCustomerData(response.data);
    } catch (error) {
      console.error('Error fetching customer data:', error);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await api.get('/customers/vehicles/');
      setVehicles(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const fetchBookingHistory = async () => {
    try {
      const response = await api.get('/bookings/');
      setBookingHistory(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching booking history:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await api.get('/branches/');
      setBranches(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      // Prepare data for submission - only send necessary fields
      const submitData = {
        name: profileForm.name,
        phone: profileForm.phone,
        branch: profileForm.branch || null  // Send null if no branch selected
      };
      console.log('Sending profile update:', submitData);
      const response = await api.put('/auth/me/', submitData);
      console.log('Profile update response:', response.data);

      // Update user context if setUser is available
      if (typeof setUser === 'function') {
        // Get existing user data from localStorage
        const storedUserData = localStorage.getItem('user');
        if (storedUserData) {
          const parsedUser = JSON.parse(storedUserData);
          // Merge the updated fields with existing user data to preserve critical fields
          const updatedUser = { ...parsedUser, ...response.data };
          setUser(updatedUser);
          // Also update localStorage with the merged data
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } else {
          // Fallback if no stored user data
          setUser(response.data);
        }
      }

      console.log('Updated user data:', response.data);
      // Update the form state to reflect the new values
      setProfileForm({
        name: response.data.name,
        email: response.data.email,
        phone: response.data.phone,
        branch: response.data.branch || null
      });
      setAlert({ show: true, type: 'success', message: 'Profile updated successfully!' });
    } catch (error) {
      console.error('Error updating profile:', error);
      console.error('Error details:', error.response?.data);
      const errorMessage = error.response?.data?.message
        || error.response?.data?.detail
        || Object.values(error.response?.data || {})[0]
        || 'Failed to update profile';
      setAlert({ show: true, type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.new_password2) {
      setAlert({ show: true, type: 'error', message: 'Passwords do not match' });
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/change-password/', {
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
        new_password2: passwordForm.new_password2,
      });
      setAlert({ show: true, type: 'success', message: 'Password changed successfully!' });
      setPasswordForm({
        old_password: '',
        new_password: '',
        new_password2: '',
      });
    } catch (error) {
      console.error('Error changing password:', error);
      // Handle different types of errors
      const errorMessage = error.response?.data?.old_password?.[0]
        || error.response?.data?.new_password?.[0]
        || error.response?.data?.new_password2?.[0]
        || error.response?.data?.message
        || error.response?.data?.detail
        || 'Failed to change password';
      setAlert({ show: true, type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        await api.put(`/customers/vehicles/${editingVehicle.id}/`, vehicleForm);
      } else {
        await api.post('/customers/vehicles/', vehicleForm);
      }
      setShowVehicleModal(false);
      setEditingVehicle(null);
      setVehicleForm({
        registration_number: '',
        brand: '',  // Changed from 'make' to 'brand'
        model: '',
        year: '',
        color: '',
      });
      fetchVehicles();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to save vehicle' });
    }
  };

  const handleDeleteVehicle = async (id) => {
    // Store the vehicle ID to be deleted and show confirmation modal
    setPendingDeleteVehicleId(id);
    setShowDeleteVehicleModal(true);
  };

  const handleConfirmDeleteVehicle = async () => {
    setShowDeleteVehicleModal(false);

    try {
      await api.delete(`/customers/vehicles/${pendingDeleteVehicleId}/`);
      fetchVehicles();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to delete vehicle' });
    }
  };

  const openEditVehicle = (vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleForm({
      registration_number: vehicle.registration_number,
      brand: vehicle.brand,  // Changed from 'make' to 'brand'
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
    });
    setShowVehicleModal(true);
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">Manage your account settings and information</p>
        </div>
        <div className="flex items-center gap-3">
          <Award className="text-yellow-500" size={24} />
          <div>
            <p className="text-sm text-gray-600">Reward Points</p>
            <p className="text-2xl font-bold text-gray-900">{customerData?.reward_points || 0}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'profile'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <User size={16} className="inline mr-2" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'vehicles'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Car size={16} className="inline mr-2" />
            My Vehicles ({vehicles.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Calendar size={16} className="inline mr-2" />
            Booking History ({bookingHistory.length})
          </button>
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Personal Information">
            <form onSubmit={handleUpdateProfile} className="space-y-4 p-6">
              <Input
                label="Full Name"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                icon={User}
                required
              />
              <Input
                label="Email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                icon={Mail}
                required
              />
              <Input
                label="Phone"
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                icon={Phone}
              />
              <Select
                label="Preferred Branch"
                value={profileForm.branch || ''}
                onChange={(e) => setProfileForm({ ...profileForm, branch: e.target.value ? parseInt(e.target.value) : null })}
                options={[
                  { value: '', label: 'No branch assigned' },
                  ...branches.map(branch => ({
                    value: branch.id,
                    label: `${branch.name}`
                  }))
                ]}
                icon={Building2}
              />
              {user?.branch_name && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-blue-600" />
                    <span className="text-sm text-blue-800">
                      <strong>Current Branch:</strong> {user.branch_name}
                    </span>
                  </div>
                </div>
              )}
              {!user?.branch && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Branch not set:</strong> Please select your preferred branch to ensure proper service delivery.
                  </p>
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full">
                {/* <Save size={18} className="mr-2" /> */}
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </Card>

          <Card title="Change Password">
            <form onSubmit={handleChangePassword} className="space-y-4 p-6">
              <div className="relative">
                <Input
                  label="Current Password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.old_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.new_password2}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password2: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {/* <Save size={18} className="mr-2" /> */}
                {loading ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </Card>

          {/* Account Stats */}
          {/* <Card title="Account Statistics" className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 mb-1">Member Since</p>
                <p className="font-bold text-gray-900">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 mb-1">Total Bookings</p>
                <p className="font-bold text-gray-900">{bookingHistory.length}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600 mb-1">Completed Services</p>
                <p className="font-bold text-gray-900">
                  {bookingHistory.filter(b => b.status === 'completed').length}
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-600 mb-1">Reward Points</p>
                <p className="font-bold text-gray-900">{customerData?.reward_points || 0}</p>
              </div>
            </div>
          </Card> */}
        </div>
      )}

      {/* Vehicles Tab */}
      {activeTab === 'vehicles' && (
        <>
          <div className="flex justify-end">
            <Button onClick={() => {
              setEditingVehicle(null);
              setVehicleForm({
                registration_number: '',
                brand: '',  // Changed from 'make' to 'brand'
                model: '',
                year: '',
                color: '',
              });
              setShowVehicleModal(true);
            }}>
              <Plus size={18} className="mr-2" />
              Add Vehicle
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id}>
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <Car className="text-primary" size={32} />
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditVehicle(vehicle)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteVehicle(vehicle.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-xl text-gray-900">{vehicle.registration_number}</p>
                    <p className="text-gray-700 mt-1">
                      {vehicle.brand} {vehicle.model}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span>Year: {vehicle.year}</span>
                      <span>•</span>
                      <span>Color: {vehicle.color}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {vehicles.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <Car size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No vehicles added yet</p>
              <Button
                onClick={() => setShowVehicleModal(true)}
                className="mt-4"
              >
                <Plus size={18} className="mr-2" />
                Add Your First Vehicle
              </Button>
            </div>
          )}
        </>
      )}

      {/* Booking History Tab */}
      {activeTab === 'history' && (
        <Card title="Booking History">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Service</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Vehicle</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Branch</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Technician</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Price</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bookingHistory.length > 0 ? (
                  bookingHistory.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">#{booking.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(booking.booking_datetime).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {booking.packages_details?.[0]?.name || 'Service'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {booking.vehicle_details?.registration_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {booking.branch_details?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {booking.jobcard?.technician_details?.name || 'Not assigned'}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-green-600">
                        ₹{booking.total_price}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(booking.status)
                          }`}>
                          {booking.status?.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No booking history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Vehicle Modal */}
      <Modal
        isOpen={showVehicleModal}
        onClose={() => {
          setShowVehicleModal(false);
          setEditingVehicle(null);
        }}
        title={editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowVehicleModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveVehicle}>
              {editingVehicle ? 'Update' : 'Add'} Vehicle
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveVehicle} className="space-y-4">
          <Input
            label="Registration Number"
            value={vehicleForm.registration_number}
            onChange={(e) => setVehicleForm({ ...vehicleForm, registration_number: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Brand"
              value={vehicleForm.brand}
              onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })}
              required
            />
            <Input
              label="Model"
              value={vehicleForm.model}
              onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Year"
              type="number"
              value={vehicleForm.year}
              onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
              required
            />
            <Input
              label="Color"
              value={vehicleForm.color}
              onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
              required
            />
          </div>
        </form>
      </Modal>

      {/* Delete Vehicle Confirmation Modal */}
      {showDeleteVehicleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Vehicle</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this vehicle? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteVehicleModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteVehicle}
                  className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Vehicle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
