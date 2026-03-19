import { Button, Input, Modal, Select } from '@/components/ui';

const UpdateModelModal = ({
    isOpen,
    onClose,
    modelToEdit,
    setModelToEdit,
    handleUpdateModel,
    vehicleBrands
}) => {
    const handleSave = () => {
        handleUpdateModel();
    };

    const handleInputChange = (field, value) => {
        setModelToEdit(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Update Model"
        >
            <div className="space-y-4">
                <Select
                    label="Brand"
                    value={modelToEdit?.brand || ''}
                    onChange={(e) => handleInputChange('brand', parseInt(e.target.value))}
                    options={[
                        { value: "", label: "Select a brand" },
                        ...vehicleBrands.map((brand) => ({
                            value: brand.id,
                            label: brand.name,
                        })),
                    ]}
                    required
                />
                <Input
                    label="Model Name"
                    placeholder="Enter model name"
                    value={modelToEdit?.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                />

                {/* Vehicle Type Selection */}
                <div>
                    <label className="label">Vehicle Type *</label>
                    <div className="grid grid-cols-4 gap-2">
                        {["hatchback", "sedan", "suv", "bike"].map((type) => (
                            <label
                                key={type}
                                className={`flex flex-col items-center p-2 border-2 rounded-lg cursor-pointer transition-all ${
                                    modelToEdit?.vehicle_type === type
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 hover:border-gray-300"
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="modelVehicleType"
                                    value={type}
                                    checked={modelToEdit?.vehicle_type === type}
                                    onChange={(e) => handleInputChange('vehicle_type', e.target.value)}
                                    className="sr-only"
                                />
                                <span className="text-lg">
                                    {type === "hatchback" && "🚗"}
                                    {type === "sedan" && "🚙"}
                                    {type === "suv" && "🚐"}
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
                        id="model_is_active"
                        checked={modelToEdit?.is_active || false}
                        onChange={(e) => handleInputChange('is_active', e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <label htmlFor="model_is_active" className="text-sm text-gray-700">
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
                        Update Model
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default UpdateModelModal;