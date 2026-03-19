import { Badge, Button, Card, Input, Modal, Textarea } from '@/components/ui';
import Alert from '@/components/ui/Alert';
import { useBranch } from '@/contexts/BranchContext';
import api from '@/utils/api';
import { Building2, Car, Clock, Edit2, Globe, IndianRupee, Package, Plus, Search, Tag, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ServicePartsMapping from './components/ServicePartsMapping';

const ServiceManagement = () => {
  const navigate = useNavigate();
  const [serviceCategories, setServiceCategories] = useState([]);
  const { isSuperAdmin, isCompanyAdmin, getCurrentBranchId, getBranchFilterParams, branches, selectedBranch } = useBranch();
  const [services, setServices] = useState([]);
  const [addons, setAddons] = useState([]);
  const [allServices, setAllServices] = useState([]); // Store all services for search
  const [allAddons, setAllAddons] = useState([]); // Store all addons for search
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('packages'); // packages, addons

  // Pagination state for services
  const [servicesPagination, setServicesPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    results: [],
    currentPage: 1,
    totalPages: 1,
    pageSize: 5,
    pageSizes: [5, 10, 20, 30, 50]
  });
  const [addonsPagination, setAddonsPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    results: [],
    currentPage: 1,
    totalPages: 1,
    pageSize: 5,
    pageSizes: [5, 10, 20, 30, 50]
  });
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [showDeleteServiceModal, setShowDeleteServiceModal] = useState(false);
  const [showDeleteAddonModal, setShowDeleteAddonModal] = useState(false);
  const [pendingDeleteServiceId, setPendingDeleteServiceId] = useState(null);
  const [pendingDeleteAddonId, setPendingDeleteAddonId] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [editingAddon, setEditingAddon] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  // Service Parts Modal state
  const [showPartsModal, setShowPartsModal] = useState(false);
  const [selectedServiceForParts, setSelectedServiceForParts] = useState(null);

  // Ref for search timeout
  const searchTimeoutRef = useRef(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    category: 'other',
    // Vehicle-type prices (always required)
    hatchback_price: '',
    sedan_price: '',
    suv_price: '',
    bike_price: '',
    // GST
    gst_applicable: true,
    gst_rate: '18.00',
    // Duration
    duration: '',
    duration_max: '',
    // Vehicle type compatibility
    compatible_vehicle_types: [],
    // Status
    is_active: true,
    is_global: true,
    branch: null,
  });

  const [serviceFormErrors, setServiceFormErrors] = useState({
    name: '',
    description: '',
    price: '',
  });

  const [addonForm, setAddonForm] = useState({
    name: '',
    description: '',
    price: '',
    gst_applicable: true,
    gst_rate: '18.00',
    duration: '',
    is_active: true,
    is_global: true,
    branch: null,
  });

  const [addonFormErrors, setAddonFormErrors] = useState({
    name: '',
    description: '',
    price: '',
  });


  useEffect(() => {
    // Initialize service categories
    setServiceCategories([
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
    ]);

    fetchServices();
    fetchAddons();
  }, []);

  const fetchServices = async (page = 1) => {
    try {
      setLoading(true);
      // Get branch filter params from BranchContext
      const params = getBranchFilterParams();
      params.page = page;
      params.page_size = servicesPagination.pageSize;

      const response = await api.get('/services/packages/', { params });

      setServicesPagination(prev => ({
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
        results: response.data.results || [],
        currentPage: page,
        totalPages: Math.ceil(response.data.count / prev.pageSize),
        pageSize: prev.pageSize,
        pageSizes: prev.pageSizes
      }));

      // Also refresh all services for search/filter
      const allParams = getBranchFilterParams();
      allParams.page_size = 1000; // Fetch all services
      const allResponse = await api.get('/services/packages/', { params: allParams });
      setAllServices(allResponse.data.results || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServicesWithNewPageSize = async (newPageSize, page = 1) => {
    try {
      setLoading(true);
      // Get branch filter params from BranchContext
      const params = getBranchFilterParams();
      params.page = page;
      params.page_size = newPageSize;

      const response = await api.get('/services/packages/', { params });

      setServicesPagination(prev => ({
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
        results: response.data.results || [],
        currentPage: page,
        totalPages: Math.ceil(response.data.count / newPageSize),
        pageSize: newPageSize,
        pageSizes: prev.pageSizes
      }));
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAddons = async (page = 1) => {
    try {
      // Get branch filter params from BranchContext
      const params = getBranchFilterParams();
      params.page = page;
      params.page_size = addonsPagination.pageSize;

      const response = await api.get('/services/addons/', { params });

      setAddonsPagination(prev => ({
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
        results: response.data.results || [],
        currentPage: page,
        totalPages: Math.ceil(response.data.count / prev.pageSize),
        pageSize: prev.pageSize,
        pageSizes: prev.pageSizes
      }));

      // Also refresh all addons for search/filter
      const allParams = getBranchFilterParams();
      allParams.page_size = 1000; // Fetch all addons
      const allResponse = await api.get('/services/addons/', { params: allParams });
      setAllAddons(allResponse.data.results || []);
    } catch (error) {
      console.error('Error fetching addons:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAddonsWithNewPageSize = async (newPageSize, page = 1) => {
    try {
      // Get branch filter params from BranchContext
      const params = getBranchFilterParams();
      params.page = page;
      params.page_size = newPageSize;

      const response = await api.get('/services/addons/', { params });

      setAddonsPagination(prev => ({
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
        results: response.data.results || [],
        currentPage: page,
        totalPages: Math.ceil(response.data.count / newPageSize),
        pageSize: newPageSize,
        pageSizes: prev.pageSizes
      }));
    } catch (error) {
      console.error('Error fetching addons:', error);
    }
  };

  const handleServicesPageSizeChange = (newPageSize) => {
    // Update the pagination state with new page size and reset to first page
    setServicesPagination(prev => ({
      ...prev,
      pageSize: newPageSize,
      currentPage: 1 // Reset to first page when page size changes
    }));

    // Fetch with the new page size immediately
    fetchServicesWithNewPageSize(newPageSize);
  };

  const handleAddonsPageSizeChange = (newPageSize) => {
    // Update the pagination state with new page size and reset to first page
    setAddonsPagination(prev => ({
      ...prev,
      pageSize: newPageSize,
      currentPage: 1 // Reset to first page when page size changes
    }));

    // Fetch with the new page size immediately
    fetchAddonsWithNewPageSize(newPageSize);
  };

  // Debounced search function - frontend-only search (no API calls)
  const debouncedSearch = (searchValue) => {
    // Clear the previous timeout if it exists
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set a new timeout to execute the search after 300ms (shorter delay for better UX)
    searchTimeoutRef.current = setTimeout(() => {
      // No API calls - search is handled by filteredServices and filteredAddons
      // The search filtering happens in the filteredServices/filteredAddons arrays
    }, 300); // 300ms delay for more responsive search
  };

  const handleCreateService = async (e) => {
    e.preventDefault();

    // Validation
    const newServiceErrors = { name: '', description: '', price: '' };
    let hasErrors = false;
    let errorMessages = [];

    if (!serviceForm.name.trim()) {
      newServiceErrors.name = 'Service name is required';
      errorMessages.push('Service name is required');
      hasErrors = true;
    }

    if (!serviceForm.description.trim()) {
      newServiceErrors.description = 'Description is required';
      errorMessages.push('Description is required');
      hasErrors = true;
    }

    // Validate duration
    if (!serviceForm.duration || parseInt(serviceForm.duration) <= 0) {
      errorMessages.push('Duration is required');
      hasErrors = true;
    }

    // Validate that at least one vehicle type has a price
    let hasValidPrice = false;

    if (serviceForm.compatible_vehicle_types?.length > 0) {
      // If specific vehicle types are selected, validate only those
      if (serviceForm.compatible_vehicle_types.includes('bike') && parseFloat(serviceForm.bike_price)) {
        hasValidPrice = true;
      }
      if (serviceForm.compatible_vehicle_types.includes('hatchback') && parseFloat(serviceForm.hatchback_price)) {
        hasValidPrice = true;
      }
      if (serviceForm.compatible_vehicle_types.includes('sedan') && parseFloat(serviceForm.sedan_price)) {
        hasValidPrice = true;
      }
      if (serviceForm.compatible_vehicle_types.includes('suv') && parseFloat(serviceForm.suv_price)) {
        hasValidPrice = true;
      }
    } else {
      // If no specific vehicle types selected (legacy behavior), check all
      hasValidPrice = parseFloat(serviceForm.hatchback_price) ||
        parseFloat(serviceForm.sedan_price) ||
        parseFloat(serviceForm.suv_price) ||
        parseFloat(serviceForm.bike_price);
    }

    if (!hasValidPrice) {
      newServiceErrors.price = 'At least one compatible vehicle type price is required';
      errorMessages.push('At least one vehicle type price is required');
      hasErrors = true;
    }

    if (hasErrors) {
      setServiceFormErrors(newServiceErrors);
      // Show toast with all error messages
      setAlert({
        show: true,
        type: 'error',
        message: errorMessages.join(', ')
      });
      return;
    }

    try {
      // Prepare service data - always use vehicle-type pricing
      const serviceData = {
        name: serviceForm.name.trim(),
        description: serviceForm.description.trim(),
        category: serviceForm.category,
        // Vehicle-type prices (always required)
        hatchback_price: parseFloat(serviceForm.hatchback_price) || 0,
        sedan_price: parseFloat(serviceForm.sedan_price) || 0,
        suv_price: parseFloat(serviceForm.suv_price) || 0,
        bike_price: parseFloat(serviceForm.bike_price) || 0,
        // Set legacy price to sedan price for backward compatibility
        price: parseFloat(serviceForm.sedan_price) || 0,
        // Vehicle type compatibility
        compatible_vehicle_types: serviceForm.compatible_vehicle_types,
        // GST
        gst_applicable: serviceForm.gst_applicable,
        gst_rate: parseFloat(serviceForm.gst_rate) || 18.00,
        // Duration
        duration: parseInt(serviceForm.duration) || 0,
        duration_max: serviceForm.duration_max ? parseInt(serviceForm.duration_max) : null,
        // Status
        is_active: serviceForm.is_active,
        is_global: serviceForm.is_global,
        branch: serviceForm.branch ? parseInt(serviceForm.branch) : null
      };

      // Auto-assign branch for branch admins
      if (!isSuperAdmin && !isCompanyAdmin) {
        const currentBranchId = getCurrentBranchId();
        if (currentBranchId) {
          serviceData.branch = currentBranchId;
          serviceData.is_global = false; // Branch-specific
        }
      }

      if (editingService) {
        await api.put(`/services/packages/${editingService.id}/`, serviceData);
      } else {
        await api.post('/services/packages/', serviceData);
      }
      setShowServiceModal(false);
      setEditingService(null);
      setServiceForm({
        name: '',
        description: '',
        category: 'other',
        hatchback_price: '',
        sedan_price: '',
        suv_price: '',
        bike_price: '',
        gst_applicable: true,
        gst_rate: '18.00',
        duration: '',
        duration_max: '',
        compatible_vehicle_types: [],
        is_active: true,
        is_global: true,
        branch: null,
      });
      fetchServices();
      setAlert({ show: true, type: 'success', message: `Service package ${editingService ? 'updated' : 'created'} successfully!` });
    } catch (error) {
      console.error('Error saving service:', error);

      // Handle specific API validation errors
      if (error.response?.data) {
        const errorData = error.response.data;

        // Check for backend error message (e.g., from 403 responses)
        if (errorData.error) {
          setAlert({ show: true, type: 'error', message: errorData.error });
          return;
        }

        // Set field-specific errors
        const newServiceErrors = { name: '', description: '', price: '' };

        if (errorData.name) {
          newServiceErrors.name = errorData.name.join(', ');
        }
        if (errorData.description) {
          newServiceErrors.description = errorData.description.join(', ');
        }
        if (errorData.hatchback_price || errorData.sedan_price || errorData.suv_price || errorData.bike_price) {
          const priceErrors = [
            errorData.hatchback_price,
            errorData.sedan_price,
            errorData.suv_price,
            errorData.bike_price
          ].filter(Boolean).flat().join(', ');
          newServiceErrors.price = priceErrors;
        }

        setServiceFormErrors(newServiceErrors);

        // Only show toast for non-field-specific errors
        if (!errorData.name && !errorData.description && !errorData.hatchback_price &&
          !errorData.sedan_price && !errorData.suv_price && !errorData.bike_price) {
          let errorMessage = 'Failed to save service package';
          if (errorData.non_field_errors) {
            errorMessage = errorData.non_field_errors.join(', ');
          } else {
            errorMessage = Object.values(errorData).flat().join(', ');
          }
          setAlert({ show: true, type: 'error', message: errorMessage });
        }
      } else {
        setAlert({ show: true, type: 'error', message: 'Failed to save service package' });
      }
    }
  }


  const handleCreateAddon = async (e) => {
    e.preventDefault();

    // Validation
    const newAddonErrors = { name: '', description: '', price: '' };
    let hasErrors = false;
    let errorMessages = [];

    if (!addonForm.name.trim()) {
      newAddonErrors.name = 'Addon name is required';
      errorMessages.push('Add-on name is required');
      hasErrors = true;
    }

    // Description is optional - no validation needed

    if (!addonForm.price || parseFloat(addonForm.price) <= 0) {
      newAddonErrors.price = 'Valid price is required';
      errorMessages.push('Valid price is required');
      hasErrors = true;
    }

    if (hasErrors) {
      setAddonFormErrors(newAddonErrors);
      // Show toast with all error messages
      setAlert({
        show: true,
        type: 'error',
        message: errorMessages.join(', ')
      });
      return;
    }

    try {
      // Prepare addon data
      const addonData = {
        name: addonForm.name.trim(),
        description: addonForm.description.trim(),
        price: parseFloat(addonForm.price) || 0,
        gst_applicable: addonForm.gst_applicable,
        gst_rate: parseFloat(addonForm.gst_rate) || 18.00,
        duration: parseInt(addonForm.duration) || 0,
        is_active: addonForm.is_active,
        is_global: addonForm.is_global,
        branch: addonForm.branch ? parseInt(addonForm.branch) : null
      };

      // Auto-assign branch for branch admins
      if (!isSuperAdmin) {
        const currentBranchId = getCurrentBranchId();
        if (currentBranchId) {
          addonData.branch = currentBranchId;
          addonData.is_global = false; // Branch-specific
        }
      }

      if (editingAddon) {
        await api.put(`/services/addons/${editingAddon.id}/`, addonData);
      } else {
        await api.post('/services/addons/', addonData);
      }
      setShowAddonModal(false);
      setEditingAddon(null);
      setAddonForm({
        name: '',
        description: '',
        price: '',
        gst_applicable: true,
        gst_rate: '18.00',
        duration: '',
        is_active: true,
        is_global: true,
        branch: null,
      });
      fetchAddons();
      setAlert({ show: true, type: 'success', message: `Add-on ${editingAddon ? 'updated' : 'created'} successfully!` });
    } catch (error) {
      console.error('Error saving addon:', error);

      // Handle specific API validation errors
      if (error.response?.data) {
        const errorData = error.response.data;

        // Check for backend error message (e.g., from 403 responses)
        if (errorData.error) {
          setAlert({ show: true, type: 'error', message: errorData.error });
          return;
        }

        // Set field-specific errors
        const newAddonErrors = { name: '', description: '', price: '' };

        if (errorData.name) {
          newAddonErrors.name = errorData.name.join(', ');
        }
        if (errorData.description) {
          newAddonErrors.description = errorData.description.join(', ');
        }
        if (errorData.price) {
          newAddonErrors.price = errorData.price.join(', ');
        }

        setAddonFormErrors(newAddonErrors);

        // Only show toast for non-field-specific errors
        if (!errorData.name && !errorData.description && !errorData.price) {
          let errorMessage = 'Failed to save addon';
          if (errorData.non_field_errors) {
            errorMessage = errorData.non_field_errors.join(', ');
          } else {
            errorMessage = Object.values(errorData).flat().join(', ');
          }
          setAlert({ show: true, type: 'error', message: errorMessage });
        }
      } else {
        setAlert({ show: true, type: 'error', message: 'Failed to save addon' });
      }
    }
  }

  const handleDeleteService = async (id) => {
    // Store the service ID to be deleted and show confirmation modal
    setPendingDeleteServiceId(id);
    setShowDeleteServiceModal(true);
  };

  const handleConfirmDeleteService = async () => {
    setShowDeleteServiceModal(false);

    try {
      await api.delete(`/services/packages/${pendingDeleteServiceId}/`);
      // After deletion, check if current page is now empty and adjust page if needed
      if (servicesPagination.results.length === 1 && servicesPagination.currentPage > 1) {
        fetchServices(servicesPagination.currentPage - 1);
      } else {
        fetchServices(servicesPagination.currentPage);
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      // Check if it's a protected error (related to foreign key constraints)
      if (error.response?.status === 400 || error.response?.status === 409) {
        setAlert({
          show: true,
          type: 'error',
          message: 'Cannot delete this service package because it is associated with existing bookings. Please deactivate it instead.'
        });
      } else {
        setAlert({ show: true, type: 'error', message: 'Failed to delete service' });
      }
    }
  };

  const handleDeleteAddon = async (id) => {
    // Store the addon ID to be deleted and show confirmation modal
    setPendingDeleteAddonId(id);
    setShowDeleteAddonModal(true);
  };

  const handleConfirmDeleteAddon = async () => {
    setShowDeleteAddonModal(false);

    try {
      await api.delete(`/services/addons/${pendingDeleteAddonId}/`);
      // After deletion, check if current page is now empty and adjust page if needed
      if (addonsPagination.results.length === 1 && addonsPagination.currentPage > 1) {
        fetchAddons(addonsPagination.currentPage - 1);
      } else {
        fetchAddons(addonsPagination.currentPage);
      }
    } catch (error) {
      console.error('Error deleting addon:', error);
      // Check if it's a protected error (related to foreign key constraints)
      if (error.response?.status === 400 || error.response?.status === 409) {
        setAlert({
          show: true,
          type: 'error',
          message: 'Cannot delete this add-on because it is associated with existing bookings. Please deactivate it instead.'
        });
      } else {
        setAlert({ show: true, type: 'error', message: 'Failed to delete addon' });
      }
    }
  };

  const openEditService = (service) => {
    // Check if non-super-admin is trying to edit a global service
    if (service.is_global && !isSuperAdmin && !isCompanyAdmin) {
      setAlert({
        show: true,
        type: 'error',
        message: 'Only super administrators can edit global services. Please contact your super admin.'
      });
      return;
    }

    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description,
      category: service.category || 'other',
      // Vehicle-type prices (always used)
      hatchback_price: service.hatchback_price || '',
      sedan_price: service.sedan_price || '',
      suv_price: service.suv_price || '',
      bike_price: service.bike_price || '',
      // Vehicle type compatibility
      compatible_vehicle_types: service.compatible_vehicle_types || [],
      // GST
      gst_applicable: service.gst_applicable !== false,
      gst_rate: service.gst_rate || '18.00',
      // Duration
      duration: service.duration,
      duration_max: service.duration_max || '',
      // Status
      is_active: service.is_active,
      is_global: service.is_global,
      branch: service.branch ? service.branch.toString() : null,
    });
    setServiceFormErrors({
      name: '',
      description: '',
      price: '',
    });
    setShowServiceModal(true);
  };


  const openEditAddon = (addon) => {
    // Check if non-super-admin is trying to edit a global add-on
    if (addon.is_global && !isSuperAdmin) {
      setAlert({
        show: true,
        type: 'error',
        message: 'Only super administrators can edit global add-ons. Please contact your super admin.'
      });
      return;
    }

    setEditingAddon(addon);
    setAddonForm({
      name: addon.name,
      description: addon.description || '',
      price: addon.price,
      gst_applicable: addon.gst_applicable !== false,
      gst_rate: addon.gst_rate || '18.00',
      duration: addon.duration,
      is_active: addon.is_active,
      is_global: addon.is_global,
      branch: addon.branch ? addon.branch.toString() : null,
    });
    setAddonFormErrors({
      name: '',
      description: '',
      price: '',
    });
    setShowAddonModal(true);
  };

  const closeServiceModal = () => {
    setShowServiceModal(false);
    setEditingService(null);
    setServiceForm({
      name: '',
      description: '',
      category: 'other',
      hatchback_price: '',
      sedan_price: '',
      suv_price: '',
      bike_price: '',
      gst_applicable: true,
      gst_rate: '18.00',
      duration: '',
      duration_max: '',
      // Vehicle type compatibility
      compatible_vehicle_types: [],
      is_active: true,
      is_global: true,
      branch: null,
    });
    setServiceFormErrors({
      name: '',
      description: '',
      price: '',
    });
  };

  const closeAddonModal = () => {
    setShowAddonModal(false);
    setEditingAddon(null);
    setAddonForm({
      name: '',
      description: '',
      price: '',
      gst_applicable: true,
      gst_rate: '18.00',
      duration: '',
      is_active: true,
      is_global: true,
      branch: null,
    });
    setAddonFormErrors({
      name: '',
      description: '',
      price: '',
    });
  };

  // Filter services by search term and branch
  // Use all services for search, but paginate the results
  const filteredServices = useMemo(() => {
    const searchResults = allServices.filter(service => {
      // Search filter
      const matchesSearch = service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchTerm.toLowerCase());

      // Branch filter (for Super Admin manual filtering)
      let matchesBranch = true;
      if (isSuperAdmin && filterBranch !== 'all') {
        if (filterBranch === 'global') {
          matchesBranch = service.is_global;
        } else {
          matchesBranch = service.branch?.id === parseInt(filterBranch);
        }
      }

      return matchesSearch && matchesBranch;
    });

    // Apply pagination to search results
    const startIndex = (servicesPagination.currentPage - 1) * servicesPagination.pageSize;
    const endIndex = startIndex + servicesPagination.pageSize;

    setServicesPagination(prev => ({
      ...prev,
      count: searchResults.length,
      results: searchResults.slice(startIndex, endIndex),
      totalPages: Math.ceil(searchResults.length / prev.pageSize)
    }));

    return searchResults.slice(startIndex, endIndex);
  }, [allServices, searchTerm, filterBranch, isSuperAdmin, servicesPagination.currentPage, servicesPagination.pageSize]);

  // Filter addons by search term and branch
  // Use all addons for search, but paginate the results
  const filteredAddons = useMemo(() => {
    const searchResults = allAddons.filter(addon => {
      // Search filter
      const matchesSearch = addon.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        addon.description?.toLowerCase().includes(searchTerm.toLowerCase());

      // Branch filter (for Super Admin manual filtering)
      let matchesBranch = true;
      if (isSuperAdmin && filterBranch !== 'all') {
        if (filterBranch === 'global') {
          matchesBranch = addon.is_global;
        } else {
          matchesBranch = addon.branch?.id === parseInt(filterBranch);
        }
      }

      return matchesSearch && matchesBranch;
    });

    // Apply pagination to search results
    const startIndex = (addonsPagination.currentPage - 1) * addonsPagination.pageSize;
    const endIndex = startIndex + addonsPagination.pageSize;

    setAddonsPagination(prev => ({
      ...prev,
      count: searchResults.length,
      results: searchResults.slice(startIndex, endIndex),
      totalPages: Math.ceil(searchResults.length / prev.pageSize)
    }));

    return searchResults.slice(startIndex, endIndex);
  }, [allAddons, searchTerm, filterBranch, isSuperAdmin, addonsPagination.currentPage, addonsPagination.pageSize]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-80 mt-2 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-16 mt-2 animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <div className="border-b border-gray-200">
          <div className="flex gap-8">
            <div className="py-4">
              <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
            </div>
            <div className="py-4">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Search Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Service Packages Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
              </div>

              <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-4/5 mb-4 animate-pulse"></div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                <div className="flex-1 h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="flex-1 h-8 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen space-y-4 md:space-y-6">
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: '', message: '' })}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            Service Management
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            Manage service packages and add-ons
          </p>
        </div>
        <Button
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl shadow-lg shadow-blue-100 w-full md:w-auto text-sm md:text-base"
          onClick={() => {
            if (activeTab === "packages") {
              setEditingService(null);
              setServiceForm({
                name: '',
                description: '',
                category: 'other',
                hatchback_price: '',
                sedan_price: '',
                suv_price: '',
                bike_price: '',
                gst_applicable: true,
                gst_rate: '18.00',
                duration: '',
                duration_max: '',
                // Vehicle type compatibility
                compatible_vehicle_types: [],
                is_active: true,
                is_global: isSuperAdmin || isCompanyAdmin, // Super admin and company admin default to global, branch admin to branch-specific
                branch: null,
              });
              setServiceFormErrors({
                name: '',
                description: '',
                price: '',
              });
              setShowServiceModal(true);
            } else {
              setEditingAddon(null);
              setAddonForm({
                name: '',
                description: '',
                price: '',
                gst_applicable: true,
                gst_rate: '18.00',
                duration: '',
                is_active: true,
                is_global: isSuperAdmin || isCompanyAdmin, // Super admin and company admin default to global, branch admin to branch-specific
                branch: null,
              });
              setAddonFormErrors({
                name: '',
                description: '',
                price: '',
              });
              setShowAddonModal(true);
            }
          }}
        >
          <Plus size={16} className="md:hidden" />
          <Plus size={18} className="hidden md:block" />
          <span>{activeTab === "packages" ? "Add Package" : "Add Addon"}</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 font-inter">
        <div className="bg-white rounded-xl border border-gray-100 p-3 md:p-4 shadow-sm">
          <p className="text-[10px] md:text-sm font-semibold uppercase tracking-wider text-gray-500">Packages</p>
          <p className="text-xl md:text-2xl font-black text-gray-900 mt-1">
            {servicesPagination.count}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3 md:p-4 shadow-sm">
          <p className="text-[10px] md:text-sm font-semibold uppercase tracking-wider text-gray-500">Active</p>
          <div className="flex items-baseline gap-1 mt-1">
            <p className="text-xl md:text-2xl font-black text-emerald-600">
              {servicesPagination.results.filter((s) => s.is_active).length}
            </p>
            {servicesPagination.currentPage > 1 && <span className="text-xs text-emerald-500 font-bold">+</span>}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3 md:p-4 shadow-sm">
          <p className="text-[10px] md:text-sm font-semibold uppercase tracking-wider text-gray-500">Add-ons</p>
          <p className="text-xl md:text-2xl font-black text-gray-900 mt-1">
            {addonsPagination.count}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3 md:p-4 shadow-sm">
          <p className="text-[10px] md:text-sm font-semibold uppercase tracking-wider text-gray-500">Active</p>
          <div className="flex items-baseline gap-1 mt-1">
            <p className="text-xl md:text-2xl font-black text-indigo-600">
              {addonsPagination.results.filter((a) => a.is_active).length}
            </p>
            {addonsPagination.currentPage > 1 && <span className="text-xs text-indigo-500 font-bold">+</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 sticky top-0 bg-gray-50/80 backdrop-blur-md z-60 pt-2">
        <nav className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
          {/* Tab Buttons */}
          <div className="flex space-x-6 md:space-x-8 overflow-x-auto no-scrollbar pb-px">
            <button
              onClick={() => {
                setActiveTab("packages");
                fetchServices(servicesPagination.currentPage);
              }}
              className={`py-3 md:py-4 px-1 border-b-2 font-bold text-sm md:text-base transition-all duration-200 whitespace-nowrap ${activeTab === "packages"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              Packages <span className="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-full text-[10px] md:text-xs">{servicesPagination.count}</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("addons");
                fetchAddons(addonsPagination.currentPage);
              }}
              className={`py-3 md:py-4 px-1 border-b-2 font-bold text-sm md:text-base transition-all duration-200 whitespace-nowrap ${activeTab === "addons"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              Add-ons <span className="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-full text-[10px] md:text-xs">{addonsPagination.count}</span>
            </button>
          </div>

          {/* Per Page Selector - Shows based on active tab */}
          <div className="mb-3 sm:mb-2 flex items-center gap-2">
            <span className="text-[10px] md:text-sm font-bold uppercase tracking-wider text-gray-500">Show:</span>
            <select
              value={activeTab === "packages" ? servicesPagination.pageSize : addonsPagination.pageSize}
              onChange={(e) => {
                const size = Number(e.target.value);
                if (activeTab === "packages") handleServicesPageSizeChange(size);
                else handleAddonsPageSizeChange(size);
              }}
              className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs md:text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer"
            >
              {(activeTab === "packages" ? servicesPagination.pageSizes : addonsPagination.pageSizes).map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </div>
        </nav>
      </div>

      {/* Optional extra bottom margin if needed below tabs */}
      <div className="mb-6"></div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
        <div className="flex-1">
          <div className="relative group">
            <Search
              className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Search services or add-ons..."
              value={searchTerm}
              onChange={(e) => {
                const newValue = e.target.value;
                setSearchTerm(newValue);
                debouncedSearch(newValue);
              }}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm text-sm"
            />
          </div>
        </div>

        {/* Branch Filter - Super Admin Only */}
        {isSuperAdmin && (
          <div className="sm:w-64">
            <select
              value={filterBranch}
              onChange={(e) => {
                setFilterBranch(e.target.value);
                if (activeTab === 'packages') fetchServices(1);
                else fetchAddons(1);
                setSearchTerm('');
              }}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm text-sm font-medium"
            >
              <option value="all">All Types</option>
              <option value="global">Global Only</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id.toString()}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Service Packages Tab */}
      {activeTab === "packages" && (
        <div>
          {/* Top pagination controls with page size */}


          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => {
              // Calculate available vehicle types
              const vehicleTypes = [
                { name: 'Hatchback', price: service.hatchback_price, icon: '🚗', color: 'blue' },
                { name: 'Sedan', price: service.sedan_price, icon: '🚙', color: 'green' },
                { name: 'SUV', price: service.suv_price, icon: '🚐', color: 'purple' },
                { name: 'Bike', price: service.bike_price, icon: '🏍️', color: 'orange' }
              ].filter(vt => vt.price > 0);

              return (
                <div
                  key={service.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:border-primary/30"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <Package className="text-primary" size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 leading-tight">
                            {service.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                              <Tag size={10} />
                              {serviceCategories.find(c => c.value === service.category)?.label || 'Other'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Badge variant={service.is_active ? "success" : "default"} className="shrink-0">
                        {service.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {/* Branch & GST Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {service.is_global ? (
                        <Badge variant="info" className="flex items-center gap-1 text-xs">
                          <Globe size={10} />
                          Global
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="flex items-center gap-1 text-xs">
                          <Building2 size={10} />
                          {service.branch_details?.name || branches.find(b => b.id === service.branch)?.name || 'Branch'}
                        </Badge>
                      )}
                      {service.gst_applicable && (
                        <Badge variant="default" className="text-xs">
                          GST {service.gst_rate}%
                        </Badge>
                      )}
                      <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                        <Clock size={10} />
                        {service.duration_max
                          ? `${service.duration}-${service.duration_max} min`
                          : `${service.duration} min`
                        }
                      </Badge>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4">
                    {/* Global Service Info for Non-Super Admins */}
                    {service.is_global && !isSuperAdmin && !isCompanyAdmin && (
                      <div className="mb-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                        <p className="text-[10px] md:text-xs text-blue-800 flex items-start gap-2">
                          <Globe size={14} className="mt-0.5 shrink-0" />
                          <span><span className="font-bold">Read-only:</span> Only super administrators can edit global services</span>
                        </p>
                      </div>
                    )}

                    {/* Description */}
                    <p className="text-xs md:text-sm text-gray-600 mb-4 line-clamp-2 min-h-[32px] md:min-h-[40px]">
                      {service.description || 'No description provided'}
                    </p>

                    {/* Vehicle Type Pricing */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pricing</span>
                        {service.gst_applicable && (
                          <span className="text-[10px] font-medium text-gray-400">+ {service.gst_rate}% GST</span>
                        )}
                      </div>

                      {vehicleTypes.length > 0 ? (
                        <div className={`grid gap-2 ${vehicleTypes.length === 1 ? 'grid-cols-1' :
                          vehicleTypes.length === 2 ? 'grid-cols-2' :
                            vehicleTypes.length === 3 ? 'grid-cols-3' :
                              'grid-cols-4'
                          }`}>
                          {vehicleTypes.map((vt, idx) => (
                            <div
                              key={idx}
                              className="bg-gray-50/50 rounded-xl p-2.5 border border-gray-100 hover:border-blue-200 transition-all text-center"
                            >
                              <span className="text-xl md:text-2xl block mb-1">{vt.icon}</span>
                              <p className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-tighter truncate">{vt.name}</p>
                              <p className="text-xs md:text-sm font-black text-emerald-600 mt-0.5 whitespace-nowrap">₹{vt.price}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-xl p-4 text-center border border-dashed">
                          <p className="text-xs text-gray-400 font-medium italic">No pricing available</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer - Actions */}
                  <div className="px-4 pb-4">
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <button
                        onClick={() => navigate(`/admin/services/${service.id}/parts`)}
                        className="w-full flex items-center justify-center gap-2 bg-white border border-blue-200 text-blue-600 rounded-xl py-2.5 text-xs md:text-sm font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      >
                        <Package size={14} />
                        Parts
                      </button>

                      <div className="flex items-center gap-2 w-full">
                        <button
                          onClick={() => openEditService(service)}
                          disabled={service.is_global && !isSuperAdmin && !isCompanyAdmin}
                          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs md:text-sm font-bold border transition-all shadow-sm ${service.is_global && !isSuperAdmin && !isCompanyAdmin
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white border-blue-600/20 text-blue-600 hover:bg-blue-600 hover:text-white'
                            }`}
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteService(service.id)}
                          disabled={service.is_global && !isSuperAdmin && !isCompanyAdmin}
                          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs md:text-sm font-bold border transition-all shadow-sm ${service.is_global && !isSuperAdmin && !isCompanyAdmin
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-600 hover:text-white'
                            }`}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Service Packages Pagination */}
      {activeTab === "packages" && servicesPagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-wider order-2 sm:order-1">
            Showing <span className="text-gray-900">{(servicesPagination.currentPage - 1) * servicesPagination.pageSize + 1}</span> to
            <span className="text-gray-900 mx-1">{Math.min(servicesPagination.currentPage * servicesPagination.pageSize, servicesPagination.count)}</span>
            of <span className="text-gray-900">{servicesPagination.count}</span> results
          </div>
          <div className="flex items-center gap-1.5 order-1 sm:order-2">
            <button
              onClick={() => setServicesPagination(prev => ({
                ...prev,
                currentPage: Math.max(1, prev.currentPage - 1)
              }))}
              disabled={servicesPagination.currentPage === 1}
              className={`p-2 rounded-xl border transition-all ${servicesPagination.currentPage === 1
                ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300 active:scale-95'}`}
            >
              <div className="flex items-center gap-1">
                <Plus className="w-4 h-4 rotate-180 transform" />
                <span className="hidden sm:inline text-sm font-bold">Prev</span>
              </div>
            </button>

            <div className="flex items-center gap-1 mx-1">
              {Array.from({ length: Math.min(3, servicesPagination.totalPages) }, (_, i) => {
                let pageNum;
                if (servicesPagination.totalPages <= 3) pageNum = i + 1;
                else if (servicesPagination.currentPage <= 2) pageNum = i + 1;
                else if (servicesPagination.currentPage >= servicesPagination.totalPages - 1) pageNum = servicesPagination.totalPages - 2 + i;
                else pageNum = servicesPagination.currentPage - 1 + i;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setServicesPagination(prev => ({
                      ...prev,
                      currentPage: pageNum
                    }))}
                    className={`w-9 h-9 md:w-10 md:h-10 rounded-xl text-xs md:text-sm font-black transition-all ${servicesPagination.currentPage === pageNum
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105'
                      : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50 hover:border-gray-200'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setServicesPagination(prev => ({
                ...prev,
                currentPage: Math.min(prev.totalPages, prev.currentPage + 1)
              }))}
              disabled={servicesPagination.currentPage === servicesPagination.totalPages}
              className={`p-2 rounded-xl border transition-all ${servicesPagination.currentPage === servicesPagination.totalPages
                ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300 active:scale-95'}`}
            >
              <div className="flex items-center gap-1">
                <span className="hidden sm:inline text-sm font-bold">Next</span>
                <Plus className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Add-ons Tab */}
      {activeTab === "addons" && (
        <div>
          {/* Top pagination controls with page size */}
          {/* <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Show:</span>
                <select
                  value={addonsPagination.pageSize}
                  onChange={(e) => handleAddonsPageSizeChange(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                >
                  {addonsPagination.pageSizes.map(size => (
                    <option key={size} value={size}>{size} per page</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
           */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAddons.map((addon) => (
              <div
                key={addon.id}
                className="bg-white rounded-xl border border-gray-100 p-4 md:p-6 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {addon.name}
                    </h3>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge variant={addon.is_active ? "success" : "default"} className="text-[10px]">
                      {addon.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {addon.is_global ? (
                    <Badge variant="info" className="flex items-center gap-1 text-[10px]">
                      <Globe size={10} />
                      Global
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="flex items-center gap-1 text-[10px]">
                      <Building2 size={10} />
                      <span className="truncate max-w-[100px]">{addon.branch_details?.name || branches.find(b => b.id === addon.branch)?.name || 'Branch'}</span>
                    </Badge>
                  )}
                </div>

                {/* Global Add-on Info for Non-Super Admins */}
                {addon.is_global && !isSuperAdmin && !isCompanyAdmin && (
                  <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <p className="text-xs text-blue-800 flex items-center gap-1">
                      <Globe size={12} />
                      <span className="font-medium">Read-only:</span> Only super administrators and company administrators can edit global add-ons
                    </p>
                  </div>
                )}

                {addon.description ? (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {addon.description}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic mb-4">
                    {/* No description provided */}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Price:</span>
                    <span className="flex items-center gap-1 text-lg font-bold text-green-600">
                      <IndianRupee size={18} />
                      {addon.price}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Duration:</span>
                    <span className="flex items-center gap-1 text-sm font-medium text-gray-900">
                      <Clock size={16} />
                      {addon.duration} min
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => openEditAddon(addon)}
                    disabled={addon.is_global && !isSuperAdmin && !isCompanyAdmin}
                    className={`w-full flex items-center justify-center gap-2 border rounded-xl py-2.5 text-xs md:text-sm font-bold transition-all shadow-sm ${addon.is_global && !isSuperAdmin && !isCompanyAdmin
                      ? 'border-gray-100 text-gray-400 bg-gray-50 cursor-not-allowed'
                      : 'border-indigo-600/20 text-indigo-600 hover:bg-indigo-600 hover:text-white'
                      }`}
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>

                  <button
                    onClick={() => handleDeleteAddon(addon.id)}
                    disabled={addon.is_global && !isSuperAdmin}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs md:text-sm font-bold border transition-all shadow-sm ${addon.is_global && !isSuperAdmin
                      ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed'
                      : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border-red-100'
                      }`}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Add-ons Pagination */}
      {activeTab === "addons" && addonsPagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-wider order-2 sm:order-1">
            Showing <span className="text-gray-900">{(addonsPagination.currentPage - 1) * addonsPagination.pageSize + 1}</span> to
            <span className="text-gray-900 mx-1">{Math.min(addonsPagination.currentPage * addonsPagination.pageSize, addonsPagination.count)}</span>
            of <span className="text-gray-900">{addonsPagination.count}</span> results
          </div>
          <div className="flex items-center gap-1.5 order-1 sm:order-2">
            <button
              onClick={() => setAddonsPagination(prev => ({
                ...prev,
                currentPage: Math.max(1, prev.currentPage - 1)
              }))}
              disabled={addonsPagination.currentPage === 1}
              className={`p-2 rounded-xl border transition-all ${addonsPagination.currentPage === 1
                ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300 active:scale-95'}`}
            >
              <Plus className="w-4 h-4 rotate-45 transform" />
              <span className="hidden sm:inline ml-1 text-sm font-bold">Prev</span>
            </button>

            <div className="flex items-center gap-1 mx-1">
              {Array.from({ length: Math.min(3, addonsPagination.totalPages) }, (_, i) => {
                let pageNum;
                if (addonsPagination.totalPages <= 3) pageNum = i + 1;
                else if (addonsPagination.currentPage <= 2) pageNum = i + 1;
                else if (addonsPagination.currentPage >= addonsPagination.totalPages - 1) pageNum = addonsPagination.totalPages - 2 + i;
                else pageNum = addonsPagination.currentPage - 1 + i;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setAddonsPagination(prev => ({
                      ...prev,
                      currentPage: pageNum
                    }))}
                    className={`w-9 h-9 md:w-10 md:h-10 rounded-xl text-xs md:text-sm font-black transition-all ${addonsPagination.currentPage === pageNum
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
                      : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50 hover:border-gray-200'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setAddonsPagination(prev => ({
                ...prev,
                currentPage: Math.min(prev.totalPages, prev.currentPage + 1)
              }))}
              disabled={addonsPagination.currentPage === addonsPagination.totalPages}
              className={`p-2 rounded-xl border transition-all ${addonsPagination.currentPage === addonsPagination.totalPages
                ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300 active:scale-95'}`}
            >
              <span className="hidden sm:inline mr-1 text-sm font-bold">Next</span>
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Service Package Modal */}
      <Modal
        isOpen={showServiceModal}
        onClose={closeServiceModal}
        title={editingService ? "Edit Service Package" : "Add Service Package"}
        footer={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={closeServiceModal}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateService}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              {editingService ? "Update" : "Create"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateService} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs md:text-sm font-bold text-gray-700">
                Service Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={serviceForm.name}
                onChange={(e) => {
                  setServiceForm({ ...serviceForm, name: e.target.value });
                  if (serviceFormErrors.name) {
                    setServiceFormErrors({ ...serviceFormErrors, name: '' });
                  }
                }}
                className={serviceFormErrors.name ? 'border-red-500 rounded-xl' : 'rounded-xl'}
                placeholder="e.g. Full Interior Cleaning"
              />
              {serviceFormErrors.name && (
                <p className="text-[10px] text-red-600 font-medium">{serviceFormErrors.name}</p>
              )}
            </div>

            {/* Service Category */}
            <div className="space-y-1">
              <label className="block text-xs md:text-sm font-bold text-gray-700">
                <Tag size={14} className="inline mr-1 text-gray-400" />
                Category
              </label>
              <select
                value={serviceForm.category}
                onChange={(e) => {
                  const category = e.target.value;
                  let compatibleTypes = [];
                  if (category === 'bike_services') compatibleTypes = ['bike'];
                  else compatibleTypes = ['hatchback', 'sedan', 'suv'];

                  setServiceForm({
                    ...serviceForm,
                    category: category,
                    compatible_vehicle_types: compatibleTypes
                  });
                }}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm md:text-base outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
              >
                {serviceCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs md:text-sm font-bold text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={serviceForm.description}
              onChange={(e) => {
                setServiceForm({ ...serviceForm, description: e.target.value });
                if (serviceFormErrors.description) {
                  setServiceFormErrors({ ...serviceFormErrors, description: '' });
                }
              }}
              className={`${serviceFormErrors.description ? 'border-red-500' : ''} rounded-xl`}
              rows={3}
              placeholder="Describe what's included in this service..."
            />
            {serviceFormErrors.description && (
              <p className="text-[10px] text-red-600 font-medium">{serviceFormErrors.description}</p>
            )}
          </div>

          {/* Vehicle-Type Compatibility */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
            <h4 className="text-xs md:text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Car size={16} className="text-blue-600" />
              Compatibility
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'bike', label: 'Bike', icon: '🏍️' },
                { id: 'hatchback', label: 'Hatchback', icon: '🚗' },
                { id: 'sedan', label: 'Sedan', icon: '🚙' },
                { id: 'suv', label: 'SUV', icon: '🚐' }
              ].map(type => (
                <label key={type.id} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:border-blue-200 transition-all">
                  <input
                    type="checkbox"
                    checked={serviceForm.compatible_vehicle_types?.includes(type.id) || false}
                    onChange={(e) => {
                      const types = e.target.checked
                        ? [...(serviceForm.compatible_vehicle_types || []), type.id]
                        : (serviceForm.compatible_vehicle_types || []).filter(t => t !== type.id);
                      setServiceForm({ ...serviceForm, compatible_vehicle_types: types });
                    }}
                    className="w-4 h-4 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-gray-700">{type.icon} {type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Vehicle-Type Pricing (Always Required) */}
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs md:text-sm font-bold text-gray-800 flex items-center gap-2">
                <IndianRupee size={16} className="text-emerald-600" />
                Pricing
              </h4>
              <span className="text-[10px] font-black uppercase text-emerald-600 bg-white px-2 py-0.5 rounded-full border border-emerald-100">INR (₹)</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: 'bike_price', label: 'Bike', icon: '🏍️' },
                { id: 'hatchback_price', label: 'Hatchback', icon: '🚗' },
                { id: 'sedan_price', label: 'Sedan', icon: '🚙' },
                { id: 'suv_price', label: 'SUV', icon: '🚐' }
              ].map(type => (
                <div key={type.id} className="space-y-1">
                  <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">{type.icon} {type.label}</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={serviceForm[type.id]}
                    onChange={(e) => setServiceForm({ ...serviceForm, [type.id]: e.target.value })}
                    className="rounded-xl border-gray-200 text-xs md:text-sm font-black"
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          {/* GST Configuration */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="gst_applicable"
                  checked={serviceForm.gst_applicable}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, gst_applicable: e.target.checked })
                  }
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="gst_applicable" className="text-sm font-medium text-gray-700">
                  GST Applicable
                </label>
              </div>
              {serviceForm.gst_applicable && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">GST Rate:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={serviceForm.gst_rate}
                    onChange={(e) =>
                      setServiceForm({ ...serviceForm, gst_rate: e.target.value })
                    }
                    className="input w-20 text-center"
                  />
                  <span className="text-sm text-gray-600">%</span>
                </div>
              )}
            </div>
            {serviceForm.gst_applicable && serviceForm.price && (
              <div className="text-xs text-amber-700 bg-amber-100 rounded p-2">
                <div className="flex justify-between">
                  <span>Base Price:</span>
                  <span>₹{parseFloat(serviceForm.price || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST ({serviceForm.gst_rate}%):</span>
                  <span>₹{(parseFloat(serviceForm.price || 0) * parseFloat(serviceForm.gst_rate || 0) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-amber-300 mt-1 pt-1">
                  <span>Total:</span>
                  <span>₹{(parseFloat(serviceForm.price || 0) * (1 + parseFloat(serviceForm.gst_rate || 0) / 100)).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs md:text-sm font-bold text-gray-700">
                Duration (min) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="5"
                value={serviceForm.duration}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, duration: e.target.value })
                }
                className="rounded-xl"
                required
                icon={<Clock size={16} className="text-gray-400" />}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs md:text-sm font-bold text-gray-700">
                Max Duration (min)
              </label>
              <Input
                type="number"
                step="5"
                placeholder="Optional e.g. 50"
                value={serviceForm.duration_max}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, duration_max: e.target.value })
                }
                className="rounded-xl"
                helperText="For ranges (e.g. 40-50 min)"
              />
            </div>
          </div>

          {/* Global & Branch Selection - Super Admin and Company Admin */}
          {(isSuperAdmin || isCompanyAdmin) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_global_service"
                  checked={serviceForm.is_global}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      is_global: e.target.checked,
                      branch: e.target.checked ? null : serviceForm.branch
                    })
                  }
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="is_global_service" className="text-sm text-gray-700 flex items-center gap-1">
                  <Globe size={14} />
                  Global Service (Available to all branches)
                </label>
              </div>

              {!serviceForm.is_global && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Branch
                  </label>
                  <select
                    value={serviceForm.branch || ''}
                    onChange={(e) =>
                      setServiceForm({ ...serviceForm, branch: e.target.value || null })
                    }
                    className="input w-full"
                    required={!serviceForm.is_global}
                  >
                    <option value="">Choose a branch...</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Branch Info - Branch Admin only (not super admin or company admin) */}
          {!isSuperAdmin && !isCompanyAdmin && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 flex items-center gap-1">
                <Building2 size={14} />
                <strong>Branch:</strong> {branches.find(b => b.id === getCurrentBranchId())?.name || 'Current Branch'}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                This service will be assigned to your branch automatically.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={serviceForm.is_active}
              onChange={(e) =>
                setServiceForm({ ...serviceForm, is_active: e.target.checked })
              }
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              Active (Available for booking)
            </label>
          </div>
        </form>
      </Modal>

      {/* Addon Modal */}
      <Modal
        isOpen={showAddonModal}
        onClose={closeAddonModal}
        title={editingAddon ? "Edit Add-on" : "Add Add-on"}
        footer={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={closeAddonModal} className="w-full sm:w-auto order-2 sm:order-1">
              Cancel
            </Button>
            <Button onClick={handleCreateAddon} className="w-full sm:w-auto order-1 sm:order-2">
              {editingAddon ? "Update" : "Create"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateAddon} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs md:text-sm font-bold text-gray-700">
              Add-on Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={addonForm.name}
              onChange={(e) => {
                setAddonForm({ ...addonForm, name: e.target.value });
                if (addonFormErrors.name) {
                  setAddonFormErrors({ ...addonFormErrors, name: '' });
                }
              }}
              className={`${addonFormErrors.name ? 'border-red-500' : ''} rounded-xl`}
              placeholder="e.g. Engine Steam Clean"
            />
            {addonFormErrors.name && (
              <p className="text-[10px] text-red-600 font-medium">{addonFormErrors.name}</p>
            )}
          </div>
          <div className="space-y-1">
            <label className="block text-xs md:text-sm font-bold text-gray-700">
              Description
            </label>
            <Textarea
              value={addonForm.description}
              onChange={(e) => {
                setAddonForm({ ...addonForm, description: e.target.value });
                if (addonFormErrors.description) {
                  setAddonFormErrors({ ...addonFormErrors, description: '' });
                }
              }}
              className={`${addonFormErrors.description ? 'border-red-500' : ''} rounded-xl`}
              rows={3}
              placeholder="What does this add-on include?"
            />
            {addonFormErrors.description && (
              <p className="text-[10px] text-red-600 font-medium">{addonFormErrors.description}</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs md:text-sm font-bold text-gray-700">
                Price (₹) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                value={addonForm.price}
                onChange={(e) => {
                  setAddonForm({ ...addonForm, price: e.target.value });
                  if (addonFormErrors.price) {
                    setAddonFormErrors({ ...addonFormErrors, price: '' });
                  }
                }}
                className={`${addonFormErrors.price ? 'border-red-500' : ''} rounded-xl font-black`}
                required
              />
              {addonFormErrors.price && (
                <p className="text-[10px] text-red-600 font-medium">{addonFormErrors.price}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="block text-xs md:text-sm font-bold text-gray-700">
                Duration (min) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="5"
                value={addonForm.duration}
                onChange={(e) =>
                  setAddonForm({ ...addonForm, duration: e.target.value })
                }
                className="rounded-xl"
                required
              />
            </div>
          </div>

          {/* Global & Branch Selection - Super Admin and Company Admin */}
          {(isSuperAdmin || isCompanyAdmin) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_global_addon"
                  checked={addonForm.is_global}
                  onChange={(e) =>
                    setAddonForm({
                      ...addonForm,
                      is_global: e.target.checked,
                      branch: e.target.checked ? null : addonForm.branch
                    })
                  }
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="is_global_addon" className="text-sm text-gray-700 flex items-center gap-1">
                  <Globe size={14} />
                  Global Add-on (Available to all branches)
                </label>
              </div>

              {!addonForm.is_global && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Branch
                  </label>
                  <select
                    value={addonForm.branch || ''}
                    onChange={(e) =>
                      setAddonForm({ ...addonForm, branch: e.target.value || null })
                    }
                    className="input w-full"
                    required={!addonForm.is_global}
                  >
                    <option value="">Choose a branch...</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Branch Info - Branch Admin */}
          {!isSuperAdmin && !isCompanyAdmin && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 flex items-center gap-1">
                <Building2 size={14} />
                <strong>Branch:</strong> {branches.find(b => b.id === getCurrentBranchId())?.name || 'Current Branch'}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                This add-on will be assigned to your branch automatically.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="addon_active"
              checked={addonForm.is_active}
              onChange={(e) =>
                setAddonForm({ ...addonForm, is_active: e.target.checked })
              }
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="addon_active" className="text-sm text-gray-700">
              Active (Available for selection)
            </label>
          </div>
        </form>
      </Modal>

      {/* Delete Service Confirmation Modal */}
      <Modal
        isOpen={showDeleteServiceModal}
        onClose={() => setShowDeleteServiceModal(false)}
        title="Delete Service Package"
        footer={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setShowDeleteServiceModal(false)} className="w-full sm:w-auto order-2 sm:order-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDeleteService} className="w-full sm:w-auto order-1 sm:order-2">
              Delete Package
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete this service package? This action cannot be undone and will affect all associated bookings.
          </p>
        </div>
      </Modal>

      {/* Delete Addon Confirmation Modal */}
      <Modal
        isOpen={showDeleteAddonModal}
        onClose={() => setShowDeleteAddonModal(false)}
        title="Delete Add-on"
        footer={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setShowDeleteAddonModal(false)} className="w-full sm:w-auto order-2 sm:order-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDeleteAddon} className="w-full sm:w-auto order-1 sm:order-2">
              Delete Add-on
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete this add-on? This action cannot be undone and will affect all associated bookings.
          </p>
        </div>
      </Modal>

      {/* Service Parts Modal */}
      {selectedServiceForParts && (
        <ServicePartsMapping
          serviceId={selectedServiceForParts.id}
          serviceName={selectedServiceForParts.name}
          isOpen={showPartsModal}
          onClose={() => {
            setShowPartsModal(false);
            setSelectedServiceForParts(null);
          }}
        />
      )}
    </div>
  );
};

export default ServiceManagement;
