import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Building2, ArrowRightLeft, ShoppingCart } from 'lucide-react';
import { useBranch } from '@/contexts/BranchContext';
import { useAuth } from '@/contexts/AuthContext';
import PartsCatalogTab from './PartsCatalogTab';
import BranchStockTab from './BranchStockTab';
import TransfersTab from './TransfersTab';
import PurchasesTab from './PurchasesTab';

const InventoryHub = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { getCurrentBranchId, getCurrentBranchName } = useBranch();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'parts');

    // Sync tab with URL
    useEffect(() => {
        const tab = searchParams.get('tab') || 'parts';
        setActiveTab(tab);
    }, [searchParams]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    const tabs = [
        { id: 'parts', label: 'Parts Catalog', icon: Package },
        { id: 'branch-stock', label: 'Branch Stock', icon: Building2 },
        { id: 'transfers', label: 'Transfers', icon: ArrowRightLeft },
        { id: 'purchases', label: 'Purchases', icon: ShoppingCart }
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Inventory Hub</h1>
                <p className="text-gray-600 mt-1">Manage your complete inventory, stock, and purchases</p>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px overflow-x-auto" aria-label="Tabs">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`
                                        flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap
                                        ${isActive
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }
                                    `}
                                >
                                    <Icon size={18} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === 'parts' && <PartsCatalogTab />}
                    {activeTab === 'branch-stock' && <BranchStockTab />}
                    {activeTab === 'transfers' && <TransfersTab />}
                    {activeTab === 'purchases' && <PurchasesTab />}
                </div>
            </div>
        </div>
    );
};

export default InventoryHub;
