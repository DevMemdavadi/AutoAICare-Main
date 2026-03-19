import { useState, useEffect, useCallback } from 'react';
import api from '@/utils/api';
import { useAccountingFilter } from '@/contexts/AccountingFilterContext';
import { Card, Button, Select } from '@/components/ui';
import {
    FileText,
    Download,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Activity,
    BarChart3,
    PieChart,
    ArrowUpRight,
    ArrowDownRight,
    Receipt,
    Percent
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { StatCardSkeleton, ChartSkeleton, TableSkeleton } from './SkeletonLoaders';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

// Define report types outside component to prevent re-renders
const REPORT_TYPES = [
    { id: 'profit_loss', label: 'Profit & Loss', icon: TrendingUp, endpoint: 'profit_loss_statement' },
    { id: 'cash_flow', label: 'Cash Flow', icon: Activity, endpoint: 'cash_flow_report' },
    { id: 'tax_summary', label: 'Tax Summary', icon: Receipt, endpoint: 'tax_summary' },
];

const ReportsTab = () => {
    const { getFilterParams, formatCurrency, compareMode } = useAccountingFilter();

    const [activeReport, setActiveReport] = useState('profit_loss');
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchReport = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = {
                ...getFilterParams(),
                compare: compareMode ? 'true' : 'false'
            };

            // Ensure start_date and end_date are always provided (required by backend)
            if (!params.start_date || !params.end_date) {
                const today = new Date();
                const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

                params.start_date = params.start_date || firstDayOfMonth.toISOString().split('T')[0];
                params.end_date = params.end_date || today.toISOString().split('T')[0];
            }

            const currentReport = REPORT_TYPES.find(r => r.id === activeReport);
            if (!currentReport) return;

            console.log('Fetching report:', currentReport.endpoint, 'with params:', params);
            const response = await api.get(`/accounting/transactions/${currentReport.endpoint}/`, { params });
            setReportData(response.data);
        } catch (err) {
            console.error('Error fetching report:', err);
            console.error('Error response:', err.response?.data);
            setError(err.response?.data?.error || err.message || 'Failed to load report');
        } finally {
            setLoading(false);
        }
    }, [activeReport, getFilterParams, compareMode]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleExportPDF = async () => {
        if (!reportData) {
            alert('No report data to export');
            return;
        }

        try {
            const doc = new jsPDF();
            const currentReport = REPORT_TYPES.find(r => r.id === activeReport);

            // Add title
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text(currentReport.label, 14, 20);

            // Add period
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`Period: ${reportData.period.start_date} to ${reportData.period.end_date}`, 14, 28);

            let yPosition = 35;

            if (activeReport === 'profit_loss') {
                // P&L Statement
                const tableData = [
                    ['REVENUE', formatCurrency(reportData.revenue.total)],
                    ...reportData.revenue.breakdown.map(item => [`  ${item.source}`, formatCurrency(item.total)]),
                    ['', ''],
                    ['COST OF GOODS SOLD', `(${formatCurrency(reportData.cost_of_goods_sold.total)})`],
                    ...reportData.cost_of_goods_sold.breakdown.map(item => [`  ${item.category_display}`, `(${formatCurrency(item.total)})`]),
                    ['', ''],
                    ['GROSS PROFIT', formatCurrency(reportData.gross_profit)],
                    ['', ''],
                    ['OPERATING EXPENSES', `(${formatCurrency(reportData.operating_expenses.total)})`],
                    ...reportData.operating_expenses.breakdown.map(item => [`  ${item.category_display}`, `(${formatCurrency(item.total)})`]),
                    ['', ''],
                    ['OTHER EXPENSES', `(${formatCurrency(reportData.other_expenses.total)})`],
                    ...reportData.other_expenses.breakdown.map(item => [`  ${item.category_display}`, `(${formatCurrency(item.total)})`]),
                    ['', ''],
                    ['NET PROFIT', formatCurrency(reportData.net_profit)],
                    ['Profit Margin', `${reportData.profit_margin_percent}%`],
                ];

                autoTable(doc, {
                    startY: yPosition,
                    head: [['Description', 'Amount']],
                    body: tableData,
                    theme: 'striped',
                    headStyles: { fillColor: [59, 130, 246] },
                });
            } else if (activeReport === 'cash_flow') {
                // Cash Flow Statement
                const tableData = [
                    ['OPENING BALANCE', formatCurrency(reportData.opening_balance)],
                    ['', ''],
                    ['OPERATING ACTIVITIES', ''],
                    ['  Cash Inflow', formatCurrency(reportData.operating_activities.cash_inflow)],
                    ['  Cash Outflow', `(${formatCurrency(reportData.operating_activities.cash_outflow)})`],
                    ['  Net Operating Cash', formatCurrency(reportData.operating_activities.net_operating_cash)],
                    ['', ''],
                    ['INVESTING ACTIVITIES', ''],
                    ['  Capital Expenditure', `(${formatCurrency(reportData.investing_activities.cash_outflow)})`],
                    ['  Net Investing Cash', formatCurrency(reportData.investing_activities.net_investing_cash)],
                    ['', ''],
                    ['FINANCING ACTIVITIES', ''],
                    ['  Cash Inflow', formatCurrency(reportData.financing_activities.cash_inflow)],
                    ['  Cash Outflow', `(${formatCurrency(reportData.financing_activities.cash_outflow)})`],
                    ['  Net Financing Cash', formatCurrency(reportData.financing_activities.net_financing_cash)],
                    ['', ''],
                    ['NET CASH CHANGE', formatCurrency(reportData.net_cash_change)],
                    ['CLOSING BALANCE', formatCurrency(reportData.closing_balance)],
                ];

                autoTable(doc, {
                    startY: yPosition,
                    head: [['Activity', 'Amount']],
                    body: tableData,
                    theme: 'striped',
                    headStyles: { fillColor: [59, 130, 246] },
                });
            } else if (activeReport === 'tax_summary') {
                // Tax Summary
                const tableData = [
                    ['OUTPUT TAX (Collected)', formatCurrency(reportData.output_tax.total_tax_collected)],
                    ['  Total Sales', formatCurrency(reportData.output_tax.total_sales)],
                    ['', ''],
                    ['INPUT TAX (Paid)', `(${formatCurrency(reportData.input_tax.estimated_input_tax)})`],
                    ['  Total Purchases', formatCurrency(reportData.input_tax.total_purchases)],
                    ['', ''],
                    ['NET TAX PAYABLE', formatCurrency(reportData.net_tax_payable)],
                ];

                autoTable(doc, {
                    startY: yPosition,
                    head: [['Description', 'Amount']],
                    body: tableData,
                    theme: 'striped',
                    headStyles: { fillColor: [59, 130, 246] },
                });

                // Add tax breakdown by rate
                if (reportData.output_tax.breakdown_by_rate.length > 0) {
                    const breakdownData = reportData.output_tax.breakdown_by_rate.map(item => [
                        `${item.tax_rate}%`,
                        formatCurrency(item.total_sales),
                        formatCurrency(item.total_tax),
                        item.count.toString()
                    ]);

                    autoTable(doc, {
                        startY: doc.lastAutoTable.finalY + 10,
                        head: [['Tax Rate', 'Sales', 'Tax Amount', 'Invoices']],
                        body: breakdownData,
                        theme: 'striped',
                        headStyles: { fillColor: [34, 197, 94] },
                    });
                }
            }

            // Save the PDF
            doc.save(`${currentReport.label.replace(/\s+/g, '_')}_${reportData.period.start_date}_to_${reportData.period.end_date}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF: ' + error.message);
        }
    };

    const handleExportExcel = async () => {
        if (!reportData) {
            alert('No report data to export');
            return;
        }

        try {
            const currentReport = REPORT_TYPES.find(r => r.id === activeReport);

            let worksheetData = [];

            if (activeReport === 'profit_loss') {
                worksheetData = [
                    ['Profit & Loss Statement'],
                    [`Period: ${reportData.period.start_date} to ${reportData.period.end_date}`],
                    [],
                    ['Description', 'Amount'],
                    ['REVENUE', reportData.revenue.total],
                    ...reportData.revenue.breakdown.map(item => [`  ${item.source}`, item.total]),
                    [],
                    ['COST OF GOODS SOLD', reportData.cost_of_goods_sold.total],
                    ...reportData.cost_of_goods_sold.breakdown.map(item => [`  ${item.category_display}`, item.total]),
                    [],
                    ['GROSS PROFIT', reportData.gross_profit],
                    [],
                    ['OPERATING EXPENSES', reportData.operating_expenses.total],
                    ...reportData.operating_expenses.breakdown.map(item => [`  ${item.category_display}`, item.total]),
                    [],
                    ['OTHER EXPENSES', reportData.other_expenses.total],
                    ...reportData.other_expenses.breakdown.map(item => [`  ${item.category_display}`, item.total]),
                    [],
                    ['NET PROFIT', reportData.net_profit],
                    ['Profit Margin %', reportData.profit_margin_percent],
                ];
            } else if (activeReport === 'cash_flow') {
                worksheetData = [
                    ['Cash Flow Statement'],
                    [`Period: ${reportData.period.start_date} to ${reportData.period.end_date}`],
                    [],
                    ['Activity', 'Amount'],
                    ['OPENING BALANCE', reportData.opening_balance],
                    [],
                    ['OPERATING ACTIVITIES', ''],
                    ['  Cash Inflow', reportData.operating_activities.cash_inflow],
                    ['  Cash Outflow', reportData.operating_activities.cash_outflow],
                    ['  Net Operating Cash', reportData.operating_activities.net_operating_cash],
                    [],
                    ['INVESTING ACTIVITIES', ''],
                    ['  Capital Expenditure', reportData.investing_activities.cash_outflow],
                    ['  Net Investing Cash', reportData.investing_activities.net_investing_cash],
                    [],
                    ['FINANCING ACTIVITIES', ''],
                    ['  Cash Inflow', reportData.financing_activities.cash_inflow],
                    ['  Cash Outflow', reportData.financing_activities.cash_outflow],
                    ['  Net Financing Cash', reportData.financing_activities.net_financing_cash],
                    [],
                    ['NET CASH CHANGE', reportData.net_cash_change],
                    ['CLOSING BALANCE', reportData.closing_balance],
                ];
            } else if (activeReport === 'tax_summary') {
                worksheetData = [
                    ['Tax Summary Report'],
                    [`Period: ${reportData.period.start_date} to ${reportData.period.end_date}`],
                    [],
                    ['Description', 'Amount'],
                    ['OUTPUT TAX (Collected)', reportData.output_tax.total_tax_collected],
                    ['  Total Sales', reportData.output_tax.total_sales],
                    [],
                    ['INPUT TAX (Paid)', reportData.input_tax.estimated_input_tax],
                    ['  Total Purchases', reportData.input_tax.total_purchases],
                    [],
                    ['NET TAX PAYABLE', reportData.net_tax_payable],
                    [],
                    [],
                    ['Tax Breakdown by Rate'],
                    ['Tax Rate', 'Sales', 'Tax Amount', 'Invoices'],
                    ...reportData.output_tax.breakdown_by_rate.map(item => [
                        `${item.tax_rate}%`,
                        item.total_sales,
                        item.total_tax,
                        item.count
                    ]),
                ];
            }

            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, currentReport.label);

            // Save the file
            XLSX.writeFile(workbook, `${currentReport.label.replace(/\s+/g, '_')}_${reportData.period.start_date}_to_${reportData.period.end_date}.xlsx`);
        } catch (error) {
            console.error('Error generating Excel:', error);
            alert('Failed to generate Excel file: ' + error.message);
        }
    };

    const StatCard = ({ title, value, icon: Icon, color, change, changeLabel }) => (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className={`text-2xl font-bold mt-2 ${color}`}>
                        {formatCurrency(value)}
                    </p>
                    {change !== undefined && (
                        <div className={`flex items-center gap-1 mt-2 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            <span>{Math.abs(change).toFixed(2)}%</span>
                            {changeLabel && <span className="text-gray-500 ml-1">{changeLabel}</span>}
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '100')}`}>
                    <Icon className={color} size={20} />
                </div>
            </div>
        </div>
    );

    const renderProfitLossReport = () => {
        if (!reportData) return null;

        // Validate required data structure
        if (!reportData.revenue || !reportData.cost_of_goods_sold || !reportData.operating_expenses || !reportData.other_expenses) {
            return (
                <div className="p-8 text-center">
                    <p className="text-gray-600">Unable to load profit & loss report. Missing required data.</p>
                    <p className="text-sm text-gray-500 mt-2">Please check the console for errors or try selecting a different date range.</p>
                </div>
            );
        }

        const revenueChartData = {
            labels: (reportData.revenue?.breakdown || []).map(item => item.source),
            datasets: [{
                label: 'Revenue by Source',
                data: (reportData.revenue?.breakdown || []).map(item => item.total),
                backgroundColor: [
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(34, 197, 94, 0.7)',
                    'rgba(251, 191, 36, 0.7)',
                    'rgba(168, 85, 247, 0.7)',
                ],
                borderWidth: 2,
            }]
        };

        const expenseChartData = {
            labels: [
                ...(reportData.operating_expenses?.breakdown || []).map(item => item.category_display),
                ...(reportData.other_expenses?.breakdown || []).map(item => item.category_display)
            ],
            datasets: [{
                label: 'Expenses by Category',
                data: [
                    ...(reportData.operating_expenses?.breakdown || []).map(item => item.total),
                    ...(reportData.other_expenses?.breakdown || []).map(item => item.total)
                ],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.7)',
                    'rgba(251, 191, 36, 0.7)',
                    'rgba(168, 85, 247, 0.7)',
                    'rgba(236, 72, 153, 0.7)',
                    'rgba(20, 184, 166, 0.7)',
                ],
                borderWidth: 2,
            }]
        };

        return (
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Revenue"
                        value={reportData.revenue.total}
                        icon={TrendingUp}
                        color="text-green-600"
                        change={reportData.comparison?.changes.income_change_percent}
                        changeLabel="vs prev period"
                    />
                    <StatCard
                        title="Total Expenses"
                        value={reportData.total_expenses}
                        icon={TrendingDown}
                        color="text-red-600"
                        change={reportData.comparison?.changes.expense_change_percent}
                        changeLabel="vs prev period"
                    />
                    <StatCard
                        title="Net Profit"
                        value={reportData.net_profit}
                        icon={DollarSign}
                        color={reportData.net_profit >= 0 ? "text-blue-600" : "text-red-600"}
                        change={reportData.comparison?.changes.profit_change_percent}
                        changeLabel="vs prev period"
                    />
                    <StatCard
                        title="Profit Margin"
                        value={reportData.profit_margin_percent}
                        icon={Percent}
                        color="text-purple-600"
                    />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Revenue Breakdown">
                        <div className="h-80 flex items-center justify-center">
                            {reportData.revenue.breakdown.length > 0 ? (
                                <Pie data={revenueChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                            ) : (
                                <p className="text-gray-500">No revenue data</p>
                            )}
                        </div>
                    </Card>

                    <Card title="Expense Breakdown">
                        <div className="h-80">
                            <Doughnut data={expenseChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                        </div>
                    </Card>
                </div>

                {/* Detailed Breakdown */}
                <Card title="Profit & Loss Statement">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b-2 border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {/* Revenue Section */}
                                <tr className="bg-green-50">
                                    <td className="px-6 py-3 font-semibold text-gray-900">REVENUE</td>
                                    <td className="px-6 py-3 text-right font-semibold text-green-600">
                                        {formatCurrency(reportData.revenue.total)}
                                    </td>
                                </tr>
                                {reportData.revenue.breakdown.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-6 py-3 pl-12 text-gray-600">{item.source}</td>
                                        <td className="px-6 py-3 text-right text-gray-900">{formatCurrency(item.total)}</td>
                                    </tr>
                                ))}

                                {/* COGS Section */}
                                <tr className="bg-gray-50">
                                    <td className="px-6 py-3 font-semibold text-gray-900">COST OF GOODS SOLD</td>
                                    <td className="px-6 py-3 text-right font-semibold text-red-600">
                                        ({formatCurrency(reportData.cost_of_goods_sold.total)})
                                    </td>
                                </tr>
                                {reportData.cost_of_goods_sold.breakdown.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-6 py-3 pl-12 text-gray-600">{item.category_display}</td>
                                        <td className="px-6 py-3 text-right text-gray-900">({formatCurrency(item.total)})</td>
                                    </tr>
                                ))}

                                {/* Gross Profit */}
                                <tr className="bg-blue-50 font-semibold">
                                    <td className="px-6 py-3 text-gray-900">GROSS PROFIT</td>
                                    <td className="px-6 py-3 text-right text-blue-600">{formatCurrency(reportData.gross_profit)}</td>
                                </tr>

                                {/* Operating Expenses */}
                                <tr className="bg-gray-50">
                                    <td className="px-6 py-3 font-semibold text-gray-900">OPERATING EXPENSES</td>
                                    <td className="px-6 py-3 text-right font-semibold text-red-600">
                                        ({formatCurrency(reportData.operating_expenses.total)})
                                    </td>
                                </tr>
                                {reportData.operating_expenses.breakdown.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-6 py-3 pl-12 text-gray-600">{item.category_display}</td>
                                        <td className="px-6 py-3 text-right text-gray-900">({formatCurrency(item.total)})</td>
                                    </tr>
                                ))}

                                {/* Other Expenses */}
                                {reportData.other_expenses.breakdown.length > 0 && (
                                    <>
                                        <tr className="bg-gray-50">
                                            <td className="px-6 py-3 font-semibold text-gray-900">OTHER EXPENSES</td>
                                            <td className="px-6 py-3 text-right font-semibold text-red-600">
                                                ({formatCurrency(reportData.other_expenses.total)})
                                            </td>
                                        </tr>
                                        {reportData.other_expenses.breakdown.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-6 py-3 pl-12 text-gray-600">{item.category_display}</td>
                                                <td className="px-6 py-3 text-right text-gray-900">({formatCurrency(item.total)})</td>
                                            </tr>
                                        ))}
                                    </>
                                )}

                                {/* Net Profit */}
                                <tr className="bg-blue-100 font-bold border-t-2 border-blue-300">
                                    <td className="px-6 py-4 text-gray-900 text-lg">NET PROFIT</td>
                                    <td className={`px-6 py-4 text-right text-lg ${reportData.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(reportData.net_profit)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Comparison Section */}
                {reportData.comparison && (
                    <Card title="Period Comparison">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600 mb-2">Previous Period</p>
                                <p className="text-xs text-gray-500 mb-3">
                                    {reportData.comparison.previous_period.start_date} to {reportData.comparison.previous_period.end_date}
                                </p>
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-xs text-gray-500">Income</p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {formatCurrency(reportData.comparison.previous_period.total_income)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Expenses</p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {formatCurrency(reportData.comparison.previous_period.total_expenses)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Net Profit</p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {formatCurrency(reportData.comparison.previous_period.net_profit)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-gray-600 mb-2">Current Period</p>
                                <p className="text-xs text-gray-500 mb-3">
                                    {reportData.period.start_date} to {reportData.period.end_date}
                                </p>
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-xs text-gray-500">Income</p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {formatCurrency(reportData.revenue.total)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Expenses</p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {formatCurrency(reportData.total_expenses)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Net Profit</p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {formatCurrency(reportData.net_profit)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <p className="text-sm text-gray-600 mb-2">Change</p>
                                <p className="text-xs text-gray-500 mb-3">Period over Period</p>
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-xs text-gray-500">Income</p>
                                        <p className={`text-lg font-semibold ${reportData.comparison.changes.income_change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {reportData.comparison.changes.income_change_percent >= 0 ? '+' : ''}
                                            {reportData.comparison.changes.income_change_percent.toFixed(2)}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Expenses</p>
                                        <p className={`text-lg font-semibold ${reportData.comparison.changes.expense_change_percent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {reportData.comparison.changes.expense_change_percent >= 0 ? '+' : ''}
                                            {reportData.comparison.changes.expense_change_percent.toFixed(2)}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Net Profit</p>
                                        <p className={`text-lg font-semibold ${reportData.comparison.changes.profit_change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {reportData.comparison.changes.profit_change_percent >= 0 ? '+' : ''}
                                            {reportData.comparison.changes.profit_change_percent.toFixed(2)}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        );
    };

    const renderCashFlowReport = () => {
        if (!reportData) return null;

        // Validate required data structure
        if (!reportData.operating_activities || !reportData.investing_activities || !reportData.financing_activities) {
            return (
                <div className="p-8 text-center">
                    <p className="text-gray-600">Unable to load cash flow report. Missing required data.</p>
                    <p className="text-sm text-gray-500 mt-2">Please check the console for errors or try selecting a different date range.</p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Opening Balance"
                        value={reportData.opening_balance || 0}
                        icon={DollarSign}
                        color="text-gray-600"
                    />
                    <StatCard
                        title="Net Operating Cash"
                        value={reportData.operating_activities?.net_operating_cash || 0}
                        icon={Activity}
                        color={(reportData.operating_activities?.net_operating_cash || 0) >= 0 ? "text-green-600" : "text-red-600"}
                    />
                    <StatCard
                        title="Net Cash Change"
                        value={reportData.net_cash_change || 0}
                        icon={TrendingUp}
                        color={(reportData.net_cash_change || 0) >= 0 ? "text-green-600" : "text-red-600"}
                    />
                    <StatCard
                        title="Closing Balance"
                        value={reportData.closing_balance || 0}
                        icon={DollarSign}
                        color="text-blue-600"
                    />
                </div>

                {/* Detailed Cash Flow Statement */}
                <Card title="Cash Flow Statement">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b-2 border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Activity</th>
                                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {/* Opening Balance */}
                                <tr className="bg-blue-50">
                                    <td className="px-6 py-3 font-semibold text-gray-900">OPENING CASH BALANCE</td>
                                    <td className="px-6 py-3 text-right font-semibold text-blue-600">
                                        {formatCurrency(reportData.opening_balance || 0)}
                                    </td>
                                </tr>

                                {/* Operating Activities */}
                                <tr className="bg-green-50">
                                    <td className="px-6 py-3 font-semibold text-gray-900">OPERATING ACTIVITIES</td>
                                    <td className="px-6 py-3"></td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-3 pl-12 text-gray-600">Cash Inflow from Operations</td>
                                    <td className="px-6 py-3 text-right text-green-600">
                                        {formatCurrency(reportData.operating_activities?.cash_inflow || 0)}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-3 pl-12 text-gray-600">Cash Outflow from Operations</td>
                                    <td className="px-6 py-3 text-right text-red-600">
                                        ({formatCurrency(reportData.operating_activities?.cash_outflow || 0)})
                                    </td>
                                </tr>
                                <tr className="bg-green-100">
                                    <td className="px-6 py-3 pl-8 font-semibold text-gray-900">Net Operating Cash Flow</td>
                                    <td className={`px-6 py-3 text-right font-semibold ${(reportData.operating_activities?.net_operating_cash || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(reportData.operating_activities?.net_operating_cash || 0)}
                                    </td>
                                </tr>

                                {/* Investing Activities */}
                                <tr className="bg-purple-50">
                                    <td className="px-6 py-3 font-semibold text-gray-900">INVESTING ACTIVITIES</td>
                                    <td className="px-6 py-3"></td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-3 pl-12 text-gray-600">Capital Expenditure</td>
                                    <td className="px-6 py-3 text-right text-red-600">
                                        ({formatCurrency(reportData.investing_activities?.cash_outflow || 0)})
                                    </td>
                                </tr>
                                <tr className="bg-purple-100">
                                    <td className="px-6 py-3 pl-8 font-semibold text-gray-900">Net Investing Cash Flow</td>
                                    <td className="px-6 py-3 text-right font-semibold text-red-600">
                                        {formatCurrency(reportData.investing_activities?.net_investing_cash || 0)}
                                    </td>
                                </tr>

                                {/* Financing Activities */}
                                <tr className="bg-orange-50">
                                    <td className="px-6 py-3 font-semibold text-gray-900">FINANCING ACTIVITIES</td>
                                    <td className="px-6 py-3"></td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-3 pl-12 text-gray-600">Loans/Capital Received</td>
                                    <td className="px-6 py-3 text-right text-green-600">
                                        {formatCurrency(reportData.financing_activities?.cash_inflow || 0)}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-3 pl-12 text-gray-600">Loan Repayments</td>
                                    <td className="px-6 py-3 text-right text-red-600">
                                        ({formatCurrency(reportData.financing_activities?.cash_outflow || 0)})
                                    </td>
                                </tr>
                                <tr className="bg-orange-100">
                                    <td className="px-6 py-3 pl-8 font-semibold text-gray-900">Net Financing Cash Flow</td>
                                    <td className={`px-6 py-3 text-right font-semibold ${(reportData.financing_activities?.net_financing_cash || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(reportData.financing_activities?.net_financing_cash || 0)}
                                    </td>
                                </tr>

                                {/* Net Change */}
                                <tr className="bg-blue-100 font-semibold border-t-2 border-blue-300">
                                    <td className="px-6 py-4 text-gray-900">NET CHANGE IN CASH</td>
                                    <td className={`px-6 py-4 text-right ${(reportData.net_cash_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(reportData.net_cash_change || 0)}
                                    </td>
                                </tr>

                                {/* Closing Balance */}
                                <tr className="bg-blue-50 font-bold border-t-2 border-blue-300">
                                    <td className="px-6 py-4 text-gray-900 text-lg">CLOSING CASH BALANCE</td>
                                    <td className="px-6 py-4 text-right text-lg text-blue-600">
                                        {formatCurrency(reportData.closing_balance || 0)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        );
    };

    const renderTaxSummaryReport = () => {
        if (!reportData) return null;

        // Validate required data structure
        if (!reportData.output_tax || !reportData.input_tax) {
            return (
                <div className="p-8 text-center">
                    <p className="text-gray-600">Unable to load tax summary report. Missing required data.</p>
                    <p className="text-sm text-gray-500 mt-2">Please check the console for errors or try selecting a different date range.</p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Sales"
                        value={reportData.output_tax?.total_sales || 0}
                        icon={TrendingUp}
                        color="text-green-600"
                    />
                    <StatCard
                        title="Tax Collected"
                        value={reportData.output_tax?.total_tax_collected || 0}
                        icon={Receipt}
                        color="text-blue-600"
                    />
                    <StatCard
                        title="Input Tax (Est.)"
                        value={reportData.input_tax?.estimated_input_tax || 0}
                        icon={Receipt}
                        color="text-orange-600"
                    />
                    <StatCard
                        title="Net Tax Payable"
                        value={reportData.net_tax_payable || 0}
                        icon={DollarSign}
                        color={(reportData.net_tax_payable || 0) >= 0 ? "text-red-600" : "text-green-600"}
                    />
                </div>

                {/* Tax Summary Table */}
                <Card title="GST Summary">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b-2 border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                <tr className="bg-green-50">
                                    <td className="px-6 py-3 font-semibold text-gray-900">OUTPUT TAX (Tax Collected)</td>
                                    <td className="px-6 py-3 text-right font-semibold text-green-600">
                                        {formatCurrency(reportData.output_tax.total_tax_collected)}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-3 pl-12 text-gray-600">Total Sales (Taxable)</td>
                                    <td className="px-6 py-3 text-right text-gray-900">
                                        {formatCurrency(reportData.output_tax.total_sales)}
                                    </td>
                                </tr>

                                <tr className="bg-orange-50">
                                    <td className="px-6 py-3 font-semibold text-gray-900">INPUT TAX (Tax Paid)</td>
                                    <td className="px-6 py-3 text-right font-semibold text-orange-600">
                                        ({formatCurrency(reportData.input_tax.estimated_input_tax)})
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-3 pl-12 text-gray-600">Total Purchases</td>
                                    <td className="px-6 py-3 text-right text-gray-900">
                                        {formatCurrency(reportData.input_tax.total_purchases)}
                                    </td>
                                </tr>

                                <tr className="bg-blue-100 font-bold border-t-2 border-blue-300">
                                    <td className="px-6 py-4 text-gray-900 text-lg">NET TAX PAYABLE</td>
                                    <td className={`px-6 py-4 text-right text-lg ${reportData.net_tax_payable >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatCurrency(reportData.net_tax_payable)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {reportData.note && (
                        <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                            <p className="text-sm text-yellow-800">
                                <strong>Note:</strong> {reportData.note}
                            </p>
                        </div>
                    )}
                </Card>

                {/* Tax Breakdown by Rate */}
                {reportData.output_tax.breakdown_by_rate.length > 0 && (
                    <Card title="Tax Breakdown by Rate">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax Rate</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tax Amount</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Invoices</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {reportData.output_tax.breakdown_by_rate.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 text-sm font-medium text-gray-900">{item.tax_rate}%</td>
                                            <td className="px-6 py-3 text-sm text-right text-gray-900">
                                                {formatCurrency(item.total_sales)}
                                            </td>
                                            <td className="px-6 py-3 text-sm text-right text-blue-600 font-semibold">
                                                {formatCurrency(item.total_tax)}
                                            </td>
                                            <td className="px-6 py-3 text-sm text-right text-gray-600">{item.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Report Type Selector & Actions */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex gap-2">
                    {REPORT_TYPES.map(report => (
                        <button
                            key={report.id}
                            onClick={() => setActiveReport(report.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${activeReport === report.id
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <report.icon size={18} />
                            <span className="font-medium">{report.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportPDF} className="flex items-center gap-2">
                        <Download size={16} />
                        Export PDF
                    </Button>
                    <Button variant="outline" onClick={handleExportExcel} className="flex items-center gap-2">
                        <Download size={16} />
                        Export Excel
                    </Button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error Loading Report</h3>
                            <p className="mt-1 text-sm text-red-700">{error}</p>
                            <p className="mt-2 text-xs text-red-600">
                                Please ensure you have selected a date range using the Global Filter Bar above, or try refreshing the page.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="space-y-6">
                    {/* Summary Cards Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </div>
                    {/* Charts Skeleton */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartSkeleton />
                        <ChartSkeleton />
                    </div>
                    {/* Table Skeleton */}
                    <TableSkeleton rows={12} />
                </div>
            )}

            {/* Report Content */}
            {!loading && reportData && (
                <>
                    {activeReport === 'profit_loss' && renderProfitLossReport()}
                    {activeReport === 'cash_flow' && renderCashFlowReport()}
                    {activeReport === 'tax_summary' && renderTaxSummaryReport()}
                </>
            )}
        </div>
    );
};

export default ReportsTab;
