import { Badge, Button, Card, Modal, Table } from '@/components/ui';
import api from '@/utils/api';
import { AlertCircle, CheckCircle, Package, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

const ServicePartsMapping = ({ serviceId, serviceName, isOpen, onClose }) => {
    const [parts, setParts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedVehicleType, setSelectedVehicleType] = useState('sedan');
    const [stockStatus, setStockStatus] = useState(null);

    useEffect(() => {
        if (isOpen && serviceId) {
            fetchServiceParts();
            checkStockAvailability();
        }
    }, [isOpen, serviceId, selectedVehicleType]);

    const fetchServiceParts = async () => {
        try {
            setLoading(true);
            const response = await api.get('/services/package-parts/', {
                params: { package: serviceId }
            });
            setParts(response.data.results || response.data || []);
        } catch (error) {
            console.error('Error fetching service parts:', error);
            setParts([]);
        } finally {
            setLoading(false);
        }
    };

    const checkStockAvailability = async () => {
        try {
            const response = await api.post('/services/package-parts/check_stock_for_service/', {
                package_id: serviceId,
                vehicle_type: selectedVehicleType,
                quantity: 1
            });
            setStockStatus(response.data);
        } catch (error) {
            console.error('Error checking stock availability:', error);
            setStockStatus(null);
        }
    };

    const getStockBadge = (part) => {
        if (!part.current_stock || part.current_stock === 0) {
            return <Badge variant="destructive" className="flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Out of Stock
            </Badge>;
        } else if (part.current_stock <= (part.part_details?.min_stock_level || 5)) {
            return <Badge variant="warning" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Low Stock
            </Badge>;
        } else {
            return <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                In Stock
            </Badge>;
        }
    };

    const getQuantityForVehicleType = (part) => {
        const vehicleQuantities = {
            hatchback: part.hatchback_quantity,
            sedan: part.sedan_quantity,
            suv: part.suv_quantity,
            bike: part.bike_quantity
        };

        return vehicleQuantities[selectedVehicleType] || part.quantity || 0;
    };

    const vehicleTypes = [
        { value: 'hatchback', label: 'Hatchback' },
        { value: 'sedan', label: 'Sedan' },
        { value: 'suv', label: 'SUV' },
        { value: 'bike', label: 'Bike' }
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Required Parts - ${serviceName}`}
            size="xl"
        >
            <div className="space-y-4 font-inter">
                {/* Vehicle Type Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                    <label className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest">
                        Vehicle Type
                    </label>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                        {vehicleTypes.map(type => (
                            <button
                                key={type.value}
                                onClick={() => setSelectedVehicleType(type.value)}
                                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-sm ${selectedVehicleType === type.value
                                    ? 'bg-blue-600 text-white shadow-blue-200'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
                                    }`}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stock Status Summary */}
                {stockStatus && (
                    <div className={`p-4 rounded-2xl border ${stockStatus.has_stock ? 'bg-emerald-50 border-emerald-100 shadow-emerald-50' : 'bg-red-50 border-red-100 shadow-red-50'} shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-top-2`}>
                        <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-xl ${stockStatus.has_stock ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                {stockStatus.has_stock ? (
                                    <CheckCircle className="h-6 w-6" />
                                ) : (
                                    <XCircle className="h-6 w-6" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className={`text-sm font-black ${stockStatus.has_stock ? 'text-emerald-900' : 'text-red-900'}`}>
                                    {stockStatus.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5 font-medium">
                                    {stockStatus.has_stock
                                        ? 'All required parts are currently available in inventory.'
                                        : 'Some parts are out of stock. This service cannot be performed until restocked.'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Parts List */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-blue-600 border-t-transparent shadow-sm"></div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Checking Inventory...</p>
                    </div>
                ) : parts.length === 0 ? (
                    <div className="p-8 text-center bg-white border border-dashed border-gray-200 rounded-2xl">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="text-gray-900 font-black mb-1">No parts configured</p>
                        <p className="text-xs text-gray-500 mb-6 max-w-xs mx-auto">
                            Configure parts in the admin panel to enable automatic inventory management.
                        </p>
                        <a
                            href={`/admin/services/servicepackagepart/?package__id__exact=${serviceId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                        >
                            <Package className="h-4 w-4" />
                            Configure Parts
                        </a>
                    </div>
                ) : (
                    <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Part Details</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">SKU</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qty</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Stock</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {parts.map((part) => {
                                        const requiredQty = getQuantityForVehicleType(part);
                                        return (
                                            <tr key={part.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                                            <Package size={14} className="text-gray-400" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-gray-900 truncate">{part.part_name}</p>
                                                            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-tighter">{part.part_details?.category || 'General'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                                        {part.part_details?.sku || part.part_sku || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-sm font-black text-gray-900">{requiredQty}</span>
                                                    <span className="ml-1 text-[10px] font-bold text-gray-400">{part.part_unit}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className={`text-sm font-black ${part.current_stock === 0 ? 'text-red-600' :
                                                            part.current_stock <= (part.part_details?.min_stock_level || 5) ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                            {part.current_stock}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase">Avail</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {getStockBadge(part)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-gray-50">
                            {parts.map((part) => {
                                const requiredQty = getQuantityForVehicleType(part);
                                return (
                                    <div key={part.id} className="p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                                                    <Package size={18} className="text-gray-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-gray-900 leading-tight">{part.part_name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{part.part_details?.category || 'General'}</span>
                                                        <span className="text-[9px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">#{part.part_details?.sku || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {getStockBadge(part)}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-2.5 rounded-xl bg-gray-50/50 border border-gray-100">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Required</p>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-sm font-black text-gray-900">{requiredQty}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">{part.part_unit}</span>
                                                </div>
                                            </div>
                                            <div className={`p-2.5 rounded-xl border ${part.current_stock === 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Available</p>
                                                <div className="flex items-baseline gap-1">
                                                    <span className={`text-sm font-black ${part.current_stock === 0 ? 'text-red-600' : 'text-emerald-600'}`}>{part.current_stock}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">{part.part_unit}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-100 mt-2">
                    <p className="text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-widest order-2 sm:order-1">
                        Showing <span className="text-gray-900 px-1">{parts.length}</span> items for <span className="text-blue-600 px-1 font-black bg-blue-50 rounded-lg">{selectedVehicleType}</span>
                    </p>
                    <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
                        {parts.length > 0 && (
                            <a
                                href={`/admin/services/servicepackagepart/?package__id__exact=${serviceId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-xs md:text-sm font-black rounded-xl hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                            >
                                <Package className="h-4 w-4 text-gray-400" />
                                Edit Parts
                            </a>
                        )}
                        <Button
                            variant="primary"
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs md:text-sm shadow-lg shadow-blue-100"
                        >
                            Got it
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ServicePartsMapping;
