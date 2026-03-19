/**
 * InvoiceItemEditor.jsx
 *
 * Reusable editable bill items table with category-based search.
 * Supports: service (ServicePackage), part (store Product), addon (AddOn), other (free text).
 * "product" type is intentionally excluded per requirements.
 *
 * Props:
 *   items           – array of item objects
 *   setItems        – setter for items array
 *   onSave          – async fn called when "Save Invoice Changes" is clicked (optional)
 *   saveLoading     – bool, shows spinner on save button
 *   savedLabel      – label for save button (default "Save Invoice Changes")
 *   hideSaveButton  – bool, hides the save button entirely (parent handles it)
 *
 * Each item shape: { item_type, description, quantity, unit_price, total }
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Search, Trash2, X } from 'lucide-react';
import api from '@/utils/api';

const ITEM_TYPES = [
    { value: 'service', label: 'Service' },
    { value: 'part', label: 'Part' },
    { value: 'addon', label: 'Add-on' },
    { value: 'other', label: 'Other' },
];

const SEARCH_ENDPOINTS = {
    service: '/services/packages/',
    part: '/jobcards/parts/',
    addon: '/services/addons/',
};

// Map an API result to a suggestion { label, price, description }
const mapResult = (type, item) => {
    if (type === 'service') {
        return {
            id: item.id,
            label: item.name,
            // show sedan price as the default — admin can change qty/price after
            price: parseFloat(item.sedan_price || item.price || 0),
            description: item.name,
        };
    }
    if (type === 'part') {
        return {
            id: item.id,
            label: `${item.name}${item.sku ? ` (${item.sku})` : ''}`,
            price: parseFloat(item.selling_price || 0),
            description: item.name,
        };
    }
    if (type === 'addon') {
        return {
            id: item.id,
            label: item.name,
            price: parseFloat(item.price || 0),
            description: item.name,
        };
    }
    return null;
};

/** Single row component */
function ItemRow({ item, index, onItemChange, onRemove }) {
    const [query, setQuery] = useState(item.description || '');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searching, setSearching] = useState(false);
    // Track whether we've already loaded the "top 10" default list for this type
    const defaultLoadedForType = useRef(null);
    const debounceRef = useRef(null);
    const containerRef = useRef(null);

    const isSearchable = ['service', 'part', 'addon'].includes(item.item_type);

    // Close suggestions if clicking outside
    useEffect(() => {
        const handleClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Reset when type changes — clear query, suggestions, and default-load cache
    useEffect(() => {
        setQuery(item.description || '');
        setSuggestions([]);
        setShowSuggestions(false);
        defaultLoadedForType.current = null;
    }, [item.item_type]);

    /** Fetch results from API and map them */
    const fetchSuggestions = useCallback(async (searchTerm) => {
        const endpoint = SEARCH_ENDPOINTS[item.item_type];
        if (!endpoint) return;
        setSearching(true);
        try {
            const params = { page_size: 10 };
            if (searchTerm) params.search = searchTerm;
            const res = await api.get(endpoint, { params });
            const results = res.data?.results || res.data || [];
            const mapped = results.map((r) => mapResult(item.item_type, r)).filter(Boolean);
            setSuggestions(mapped);
            setShowSuggestions(mapped.length > 0);
        } catch {
            setSuggestions([]);
            setShowSuggestions(false);
        } finally {
            setSearching(false);
        }
    }, [item.item_type]);

    /** Called when user focuses the description input */
    const handleFocus = useCallback(() => {
        if (!isSearchable) return;
        if (suggestions.length > 0) {
            // Already have suggestions cached — just show them
            setShowSuggestions(true);
            return;
        }
        // First time this row is focused for this type — load top 10
        if (defaultLoadedForType.current !== item.item_type) {
            defaultLoadedForType.current = item.item_type;
            fetchSuggestions('');
        }
    }, [isSearchable, suggestions.length, item.item_type, fetchSuggestions]);

    /** Called as user types */
    const handleSearch = useCallback((value) => {
        setQuery(value);
        onItemChange(index, 'description', value);

        if (!isSearchable) return;

        clearTimeout(debounceRef.current);

        if (!value.trim()) {
            // Cleared back to empty — re-show default top 10 (already cached)
            if (suggestions.length > 0) {
                setShowSuggestions(true);
            } else {
                // Need to reload defaults
                debounceRef.current = setTimeout(() => fetchSuggestions(''), 150);
            }
            return;
        }

        // Debounced search
        debounceRef.current = setTimeout(() => fetchSuggestions(value.trim()), 300);
    }, [index, isSearchable, suggestions.length, fetchSuggestions, onItemChange]);

    const handleSelect = (suggestion) => {
        setQuery(suggestion.label);
        setShowSuggestions(false);
        onItemChange(index, 'description', suggestion.description);
        onItemChange(index, 'unit_price', suggestion.price);
    };

    const handleTypeChange = (newType) => {
        onItemChange(index, 'item_type', newType);
        onItemChange(index, 'description', '');
        onItemChange(index, 'unit_price', 0);
        setQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
        defaultLoadedForType.current = null;
    };

    return (
        <tr className="hover:bg-gray-50 transition-colors">
            {/* Type */}
            <td className="px-3 py-2 align-top">
                <select
                    value={item.item_type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="text-sm border rounded px-2 py-1.5 w-full bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
                >
                    {ITEM_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
            </td>

            {/* Description with search */}
            <td className="px-3 py-2 align-top" ref={containerRef}>
                <div className="relative">
                    <div className="relative flex items-center">
                        {isSearchable && (
                            <Search size={13} className="absolute left-2 text-gray-400 pointer-events-none" />
                        )}
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => handleSearch(e.target.value)}
                            onFocus={handleFocus}
                            placeholder={
                                isSearchable
                                    ? `Search or pick a ${item.item_type}…`
                                    : 'Enter description'
                            }
                            className={`text-sm border rounded py-1.5 pr-2 w-full focus:ring-2 focus:ring-blue-400 focus:outline-none ${isSearchable ? 'pl-6' : 'pl-2'
                                }`}
                        />
                        {searching && (
                            <span className="absolute right-2 text-gray-400">
                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                            </span>
                        )}
                    </div>

                    {/* Suggestions dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg mt-0.5 max-h-52 overflow-y-auto">
                            <div className="px-3 py-1.5 text-xs text-gray-400 bg-gray-50 border-b font-medium tracking-wide">
                                {query.trim() ? 'Search results' : `Top ${suggestions.length} ${item.item_type}s`}
                            </div>
                            {suggestions.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => handleSelect(s)}
                                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-left hover:bg-blue-50 transition-colors border-b last:border-b-0"
                                >
                                    <span className="font-medium text-gray-800">{s.label}</span>
                                    <span className="text-gray-500 ml-2 shrink-0">₹{Math.round(s.price)}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </td>

            {/* Qty */}
            <td className="px-3 py-2 align-top">
                <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={item.quantity}
                    onChange={(e) => onItemChange(index, 'quantity', e.target.value)}
                    className="text-sm border rounded px-2 py-1.5 w-20 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
            </td>

            {/* Unit Price */}
            <td className="px-3 py-2 align-top">
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unit_price}
                    onChange={(e) => onItemChange(index, 'unit_price', e.target.value)}
                    className="text-sm border rounded px-2 py-1.5 w-24 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
            </td>

            {/* Total */}
            <td className="px-3 py-2 align-top text-sm font-medium text-gray-800 pt-2.5">
                ₹{Math.round(parseFloat(item.total || 0))}
            </td>

            {/* Remove */}
            <td className="px-3 py-2 align-top pt-2">
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    title="Remove item"
                >
                    <X size={16} />
                </button>
            </td>
        </tr>
    );
}


export default function InvoiceItemEditor({
    items,
    setItems,
    onSave,
    saveLoading = false,
    savedLabel = 'Save Invoice Changes',
    hideSaveButton = false,
}) {
    const handleItemChange = useCallback((index, field, value) => {
        setItems((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };

            if (field === 'quantity' || field === 'unit_price') {
                const qty = parseFloat(updated[index].quantity || 0);
                const price = parseFloat(updated[index].unit_price || 0);
                updated[index].total = Math.round(qty * price);
            }

            return updated;
        });
    }, [setItems]);

    const addItem = () => {
        setItems((prev) => [
            ...prev,
            { item_type: 'service', description: '', quantity: 1, unit_price: 0, total: 0 },
        ]);
    };

    const removeItem = (index) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-3">
            <div className="border rounded-lg overflow-visible">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-28">Type</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Description</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-20">Qty</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-28">Unit Price</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 w-24">Total</th>
                            <th className="px-3 py-2 w-8"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {items.map((item, index) => (
                            <ItemRow
                                key={index}
                                item={item}
                                index={index}
                                onItemChange={handleItemChange}
                                onRemove={removeItem}
                            />
                        ))}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-400 italic">
                                    No items yet. Click "+ Add Item" to add a line item.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-300 hover:border-blue-500 rounded-md px-3 py-1.5 transition-colors"
                >
                    <Plus size={15} />
                    Add Item
                </button>

                {!hideSaveButton && onSave && (
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={saveLoading}
                        className="text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 rounded-md px-4 py-1.5 font-medium transition-colors"
                    >
                        {saveLoading ? 'Saving…' : savedLabel}
                    </button>
                )}
            </div>
        </div>
    );
}
