import { Autocomplete, Button, Card, Input } from '@/components/ui';
import { Edit, Plus } from 'lucide-react';

const VehicleSelection = ({
    vehicleData,
    setVehicleData,
    addingNewVehicle,
    customerData,
    registrationNumberRef,
    brandInputRef,
    modelInputRef,
    setShowAddBrandModal,
    setShowAddModelModal,
    setNewModelBrand,
    vehicleBrands,
    vehicleModels,
    allVehicleModels,
    setVehicleModels,
    setSelectedBrandId,
    detectVehicleType,
    vehicleYears,
    // Update functionality props
    openUpdateBrandModal,
    openUpdateModelModal,
}) => {
    // Show vehicle fields when:
    // 1. Explicitly adding new vehicle (button clicked for existing customer), OR
    // 2. New customer (no ID) - always show fields by default
    const shouldShow = addingNewVehicle || !customerData.id;

    if (!shouldShow) {
        return null;
    }

    return (
        <Card title="Vehicle Details">
            <div className="transition-all duration-300 ring-2 ring-blue-500 ring-opacity-50 rounded-lg p-1 -m-1">
                <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 mt-0.5">
                            <Plus className="h-5 w-5 text-blue-500" size={20} />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-semibold text-blue-800">
                                Adding New Vehicle
                            </h3>
                            <p className="text-sm text-blue-700 mt-1">
                                Enter details for the new vehicle below
                            </p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        ref={registrationNumberRef}
                        label="Registration Number"
                        placeholder="Registration number"
                        value={vehicleData.registration_number}
                        onChange={(e) =>
                            setVehicleData({
                                ...vehicleData,
                                registration_number: e.target.value,
                            })
                        }
                        required
                    />
                    <Autocomplete
                        label="Year"
                        placeholder="Select year..."
                        options={vehicleYears}
                        value={vehicleData.year}
                        onChange={(value) =>
                            setVehicleData({ ...vehicleData, year: value })
                        }
                    />
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="label">Brand*</label>
                            <div className="flex gap-1">
                                <Button
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    className="px-3 py-1.5 text-sm"
                                    onClick={() => setShowAddBrandModal(true)}
                                >
                                    Add+
                                </Button>
                                {vehicleData.brand && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="px-3 py-1.5 text-sm"
                                        onClick={() => {
                                            if (openUpdateBrandModal) {
                                                const selectedBrand = vehicleBrands.find(b => b.name === vehicleData.brand);
                                                if (selectedBrand) {
                                                    openUpdateBrandModal(selectedBrand);
                                                }
                                            }
                                        }}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <Autocomplete
                            ref={brandInputRef}
                            placeholder="Search brand..."
                            options={vehicleBrands.map((b) => b.name)}
                            value={vehicleData.brand}
                            onChange={(value) => {
                                setVehicleData({
                                    ...vehicleData,
                                    brand: value,
                                    model: "",
                                });
                                // Find the brand ID and filter models
                                const selectedBrand = vehicleBrands.find(
                                    (b) => b.name === value
                                );
                                if (selectedBrand) {
                                    setSelectedBrandId(selectedBrand.id);
                                    // Filter models for this brand
                                    const filteredModels = allVehicleModels.filter(
                                        (m) =>
                                            m.brand == selectedBrand.id ||
                                            m.brand_name === selectedBrand.name
                                    );
                                    setVehicleModels(filteredModels);

                                    // Auto-detect vehicle type for bike brands
                                    if (selectedBrand.vehicle_type === 'bike' && detectVehicleType) {
                                        detectVehicleType(value, "bike");
                                    }
                                } else {
                                    setSelectedBrandId(null);
                                    setVehicleModels(allVehicleModels);
                                }
                            }}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="label">Model*</label>
                            <div className="flex gap-1">
                                <Button
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    className="px-3 py-1.5 text-sm"
                                    onClick={() => {
                                        setNewModelBrand(vehicleData.brand);
                                        setShowAddModelModal(true);
                                    }}
                                    disabled={!vehicleData.brand}
                                >
                                    Add+
                                </Button>
                                {vehicleData.model && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="px-3 py-1.5 text-sm"
                                        onClick={() => {
                                            if (openUpdateModelModal) {
                                                const selectedModel = vehicleModels.find(m => m.name === vehicleData.model);
                                                if (selectedModel) {
                                                    openUpdateModelModal(selectedModel);
                                                }
                                            }
                                        }}
                                        disabled={!vehicleData.brand}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <Autocomplete
                            ref={modelInputRef}
                            placeholder="Search model..."
                            options={vehicleModels.map((m) => m.name)}
                            value={vehicleData.model}
                            onChange={(value) => {
                                setVehicleData({ ...vehicleData, model: value });

                                // Auto-detect vehicle type when both brand and model are selected
                                if (vehicleData.brand && value) {
                                    detectVehicleType(vehicleData.brand, value);
                                }
                            }}
                            disabled={!vehicleData.brand}
                            required
                        />
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default VehicleSelection;
