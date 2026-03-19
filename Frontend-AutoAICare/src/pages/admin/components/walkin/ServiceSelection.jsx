import { Button, Card, Input, Select } from '@/components/ui';
import { Car, Check, Clock, Plus, Search } from 'lucide-react';

const ServiceSelection = ({
    vehicleData,
    vehicleType,
    setVehicleType,
    setShowServiceModal,
    setShowAddAddonModal,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    serviceCategories,
    filteredPackages,
    packages,
    getVehicleTypePrice,
    // Multi-select props
    selectedPackages,   // array of selected package IDs (as strings)
    togglePackage,      // (pkgId: string) => void
    addons,
    selectedAddons,
    toggleAddon,
    isBranchSelected = true
}) => {

    const formatDuration = (min, max) => {
        const hours = Math.floor(min / 60);
        const minutes = min % 60;
        if (max && max !== min) {
            const maxHours = Math.floor(max / 60);
            const maxMinutes = max % 60;
            if (hours === maxHours) {
                return minutes === maxMinutes ? `${hours}h ${minutes}m` : `${hours}h ${minutes}-${maxMinutes}m`;
            }
            return `${hours}-${maxHours} hrs`;
        }
        return hours > 0 ? `${hours}h ${minutes > 0 ? minutes + 'm' : ''}` : `${minutes}m`;
    };

    const getCategoryLabel = (category) => {
        const labels = {
            wash: 'Wash', interior: 'Interior', exterior: 'Exterior', coating: 'Coating',
            makeover: 'Makeover', mechanical: 'Mechanical', ac_service: 'AC Service',
            polish: 'Polish', bike_services: 'Bike', other: 'Other',
        };
        return labels[category] || 'Service';
    };

    const totalSelectedDuration = packages
        .filter(pkg => selectedPackages.includes(pkg.id.toString()))
        .reduce((sum, pkg) => sum + (pkg.duration || 0), 0);

    const vehicleTypeOptions = [
        { value: "hatchback", label: "Hatchback", icon: "🚗", desc: "Small cars" },
        { value: "sedan", label: "Sedan", icon: "🚙", desc: "Mid-size" },
        { value: "suv", label: "SUV", icon: "🚐", desc: "Large" },
        { value: "bike", label: "Bike", icon: "🏍️", desc: "Two-wheeler" },
    ];

    return (
        <Card title="Service Selection">
            <div className="space-y-6">
                {/* Vehicle Type Selection */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Car size={18} className="text-blue-600" />
                        Vehicle Type (for pricing)
                    </h3>

                    {vehicleData.brand && vehicleData.model ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-white rounded-lg p-4 border-2 border-green-500">
                                <div className="flex items-center gap-3">
                                    <div className="text-4xl">
                                        {vehicleType === 'hatchback' && '🚗'}
                                        {vehicleType === 'sedan' && '🚙'}
                                        {vehicleType === 'suv' && '🚐'}
                                        {vehicleType === 'bike' && '🏍️'}
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Auto-detected as</p>
                                        <p className="text-xl font-bold text-gray-900 capitalize">{vehicleType}</p>
                                        <p className="text-xs text-gray-500">Based on {vehicleData.brand} {vehicleData.model}</p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✓ Auto-detected
                                </span>
                            </div>
                            <details className="group">
                                <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 font-medium list-none flex items-center gap-2">
                                    <span>Change vehicle type manually</span>
                                    <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </summary>
                                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {vehicleTypeOptions.map((type) => (
                                        <label key={type.value}
                                            className={`flex flex-col items-center p-3 border-2 rounded-xl cursor-pointer transition-all ${vehicleType === type.value ? "border-blue-500 bg-white shadow-md" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                                            <input type="radio" name="vehicle_type_admin" value={type.value} checked={vehicleType === type.value} onChange={(e) => setVehicleType(e.target.value)} className="sr-only" />
                                            <span className="text-2xl mb-1">{type.icon}</span>
                                            <span className="font-semibold text-gray-900 text-sm">{type.label}</span>
                                            <span className="text-xs text-gray-500 text-center">{type.desc}</span>
                                        </label>
                                    ))}
                                </div>
                            </details>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">Select the vehicle type to see applicable prices</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {vehicleTypeOptions.map((type) => (
                                    <label key={type.value}
                                        className={`flex flex-col items-center p-3 border-2 rounded-xl cursor-pointer transition-all ${vehicleType === type.value ? "border-blue-500 bg-white shadow-md" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                                        <input type="radio" name="vehicle_type_admin" value={type.value} checked={vehicleType === type.value} onChange={(e) => setVehicleType(e.target.value)} className="sr-only" />
                                        <span className="text-2xl mb-1">{type.icon}</span>
                                        <span className="font-semibold text-gray-900 text-sm">{type.label}</span>
                                        <span className="text-xs text-gray-500 text-center">{type.desc}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Service Packages — Multi-Select */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <div>
                            <h3 className="font-medium text-gray-900">Select Service(s)</h3>
                            <p className="text-xs text-gray-500 mt-0.5">You can select multiple services for a single booking</p>
                        </div>
                        <Button variant="outline" size="sm" className="flex items-center gap-1.5" onClick={() => setShowServiceModal(true)}>
                            <Plus size={16} />
                            Add Service
                        </Button>
                    </div>

                    {/* Selected services summary bar */}
                    {selectedPackages.length > 0 && (
                        <div className="mb-4 px-4 py-3 bg-blue-600 text-white rounded-lg flex items-center justify-between">
                            <span className="font-medium">
                                {selectedPackages.length} service{selectedPackages.length > 1 ? 's' : ''} selected
                            </span>
                            {totalSelectedDuration > 0 && (
                                <span className="flex items-center gap-1 text-sm text-blue-100">
                                    <Clock size={14} />
                                    Total: {totalSelectedDuration >= 60
                                        ? `${Math.floor(totalSelectedDuration / 60)}h ${totalSelectedDuration % 60 > 0 ? totalSelectedDuration % 60 + 'm' : ''}`
                                        : `${totalSelectedDuration}m`}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Search and Filter */}
                    <div className="mb-4 space-y-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                                <Input placeholder="Search services..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} prefix={<Search className="text-gray-400" size={18} />} />
                            </div>
                            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full sm:w-48"
                                options={[{ value: 'all', label: 'All Categories' }, ...serviceCategories]} />
                        </div>
                        <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-2">
                            <Car size={16} className="text-blue-600" />
                            <span className="text-sm text-blue-800">
                                {searchQuery ? (
                                    <>Search results for "<strong>{searchQuery}</strong>" <span className="ml-2 text-gray-600">({filteredPackages.length} found)</span></>
                                ) : vehicleType === 'bike' ? (
                                    <>Showing <strong>bike services only</strong></>
                                ) : (
                                    <>Showing <strong>car services</strong> for <strong className="capitalize">{vehicleType}</strong>
                                        {filteredPackages.length > 0 && filteredPackages.length < packages.length && (
                                            <span className="ml-2 text-gray-600">({filteredPackages.length} of {packages.length})</span>
                                        )}
                                    </>
                                )}
                            </span>
                        </div>
                    </div>

                    {filteredPackages.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredPackages.map((pkg) => {
                                const displayPrice = getVehicleTypePrice(pkg, vehicleType);
                                const isSelected = selectedPackages.includes(pkg.id.toString());

                                return (
                                    <div key={pkg.id}
                                        className={`relative border-2 rounded-xl p-5 cursor-pointer transition-all ${isSelected
                                            ? "border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200"
                                            : "border-gray-200 hover:border-blue-300 hover:shadow-md"}`}
                                        onClick={() => togglePackage(pkg.id.toString())}>

                                        <div className="flex items-center justify-between mb-3">
                                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                                                {getCategoryLabel(pkg.category)}
                                            </span>
                                            {isSelected && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
                                                    <Check size={12} />
                                                    Added
                                                </span>
                                            )}
                                        </div>

                                        <h4 className="font-bold text-lg text-gray-900 mb-2 leading-tight">{pkg.name}</h4>
                                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{pkg.description}</p>

                                        <div className="flex items-end justify-between mb-3">
                                            <div>
                                                <div className="text-2xl font-bold text-green-600">₹{parseFloat(displayPrice).toFixed(2)}</div>
                                                {pkg.gst_applicable && (
                                                    <div className="text-xs text-gray-500">+{parseFloat(pkg.gst_rate).toFixed(2)}% GST</div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 text-sm text-gray-600">
                                                <Clock size={14} />
                                                <span>{formatDuration(pkg.duration, pkg.duration_max)}</span>
                                            </div>
                                        </div>

                                        {/* Other prices expandable (stop propagation so it doesn't toggle selection) */}
                                        <details className="group" onClick={(e) => e.stopPropagation()}>
                                            <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-700 font-medium list-none flex items-center gap-1">
                                                <span>View pricing for other vehicle types</span>
                                                <svg className="w-3 h-3 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </summary>
                                            <div className="mt-3 grid grid-cols-1 gap-2 text-sm pt-2 border-t border-gray-200">
                                                {parseFloat(pkg.hatchback_price) > 0 && <div className="flex items-center justify-between p-2 bg-gray-50 rounded"><div className="flex items-center gap-2"><span>🚗</span><span className="font-medium">Hatchback</span></div><span className="font-semibold text-green-600">₹{parseFloat(pkg.hatchback_price).toFixed(2)}</span></div>}
                                                {parseFloat(pkg.sedan_price) > 0 && <div className="flex items-center justify-between p-2 bg-gray-50 rounded"><div className="flex items-center gap-2"><span>🚙</span><span className="font-medium">Sedan</span></div><span className="font-semibold text-green-600">₹{parseFloat(pkg.sedan_price).toFixed(2)}</span></div>}
                                                {parseFloat(pkg.suv_price) > 0 && <div className="flex items-center justify-between p-2 bg-gray-50 rounded"><div className="flex items-center gap-2"><span>🚐</span><span className="font-medium">SUV</span></div><span className="font-semibold text-green-600">₹{parseFloat(pkg.suv_price).toFixed(2)}</span></div>}
                                                {parseFloat(pkg.bike_price) > 0 && <div className="flex items-center justify-between p-2 bg-gray-50 rounded"><div className="flex items-center gap-2"><span>🏍️</span><span className="font-medium">Bike</span></div><span className="font-semibold text-green-600">₹{parseFloat(pkg.bike_price).toFixed(2)}</span></div>}
                                            </div>
                                        </details>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            {searchQuery || categoryFilter !== 'all' ? (
                                <div>
                                    <p className="text-lg font-medium text-gray-900 mb-2">No services found</p>
                                    <p className="text-gray-500 mb-4">{searchQuery ? `No services match "${searchQuery}"` : 'No services in this category'}</p>
                                    <div className="flex justify-center gap-3">
                                        {searchQuery && <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>Clear Search</Button>}
                                        {categoryFilter !== 'all' && <Button variant="outline" size="sm" onClick={() => setCategoryFilter('all')}>Clear Filter</Button>}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="mt-2 text-lg font-medium text-blue-900 border-2 border-dashed border-blue-200 bg-blue-50/50 p-4 rounded-xl">
                                        {isBranchSelected ? "No service packages available for this branch" : "Please FIRST SELECT A BRANCH to see available services"}
                                    </p>
                                    {!isBranchSelected && <p className="text-sm text-blue-600 mt-2">Select branch from the top panel or global header</p>}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Add-ons */}
                <div className="mt-8 pt-6 border-t">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Select Add-ons (Optional)</h3>
                        <Button variant="outline" size="sm" className="flex items-center gap-1.5" onClick={() => setShowAddAddonModal(true)}>
                            <Plus size={16} />
                            Add Add-on
                        </Button>
                    </div>

                    {addons.length > 0 ? (
                        <div className="space-y-3">
                            {addons.map((addon) => {
                                const isSelected = selectedAddons.includes(addon.id.toString());
                                return (
                                    <div key={addon.id} onClick={() => toggleAddon(addon.id.toString())}
                                        className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">{addon.name}</div>
                                            {addon.description && <div className="text-sm text-gray-600 mt-1">{addon.description}</div>}
                                            {addon.duration > 0 && <div className="text-xs text-gray-500 mt-1">Duration: {addon.duration} minutes</div>}
                                        </div>
                                        <div className="ml-4 text-right">
                                            <div className="text-lg font-semibold text-blue-600">+₹{parseFloat(addon.price || 0).toFixed(2)}</div>
                                        </div>
                                        <div className="ml-4">
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                                                {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className={`text-center py-4 rounded-lg border-2 border-dashed ${!isBranchSelected ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                            {!isBranchSelected ? "Please select a branch to view available add-ons" : "No add-ons available for this branch"}
                        </p>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default ServiceSelection;
