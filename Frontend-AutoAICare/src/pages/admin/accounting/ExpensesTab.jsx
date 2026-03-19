import { useState, useEffect } from 'react';
import api from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountingFilter } from '@/contexts/AccountingFilterContext';
import { Card, Button, Modal, Input, Select, Textarea } from '@/components/ui';
import ExpenseFormModal from '@/components/accounting/ExpenseFormModal';
import {
    Plus, Edit, Trash2, Upload, Download, Filter, Search,
    Calendar, DollarSign, Tag, Building, User, FileText
} from 'lucide-react';
import { StatCardSkeleton, TableSkeleton, FilterBarSkeleton } from './SkeletonLoaders';

const ExpensesTab = () => {
    const { user } = useAuth();
    const { getFilterParams, formatCurrency } = useAccountingFilter();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [localFilters, setLocalFilters] = useState({
        search: '',
        category: '',
        vendor: '',
        payment_status: ''
    });

    useEffect(() => {
        fetchData();
    }, [localFilters, getFilterParams]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const globalParams = getFilterParams();
            const params = {
                ...globalParams,
                search: localFilters.search,
                category: localFilters.category,
                vendor: localFilters.vendor,
                payment_status: localFilters.payment_status
            };

            // Remove empty params
            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });

            const expensesRes = await api.get('/accounting/expenses/', { params });
            setExpenses(expensesRes.data.results || []);
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setLoading(false);
        }
    };



    const exportToExcel = async () => {
        try {
            const globalParams = getFilterParams();
            const params = {
                ...globalParams,
                search: localFilters.search,
                category: localFilters.category,
                vendor: localFilters.vendor,
                payment_status: localFilters.payment_status
            };

            // Remove empty params
            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });

            const response = await api.get('/accounting/expenses/export_excel/', {
                responseType: 'blob',
                params
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert('Failed to export data. Please try again.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this expense?')) {
            try {
                await api.delete(`/accounting/expenses/${id}/`);
                fetchData();
            } catch (error) {
                console.error('Error deleting expense:', error);
            }
        }
    };

    const paymentStatusOptions = [
        { value: '', label: 'All Status' },
        { value: 'paid', label: 'Paid' },
        { value: 'pending', label: 'Pending' },
        { value: 'partial', label: 'Partially Paid' }
    ];

    const categoryOptions = [
        { value: '', label: 'All Categories' },
        { value: 'inventory', label: 'Inventory Purchase' },
        { value: 'salary', label: 'Salary/Wages' },
        { value: 'utilities', label: 'Utilities' },
        { value: 'rent', label: 'Rent' },
        { value: 'maintenance', label: 'Maintenance & Repairs' },
        { value: 'marketing', label: 'Marketing & Advertising' },
        { value: 'software', label: 'Software & Subscriptions' },
        { value: 'equipment', label: 'Equipment Purchase' },
        { value: 'supplies', label: 'Office Supplies' },
        { value: 'fuel', label: 'Fuel & Transport' },
        { value: 'insurance', label: 'Insurance' },
        { value: 'taxes', label: 'Taxes & Fees' },
        { value: 'other', label: 'Other' }
    ];

    // Enhanced calculations for partial payments
    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

    // Total paid includes fully paid + partial amounts paid
    const totalPaid = expenses.reduce((sum, exp) => {
        return sum + parseFloat(exp.paid_amount || 0);
    }, 0);

    // Total payables includes pending + remaining from partial payments
    const totalPayables = expenses.reduce((sum, exp) => {
        return sum + parseFloat(exp.remaining_amount || 0);
    }, 0);

    const partialPayments = expenses.filter(e => e.payment_status === 'partial');

    return (
        <div className="space-y-6">
            {loading ? (
                <>
                    {/* Summary Cards Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </div>
                    {/* Filters Skeleton */}
                    <FilterBarSkeleton />
                    {/* Table Skeleton */}
                    <TableSkeleton rows={10} />
                </>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total Expenses</p>
                                    <p className="text-2xl font-bold text-gray-900">₹{totalExpenses.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500 mt-1">{expenses.length} expense(s)</p>
                                </div>
                                <DollarSign className="text-blue-600" size={32} />
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total Paid</p>
                                    <p className="text-2xl font-bold text-green-600">₹{totalPaid.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500 mt-1">Including partial payments</p>
                                </div>
                                <FileText className="text-green-600" size={32} />
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total Payables</p>
                                    <p className="text-2xl font-bold text-orange-600">₹{totalPayables.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500 mt-1">Pending + Due amounts</p>
                                </div>
                                <FileText className="text-orange-600" size={32} />
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Partial Payments</p>
                                    <p className="text-2xl font-bold text-yellow-600">{partialPayments.length}</p>
                                    <p className="text-xs text-gray-500 mt-1">In progress</p>
                                </div>
                                <Tag className="text-yellow-600" size={32} />
                            </div>
                        </Card>
                    </div>

                    {/* Filters & Actions */}
                    <Card className="p-4">
                        <div className="flex flex-col md:flex-row gap-4 mb-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Search expenses..."
                                    value={localFilters.search}
                                    onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
                                    icon={Search}
                                />
                            </div>
                            <Select
                                value={localFilters.category}
                                onChange={(e) => setLocalFilters({ ...localFilters, category: e.target.value })}
                                options={categoryOptions}
                            />
                            <Select
                                value={localFilters.payment_status}
                                onChange={(e) => setLocalFilters({ ...localFilters, payment_status: e.target.value })}
                                options={paymentStatusOptions}
                            />
                        </div>

                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex gap-2 items-end ml-auto">
                                <Button onClick={() => {
                                    setEditingExpense(null);
                                    setShowModal(true);
                                }} className="flex items-center gap-2">
                                    <Plus size={16} />
                                    Add Expense
                                </Button>
                                <Button onClick={exportToExcel} variant="outline" className="flex items-center gap-2">
                                    <Download size={16} />
                                    Export
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Expenses Table */}
                    <Card title={`Expenses (${expenses.length})`}>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                                        </tr>
                                    ) : expenses.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No expenses found</td>
                                        </tr>
                                    ) : (
                                        expenses.map((expense) => (
                                            <tr key={expense.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-500">{new Date(expense.date).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{expense.title}</td>
                                                <td className="px-4 py-3 text-sm text-gray-500 capitalize">{expense.category_display}</td>
                                                <td className="px-4 py-3 text-sm text-gray-500">{expense.vendor_details?.name || expense.vendor_name || '-'}</td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm">
                                                        <div className="font-semibold text-gray-900">₹{parseFloat(expense.amount).toLocaleString()}</div>
                                                        {expense.payment_status === 'partial' && expense.partial_amount && (
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                <span className="text-green-600">Paid: ₹{parseFloat(expense.paid_amount || 0).toLocaleString()}</span>
                                                                <span className="mx-1">•</span>
                                                                <span className="text-orange-600">Due: ₹{parseFloat(expense.remaining_amount || 0).toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-xs text-gray-600 capitalize">
                                                        {expense.payment_method_display || 'Cash'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${expense.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                                        expense.payment_status === 'pending' ? 'bg-orange-100 text-orange-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {expense.payment_status_display}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2">
                                                        {expense.receipt && (
                                                            <a
                                                                href={expense.receipt}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-green-600 hover:text-green-800"
                                                                title="View Receipt"
                                                            >
                                                                <FileText size={16} />
                                                            </a>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                setEditingExpense(expense);
                                                                setShowModal(true);
                                                            }}
                                                            className="text-blue-600 hover:text-blue-800"
                                                            title="Edit"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(expense.id)}
                                                            className="text-red-600 hover:text-red-800"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Add/Edit Expense Modal */}
                    <ExpenseFormModal
                        isOpen={showModal}
                        onClose={() => {
                            setShowModal(false);
                            setEditingExpense(null);
                        }}
                        editingExpense={editingExpense}
                        onSuccess={fetchData}
                    />
                </>
            )}
        </div>
    );
};

export default ExpensesTab;

