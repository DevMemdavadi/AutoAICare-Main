import { useState, useEffect } from 'react';
import { Download, TrendingUp, FileText, BarChart3 } from 'lucide-react';
import api from '../../../utils/api';

const Reports = () => {
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [gstReport, setGstReport] = useState(null);
    const [supplierReport, setSupplierReport] = useState(null);
    const [monthlyTrend, setMonthlyTrend] = useState(null);

    useEffect(() => {
        fetchReports();
    }, [dateRange]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const params = `start_date=${dateRange.start}&end_date=${dateRange.end}`;

            const [gst, supplier, trend] = await Promise.all([
                api.get(`/purchases/reports/gst_input_report/?${params}`),
                api.get(`/purchases/reports/supplier_wise_report/?${params}`),
                api.get(`/purchases/reports/monthly_trend/`)
            ]);

            setGstReport(gst.data);
            setSupplierReport(supplier.data);
            setMonthlyTrend(trend.data);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = (data, filename) => {
        // Simple CSV export logic
        const csv = data.map(row => Object.values(row).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Purchase Reports</h1>
                    <p className="text-gray-600 mt-1">GST reports, supplier analysis & trends</p>
                </div>
            </div>

            {/* Date Range Filter */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={fetchReports}
                        className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Generate Reports
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <>
                    {/* GST Input Report */}
                    {gstReport && (
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                    <FileText size={24} className="text-blue-600" />
                                    GST Input Tax Credit Report
                                </h2>
                                <button
                                    onClick={() => exportToCSV(gstReport.by_gst_rate, 'gst_report')}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    <Download size={18} />
                                    Export
                                </button>
                            </div>

                            {/* Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-gray-600">Total Taxable Value</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        ₹{(gstReport.summary.total_taxable_value || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg">
                                    <p className="text-sm text-gray-600">Total CGST</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        ₹{(gstReport.summary.total_cgst || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-lg">
                                    <p className="text-sm text-gray-600">Total SGST</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        ₹{(gstReport.summary.total_sgst || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-4 bg-orange-50 rounded-lg">
                                    <p className="text-sm text-gray-600">Total IGST</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        ₹{(gstReport.summary.total_igst || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* By GST Rate */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">GST Rate</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Taxable Value</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">CGST</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SGST</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">IGST</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total GST</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {gstReport.by_gst_rate.map((row, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-3 text-sm font-medium">{row.gst_rate}%</td>
                                                <td className="px-4 py-3 text-sm">₹{row.taxable_value?.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm">₹{row.cgst?.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm">₹{row.sgst?.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm">₹{row.igst?.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm font-medium">₹{row.total_gst?.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Supplier-wise Report */}
                    {supplierReport && (
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                    <BarChart3 size={24} className="text-green-600" />
                                    Supplier-wise Purchase Analysis
                                </h2>
                                <button
                                    onClick={() => exportToCSV(supplierReport.suppliers, 'supplier_report')}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    <Download size={18} />
                                    Export
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">GST Number</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Purchases</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {supplierReport.suppliers.map((supplier, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-3 text-sm font-medium">{supplier.supplier__name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{supplier.supplier__gst_number || 'N/A'}</td>
                                                <td className="px-4 py-3 text-sm">{supplier.total_purchases}</td>
                                                <td className="px-4 py-3 text-sm font-medium">₹{supplier.total_amount?.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm text-green-600">₹{supplier.total_paid?.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm text-orange-600">₹{supplier.outstanding?.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Monthly Trend */}
                    {monthlyTrend && (
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <TrendingUp size={24} className="text-purple-600" />
                                Monthly Purchase Trend (Last 12 Months)
                            </h2>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Purchases</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {monthlyTrend.monthly_trend.map((month, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-3 text-sm font-medium">
                                                    {new Date(month.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                                                </td>
                                                <td className="px-4 py-3 text-sm">{month.purchase_count}</td>
                                                <td className="px-4 py-3 text-sm font-medium">₹{month.total_amount?.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Reports;
