import React from 'react';
import { Button, Input, Modal, Textarea } from '@/components/ui';
import { Tag, Car, Clock, Building2 } from 'lucide-react';

const ServicePackageModal = ({
    isOpen,
    onClose,
    handleCreateService,
    serviceForm,
    setServiceForm,
    serviceCategories,
    isSuperAdmin,
    branches,
    getCurrentBranchId
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add Service Package"
            footer={
                <>
                    <Button
                        variant="outline"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleCreateService}>Create</Button>
                </>
            }
        >
            <form
                onSubmit={handleCreateService}
                className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
            >
                <Input
                    label="Service Name"
                    value={serviceForm.name}
                    onChange={(e) =>
                        setServiceForm({ ...serviceForm, name: e.target.value })
                    }
                    required
                />

                {/* Service Category */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Tag size={14} className="inline mr-1" />
                        Service Category
                    </label>
                    <select
                        value={serviceForm.category}
                        onChange={(e) =>
                            setServiceForm({ ...serviceForm, category: e.target.value })
                        }
                        className="input w-full"
                        required
                    >
                        {serviceCategories.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                                {cat.label}
                            </option>
                        ))}
                    </select>
                </div>

                <Textarea
                    label="Description"
                    value={serviceForm.description}
                    onChange={(e) =>
                        setServiceForm({ ...serviceForm, description: e.target.value })
                    }
                    required
                    rows={3}
                />

                {/* Vehicle-Type Pricing (Always Required) */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Car size={16} className="text-blue-600" />
                        Pricing by Vehicle Type
                    </h4>
                    <p className="text-xs text-gray-600 mb-3">
                        Set prices for each vehicle type:
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                🚗 Hatchback
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="₹"
                                value={serviceForm.hatchback_price}
                                onChange={(e) =>
                                    setServiceForm({
                                        ...serviceForm,
                                        hatchback_price: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                🚙 Sedan
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="₹"
                                value={serviceForm.sedan_price}
                                onChange={(e) =>
                                    setServiceForm({
                                        ...serviceForm,
                                        sedan_price: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                🚐 SUV
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="₹"
                                value={serviceForm.suv_price}
                                onChange={(e) =>
                                    setServiceForm({
                                        ...serviceForm,
                                        suv_price: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                🏍️ Bike
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="₹"
                                value={serviceForm.bike_price}
                                onChange={(e) =>
                                    setServiceForm({
                                        ...serviceForm,
                                        bike_price: e.target.value,
                                    })
                                }
                            />
                        </div>
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
                                    setServiceForm({
                                        ...serviceForm,
                                        gst_applicable: e.target.checked,
                                    })
                                }
                                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                            />
                            <label
                                htmlFor="gst_applicable"
                                className="text-sm font-medium text-gray-700"
                            >
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
                                        setServiceForm({
                                            ...serviceForm,
                                            gst_rate: e.target.value,
                                        })
                                    }
                                    className="input w-20 text-center"
                                />
                                <span className="text-sm text-gray-600">%</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Duration */}
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Duration (minutes)"
                        type="number"
                        step="5"
                        value={serviceForm.duration}
                        onChange={(e) =>
                            setServiceForm({ ...serviceForm, duration: e.target.value })
                        }
                        required
                        icon={<Clock size={16} />}
                    />
                    <Input
                        label="Max Duration (optional)"
                        type="number"
                        step="5"
                        placeholder="e.g., 50"
                        value={serviceForm.duration_max}
                        onChange={(e) =>
                            setServiceForm({ ...serviceForm, duration_max: e.target.value })
                        }
                        helperText="For range like 40-50 mins"
                    />
                </div>

                {/* Branch Info - Branch Admin */}
                {!isSuperAdmin && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800 flex items-center gap-1">
                            <Building2 size={14} />
                            <strong>Branch:</strong>{" "}
                            {branches.find((b) => b.id === getCurrentBranchId())?.name ||
                                "Current Branch"}
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
    );
};

export default ServicePackageModal;
