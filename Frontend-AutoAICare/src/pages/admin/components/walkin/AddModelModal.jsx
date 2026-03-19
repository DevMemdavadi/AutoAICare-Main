import React from 'react';
import { Button, Input, Modal, Select } from '@/components/ui';

const AddModelModal = ({
    isOpen,
    onClose,
    newModelBrand,
    setNewModelBrand,
    newModelName,
    setNewModelName,
    newModelVehicleType,
    setNewModelVehicleType,
    handleAddModel,
    vehicleBrands
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add New Model"
        >
            <div className="space-y-4">
                <Select
                    label="Brand"
                    value={newModelBrand}
                    onChange={(e) => setNewModelBrand(e.target.value)}
                    options={[
                        { value: "", label: "Select a brand" },
                        ...vehicleBrands.map((brand) => ({
                            value: brand.name,
                            label: brand.name,
                        })),
                    ]}
                    required
                />
                <Input
                    label="Model Name"
                    placeholder="Enter model name"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    required
                />

                {/* Vehicle Type Selection */}
                <div>
                    <label className="label">Vehicle Type *</label>
                    <div className="grid grid-cols-4 gap-2">
                        {["hatchback", "sedan", "suv", "bike"].map((type) => (
                            <label
                                key={type}
                                className={`flex flex-col items-center p-2 border-2 rounded-lg cursor-pointer transition-all ${newModelVehicleType === type
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300"
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="newModelVehicleType"
                                    value={type}
                                    checked={newModelVehicleType === type}
                                    onChange={(e) => setNewModelVehicleType(e.target.value)}
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

                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleAddModel} disabled={!newModelVehicleType}>
                        Add Model
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default AddModelModal;
