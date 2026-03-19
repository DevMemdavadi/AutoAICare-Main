import { useEffect, useState, useRef } from 'react';
import api from '@/utils/api';
import { History, TrendingUp, Sparkles, CheckCircle2 } from 'lucide-react';

// Colour palette — index is chosen by hashing the category string so any new
// backend category gets a consistent, unique colour with zero code changes.
const COLOR_PALETTE = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-pink-100 text-pink-700',
    'bg-cyan-100 text-cyan-700',
    'bg-orange-100 text-orange-700',
    'bg-red-100 text-red-700',
    'bg-sky-100 text-sky-700',
    'bg-yellow-100 text-yellow-700',
    'bg-green-100 text-green-700',
    'bg-teal-100 text-teal-700',
    'bg-indigo-100 text-indigo-700',
    'bg-rose-100 text-rose-700',
];

/** Stable hash: same string always maps to the same palette slot */
const hashStr = (str = '') => {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h % COLOR_PALETTE.length;
};

const getCategoryColor = (category) => COLOR_PALETTE[hashStr(category)] ?? 'bg-gray-100 text-gray-600';

/** 'ac_service' → 'Ac Service', 'bike_services' → 'Bike Services' */
const getCategoryLabel = (category) =>
    (category || 'other').split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

function SuggestionPill({ item, type, selected, onClick }) {
    const isSelected = selected;
    const colorClass = getCategoryColor(item.category);
    const label = getCategoryLabel(item.category);

    return (
        <button
            onClick={onClick}
            title={type === 'history'
                ? `Booked ${item.times_booked}× — last on ${item.last_booked}`
                : `${item.bookings_last_90_days} bookings (last 90 days)`}
            className={`
        relative flex-shrink-0 flex flex-col gap-1 text-left
        rounded-xl border px-3 py-2.5 transition-all duration-200 cursor-pointer
        ${isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm'
                }
      `}
        >
            {/* Selected checkmark */}
            {isSelected && (
                <CheckCircle2 className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-blue-500" />
            )}

            {/* Service name */}
            <span className={`text-sm font-semibold leading-tight pr-3 ${isSelected ? 'text-blue-800' : 'text-gray-800'}`}>
                {item.name}
            </span>

            {/* Category badge + meta */}
            <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colorClass}`}>
                    {label}
                </span>
                {type === 'history' && item.times_booked > 0 && (
                    <span className="text-[10px] text-gray-400">{item.times_booked}×</span>
                )}
                {type === 'trending' && item.bookings_last_90_days > 0 && (
                    <span className="text-[10px] text-gray-400">{item.bookings_last_90_days} bookings</span>
                )}
            </div>
        </button>
    );
}

const ServiceSuggestions = ({
    customerId,
    branchId,
    vehicleType,
    selectedPackages = [],
    onToggle,
    packages = [],
}) => {
    const [data, setData] = useState({ customer_history: [], branch_trending: [] });
    const [loading, setLoading] = useState(false);
    const fetchRef = useRef(null);

    useEffect(() => {
        if (fetchRef.current) clearTimeout(fetchRef.current);

        if (!customerId && !branchId) {
            setData({ customer_history: [], branch_trending: [] });
            return;
        }

        setLoading(true);
        fetchRef.current = setTimeout(async () => {
            try {
                const params = {};
                if (customerId) params.customer_id = customerId;
                if (branchId) params.branch_id = branchId;
                if (vehicleType) params.vehicle_type = vehicleType;

                const res = await api.get('/bookings/service_suggestions/', { params });
                setData(res.data);
            } catch (err) {
                console.error('ServiceSuggestions fetch error:', err);
                setData({ customer_history: [], branch_trending: [] });
            } finally {
                setLoading(false);
            }
        }, 400);

        return () => { if (fetchRef.current) clearTimeout(fetchRef.current); };
    }, [customerId, branchId, vehicleType]);

    const hasHistory = data.customer_history.length > 0;
    const hasTrending = data.branch_trending.length > 0;
    const hasAny = hasHistory || hasTrending;

    // Helper: find the live package ID by name (suggestions only carry id/name/category)
    const resolvePackageId = (suggestionId) => {
        // Suggestions already carry the DB id — use directly
        return suggestionId.toString();
    };

    if (!hasAny && !loading) return null;

    return (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-amber-200 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-amber-800">Smart Suggestions</span>
                {loading && (
                    <span className="ml-auto text-xs text-amber-500 animate-pulse">Fetching…</span>
                )}
            </div>

            <div className="px-4 py-3 space-y-4">

                {/* Previously Booked */}
                {hasHistory && (
                    <div>
                        <div className="flex items-center gap-1.5 mb-2">
                            <History className="h-3.5 w-3.5 text-indigo-500" />
                            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                                Previously Booked
                            </span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                            {data.customer_history.map((item) => {
                                const pid = resolvePackageId(item.id);
                                return (
                                    <SuggestionPill
                                        key={`h-${item.id}`}
                                        item={item}
                                        type="history"
                                        selected={selectedPackages.includes(pid)}
                                        onClick={() => onToggle(pid)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Trending */}
                {hasTrending && (
                    <div>
                        <div className="flex items-center gap-1.5 mb-2">
                            <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
                            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wide">
                                Trending at This Branch
                            </span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                            {data.branch_trending.map((item) => {
                                const pid = resolvePackageId(item.id);
                                return (
                                    <SuggestionPill
                                        key={`t-${item.id}`}
                                        item={item}
                                        type="trending"
                                        selected={selectedPackages.includes(pid)}
                                        onClick={() => onToggle(pid)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ServiceSuggestions;
