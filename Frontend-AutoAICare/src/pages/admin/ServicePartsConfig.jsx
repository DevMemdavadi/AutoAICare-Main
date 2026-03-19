import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Input, Badge } from '@/components/ui';
import Alert from '@/components/ui/Alert';
import { ArrowLeft, Search, Plus, Trash2, ChevronDown, ChevronUp, Package, AlertCircle } from 'lucide-react';
import api from '@/utils/api';

const ServicePartsConfig = () => {
    const { serviceId } = useParams();
    const navigate = useNavigate();

    const [service, setService] = useState(null);
    const [availableParts, setAvailableParts] = useState([]);
    const [selectedParts, setSelectedParts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [expandedPart, setExpandedPart] = useState(null);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    useEffect(() => {
        fetchServiceAndParts();
    }, [serviceId]);

    const fetchServiceAndParts = async () => {
        try {
            setLoading(true);

            // Fetch service details
            const serviceRes = await api.get(`/services/packages/${serviceId}/`);
            setService(serviceRes.data);

            // Fetch all available parts
            const partsRes = await api.get('/jobcards/parts/', {
                params: { page_size: 1000 }
            });
            setAvailableParts(partsRes.data.results || partsRes.data || []);

            // Fetch currently selected parts for this service
            const selectedRes = await api.get('/services/package-parts/', {
                params: { package: serviceId }
            });
            setSelectedParts(selectedRes.data.results || selectedRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            setAlert({ show: true, type: 'error', message: 'Failed to load service data' });
        } finally {
            setLoading(false);
        }
    };

    const addPart = (part) => {
        // Check if part is already added
        if (selectedParts.some(sp => sp.part === part.id)) {
            setAlert({ show: true, type: 'warning', message: 'Part already added' });
            return;
        }

        setSelectedParts([...selectedParts, {
            part: part.id,
            part_name: part.name,
            part_sku: part.sku,
            part_unit: part.unit,
            current_stock: part.stock,
            quantity: 1,
            hatchback_quantity: null,
            sedan_quantity: null,
            suv_quantity: null,
            bike_quantity: null,
            is_optional: false,
            is_active: true
        }]);
    };

    const removePart = (index) => {
        setSelectedParts(selectedParts.filter((_, i) => i !== index));
    };

    const updatePart = (index, field, value) => {
        const updated = [...selectedParts];
        updated[index][field] = value;
        setSelectedParts(updated);
    };

    const saveChanges = async () => {
        try {
            setSaving(true);

            // Prepare parts data for bulk save
            const partsPayload = selectedParts.map(part => ({
                part: part.part,
                quantity: parseFloat(part.quantity) || 1,
                hatchback_quantity: part.hatchback_quantity ? parseFloat(part.hatchback_quantity) : null,
                sedan_quantity: part.sedan_quantity ? parseFloat(part.sedan_quantity) : null,
                suv_quantity: part.suv_quantity ? parseFloat(part.suv_quantity) : null,
                bike_quantity: part.bike_quantity ? parseFloat(part.bike_quantity) : null,
                is_optional: part.is_optional
            }));

            // Single bulk save API call
            const response = await api.post('/services/package-parts/bulk_save/', {
                package_id: parseInt(serviceId),
                parts: partsPayload
            });

            console.log('Bulk save response:', response.data);
            setAlert({
                show: true,
                type: 'success',
                message: `Successfully saved ${response.data.count} parts!`
            });

            setTimeout(() => {
                navigate('/admin/services');
            }, 1500);
        } catch (error) {
            console.error('Error saving parts:', error);
            const errorMessage = error.response?.data?.error || 'Failed to save parts configuration';
            setAlert({ show: true, type: 'error', message: errorMessage });
        } finally {
            setSaving(false);
        }
    };

    const filteredAvailableParts = availableParts.filter(part => {
        const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            part.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const notSelected = !selectedParts.some(sp => sp.part === part.id);
        return matchesSearch && notSelected;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                {/* Back button skeleton */}
                <div className="mb-6">
                    <div className="h-5 w-36 bg-gray-200 rounded animate-pulse mb-4" />
                    {/* Header skeleton */}
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
                        <div className="space-y-2">
                            <div className="h-7 w-72 bg-gray-200 rounded animate-pulse" />
                            <div className="h-4 w-80 bg-gray-100 rounded animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Two-panel grid skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Left panel - Available Parts */}
                    <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-5 w-36 bg-gray-200 rounded animate-pulse" />
                            <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" />
                        </div>
                        {/* Search bar skeleton */}
                        <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse mb-4" />
                        {/* Part rows */}
                        <div className="space-y-2">
                            {Array.from({ length: 7 }).map((_, i) => (
                                <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                                    <div className="space-y-1.5 flex-1">
                                        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                                        <div className="flex gap-3">
                                            <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                                            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="h-8 w-16 bg-gray-200 rounded-lg animate-pulse ml-4" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right panel - Selected Parts */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                            <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" />
                        </div>
                        {/* Empty state placeholder */}
                        <div className="flex flex-col items-center justify-center py-16 space-y-3">
                            <div className="h-12 w-12 bg-gray-100 rounded-full animate-pulse" />
                            <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                            <div className="h-3 w-40 bg-gray-100 rounded animate-pulse" />
                        </div>
                        {/* Action buttons skeleton */}
                        <div className="space-y-2 mt-4">
                            <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
                            <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Alert */}
            {alert.show && (
                <div className="fixed top-4 right-4 z-50 max-w-md">
                    <Alert
                        type={alert.type}
                        message={alert.message}
                        onClose={() => setAlert({ show: false, type: '', message: '' })}
                    />
                </div>
            )}

            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate('/admin/services')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back to Services
                </button>
                <div className="flex items-center gap-3">
                    <Package className="h-8 w-8 text-blue-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Configure Parts: {service?.name}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Select which parts are required when performing this service
                        </p>
                    </div>
                </div>
            </div>

            {/* Two-panel layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left Panel - Available Parts */}
                <Card className="lg:col-span-3 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Available Parts</h2>
                        <Badge variant="secondary">{filteredAvailableParts.length} parts</Badge>
                    </div>

                    {/* Search */}
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <Input
                                placeholder="Search parts by name or SKU..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Parts list */}
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                        {filteredAvailableParts.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">
                                    {searchTerm ? 'No parts found matching your search' : 'All parts have been added'}
                                </p>
                            </div>
                        ) : (
                            filteredAvailableParts.map(part => (
                                <div
                                    key={part.id}
                                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{part.name}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <p className="text-sm text-gray-500">SKU: {part.sku}</p>
                                            <span className="text-gray-300">•</span>
                                            <p className={`text-sm font-medium ${part.stock === 0 ? 'text-red-600' :
                                                part.stock <= (part.min_stock_level || 5) ? 'text-orange-600' :
                                                    'text-green-600'
                                                }`}>
                                                Stock: {part.stock} {part.unit}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => addPart(part)}
                                        className="ml-4"
                                    >
                                        <Plus size={16} className="mr-1" />
                                        Add
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Right Panel - Selected Parts */}
                <Card className="lg:col-span-2 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Selected Parts</h2>
                        <Badge variant="primary">{selectedParts.length} selected</Badge>
                    </div>

                    <div className="space-y-3 mb-6 max-h-[600px] overflow-y-auto pr-2">
                        {selectedParts.length === 0 ? (
                            <div className="text-center py-12">
                                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">No parts selected</p>
                                <p className="text-sm text-gray-400 mt-1">Add parts from the left panel</p>
                            </div>
                        ) : (
                            selectedParts.map((part, index) => (
                                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">{part.part_name}</p>
                                            <p className="text-xs text-gray-500">{part.part_sku}</p>
                                            {part.current_stock !== undefined && (
                                                <p className={`text-xs mt-1 ${part.current_stock === 0 ? 'text-red-600' :
                                                    part.current_stock <= 5 ? 'text-orange-600' :
                                                        'text-green-600'
                                                    }`}>
                                                    Stock: {part.current_stock} {part.part_unit}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => removePart(index)}
                                            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                                            title="Remove part"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Default quantity */}
                                    <div className="mb-3">
                                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                                            Default Quantity ({part.part_unit})
                                        </label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={part.quantity}
                                            onChange={(e) => updatePart(index, 'quantity', e.target.value)}
                                            className="w-full"
                                        />
                                    </div>

                                    {/* Vehicle quantities (collapsible) */}
                                    <button
                                        onClick={() => setExpandedPart(expandedPart === index ? null : index)}
                                        className="text-sm text-blue-600 flex items-center gap-1 hover:text-blue-800 mb-2"
                                    >
                                        {expandedPart === index ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        Vehicle-Specific Quantities
                                    </button>

                                    {expandedPart === index && (
                                        <div className="mt-2 grid grid-cols-2 gap-2 p-3 bg-white rounded border border-gray-200">
                                            <div>
                                                <label className="text-xs text-gray-600 mb-1 block">Hatchback</label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="Use default"
                                                    value={part.hatchback_quantity || ''}
                                                    onChange={(e) => updatePart(index, 'hatchback_quantity', e.target.value)}
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600 mb-1 block">Sedan</label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="Use default"
                                                    value={part.sedan_quantity || ''}
                                                    onChange={(e) => updatePart(index, 'sedan_quantity', e.target.value)}
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600 mb-1 block">SUV</label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="Use default"
                                                    value={part.suv_quantity || ''}
                                                    onChange={(e) => updatePart(index, 'suv_quantity', e.target.value)}
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600 mb-1 block">Bike</label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="Use default"
                                                    value={part.bike_quantity || ''}
                                                    onChange={(e) => updatePart(index, 'bike_quantity', e.target.value)}
                                                    className="text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Optional toggle */}
                                    <label className="flex items-center gap-2 mt-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={part.is_optional}
                                            onChange={(e) => updatePart(index, 'is_optional', e.target.checked)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">
                                            {part.is_optional ? 'Optional part' : 'Required part'}
                                        </span>
                                    </label>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-2">
                        <Button
                            onClick={saveChanges}
                            className="w-full"
                            disabled={selectedParts.length === 0 || saving}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigate('/admin/services')}
                            className="w-full"
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ServicePartsConfig;
