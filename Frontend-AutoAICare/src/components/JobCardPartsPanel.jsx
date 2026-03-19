import { Alert, Badge, Button, Input, Modal, Select } from '@/components/ui';
import api from '@/utils/api';
import { Check, Package, Pencil, Plus, Trash2, Search, X } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

const JobCardPartsPanel = ({ jobCardId, parts, onUpdate }) => {
    const [availableParts, setAvailableParts] = useState([]);
    const [branches, setBranches] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedPart, setSelectedPart] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [customMode, setCustomMode] = useState(false);
    const [customPartData, setCustomPartData] = useState({
        part_name: '',
        quantity: 1,
        price: '',
        cost_price: ''
    });
    const [showAddNewPartModal, setShowAddNewPartModal] = useState(false);
    const [newPartData, setNewPartData] = useState({
        name: '',
        sku: '',
        category: 'spare',
        description: '',
        cost_price: '',
        selling_price: '',
        stock: 0,
        min_stock_level: 5,
        unit: 'pieces',
        gst_rate: 18.00,
        hsn_code: '',
        gst_applicable: true,
        is_global: true,
        branch: '',
        stock_tracking_mode: 'global',
        is_active: true
    });
    const [loading, setLoading] = useState(false);
    const [editingPart, setEditingPart] = useState(null);
    const [editPartData, setEditPartData] = useState({
        quantity: 1,
        price: '',
        part_name: ''
    });
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [partToDelete, setPartToDelete] = useState(null);

    // Search and dropdown states
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    // Alert state
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
    };

    useEffect(() => {
        console.log('🔄 JobCardPartsPanel mounted, fetching data...');
        fetchAvailableParts();
        fetchBranches();
    }, []);

    // Auto-open dropdown when modal opens in catalog mode
    useEffect(() => {
        if (showAddModal && !customMode) {
            setIsDropdownOpen(true);
            // Focus search input after a short delay to ensure modal is rendered
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        } else {
            setIsDropdownOpen(false);
            setSearchTerm('');
        }
    }, [showAddModal, customMode]);

    // Debug: Log newPartData changes
    useEffect(() => {
        console.log('📊 [JobCardPartsPanel] newPartData changed:', {
            is_global: newPartData.is_global,
            branch: newPartData.branch,
            stock_tracking_mode: newPartData.stock_tracking_mode,
            name: newPartData.name
        });
    }, [newPartData]);

    // Debug: Log branches state
    useEffect(() => {
        console.log('🏢 [JobCardPartsPanel] Branches state updated:', branches);
        console.log('[JobCardPartsPanel] Number of branches:', branches.length);
    }, [branches]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    const fetchAvailableParts = async () => {
        try {
            let allParts = [];
            let url = '/jobcards/parts/?is_active=true';

            // Fetch all pages recursively
            while (url) {
                const response = await api.get(url);
                const data = response.data;

                // Add current page results
                if (data.results) {
                    allParts = [...allParts, ...data.results];
                } else if (Array.isArray(data)) {
                    allParts = [...allParts, ...data];
                }

                // Check if there's a next page
                url = data.next ? data.next.replace('http://localhost:8000/api', '') : null;
            }

            setAvailableParts(allParts);
        } catch (error) {
            console.error('Error fetching parts:', error);
        }
    };

    const fetchBranches = async () => {
        try {
            console.log('🔍 [JobCardPartsPanel] Fetching branches...');
            const response = await api.get('/branches/');
            const branchesData = response.data.results || response.data || [];
            console.log('✅ [JobCardPartsPanel] Branches fetched:', branchesData);
            console.log('📊 [JobCardPartsPanel] Number of branches:', branchesData.length);
            setBranches(branchesData);
        } catch (error) {
            console.error('❌ [JobCardPartsPanel] Error fetching branches:', error);
            console.error('Error details:', error.response?.data);
        }
    };

    const handleAddPart = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (customMode) {
                // Add custom part
                await api.post(`/jobcards/${jobCardId}/add_part/`, {
                    part_name: customPartData.part_name,
                    quantity: customPartData.quantity,
                    price: parseFloat(customPartData.price),
                    cost_price: parseFloat(customPartData.cost_price || 0)
                });
            } else {
                // Add part from catalog
                const part = availableParts.find(p => p.id === parseInt(selectedPart));
                if (!part) {
                    showAlert('warning', 'Please select a part');
                    setLoading(false);
                    return;
                }

                if (part.stock < quantity) {
                    showAlert('error', `Insufficient stock. Available: ${part.stock} ${part.unit}`);
                    setLoading(false);
                    return;
                }

                await api.post(`/jobcards/${jobCardId}/add_part/`, {
                    part: part.id,
                    part_name: part.name,
                    quantity: quantity,
                    price: parseFloat(part.selling_price),
                    cost_price: parseFloat(part.cost_price)
                });
            }

            setShowAddModal(false);
            resetForm();
            onUpdate();
        } catch (error) {
            console.error('Error adding part:', error);
            showAlert('error', error.response?.data?.error || error.response?.data?.part?.[0] || 'Error adding part');
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePart = async (partId) => {
        setPartToDelete(partId);
        setShowDeleteConfirmModal(true);
    };

    const confirmDeletePart = async () => {
        if (!partToDelete) return;

        try {
            await api.delete(`/jobcards/${jobCardId}/parts/${partToDelete}/`);
            setShowDeleteConfirmModal(false);
            setPartToDelete(null);
            onUpdate();
        } catch (error) {
            console.error('Error deleting part:', error);
            showAlert('error', error.response?.data?.error || 'Error removing part');
        }
    };

    const startEditingPart = (part) => {
        // Find if this part exists in the available parts catalog
        const catalogPart = availableParts.find(availablePart =>
            availablePart.name === part.part_name ||
            availablePart.id === part.part_details?.id
        );

        setEditPartData({
            quantity: part.quantity,
            price: catalogPart ? catalogPart.selling_price : part.price,
            part_name: catalogPart ? catalogPart.name : part.part_name
        });
        setEditingPart(part.id);
        setShowEditModal(true);
    };

    const cancelEditing = () => {
        setEditingPart(null);
        setShowEditModal(false);
        setEditPartData({
            quantity: 1,
            price: '',
            part_name: ''
        });
    };

    const updatePart = async (partId) => {
        try {
            // Find if the selected part name matches a catalog part
            const selectedCatalogPart = availableParts.find(part => part.name === editPartData.part_name);

            // Use catalog price if available, otherwise use the manually entered price
            const finalPrice = selectedCatalogPart ? parseFloat(selectedCatalogPart.selling_price) : parseFloat(editPartData.price);

            let updateData = {
                quantity: parseInt(editPartData.quantity),
                price: finalPrice,
                part_name: editPartData.part_name
            };

            await api.patch(`/jobcards/${jobCardId}/parts/${partId}/`, updateData);
            setEditingPart(null);
            setShowEditModal(false);
            onUpdate();
        } catch (error) {
            console.error('Error updating part:', error);
            showAlert('error', error.response?.data?.error || 'Error updating part');
        }
    };

    const resetForm = () => {
        setSelectedPart('');
        setQuantity(1);
        setCustomMode(false);
        setCustomPartData({
            part_name: '',
            quantity: 1,
            price: '',
            cost_price: ''
        });
        setSearchTerm('');
        setIsDropdownOpen(false);
    };

    const resetNewPartForm = () => {
        setNewPartData({
            name: '',
            sku: '',
            category: 'spare',
            description: '',
            cost_price: '',
            selling_price: '',
            stock: 0,
            min_stock_level: 5,
            unit: 'pieces',
            gst_rate: 18.00,
            hsn_code: '',
            gst_applicable: true,
            is_global: true,
            branch: '',
            stock_tracking_mode: 'global',
            is_active: true
        });
    };

    const handleAddNewPart = async (e) => {
        e.preventDefault();
        console.log('🆕 [JobCardPartsPanel] Adding new part to catalog...');
        console.log('New Part Data:', newPartData);
        console.log('is_global:', newPartData.is_global);
        console.log('branch:', newPartData.branch);
        console.log('Available branches:', branches);

        setLoading(true);
        try {
            console.log('📤 Sending POST request to /jobcards/parts/');
            const response = await api.post('/jobcards/parts/', newPartData);
            console.log('✅ Part created successfully:', response.data);

            setShowAddNewPartModal(false);
            resetNewPartForm();
            fetchAvailableParts();

            // Optionally add the newly created part to the job card
            const newPart = response.data;
            await api.post(`/jobcards/job-cards/${jobCardId}/parts/`, {
                part: newPart.id,
                quantity: 1,
                price: newPart.selling_price,
                cost_price: newPart.cost_price
            });

            onUpdate();
        } catch (error) {
            console.error('❌ [JobCardPartsPanel] Error adding new part:', error);
            console.error('Error response:', error.response?.data);
            alert(error.response?.data?.detail || 'Error adding part to catalog');
        } finally {
            setLoading(false);
        }
    };

    // Filter parts based on search term
    const getFilteredParts = () => {
        if (!searchTerm.trim()) {
            return availableParts;
        }

        const lowerSearch = searchTerm.toLowerCase();
        return availableParts.filter(part =>
            part.name.toLowerCase().includes(lowerSearch) ||
            part.sku.toLowerCase().includes(lowerSearch)
        );
    };

    const getSelectedPartDetails = () => {
        if (!selectedPart) return null;
        return availableParts.find(p => p.id === parseInt(selectedPart));
    };

    const selectedPartDetails = getSelectedPartDetails();

    const defaultParts = parts?.filter(p => p.is_service_default) || [];
    const additionalParts = parts?.filter(p => !p.is_service_default) || [];
    const totalPartsValue = additionalParts.reduce((sum, part) => sum + parseFloat(part.total_price || 0), 0);

    return (
        <div className="space-y-4">
            {/* Alert Component */}
            {alert.show && (
                <Alert
                    type={alert.type}
                    message={alert.message}
                    onClose={() => setAlert({ show: false, type: '', message: '' })}
                />
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Parts Used</p>
                    <p className="text-2xl font-bold text-blue-600">{parts?.length || 0}</p>
                    {defaultParts.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">{defaultParts.length} included · {additionalParts.length} additional</p>
                    )}
                </div>

                <div className="bg-teal-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Included in Service</p>
                    <p className="text-2xl font-bold text-teal-600">{defaultParts.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Cost ₹0.00 on bill</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Billable Value</p>
                    <p className="text-2xl font-bold text-green-600">₹{totalPartsValue.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">Additional parts only</p>
                </div>
            </div>

            {/* Add Part Button */}
            <div className="flex justify-end">
                <Button onClick={() => setShowAddModal(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Part
                </Button>
            </div>

            {/* Parts List */}
            {parts && parts.length > 0 ? (
                <div className="space-y-3">
                    {parts.map((part) => (
                        <div key={part.id} className={`border rounded-lg p-4 hover:bg-gray-50 ${part.is_service_default
                            ? 'border-teal-200 bg-teal-50/30'
                            : 'border-gray-200'
                            }`}>
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    {editingPart === part.id ? (
                                        // Edit mode
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Part Name</label>
                                                <Select
                                                    value={editPartData.part_name}
                                                    onChange={(e) => {
                                                        const selectedPartName = e.target.value;
                                                        setEditPartData(prevData => {
                                                            // Find the selected catalog part
                                                            const selectedCatalogPart = availableParts.find(part => part.name === selectedPartName);
                                                            // If it's a catalog part, update the price to match the catalog price
                                                            const newPrice = selectedCatalogPart ? selectedCatalogPart.selling_price : prevData.price;
                                                            return {
                                                                ...prevData,
                                                                part_name: selectedPartName,
                                                                price: newPrice
                                                            };
                                                        });
                                                    }}
                                                    className="mt-1"
                                                >
                                                    <option value="">Select a part...</option>
                                                    {availableParts.map(part => (
                                                        <option key={part.id} value={part.name}>
                                                            {part.name} ({part.sku})
                                                        </option>
                                                    ))}
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Quantity</label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={editPartData.quantity}
                                                        onChange={(e) => setEditPartData({ ...editPartData, quantity: parseInt(e.target.value) || 1 })}
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Price (₹)</label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={editPartData.price}
                                                        onChange={(e) => setEditPartData({ ...editPartData, price: e.target.value })}
                                                        className="mt-1"
                                                    />
                                                </div>
                                            </div>

                                            {/* Calculated Total Price */}
                                            <div className="bg-green-50 p-3 rounded-lg">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Calculated Total:</span>
                                                    <span className="font-semibold text-green-600">₹{(parseFloat(editPartData.price || 0) * parseInt(editPartData.quantity || 1)).toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => updatePart(part.id)}
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    <Check className="h-4 w-4 mr-1" />
                                                    Save
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={cancelEditing}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        // Display mode
                                        <>
                                            <div className="flex items-center gap-2">
                                                <Package className={`h-5 w-5 ${part.is_service_default ? 'text-teal-500' : 'text-gray-400'}`} />
                                                <h4 className="font-semibold text-gray-900">{part.part_name}</h4>
                                                {part.is_service_default ? (
                                                    <Badge variant="default" className="text-xs bg-teal-100 text-teal-700 border-teal-200">Included in Service</Badge>
                                                ) : part.part_details ? (
                                                    <Badge variant="info" className="text-xs">Additional</Badge>
                                                ) : null}
                                            </div>

                                            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <p className="text-gray-500">Quantity</p>
                                                    <p className="font-medium">{part.quantity} {part.part_details?.unit || 'pcs'}</p>
                                                </div>

                                                <div>
                                                    <p className="text-gray-500">Unit Price</p>
                                                    {part.is_service_default ? (
                                                        <p className="font-medium">
                                                            <span className="text-teal-600">₹0.00</span>
                                                            <span className="text-xs text-gray-400 line-through ml-1">₹{parseFloat(part.price).toFixed(2)}</span>
                                                        </p>
                                                    ) : (
                                                        <p className="font-medium">₹{parseFloat(part.price).toFixed(2)}</p>
                                                    )}
                                                </div>

                                                <div>
                                                    <p className="text-gray-500">Bill Amount</p>
                                                    {part.is_service_default ? (
                                                        <p className="font-medium text-teal-600">₹0.00</p>
                                                    ) : (
                                                        <p className="font-medium text-green-600">₹{parseFloat(part.total_price).toFixed(2)}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => startEditingPart(part)}
                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeletePart(part.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No parts added yet</p>
                    <p className="text-sm text-gray-500 mt-1">Click "Add Part" to get started</p>
                </div>
            )}

            {/* Add Part Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => { setShowAddModal(false); resetForm(); }}
                title="Add Part to Job Card"
            >
                <form onSubmit={handleAddPart} className="space-y-4">
                    {/* Mode Toggle */}
                    <div className="flex gap-2 p-2 bg-gray-100 rounded-lg">
                        <button
                            type="button"
                            className={`flex-1 py-2 px-4 rounded ${!customMode ? 'bg-white shadow-sm font-medium' : 'text-gray-600'}`}
                            onClick={() => setCustomMode(false)}
                        >
                            From Catalog
                        </button>
                        <button
                            type="button"
                            className={`flex-1 py-2 px-4 rounded ${customMode ? 'bg-white shadow-sm font-medium' : 'text-gray-600'}`}
                            onClick={() => {
                                setShowAddModal(false);
                                setShowAddNewPartModal(true);
                            }}
                        >
                            Custom Part
                        </button>
                    </div>

                    {!customMode ? (
                        <>
                            {/* Catalog Part Selection - Custom Searchable Dropdown */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Select Part
                                </label>

                                <div className="relative" ref={dropdownRef}>
                                    {/* Search Input */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Search by name or SKU..."
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                setIsDropdownOpen(true);
                                            }}
                                            onFocus={() => setIsDropdownOpen(true)}
                                        />
                                        {searchTerm && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchTerm('');
                                                    setSelectedPart('');
                                                    searchInputRef.current?.focus();
                                                }}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Dropdown List */}
                                    {isDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                            {getFilteredParts().length > 0 ? (
                                                getFilteredParts().map(part => {
                                                    const isSelected = selectedPart === part.id.toString();
                                                    const isOutOfStock = part.stock === 0;

                                                    return (
                                                        <div
                                                            key={part.id}
                                                            onClick={() => {
                                                                if (!isOutOfStock) {
                                                                    setSelectedPart(part.id.toString());
                                                                    setSearchTerm(part.name);
                                                                    setIsDropdownOpen(false);
                                                                }
                                                            }}
                                                            className={`px-4 py-3 cursor-pointer transition-colors ${isOutOfStock
                                                                ? 'bg-gray-100 cursor-not-allowed opacity-60'
                                                                : isSelected
                                                                    ? 'bg-blue-50 border-l-4 border-blue-500'
                                                                    : 'hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <p className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                                                                            {part.name}
                                                                        </p>
                                                                        {isSelected && (
                                                                            <Check className="h-4 w-4 text-blue-600" />
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm text-gray-500 mt-0.5">
                                                                        SKU: {part.sku}
                                                                    </p>
                                                                    <div className="flex items-center gap-3 mt-1 text-sm">
                                                                        <span className={`font-medium ${isOutOfStock
                                                                            ? 'text-red-600'
                                                                            : part.stock < 10
                                                                                ? 'text-orange-600'
                                                                                : 'text-green-600'
                                                                            }`}>
                                                                            Stock: {part.stock} {part.unit}
                                                                            {isOutOfStock && ' - OUT OF STOCK'}
                                                                        </span>
                                                                        <span className="text-gray-600">
                                                                            ₹{part.selling_price}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="px-4 py-8 text-center text-gray-500">
                                                    <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                                    <p className="text-sm">No parts found</p>
                                                    {searchTerm && (
                                                        <p className="text-xs mt-1">Try a different search term</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Hidden input for form validation */}
                                <input
                                    type="hidden"
                                    value={selectedPart}
                                    required
                                />
                            </div>

                            {selectedPartDetails && (
                                <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Available Stock:</span>
                                        <span className="font-semibold">{selectedPartDetails.stock} {selectedPartDetails.unit}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Selling Price:</span>
                                        <span className="font-semibold">₹{selectedPartDetails.selling_price}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Profit Margin:</span>
                                        <span className="font-semibold text-green-600">
                                            ₹{selectedPartDetails.profit_margin} ({selectedPartDetails.profit_percentage}%)
                                        </span>
                                    </div>
                                </div>
                            )}

                            <Input
                                label="Quantity"
                                type="number"
                                min="1"
                                max={selectedPartDetails?.stock || 999}
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                required
                            />

                            {selectedPartDetails && quantity > 0 && (
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-700">
                                        Total: <span className="font-bold text-green-600">₹{(parseFloat(selectedPartDetails.selling_price) * quantity).toFixed(2)}</span>
                                    </p>
                                    <p className="text-sm text-gray-700 mt-1">
                                        Profit: <span className="font-bold text-purple-600">₹{(parseFloat(selectedPartDetails.profit_margin) * quantity).toFixed(2)}</span>
                                    </p>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Custom Part Entry */}
                            <Input
                                label="Part Name"
                                value={customPartData.part_name}
                                onChange={(e) => setCustomPartData({ ...customPartData, part_name: e.target.value })}
                                required
                                placeholder="Enter part name"
                            />

                            <Input
                                label="Quantity"
                                type="number"
                                min="1"
                                value={customPartData.quantity}
                                onChange={(e) => setCustomPartData({ ...customPartData, quantity: parseInt(e.target.value) || 1 })}
                                required
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Cost Price (₹)"
                                    type="number"
                                    step="0.01"
                                    value={customPartData.cost_price}
                                    onChange={(e) => setCustomPartData({ ...customPartData, cost_price: e.target.value })}
                                    placeholder="0.00"
                                />

                                <Input
                                    label="Selling Price (₹)"
                                    type="number"
                                    step="0.01"
                                    value={customPartData.price}
                                    onChange={(e) => setCustomPartData({ ...customPartData, price: e.target.value })}
                                    required
                                    placeholder="0.00"
                                />
                            </div>

                            {customPartData.price && customPartData.quantity > 0 && (
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-700">
                                        Total: <span className="font-bold text-green-600">₹{(parseFloat(customPartData.price || 0) * customPartData.quantity).toFixed(2)}</span>
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); resetForm(); }}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={loading}>
                            {loading ? 'Adding...' : 'Add Part'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Part Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={cancelEditing}
                title="Edit Part"
            >
                <form onSubmit={(e) => { e.preventDefault(); updatePart(editingPart); }} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700">Part Name</label>
                        <Select
                            value={editPartData.part_name}
                            onChange={(e) => {
                                const selectedPartName = e.target.value;
                                setEditPartData(prevData => {
                                    // Find the selected catalog part
                                    const selectedCatalogPart = availableParts.find(part => part.name === selectedPartName);
                                    // If it's a catalog part, update the price to match the catalog price
                                    const newPrice = selectedCatalogPart ? selectedCatalogPart.selling_price : prevData.price;
                                    return {
                                        ...prevData,
                                        part_name: selectedPartName,
                                        price: newPrice
                                    };
                                });
                            }}
                            className="mt-1"
                        >
                            <option value="">Select a part...</option>
                            {availableParts.map(part => (
                                <option key={part.id} value={part.name}>
                                    {part.name} ({part.sku})
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Quantity"
                            type="number"
                            min="1"
                            value={editPartData.quantity}
                            onChange={(e) => setEditPartData({ ...editPartData, quantity: parseInt(e.target.value) || 1 })}
                            required
                        />
                        <Input
                            label="Price (₹)"
                            type="number"
                            step="0.01"
                            min="0"
                            value={editPartData.price}
                            onChange={(e) => setEditPartData({ ...editPartData, price: e.target.value })}
                            required
                        />
                    </div>

                    {/* Calculated Total Price */}
                    <div className="bg-green-50 p-3 rounded-lg">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total:</span>
                            <span className="font-semibold text-green-600">₹{(parseFloat(editPartData.price || 0) * parseInt(editPartData.quantity || 1)).toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={cancelEditing}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            Update Part
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteConfirmModal}
                onClose={() => {
                    setShowDeleteConfirmModal(false);
                    setPartToDelete(null);
                }}
                title="Confirm Delete"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                            <Trash2 className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900">Remove Part</h3>
                            <p className="mt-2 text-sm text-gray-500">
                                Are you sure you want to remove this part from the job card? This action cannot be undone.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setShowDeleteConfirmModal(false);
                                setPartToDelete(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={confirmDeletePart}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Part
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Add New Part to Catalog Modal */}
            <Modal
                isOpen={showAddNewPartModal}
                onClose={() => { setShowAddNewPartModal(false); resetNewPartForm(); }}
                title="Add New Part"
            >
                <form onSubmit={handleAddNewPart} className="space-y-4">
                    {/* Mode Toggle */}
                    <div className="flex gap-2 p-2 bg-gray-100 rounded-lg">
                        <button
                            type="button"
                            className="flex-1 py-2 px-4 rounded text-gray-600 hover:bg-gray-200"
                            onClick={() => {
                                setShowAddNewPartModal(false);
                                setShowAddModal(true);
                                setCustomMode(false);
                            }}
                        >
                            From Catalog
                        </button>
                        <button
                            type="button"
                            className="flex-1 py-2 px-4 rounded bg-white shadow-sm font-medium"
                        >
                            Custom Part
                        </button>
                    </div>

                    {/* Part Name */}
                    <Input
                        label="Part Name"
                        value={newPartData.name}
                        onChange={(e) => setNewPartData({ ...newPartData, name: e.target.value })}
                        required
                        placeholder="Enter part name"
                    />

                    {/* SKU */}
                    <Input
                        label="SKU"
                        value={newPartData.sku}
                        onChange={(e) => setNewPartData({ ...newPartData, sku: e.target.value })}
                        required
                        placeholder="Enter SKU"
                    />

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <Select
                            value={newPartData.category}
                            onChange={(e) => setNewPartData({ ...newPartData, category: e.target.value })}
                            required
                        >
                            <option value="spare">Spare Part</option>
                            <option value="consumable">Consumable</option>
                            <option value="material">Material</option>
                            <option value="chemical">Chemical/Product</option>
                            <option value="tool">Tool/Equipment</option>
                        </Select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows="3"
                            value={newPartData.description}
                            onChange={(e) => setNewPartData({ ...newPartData, description: e.target.value })}
                            placeholder="Enter part description"
                        />
                    </div>

                    {/* Cost Price and Selling Price */}
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Cost Price (₹)"
                            type="number"
                            step="0.01"
                            min="0"
                            value={newPartData.cost_price}
                            onChange={(e) => setNewPartData({ ...newPartData, cost_price: e.target.value })}
                            required
                            placeholder="0.00"
                        />
                        <Input
                            label="Selling Price (₹)"
                            type="number"
                            step="0.01"
                            min="0"
                            value={newPartData.selling_price}
                            onChange={(e) => setNewPartData({ ...newPartData, selling_price: e.target.value })}
                            required
                            placeholder="0.00"
                        />
                    </div>

                    {/* Initial Stock and Min Stock Level */}
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Initial Stock"
                            type="number"
                            min="0"
                            value={newPartData.stock}
                            onChange={(e) => setNewPartData({ ...newPartData, stock: parseInt(e.target.value) || 0 })}
                            required
                        />
                        <Input
                            label="Min Stock Level"
                            type="number"
                            min="0"
                            value={newPartData.min_stock_level}
                            onChange={(e) => setNewPartData({ ...newPartData, min_stock_level: parseInt(e.target.value) || 0 })}
                            required
                        />
                    </div>

                    {/* Unit */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                        <Select
                            value={newPartData.unit}
                            onChange={(e) => setNewPartData({ ...newPartData, unit: e.target.value })}
                            required
                        >
                            <option value="pieces">Pieces</option>
                            <option value="liters">Liters</option>
                            <option value="kg">Kilograms</option>
                            <option value="sets">Sets</option>
                            <option value="meters">Meters</option>
                            <option value="bottles">Bottles</option>
                        </Select>
                    </div>

                    {/* GST Rate and HSN Code */}
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="GST Rate (%)"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={newPartData.gst_rate}
                            onChange={(e) => setNewPartData({ ...newPartData, gst_rate: parseFloat(e.target.value) || 0 })}
                            required
                        />
                        <Input
                            label="HSN Code"
                            value={newPartData.hsn_code}
                            onChange={(e) => setNewPartData({ ...newPartData, hsn_code: e.target.value })}
                            placeholder="Enter HSN code"
                        />
                    </div>

                    {/* Checkboxes */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={newPartData.gst_applicable}
                                onChange={(e) => setNewPartData({ ...newPartData, gst_applicable: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">GST Applicable</span>
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={newPartData.is_global}
                                onChange={(e) => setNewPartData({ ...newPartData, is_global: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Global (All Branches)</span>
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={newPartData.is_active}
                                onChange={(e) => setNewPartData({ ...newPartData, is_active: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Active</span>
                        </label>
                    </div>

                    {/* Stock Tracking Mode */}
                    {/* <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stock Tracking Mode</label>
                        <Select
                            value={newPartData.stock_tracking_mode}
                            onChange={(e) => setNewPartData({ ...newPartData, stock_tracking_mode: e.target.value })}
                            required
                        >
                            <option value="global">Global - Single stock pool for all branches</option>
                            <option value="branch">Branch - Track stock separately per branch</option>
                        </Select>
                    </div> */}

                    {/* Branch Selection - Only show when is_global is false */}
                    {!newPartData.is_global && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                            <Select
                                value={newPartData.branch}
                                onChange={(e) => setNewPartData({ ...newPartData, branch: e.target.value })}
                                required={!newPartData.is_global}
                            >
                                <option value="">Select Branch...</option>
                                {branches.map(branch => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name} {branch.code ? `(${branch.code})` : ''}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    )}

                    {/* Profit Margin Preview */}
                    {newPartData.cost_price && newPartData.selling_price && (
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-700">
                                Profit Margin: <span className="font-bold text-purple-600">
                                    ₹{(parseFloat(newPartData.selling_price) - parseFloat(newPartData.cost_price)).toFixed(2)}
                                    {' '}({((parseFloat(newPartData.selling_price) - parseFloat(newPartData.cost_price)) / parseFloat(newPartData.cost_price) * 100).toFixed(2)}%)
                                </span>
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => { setShowAddNewPartModal(false); resetNewPartForm(); }}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={loading}>
                            {loading ? 'Adding...' : 'Add Part'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default JobCardPartsPanel;
