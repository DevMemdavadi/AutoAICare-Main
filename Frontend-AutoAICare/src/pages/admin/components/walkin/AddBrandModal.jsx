import React from 'react';
import { Button, Input, Modal } from '@/components/ui';

const AddBrandModal = ({
    isOpen,
    onClose,
    newBrandName,
    setNewBrandName,
    newBrandVehicleType,
    setNewBrandVehicleType,
    handleAddBrand
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add New Brand"
        >
            <div className="space-y-4">
                <Input
                    label="Brand Name"
                    placeholder="Enter brand name"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    required
                />

                {/* Vehicle Type Selection */}
                <div>
                    <label className="label">Vehicle Type *</label>
                    <div className="grid grid-cols-2 gap-2">
                        {["car", "bike"].map((type) => (
                            <label
                                key={type}
                                className={`flex flex-col items-center p-2 border-2 rounded-lg cursor-pointer transition-all ${newBrandVehicleType === type
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300"
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="newBrandVehicleType"
                                    value={type}
                                    checked={newBrandVehicleType === type}
                                    onChange={(e) => setNewBrandVehicleType(e.target.value)}
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

                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleAddBrand} disabled={!newBrandVehicleType}>Add Brand</Button>
                </div>
            </div>
        </Modal>
    );
};

export default AddBrandModal;
