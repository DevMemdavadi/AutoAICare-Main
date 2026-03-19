import { Badge, Button, Card, Modal, Select, Textarea } from '@/components/ui';
import Alert from '@/components/ui/Alert';
import { useBranch } from '@/contexts/BranchContext';
import api from '@/utils/api';
import { Building2, Car, CheckCircle, Clock, Eye, MapPin, Phone, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

const PickupDrop = () => {
  const { isSuperAdmin, getBranchFilterParams, branches, selectedBranch } = useBranch();
  const [pickupRequests, setPickupRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    branch: 'all',
  });
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [newRequest, setNewRequest] = useState({
    booking: '',
    request_type: 'pickup',
    driver: '',
    notes: '',
  });

  useEffect(() => {
    fetchPickupRequests();
    fetchDrivers();
    fetchBookings();
  }, [selectedBranch]);

  const fetchPickupRequests = async () => {
    try {
      setLoading(true);
      const params = getBranchFilterParams();
      const response = await api.get('/pickup/', { params });
      setPickupRequests(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching pickup requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      // Fetch supervisor users who handle pickup/drop requests
      const params = getBranchFilterParams();
      const response = await api.get('/auth/users/?role=supervisor', { params });
      setDrivers(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      // Fetch confirmed or in-progress bookings that don't have pickup requests
      const params = {
        ...getBranchFilterParams(),
        exclude_with_pickup: 'true'
      };
      const response = await api.get('/bookings/', { params });
      setBookings(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    try {
      // Only send the booking ID when creating a pickup request
      const requestData = {
        booking: newRequest.booking,
        request_type: newRequest.request_type,
      };

      // Only include driver and notes if they have values
      if (newRequest.driver) {
        requestData.driver = newRequest.driver;
      }
      if (newRequest.notes) {
        requestData.notes = newRequest.notes;
      }

      await api.post('/pickup/', requestData);
      setShowAddModal(false);
      setNewRequest({
        booking: '',
        request_type: 'pickup',
        driver: '',
        notes: '',
      });
      fetchPickupRequests();
      fetchBookings(); // Refresh bookings list
    } catch (error) {
      console.error('Error creating request:', error);
      const errorMsg = error.response?.data?.booking?.[0] ||
        error.response?.data?.message ||
        'Failed to create pickup request';
      setAlert({ show: true, type: 'error', message: errorMsg });
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.patch(`/pickup/${id}/`, { status });
      fetchPickupRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to update status' });
    }
  };

  const handleAssignDriver = async (id, driverId) => {
    try {
      await api.put(`/pickup/${id}/assign_driver/`, { driver_id: driverId });
      fetchPickupRequests();
    } catch (error) {
      console.error('Error assigning driver:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to assign driver' });
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      driver_assigned: 'bg-blue-100 text-blue-800',
      picked_up: 'bg-indigo-100 text-indigo-800',
      in_service: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredRequests = pickupRequests.filter(req => {
    if (filters.status && req.status !== filters.status) return false;
    if (filters.type && req.request_type !== filters.type) return false;

    // Local branch filter for Super Admin (when global branch is "All Branches")
    if (!selectedBranch && isSuperAdmin && filters.branch !== 'all') {
      // If Super Admin and using local branch filter
      if (req.booking_details?.branch?.id !== parseInt(filters.branch)) return false;
    }
    // If selectedBranch is set, API already filtered data, no need for client-side filtering

    return true;
  });

  // Reset branch filter when branch context changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      branch: 'all'
    }));
  }, [selectedBranch]);

  const openDetailsModal = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-80 mt-2 animate-pulse"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-16 mt-2 animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Requests Table Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[...Array(8)].map((_, i) => (
                    <th key={i} className="px-4 py-3 text-left">
                      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: "", message: "" })}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Pickup & Drop Management
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Manage vehicle pickup and delivery services
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchPickupRequests}
            variant="outline"
            className="flex-1 md:flex-initial w-full md:w-auto flex items-center justify-center gap-1 md:gap-2 text-xs md:text-base px-2 md:px-4 py-2 whitespace-nowrap"
          >
            <RefreshCw size={16} className="md:hidden" />
            <RefreshCw size={18} className="hidden md:block" />
            <span>Refresh</span>
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            className="flex-1 md:flex-initial w-full md:w-auto flex items-center justify-center gap-1 md:gap-2 text-xs md:text-base px-2 md:px-4 py-2 whitespace-nowrap"
          >
            <Plus size={16} className="md:hidden" />
            <Plus size={18} className="hidden md:block" />
            <span>New Request</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Requests</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {pickupRequests.length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {pickupRequests.filter((r) => r.status === "pending").length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Driver Assigned</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {
              pickupRequests.filter((r) => r.status === "driver_assigned")
                .length
            }
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">In Service</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {pickupRequests.filter((r) => r.status === "in_service").length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Delivered</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {pickupRequests.filter((r) => r.status === "delivered").length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            options={[
              { value: "", label: "All Status" },
              { value: "pending", label: "Pending" },
              { value: "driver_assigned", label: "Driver Assigned" },
              { value: "picked_up", label: "Picked Up" },
              { value: "in_service", label: "In Service" },
              { value: "delivered", label: "Delivered" },
            ]}
          />
          <Select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            options={[
              { value: "", label: "All Types" },
              { value: "pickup", label: "Pickup" },
              { value: "drop", label: "Drop" },
            ]}
          />
          {/* Branch Filter - Super Admin Only */}
          {isSuperAdmin && (
            <Select
              value={filters.branch}
              onChange={(e) =>
                setFilters({ ...filters, branch: e.target.value })
              }
              options={[
                { value: "all", label: "All Branches" },
                ...branches.map((branch) => ({
                  value: branch.id.toString(),
                  label: branch.name,
                })),
              ]}
            />
          )}
        </div>
      </Card>

      {/* Requests Table */}
      <Card title="Pickup/Drop Requests">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Customer
                </th>
                {isSuperAdmin && (
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Branch
                  </th>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Address
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Scheduled Time
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Driver
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      #{request.id}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge
                        variant={
                          request.request_type === "pickup" ? "info" : "warning"
                        }
                      >
                        {request.request_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {request.booking_details?.customer_details?.user?.name ||
                        request.booking_details?.customer_name ||
                        "N/A"}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-1">
                          <Building2 size={14} className="text-gray-400" />
                          {request.booking_details?.branch_details?.name ||
                            "N/A"}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} className="text-gray-400" />
                        {request.booking_details?.location?.substring(0, 30) ||
                          "N/A"}
                        ...
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="flex items-center gap-1">
                        <Clock size={14} className="text-gray-400" />
                        {request.booking_details?.booking_datetime
                          ? new Date(
                            request.booking_details.booking_datetime
                          ).toLocaleDateString()
                          : "N/A"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {request.driver_details ? (
                        <div className="flex items-center gap-1">
                          <Car size={14} className="text-gray-400" />
                          <span>{request.driver_details.name}</span>
                        </div>
                      ) : (
                        <Select
                          value=""
                          onChange={(e) =>
                            handleAssignDriver(request.id, e.target.value)
                          }
                          options={[
                            { value: "", label: "Assign Driver" },
                            ...drivers.map((d) => ({
                              value: d.id,
                              label: d.name,
                            })),
                          ]}
                          className="text-xs"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                          request.status
                        )}`}
                      >
                        {request.status?.replaceAll("_", " ").split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openDetailsModal(request)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        {request.status === "pending" && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(request.id, "driver_assigned")
                            }
                            className="text-green-600 hover:text-green-800"
                            title="Assign Driver"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        {request.status === "driver_assigned" && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(request.id, "picked_up")
                            }
                            className="text-sm text-primary hover:underline"
                          >
                            Pick Up
                          </button>
                        )}
                        {request.status === "picked_up" && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(request.id, "in_service")
                            }
                            className="text-sm text-purple-600 hover:underline"
                          >
                            Start Service
                          </button>
                        )}
                        {request.status === "in_service" && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(request.id, "delivered")
                            }
                            className="text-sm text-green-600 hover:underline"
                          >
                            Deliver
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={isSuperAdmin ? 9 : 8}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No pickup/drop requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Request Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create Pickup/Drop Request"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRequest}>Create Request</Button>
          </>
        }
      >
        <form onSubmit={handleCreateRequest} className="space-y-4">
          <Select
            label="Select Booking"
            value={newRequest.booking}
            onChange={(e) =>
              setNewRequest({ ...newRequest, booking: e.target.value })
            }
            options={[
              { value: "", label: "Select a booking..." },
              ...bookings.map((b) => ({
                value: b.id,
                label: `#${b.id} - ${b.customer_details?.user?.name || b.customer_name || "N/A"
                  } - ${b.vehicle_details?.brand || ""} ${b.vehicle_details?.model || ""
                  } (${b.vehicle_details?.registration_number || "N/A"})`,
              })),
            ]}
            required
          />
          <Select
            label="Request Type"
            value={newRequest.request_type}
            onChange={(e) =>
              setNewRequest({ ...newRequest, request_type: e.target.value })
            }
            options={[
              { value: "pickup", label: "Pickup" },
              { value: "drop", label: "Drop" },
            ]}
            required
          />
          <Select
            label="Assign Driver (Optional)"
            value={newRequest.driver}
            onChange={(e) =>
              setNewRequest({ ...newRequest, driver: e.target.value })
            }
            options={[
              { value: "", label: "Unassigned" },
              ...drivers.map((d) => ({
                value: d.id,
                label: `${d.name} - ${d.email}`,
              })),
            ]}
          />
          <Textarea
            label="Notes (Optional)"
            value={newRequest.notes}
            onChange={(e) =>
              setNewRequest({ ...newRequest, notes: e.target.value })
            }
            rows={2}
          />
        </form>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={`Request #${selectedRequest?.id} Details`}
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 font-bold">Request Type</p>
                <Badge
                  variant={
                    selectedRequest.request_type === "pickup"
                      ? "info"
                      : "warning"
                  }
                >
                  {selectedRequest.request_type}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-bold">Status</p>
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                    selectedRequest.status
                  )}`}
                >
                  {selectedRequest.status?.replaceAll("_", " ").split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-bold">Customer</p>
              <p className="text-sm font-semibold">
                {selectedRequest.booking_details?.customer_details?.user
                  ?.name ||
                  selectedRequest.booking_details?.customer_name ||
                  "N/A"}
              </p>
              <p className="text-sm text-gray-500 font-medium">
                {selectedRequest.booking_details?.customer_details?.user
                  ?.email || ""}
              </p>
              <p className="text-sm text-gray-500 font-medium">
                {selectedRequest.booking_details?.customer_details?.user
                  ?.phone || ""}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-bold">Vehicle</p>
              <p className="font-semibold text-sm">
                {selectedRequest.booking_details?.vehicle_details?.brand}{" "}
                {selectedRequest.booking_details?.vehicle_details?.model}
              </p>
              <p className="text-sm text-gray-500 font-medium">
                {selectedRequest.booking_details?.vehicle_details
                  ?.registration_number || "N/A"}
              </p>
              <p className="text-sm text-gray-500 font-medium">
                {selectedRequest.booking_details?.vehicle_details?.color} (
                {selectedRequest.booking_details?.vehicle_details?.year})
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-bold">Service Package</p>
              <p className="font-semibold text-sm">
                {selectedRequest.booking_details?.package_details?.name ||
                  "N/A"}
              </p>
              <p className="text-sm text-gray-500 font-medium">
                ₹
                {selectedRequest.booking_details?.package_details?.price ||
                  "0.00"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-bold">Addons</p>
              {selectedRequest.booking_details?.addon_details?.length > 0 ? (
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 font-medium">
                  {selectedRequest.booking_details.addon_details.map(
                    (addon) => (
                      <li key={addon.id}>
                        {addon.name} - ₹{addon.price}
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 font-medium">No addons</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600 font-bold">Address</p>
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-gray-400 mt-1" />
                <p className="font-semibold text-sm">
                  {selectedRequest.booking_details?.location || "N/A"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-bold">Scheduled Time</p>
              <p className="font-semibold text-sm">
                {selectedRequest.booking_details?.booking_datetime
                  ? new Date(
                    selectedRequest.booking_details.booking_datetime
                  ).toLocaleString()
                  : "N/A"}
              </p>
            </div>
            {selectedRequest.driver_details && (
              <div>
                <p className="text-sm text-gray-600 font-bold">
                  Assigned Driver
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Car size={16} className="text-gray-400" />
                  <p className="font-semibold text-sm">
                    {selectedRequest.driver_details.name}
                  </p>
                  {selectedRequest.driver_details.phone && (
                    <>
                      <Phone size={14} className="text-gray-400 ml-2" />
                      <p className="text-sm text-gray-600 font-medium">
                        {selectedRequest.driver_details.phone}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
            {selectedRequest.pickup_notes && (
              <div>
                <p className="text-sm text-gray-600 font-bold">Pickup Notes</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-1 rounded font-medium">
                  {selectedRequest.pickup_notes}
                </p>
              </div>
            )}
            {selectedRequest.drop_notes && (
              <div>
                <p className="text-sm text-gray-600 font-bold">Drop Notes</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-1 rounded font-medium">
                  {selectedRequest.drop_notes}
                </p>
              </div>
            )}
            {selectedRequest.pickup_time && (
              <div>
                <p className="text-sm text-gray-600 font-bold">Pickup Time</p>
                <p className="font-semibold">
                  {new Date(selectedRequest.pickup_time).toLocaleString()}
                </p>
              </div>
            )}
            {selectedRequest.drop_time && (
              <div>
                <p className="text-sm text-gray-600 font-bold">Drop Time</p>
                <p className="font-semibold text-sm ">
                  {new Date(selectedRequest.drop_time).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PickupDrop;
