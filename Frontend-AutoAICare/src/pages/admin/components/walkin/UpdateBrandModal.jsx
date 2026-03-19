import { Button, Input, Modal } from '@/components/ui';

const UpdateBrandModal = ({
    isOpen,
    onClose,
    brandToEdit,
    setBrandToEdit,
    handleUpdateBrand
}) => {
    const handleSave = () => {
        handleUpdateBrand();
    };

    const handleInputChange = (field, value) => {
        setBrandToEdit(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Update Brand"
        >
            <div className="space-y-4">
                <Input
                    label="Brand Name"
                    placeholder="Enter brand name"
                    value={brandToEdit?.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                />

                {/* Vehicle Type Selection */}
                <div>
                    <label className="label">Vehicle Type *</label>
                    <div className="grid grid-cols-4 gap-2">
                        {["car", "bike"].map((type) => (
                            <label
                                key={type}
                                className={`flex flex-col items-center p-2 border-2 rounded-lg cursor-pointer transition-all ${
                                    brandToEdit?.vehicle_type === type
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 hover:border-gray-300"
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="brandVehicleType"
                                    value={type}
                                    checked={brandToEdit?.vehicle_type === type}
                                    onChange={(e) => handleInputChange('vehicle_type', e.target.value)}
                                    className="sr-only"
                                />
                                <span className="text-lg">
                                    {type === "car" && "🚗"}
                                    {type === "bike" && "🏍️"}
                                </span>
                                <span className="text-xs font-medium capitalize mt-1">
                                    {type}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="brand_is_active"
                        checked={brandToEdit?.is_active || false}
                        onChange={(e) => handleInputChange('is_active', e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <label htmlFor="brand_is_active" className="text-sm text-gray-700">
                        Active
                    </label>
                </div>

                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Update Brand
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default UpdateBrandModal;