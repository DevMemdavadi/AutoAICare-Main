import { Card } from '@/components/ui';
import api from '@/utils/api';
import { BarChart3, Package, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const PartsAnalytics = () => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => {
        fetchAnalytics();
    }, [days]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/jobcards/parts/analytics/usage/?days=${days}`);
            setAnalytics(response.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading analytics...</div>;
    }

    if (!analytics) {
        return <div className="p-8 text-center text-gray-500">No data available</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Parts Usage Analytics</h1>
                    <p className="text-gray-600">Insights into parts consumption and profitability</p>
                </div>
                <select
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value))}
                    className="input"
                >
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                    <option value="180">Last 6 Months</option>
                    <option value="365">Last Year</option>
                </select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Parts Used</p>
                            <p className="text-2xl font-bold">{analytics.summary.total_quantity || 0}</p>
                        </div>
                        <Package className="h-8 w-8 text-blue-500" />
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Revenue</p>
                            <p className="text-2xl font-bold text-green-600">
                                ₹{parseFloat(analytics.summary.total_revenue || 0).toFixed(0)}
                            </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Profit</p>
                            <p className="text-2xl font-bold text-purple-600">
                                ₹{parseFloat(analytics.summary.total_profit || 0).toFixed(0)}
                            </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-purple-500" />
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Profit Margin</p>
                            <p className="text-2xl font-bold text-indigo-600">
                                {parseFloat(analytics.summary.profit_margin_percent || 0).toFixed(1)}%
                            </p>
                        </div>
                        <BarChart3 className="h-8 w-8 text-indigo-500" />
                    </div>
                </Card>
            </div>

            {/* Top Parts by Quantity */}
            <Card title="Top 10 Most Used Parts (by Quantity)">
                <div className="p-6">
                    <div className="space-y-3">
                        {analytics.top_parts_by_quantity.map((part, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold text-sm">
                                        {index + 1}
                                    </span>
                                    <div>
                                        <p className="font-semibold text-gray-900">{part.part_name}</p>
                                        <p className="text-xs text-gray-500">{part.part__sku || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-blue-600">{part.total_quantity} {part.part__unit || 'pcs'}</p>
                                    <p className="text-xs text-gray-500">Used {part.times_used} times</p>
                                    <p className="text-xs text-green-600">₹{parseFloat(part.total_revenue || 0).toFixed(0)} revenue</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Top Parts by Profit */}
            <Card title="Top 10 Most Profitable Parts">
                <div className="p-6">
                    <div className="space-y-3">
                        {analytics.top_parts_by_profit.map((part, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-full font-bold text-sm">
                                        {index + 1}
                                    </span>
                                    <div>
                                        <p className="font-semibold text-gray-900">{part.part_name}</p>
                                        <p className="text-xs text-gray-500">{part.part__sku || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-purple-600">₹{parseFloat(part.profit || 0).toFixed(0)} profit</p>
                                    <p className="text-xs text-gray-500">{part.total_quantity} units sold</p>
                                    <p className="text-xs text-green-600">₹{parseFloat(part.total_revenue || 0).toFixed(0)} revenue</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Usage by Category */}
            <Card title="Parts Usage by Category">
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {analytics.usage_by_category.map((category, index) => (
                            <div key={index} className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200">
                                <p className="text-sm font-medium text-gray-600 capitalize mb-2">
                                    {category.part__category?.replace('_', ' ') || 'Uncategorized'}
                                </p>
                                <p className="text-2xl font-bold text-gray-900 mb-1">
                                    {category.total_quantity}
                                </p>
                                <p className="text-sm text-green-600">₹{parseFloat(category.total_revenue || 0).toFixed(0)}</p>
                                <p className="text-xs text-gray-500 mt-1">{category.parts_count} transactions</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Critical Low Stock (Frequently Used) */}
            {analytics.critical_low_stock.length > 0 && (
                <Card title="⚠️ Critical: Low Stock on Frequently Used Parts">
                    <div className="p-6">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                            <p className="text-sm text-red-800">
                                These parts are frequently used but running low on stock. Immediate reordering recommended!
                            </p>
                        </div>
                        <div className="space-y-3">
                            {analytics.critical_low_stock.map((part) => (
                                <div key={part.id} className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-lg">
                                    <div>
                                        <p className="font-semibold text-gray-900">{part.name}</p>
                                        <p className="text-xs text-gray-500">{part.sku}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${part.stock === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                                            {part.stock} {part.unit}
                                        </p>
                                        <p className="text-xs text-gray-500">Min: {part.min_stock_level} {part.unit}</p>
                                        {part.stock === 0 && (
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
                                                OUT OF STOCK
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Link
                            to="/admin/parts"
                            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                            <Package className="h-4 w-4" />
                            Reorder Now
                        </Link>
                    </div>
                </Card>
            )}

            {/* Daily Trend */}
            <Card title="Daily Usage Trend">
                <div className="p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Parts Used</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Quantity</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {analytics.daily_trend.slice(-14).reverse().map((day, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {new Date(day.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{day.parts_used}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{day.total_quantity}</td>
                                        <td className="px-4 py-3 text-sm text-green-600 font-medium">
                                            ₹{parseFloat(day.total_value || 0).toFixed(0)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default PartsAnalytics;
