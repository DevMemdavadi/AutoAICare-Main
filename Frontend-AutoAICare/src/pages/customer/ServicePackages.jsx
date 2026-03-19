import { Badge, Button, Card, Select } from '@/components/ui';
import { useBranch } from '@/contexts/BranchContext';
import api from '@/utils/api';
import { Building2, Car, CheckCircle, Clock, Crown, Globe, IndianRupee, Package, Search, Star, Tag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SERVICE_CATEGORIES = [
  { value: 'wash', label: 'Car Wash' },
  { value: 'interior', label: 'Interior Cleaning' },
  { value: 'exterior', label: 'Exterior Beautification' },
  { value: 'coating', label: 'Ceramic Coating' },
  { value: 'makeover', label: 'Car Makeover' },
  { value: 'mechanical', label: 'Mechanical Services' },
  { value: 'ac_service', label: 'AC Service' },
  { value: 'polish', label: 'Body Polish' },
  { value: 'bike_services', label: 'Bike Services' },
  { value: 'other', label: 'Other' }
];

const ServicePackages = () => {
  const navigate = useNavigate();
  const { getCurrentBranchId } = useBranch();
  const [packages, setPackages] = useState([]);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('packages'); // packages, addons
  const [filters, setFilters] = useState({
    category: '',
    priceRange: '',
    search: '',
  });

  // Membership state for showing discounted prices
  const [membership, setMembership] = useState(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const branchId = getCurrentBranchId();
      const params = branchId ? { branch: branchId } : {};

      const [packagesRes, addonsRes] = await Promise.all([
        api.get('/services/packages/', { params }),
        api.get('/services/addons/', { params }),
      ]);
      setPackages(packagesRes.data.results || packagesRes.data || []);
      setAddons(addonsRes.data.results || addonsRes.data || []);

      // Fetch user's active membership for discount display
      try {
        const membershipRes = await api.get('/memberships/subscriptions/my_active_membership/');
        const data = membershipRes.data;
        setMembership(data.has_membership === false ? null : data);
      } catch (e) {
        setMembership(null);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate member price with discount
  const getMemberPrice = (originalPrice) => {
    if (!membership || !membership.discount_percentage) return null;
    const discount = (originalPrice * parseFloat(membership.discount_percentage)) / 100;
    return originalPrice - discount;
  };

  const handleBookService = (packageId) => {
    navigate('/customer/book', { state: { packageId } });
  };

  const filteredPackages = packages.filter(pkg => {
    if (!pkg.is_active) return false;
    if (filters.category && pkg.category !== filters.category) return false;
    if (filters.search && !pkg.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split('-').map(Number);
      if (max) {
        if (pkg.price < min || pkg.price > max) return false;
      } else {
        if (pkg.price < min) return false;
      }
    }
    return true;
  });

  const filteredAddons = addons.filter(addon => {
    if (!addon.is_active) return false;
    if (filters.search && !addon.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Service Packages</h1>
        <p className="text-gray-600 mt-1">Choose the perfect service package for your vehicle</p>
      </div>

      {/* Membership Banner */}
      {membership ? (
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown size={28} className="text-yellow-300" />
            <div>
              <p className="font-bold">{membership.plan_name} Member</p>
              <p className="text-sm opacity-90">You get {membership.discount_percentage}% off on all services!</p>
            </div>
          </div>
          <Badge className="bg-yellow-400 text-yellow-900">{membership.days_remaining} days left</Badge>
        </div>
      ) : (
        <div
          className="bg-gradient-to-r from-amber-100 to-yellow-100 border border-yellow-300 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/customer/memberships')}
        >
          <div className="flex items-center gap-3">
            <Crown size={28} className="text-yellow-600" />
            <div>
              <p className="font-bold text-gray-900">Become a Member & Save!</p>
              <p className="text-sm text-gray-600">Get up to 20% off on all services + free washes & coupons</p>
            </div>
          </div>
          <Button size="sm">View Plans</Button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('packages')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'packages'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Service Packages ({packages.filter(p => p.is_active).length})
          </button>
          <button
            onClick={() => setActiveTab('addons')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'addons'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Add-ons ({addons.filter(a => a.is_active).length})
          </button>
        </nav>
      </div>

      {/* Filters */}
      {activeTab === 'packages' && (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search services..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input pl-10 w-full"
              />
            </div>
            <Select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              options={[
                { value: '', label: 'All Categories' },
                ...SERVICE_CATEGORIES
              ]}
            />
            <Select
              value={filters.priceRange}
              onChange={(e) => setFilters({ ...filters, priceRange: e.target.value })}
              options={[
                { value: '', label: 'All Prices' },
                { value: '0-500', label: '₹0 - ₹500' },
                { value: '500-1000', label: '₹500 - ₹1000' },
                { value: '1000-2000', label: '₹1000 - ₹2000' },
                { value: '2000', label: '₹2000+' },
              ]}
            />
          </div>
        </Card>
      )}

      {/* Service Packages */}
      {activeTab === 'packages' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.length > 0 ? (
            filteredPackages.map((pkg) => {
              // Calculate available vehicle types
              const vehicleTypes = [
                { name: 'Hatchback', price: pkg.hatchback_price, icon: '🚗' },
                { name: 'Sedan', price: pkg.sedan_price, icon: '🚙' },
                { name: 'SUV', price: pkg.suv_price, icon: '🚐' },
                { name: 'Bike', price: pkg.bike_price, icon: '🏍️' }
              ].filter(vt => vt.price > 0);

              return (
                <div
                  key={pkg.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group"
                >
                  {/* Card Header matching Admin View */}
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <Package className="text-primary" size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 leading-tight">
                            {pkg.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                              <Tag size={10} />
                              {SERVICE_CATEGORIES.find(c => c.value === pkg.category)?.label || 'Other'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Badge variant={pkg.is_active ? "success" : "default"} className="shrink-0">
                        {pkg.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {/* Branch & GST Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {pkg.is_global ? (
                        <Badge variant="info" className="flex items-center gap-1 text-xs">
                          <Globe size={10} />
                          Global
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="flex items-center gap-1 text-xs">
                          <Building2 size={10} />
                          {pkg.branch_details?.name || 'Local'}
                        </Badge>
                      )}
                      {pkg.gst_applicable && (
                        <Badge variant="default" className="text-xs">
                          GST {pkg.gst_rate}%
                        </Badge>
                      )}
                      <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                        <Clock size={10} />
                        {pkg.duration_max
                          ? `${pkg.duration}-${pkg.duration_max} min`
                          : `${pkg.duration || (pkg.duration_hours ? pkg.duration_hours * 60 : 0)} min`
                        }
                      </Badge>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4">
                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                      {pkg.description || 'No description provided'}
                    </p>

                    {/* Member Discount Badge if applicable */}
                    {membership && (
                      <div className="mb-4 bg-purple-50 border border-purple-100 rounded-lg p-2 flex items-center gap-2">
                        <Crown size={16} className="text-purple-600" />
                        <span className="text-xs font-medium text-purple-700">
                          Member Discount: {membership.discount_percentage}% OFF
                        </span>
                      </div>
                    )}

                    {/* Vehicle Type Pricing */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Pricing</span>
                        {pkg.gst_applicable && (
                          <span className="text-xs text-gray-500">+ {pkg.gst_rate}% GST</span>
                        )}
                      </div>

                      {vehicleTypes.length > 0 ? (
                        <div className={`grid gap-2 ${vehicleTypes.length === 1 ? 'grid-cols-1' :
                          vehicleTypes.length === 2 ? 'grid-cols-2' :
                            vehicleTypes.length === 3 ? 'grid-cols-3' :
                              'grid-cols-2'
                          }`}>
                          {vehicleTypes.map((vt, idx) => {
                            const originalPrice = parseFloat(vt.price);
                            const memberPrice = getMemberPrice(originalPrice);

                            return (
                              <div
                                key={idx}
                                className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-2 border border-gray-200 hover:border-primary/30 transition-all shadow-sm"
                              >
                                <div className="flex flex-col items-center justify-center text-center">
                                  <span className="text-xl mb-1">{vt.icon}</span>
                                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">{vt.name}</p>
                                  <div className="mt-0.5">
                                    {memberPrice ? (
                                      <div className="flex flex-col items-center">
                                        <span className="text-[10px] text-gray-400 line-through">₹{originalPrice.toFixed(0)}</span>
                                        <span className="text-sm font-bold text-purple-600">₹{memberPrice.toFixed(0)}</span>
                                      </div>
                                    ) : (
                                      <p className="text-sm font-bold text-green-600">₹{originalPrice.toFixed(0)}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          {pkg.price ? (
                            <div className="flex flex-col items-center">
                              <p className="text-xs text-gray-500 mb-1">Standard Price</p>
                              {getMemberPrice(parseFloat(pkg.price)) ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-400 line-through">₹{pkg.price}</span>
                                  <span className="text-2xl font-bold text-purple-600">₹{getMemberPrice(parseFloat(pkg.price)).toFixed(0)}</span>
                                </div>
                              ) : (
                                <span className="text-2xl font-bold text-green-600">₹{pkg.price}</span>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No pricing available</p>
                          )}
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => handleBookService(pkg.id)}
                      className="w-full mt-2"
                    >
                      Request
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <Package size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No service packages found</p>
            </div>
          )}
        </div>
      )}

      {/* Add-ons */}
      {activeTab === 'addons' && (
        <div>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search add-ons..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAddons.length > 0 ? (
              filteredAddons.map((addon) => (
                <div
                  key={addon.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{addon.name}</h3>
                    {/* <Badge variant="info">{addon.category}</Badge> */}
                  </div>

                  <p className="text-gray-600 text-sm mb-4">{addon.description}</p>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1 text-xl font-bold text-green-600">
                        <IndianRupee size={18} />
                        {addon.price}
                      </span>
                      {addon.duration > 0 && (
                        <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
                          <Clock size={12} />
                          {addon.duration} min
                        </span>
                      )}
                    </div>
                    <CheckCircle size={20} className="text-green-500" />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Package size={48} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No add-ons found</p>
              </div>
            )}
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <CheckCircle size={16} className="inline mr-2" />
              Add-ons can be selected during the booking process to enhance your service package.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicePackages;
