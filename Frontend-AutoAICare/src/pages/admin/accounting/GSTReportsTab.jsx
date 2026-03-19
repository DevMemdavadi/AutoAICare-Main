import { useState, useEffect } from 'react';
import api from '@/utils/api';
import { Card, Button, Alert, Input, Select } from '@/components/ui';
import {
    FileText,
    Download,
    Calendar,
    TrendingUp,
    DollarSign,
    PieChart,
    BarChart3,
    Filter,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    Building2
} from 'lucide-react';

const GSTReportsTab = () => {
    const [activeReport, setActiveReport] = useState('gstr1'); // gstr1, gstr3b, hsn, liability
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        if (activeReport) {
            fetchReport();
        }
    }, [activeReport, selectedMonth, selectedYear]);

    const fetchReport = async () => {
        setLoading(true);
        setError(null);

        try {
            let endpoint = '';
            let params = {};

            if (activeReport === 'gstr1') {
                endpoint = '/accounting/gst-reports/gstr1/';
                params = { month: selectedMonth, year: selectedYear };
            } else if (activeReport === 'gstr3b') {
                endpoint = '/accounting/gst-reports/gstr3b/';
                params = { month: selectedMonth, year: selectedYear };
            } else if (activeReport === 'hsn') {
                endpoint = '/accounting/gst-reports/hsn_summary/';
                params = { month: selectedMonth, year: selectedYear };
            } else if (activeReport === 'liability') {
                endpoint = '/accounting/gst-reports/tax_liability_register/';
                params = { year: selectedYear };
            }

            const response = await api.get(endpoint, { params });
            setReportData(response.data);
        } catch (err) {
            setError(`Failed to fetch ${activeReport.toUpperCase()} report`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const handleExport = () => {
        setSuccess('Export functionality coming soon!');
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">GST Reports</h2>
                    <p className="text-sm text-gray-600 mt-1">Generate GST compliance reports</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={fetchReport}
                        variant="secondary"
                        className="flex items-center gap-2"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </Button>
                    <Button
                        onClick={handleExport}
                        className="flex items-center gap-2"
                    >
                        <Download size={16} />
                        Export
                    </Button>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <Alert variant="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert variant="success" onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            )}

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Report Type
                        </label>
                        <Select
                            value={activeReport}
                            onChange={(e) => setActiveReport(e.target.value)}
                            options={[
                                { value: 'gstr1', label: 'GSTR-1 (Outward Supplies)' },
                                { value: 'gstr3b', label: 'GSTR-3B (Monthly Return)' },
                                { value: 'hsn', label: 'HSN Summary' },
                                { value: 'liability', label: 'Tax Liability Register' }
                            ]}
                        />
                    </div>

                    {activeReport !== 'liability' && (
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Month
                            </label>
                            <Select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                options={monthNames.map((name, index) => ({
                                    value: index + 1,
                                    label: name
                                }))}
                            />
                        </div>
                    )}

                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Year
                        </label>
                        <Input
                            type="number"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            min="2020"
                            max="2030"
                        />
                    </div>
                </div>
            </Card>

            {/* Report Content */}
            {loading ? (
                <Card className="p-8 text-center text-gray-500">
                    <RefreshCw size={48} className="mx-auto animate-spin text-blue-500 mb-4" />
                    <p>Loading report...</p>
                </Card>
            ) : reportData ? (
                <>
                    {/* GSTR-1 Report */}
                    {activeReport === 'gstr1' && (
                        <GSTR1Report data={reportData} formatCurrency={formatCurrency} />
                    )}

                    {/* GSTR-3B Report */}
                    {activeReport === 'gstr3b' && (
                        <GSTR3BReport data={reportData} formatCurrency={formatCurrency} />
                    )}

                    {/* HSN Summary */}
                    {activeReport === 'hsn' && (
                        <HSNSummaryReport data={reportData} formatCurrency={formatCurrency} />
                    )}

                    {/* Tax Liability Register */}
                    {activeReport === 'liability' && (
                        <TaxLiabilityReport data={reportData} formatCurrency={formatCurrency} />
                    )}
                </>
            ) : (
                <Card className="p-8 text-center">
                    <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 font-medium">No data available</p>
                    <p className="text-sm text-gray-500 mt-1">Select filters and click refresh to generate report</p>
                </Card>
            )}
        </div>
    );
};

// GSTR-1 Report Component
const GSTR1Report = ({ data, formatCurrency }) => {
    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Invoices</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {data.grand_total?.total_invoices || 0}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <DollarSign size={20} className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Tax Collected</p>
                            <p className="text-xl font-bold text-gray-900">
                                {formatCurrency(data.grand_total?.total_tax_collected)}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <TrendingUp size={20} className="text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Invoice Value</p>
                            <p className="text-xl font-bold text-gray-900">
                                {formatCurrency(data.grand_total?.total_invoice_value)}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* B2B Supplies */}
            <Card>
                <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">B2B Supplies (With GSTIN)</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        {data.b2b_supplies?.count || 0} invoices | {formatCurrency(data.b2b_supplies?.total_invoice_value)}
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice No</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GSTIN</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxable Value</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tax Rate</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tax Amount</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data.b2b_supplies?.details?.length > 0 ? (
                                data.b2b_supplies.details.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">{item.invoice_number}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{item.customer_name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.customer_gstin}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(item.taxable_value)}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-600">{item.tax_rate}%</td>
                                        <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">{formatCurrency(item.total_tax)}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium">{formatCurrency(item.invoice_value)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                                        No B2B supplies found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* B2C Large Supplies */}
            {data.b2c_large_supplies?.count > 0 && (
                <Card>
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-900">B2C Large Supplies ({'>'}₹2.5 Lakhs)</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            {data.b2c_large_supplies.count} invoices | {formatCurrency(data.b2c_large_supplies.total_invoice_value)}
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice No</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Place of Supply</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxable Value</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tax Amount</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {data.b2c_large_supplies.details.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">{item.invoice_number}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{item.place_of_supply}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(item.taxable_value)}</td>
                                        <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">{formatCurrency(item.total_tax)}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium">{formatCurrency(item.invoice_value)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* B2C Small Summary */}
            <Card>
                <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">B2C Small Supplies ({'<'}₹2.5 Lakhs)</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        {data.b2c_small_supplies?.count || 0} invoices | {formatCurrency(data.b2c_small_supplies?.total_invoice_value)}
                    </p>
                </div>
                <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {data.b2c_small_supplies?.summary_by_rate?.map((item, index) => (
                            <div key={index} className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600">Tax Rate: {item.tax_rate}%</p>
                                <p className="text-lg font-semibold text-gray-900 mt-1">
                                    {formatCurrency(item.total_invoice_value)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {item.invoice_count} invoices | Tax: {formatCurrency(item.total_tax)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
        </div>
    );
};

// GSTR-3B Report Component
const GSTR3BReport = ({ data, formatCurrency }) => {
    return (
        <div className="space-y-6">
            {/* Summary */}
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
                <h3 className="font-semibold text-gray-900 mb-4">GSTR-3B Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-sm text-gray-600">Period</p>
                        <p className="text-lg font-medium text-gray-900">
                            {data.period?.month}/{data.period?.year}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Total Tax Payable</p>
                        <p className="text-2xl font-bold text-blue-600">
                            {formatCurrency(data.summary?.total_tax_payable)}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Outward Supplies */}
            <Card>
                <div className="p-4 border-b border-gray-200 bg-green-50">
                    <h3 className="font-semibold text-green-900">Outward Supplies (Sales)</h3>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Taxable Value</p>
                            <p className="text-lg font-semibold text-gray-900">
                                {formatCurrency(data.outward_supplies?.taxable_value)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">CGST</p>
                            <p className="text-lg font-semibold text-green-600">
                                {formatCurrency(data.outward_supplies?.central_tax)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">SGST</p>
                            <p className="text-lg font-semibold text-green-600">
                                {formatCurrency(data.outward_supplies?.state_tax)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Tax</p>
                            <p className="text-lg font-semibold text-green-700">
                                {formatCurrency(data.outward_supplies?.total_tax)}
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Inward Supplies */}
            <Card>
                <div className="p-4 border-b border-gray-200 bg-blue-50">
                    <h3 className="font-semibold text-blue-900">Inward Supplies (Purchases)</h3>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Taxable Value</p>
                            <p className="text-lg font-semibold text-gray-900">
                                {formatCurrency(data.inward_supplies?.taxable_value)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">CGST</p>
                            <p className="text-lg font-semibold text-blue-600">
                                {formatCurrency(data.inward_supplies?.central_tax)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">SGST</p>
                            <p className="text-lg font-semibold text-blue-600">
                                {formatCurrency(data.inward_supplies?.state_tax)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">ITC Available</p>
                            <p className="text-lg font-semibold text-blue-700">
                                {formatCurrency(data.inward_supplies?.total_input_tax_credit)}
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Tax Liability */}
            <Card>
                <div className="p-4 border-b border-gray-200 bg-purple-50">
                    <h3 className="font-semibold text-purple-900">Tax Liability</h3>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="text-gray-700">Central Tax (CGST)</span>
                            <span className="font-semibold text-gray-900">
                                {formatCurrency(data.tax_liability?.central_tax)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="text-gray-700">State Tax (SGST)</span>
                            <span className="font-semibold text-gray-900">
                                {formatCurrency(data.tax_liability?.state_tax)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-purple-100 rounded border-2 border-purple-300">
                            <span className="font-semibold text-purple-900">Total Tax Payable</span>
                            <span className="text-xl font-bold text-purple-700">
                                {formatCurrency(data.tax_liability?.total_tax_payable)}
                            </span>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Note */}
            {data.note && (
                <Alert variant="info">
                    <AlertCircle size={16} className="mr-2" />
                    {data.note}
                </Alert>
            )}
        </div>
    );
};

// HSN Summary Report Component
const HSNSummaryReport = ({ data, formatCurrency }) => {
    return (
        <div className="space-y-6">
            {/* Summary Card */}
            <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50">
                <h3 className="font-semibold text-gray-900 mb-4">HSN Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">Total Quantity</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {data.total?.total_quantity || 0}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Taxable Value</p>
                        <p className="text-xl font-semibold text-gray-900">
                            {formatCurrency(data.total?.total_taxable_value)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Total Tax</p>
                        <p className="text-xl font-semibold text-green-600">
                            {formatCurrency(data.total?.total_tax)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Total Value</p>
                        <p className="text-xl font-semibold text-blue-600">
                            {formatCurrency(data.total?.total_value)}
                        </p>
                    </div>
                </div>
            </Card>

            {/* HSN Table */}
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HSN Code</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">UQC</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxable Value</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tax Rate</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tax Amount</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data.hsn_summary?.length > 0 ? (
                                data.hsn_summary.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-mono text-gray-900">{item.hsn_code}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{item.description}</td>
                                        <td className="px-4 py-3 text-sm text-center text-gray-600">{item.uqc}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-900">{item.total_quantity}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(item.total_taxable_value)}</td>
                                        <td className="px-4 py-3 text-sm text-center text-gray-600">{item.tax_rate}%</td>
                                        <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">{formatCurrency(item.total_tax)}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium">{formatCurrency(item.total_value)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                                        No HSN data available
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Note */}
            {data.note && (
                <Alert variant="info">
                    <AlertCircle size={16} className="mr-2" />
                    {data.note}
                </Alert>
            )}
        </div>
    );
};

// Tax Liability Register Component
const TaxLiabilityReport = ({ data, formatCurrency }) => {
    return (
        <div className="space-y-6">
            {/* Annual Summary */}
            <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50">
                <h3 className="font-semibold text-gray-900 mb-4">Annual Summary - {data.year}</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">Outward Taxable</p>
                        <p className="text-lg font-semibold text-gray-900">
                            {formatCurrency(data.annual_summary?.total_outward_taxable_value)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Output Tax</p>
                        <p className="text-lg font-semibold text-green-600">
                            {formatCurrency(data.annual_summary?.total_output_tax)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Inward Taxable</p>
                        <p className="text-lg font-semibold text-gray-900">
                            {formatCurrency(data.annual_summary?.total_inward_taxable_value)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Input Tax Credit</p>
                        <p className="text-lg font-semibold text-blue-600">
                            {formatCurrency(data.annual_summary?.total_input_tax_credit)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Net Tax Liability</p>
                        <p className="text-xl font-bold text-purple-600">
                            {formatCurrency(data.annual_summary?.net_tax_liability)}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Monthly Breakdown */}
            <Card>
                <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Month-wise Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outward Taxable</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Output Tax</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Inward Taxable</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Input Tax Credit</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Tax Liability</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data.monthly_data?.map((month, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{month.month_name}</td>
                                    <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(month.outward_taxable_value)}</td>
                                    <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">{formatCurrency(month.output_tax)}</td>
                                    <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(month.inward_taxable_value)}</td>
                                    <td className="px-4 py-3 text-sm text-right text-blue-600 font-medium">{formatCurrency(month.input_tax_credit)}</td>
                                    <td className="px-4 py-3 text-sm text-right text-purple-600 font-semibold">{formatCurrency(month.net_tax_liability)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                            <tr>
                                <td className="px-4 py-3 text-sm font-bold text-gray-900">Total</td>
                                <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                                    {formatCurrency(data.annual_summary?.total_outward_taxable_value)}
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                                    {formatCurrency(data.annual_summary?.total_output_tax)}
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                                    {formatCurrency(data.annual_summary?.total_inward_taxable_value)}
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-bold text-blue-600">
                                    {formatCurrency(data.annual_summary?.total_input_tax_credit)}
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-bold text-purple-600">
                                    {formatCurrency(data.annual_summary?.net_tax_liability)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default GSTReportsTab;
