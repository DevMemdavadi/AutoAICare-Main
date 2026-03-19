import { useState, useEffect } from 'react';
import api from '@/utils/api';
import { useAccountingFilter } from '@/contexts/AccountingFilterContext';
import { Alert, Card, Button, Modal, Input, Select } from '@/components/ui';
import {
    Plus, Edit, DollarSign, Users, CheckCircle, XCircle,
    Calendar, Download, FileText, Eye, Mail, TrendingDown, RefreshCw
} from 'lucide-react';

const SalaryTab = () => {
    const { getFilterParams, formatCurrency } = useAccountingFilter();
    const [activeSubTab, setActiveSubTab] = useState('payroll'); // payroll, structures
    const [payrolls, setPayrolls] = useState([]);
    const [salaryStructures, setSalaryStructures] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState(null);
    const [localFilters, setLocalFilters] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        status: '',
        employee: ''
    });

    const [structureForm, setStructureForm] = useState({
        employee: '',
        base_salary: '',
        hra: '',
        transport_allowance: '',
        other_allowances: '',
        pf_deduction: '',
        esi_deduction: '',
        tds_deduction: '',
        incentive_per_job: '',
        incentive_per_qc_pass: '',
        overtime_hourly_rate: '',
        effective_from: new Date().toISOString().split('T')[0],
        is_active: true
    });

    // Add state for editing
    const [editingStructureId, setEditingStructureId] = useState(null);

    const [paymentForm, setPaymentForm] = useState({
        payment_method: 'bank_transfer',
        payment_date: new Date().toISOString().split('T')[0],
        // salary override field
        net_salary: '',
        salary_note: ''
    });
    const [showSalaryEdit, setShowSalaryEdit] = useState(false);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Alert state
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    // Confirmation modal state
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);

    const showAlert = (type, message) => {
        setAlert({ show: true, type, message });
    };

    useEffect(() => {
        fetchData();
    }, [localFilters, activeSubTab, getFilterParams]);

    const fetchData = async () => {
        try {
            setLoading(true);
            if (activeSubTab === 'payroll') {
                const globalParams = getFilterParams();
                const params = {
                    ...globalParams,
                    month: localFilters.month,
                    year: localFilters.year,
                    status: localFilters.status,
                    employee: localFilters.employee
                };

                // Remove empty params
                Object.keys(params).forEach(key => {
                    if (!params[key]) delete params[key];
                });

                const [payrollRes, employeesRes] = await Promise.all([
                    api.get('/accounting/payroll/', { params }),
                    api.get('/auth/users/?role=staff')
                ]);
                setPayrolls(payrollRes.data.results || []);
                setEmployees(employeesRes.data.results || []);
            } else {
                const [structuresRes, employeesRes] = await Promise.all([
                    api.get('/accounting/salary-structures/'),
                    api.get('/auth/users/?role=staff')
                ]);
                setSalaryStructures(structuresRes.data.results || []);
                setEmployees(employeesRes.data.results || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateBulkPayroll = () => {
        setConfirmAction({
            type: 'generate_payroll',
            message: `Generate payroll for all employees for ${months[localFilters.month - 1]} ${localFilters.year}?`,
            action: async () => {
                try {
                    const response = await api.post('/accounting/payroll/generate_bulk/', {
                        month: localFilters.month,
                        year: localFilters.year
                    });
                    showAlert('success', response.data.message);
                    fetchData();
                } catch (error) {
                    console.error('Error generating payroll:', error);
                    showAlert('error', 'Error generating payroll: ' + (error.response?.data?.detail || error.message));
                }
            }
        });
        setShowConfirmModal(true);
    };

    const handleConfirmAction = async () => {
        if (confirmAction && confirmAction.action) {
            await confirmAction.action();
        }
        setShowConfirmModal(false);
        setConfirmAction(null);
    };

    const handleCancelAction = () => {
        setShowConfirmModal(false);
        setConfirmAction(null);
    };

    const handleRecalculateBulk = () => {
        setConfirmAction({
            type: 'recalculate_payroll',
            message: `Recalculate all pending payroll records for ${months[localFilters.month - 1]} ${localFilters.year} using the latest salary structures? (Paid records will not be changed.)`,
            action: async () => {
                try {
                    const response = await api.post('/accounting/payroll/recalculate_bulk/', {
                        month: localFilters.month,
                        year: localFilters.year
                    });
                    showAlert('success', response.data.message);
                    fetchData();
                } catch (error) {
                    console.error('Error recalculating payroll:', error);
                    showAlert('error', 'Error recalculating payroll: ' + (error.response?.data?.detail || error.response?.data?.error || error.message));
                }
            }
        });
        setShowConfirmModal(true);
    };

    const handleRecalculateSingle = (payroll) => {
        setConfirmAction({
            type: 'recalculate_single',
            message: `Recalculate payroll for ${payroll.employee_name} (${months[localFilters.month - 1]} ${localFilters.year}) using the latest salary structure?`,
            action: async () => {
                try {
                    const response = await api.post(`/accounting/payroll/${payroll.id}/recalculate/`);
                    showAlert('success', response.data.message);
                    fetchData();
                } catch (error) {
                    console.error('Error recalculating payroll:', error);
                    showAlert('error', 'Error: ' + (error.response?.data?.detail || error.response?.data?.error || error.message));
                }
            }
        });
        setShowConfirmModal(true);
    };

    const handleEditStructure = (structure) => {
        setEditingStructureId(structure.id);
        setStructureForm({
            employee: structure.employee,
            base_salary: structure.base_salary,
            hra: structure.hra,
            transport_allowance: structure.transport_allowance,
            other_allowances: structure.other_allowances,
            pf_deduction: structure.pf_deduction,
            esi_deduction: structure.esi_deduction,
            tds_deduction: structure.tds_deduction,
            incentive_per_job: structure.incentive_per_job,
            incentive_per_qc_pass: structure.incentive_per_qc_pass,
            overtime_hourly_rate: structure.overtime_hourly_rate,
            effective_from: structure.effective_from || new Date().toISOString().split('T')[0],
            is_active: structure.is_active
        });
        setShowModal(true);
    };

    const handleMarkPaid = async () => {
        try {
            const payload = {
                payment_method: paymentForm.payment_method,
                payment_date: paymentForm.payment_date,
            };
            // Only send net_salary override if the user explicitly edited it
            if (showSalaryEdit && paymentForm.net_salary !== '') {
                payload.net_salary = paymentForm.net_salary;
                if (paymentForm.salary_note.trim()) payload.salary_note = paymentForm.salary_note.trim();
            }
            await api.post(`/accounting/payroll/${selectedPayroll.id}/mark_paid/`, payload);
            showAlert('success', 'Payroll marked as paid successfully!');
            setShowPaymentModal(false);
            setSelectedPayroll(null);
            setShowSalaryEdit(false);
            setPaymentForm({
                payment_method: 'bank_transfer',
                payment_date: new Date().toISOString().split('T')[0],
                net_salary: '', salary_note: ''
            });
            fetchData();
        } catch (error) {
            console.error('Error marking payroll as paid:', error);
            showAlert('error', 'Error: ' + (error.response?.data?.detail || error.response?.data?.error || error.message));
        }
    };

    const handleSaveStructure = async (e) => {
        e.preventDefault();
        // Sanitize payload - ensure hidden fields are 0 if empty
        const payload = {
            ...structureForm,
            hra: structureForm.hra || 0,
            transport_allowance: structureForm.transport_allowance || 0,
            other_allowances: structureForm.other_allowances || 0,
            pf_deduction: structureForm.pf_deduction || 0,
            esi_deduction: structureForm.esi_deduction || 0,
            tds_deduction: structureForm.tds_deduction || 0,
            incentive_per_job: structureForm.incentive_per_job || 0,
            incentive_per_qc_pass: structureForm.incentive_per_qc_pass || 0,
            overtime_hourly_rate: structureForm.overtime_hourly_rate || 0,
        };

        try {
            if (editingStructureId) {
                await api.patch(`/accounting/salary-structures/${editingStructureId}/`, payload);
                showAlert('success', 'Salary structure updated successfully!');
            } else {
                await api.post('/accounting/salary-structures/', payload);
                showAlert('success', 'Salary structure created successfully!');
            }
            setShowModal(false);
            resetStructureForm();
            fetchData();
        } catch (error) {
            console.error('Error saving salary structure:', error);
            showAlert('error', 'Error: ' + (error.response?.data?.detail || error.message));
        }
    };

    const resetStructureForm = () => {
        setStructureForm({
            employee: '',
            base_salary: '',
            hra: '',
            transport_allowance: '',
            other_allowances: '',
            pf_deduction: '',
            esi_deduction: '',
            tds_deduction: '',
            incentive_per_job: '',
            incentive_per_qc_pass: '',
            overtime_hourly_rate: '',
            effective_from: new Date().toISOString().split('T')[0],
            is_active: true
        });
        setEditingStructureId(null);
    };

    const downloadSalarySlip = async (payrollId) => {
        try {
            const response = await api.get(`/accounting/payroll/${payrollId}/salary_slip/`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `salary_slip_${payrollId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading salary slip:', error);
            showAlert('error', 'Error downloading salary slip');
        }
    };

    const emailSalarySlip = (payrollId, employeeName) => {
        setConfirmAction({
            type: 'email_salary_slip',
            message: `Send salary slip to ${employeeName}'s email?`,
            action: async () => {
                try {
                    await api.post(`/accounting/payroll/${payrollId}/email_salary_slip/`);
                    showAlert('success', `Salary slip sent to ${employeeName}'s email successfully!`);
                } catch (error) {
                    console.error('Error emailing salary slip:', error);
                    showAlert('error', 'Error sending email: ' + (error.response?.data?.detail || error.message));
                }
            }
        });
        setShowConfirmModal(true);
    };

    const totalPayroll = payrolls.reduce((sum, p) => sum + parseFloat(p.net_salary), 0);
    const paidPayroll = payrolls.filter(p => p.status === 'paid').reduce((sum, p) => sum + parseFloat(p.net_salary), 0);
    const pendingPayroll = payrolls.filter(p => p.status === 'pending').reduce((sum, p) => sum + parseFloat(p.net_salary), 0);

    return (
        <div className="space-y-6">
            {/* Alert Component */}
            {alert.show && (
                <Alert
                    type={alert.type}
                    message={alert.message}
                    onClose={() => setAlert({ show: false, type: '', message: '' })}
                />
            )}

            {/* Sub-tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                    {[
                        { id: 'payroll', label: 'Payroll Records' },
                        { id: 'structures', label: 'Salary Structures' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id)}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeSubTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Payroll Tab */}
            {activeSubTab === 'payroll' && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total Payroll</p>
                                    <p className="text-2xl font-bold text-gray-900">₹{totalPayroll.toLocaleString()}</p>
                                </div>
                                <DollarSign className="text-blue-600" size={32} />
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Paid</p>
                                    <p className="text-2xl font-bold text-green-600">₹{paidPayroll.toLocaleString()}</p>
                                </div>
                                <CheckCircle className="text-green-600" size={32} />
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Pending</p>
                                    <p className="text-2xl font-bold text-orange-600">₹{pendingPayroll.toLocaleString()}</p>
                                </div>
                                <XCircle className="text-orange-600" size={32} />
                            </div>
                        </Card>
                    </div>

                    {/* Filters & Actions */}
                    <Card className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <Select
                                label="Month"
                                value={localFilters.month}
                                onChange={(e) => setLocalFilters({ ...localFilters, month: parseInt(e.target.value) })}
                                options={months.map((month, index) => ({ value: index + 1, label: month }))}
                            />
                            <Select
                                label="Year"
                                value={localFilters.year}
                                onChange={(e) => setLocalFilters({ ...localFilters, year: parseInt(e.target.value) })}
                                options={Array.from({ length: 5 }, (_, i) => {
                                    const year = new Date().getFullYear() - i;
                                    return { value: year, label: year.toString() };
                                })}
                            />
                            <Select
                                label="Status"
                                value={localFilters.status}
                                onChange={(e) => setLocalFilters({ ...localFilters, status: e.target.value })}
                                options={[
                                    { value: '', label: 'All Status' },
                                    { value: 'pending', label: 'Pending' },
                                    { value: 'approved', label: 'Approved' },
                                    { value: 'paid', label: 'Paid' },
                                    { value: 'cancelled', label: 'Cancelled' }
                                ]}
                            />
                            <div className="flex gap-2 items-end flex-wrap">
                                <Button onClick={handleGenerateBulkPayroll} className="flex items-center gap-2">
                                    <Plus size={16} />
                                    Generate Payroll
                                </Button>
                                <Button
                                    onClick={handleRecalculateBulk}
                                    variant="outline"
                                    className="flex items-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                                    title="Recalculate all pending payrolls from updated salary structures"
                                >
                                    <RefreshCw size={16} />
                                    Recalculate All
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Payroll Table */}
                    <Card title={`Payroll Records (${payrolls.length})`}>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross Salary</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary Adjustment</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Salary</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                                        </tr>
                                    ) : payrolls.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                                No payroll records found. Click "Generate Payroll" to create.
                                            </td>
                                        </tr>
                                    ) : (
                                        payrolls.map((payroll) => (
                                            <tr key={payroll.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{payroll.employee_name}</p>
                                                        <p className="text-xs text-gray-500">{payroll.employee_role}</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500">
                                                    {payroll.month_name} {payroll.year}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                                    ₹{parseFloat(payroll.gross_salary).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-semibold">
                                                    {(() => {
                                                        const gross = parseFloat(payroll.gross_salary || 0);
                                                        const net = parseFloat(payroll.net_salary || 0);
                                                        const diff = net - gross;
                                                        if (diff > 0) {
                                                            // Net > Gross → bonus / extra paid
                                                            return (
                                                                <span className="text-green-600">
                                                                    +₹{diff.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                                </span>
                                                            );
                                                        } else if (diff < 0) {
                                                            // Net < Gross → deduction applied
                                                            return (
                                                                <span className="text-red-600">
                                                                    -₹{Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                                </span>
                                                            );
                                                        } else {
                                                            return <span className="text-gray-400 font-normal">₹0</span>;
                                                        }
                                                    })()}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-bold text-green-600">
                                                    ₹{parseFloat(payroll.net_salary).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${payroll.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                        payroll.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                                                            payroll.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {payroll.status_display}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedPayroll(payroll);
                                                                setShowDetailModal(true);
                                                            }}
                                                            className="text-indigo-600 hover:text-indigo-800"
                                                            title="View Details"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        {payroll.status !== 'paid' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleRecalculateSingle(payroll)}
                                                                    className="text-orange-500 hover:text-orange-700"
                                                                    title="Recalculate from latest salary structure"
                                                                >
                                                                    <RefreshCw size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedPayroll(payroll);
                                                                        setShowPaymentModal(true);
                                                                    }}
                                                                    className="text-green-600 hover:text-green-800"
                                                                    title="Mark as Paid"
                                                                >
                                                                    <CheckCircle size={16} />
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => downloadSalarySlip(payroll.id)}
                                                            className="text-blue-600 hover:text-blue-800"
                                                            title="Download Salary Slip"
                                                        >
                                                            <Download size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => emailSalarySlip(payroll.id, payroll.employee_name)}
                                                            className="text-purple-600 hover:text-purple-800"
                                                            title="Email Salary Slip"
                                                        >
                                                            <Mail size={16} />
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
                </>
            )}

            {/* Salary Structures Tab */}
            {activeSubTab === 'structures' && (
                <>
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Salary Structures</h2>
                        <Button onClick={() => {
                            resetStructureForm();
                            setShowModal(true);
                        }} className="flex items-center gap-2">
                            <Plus size={16} />
                            Add Salary Structure
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            <p className="text-gray-500">Loading...</p>
                        ) : salaryStructures.length === 0 ? (
                            <p className="text-gray-500">No salary structures found. Add one to get started.</p>
                        ) : (
                            salaryStructures.map((structure) => (
                                <Card key={structure.id} className="p-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-semibold text-lg">{structure.employee_name}</h3>
                                                <p className="text-sm text-gray-500">{structure.employee_role}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={`px-2 py-1 text-xs font-medium rounded-full ${structure.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {structure.is_active ? 'Active' : 'Inactive'}
                                                </div>
                                                <button
                                                    onClick={() => handleEditStructure(structure)}
                                                    className="p-1 hover:bg-gray-100 rounded-full text-blue-600 transition-colors"
                                                    title="Edit Structure"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Base Salary:</span>
                                                <span className="font-semibold">₹{parseFloat(structure.base_salary).toLocaleString()}</span>
                                            </div>
                                            {/* Hidden fields
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">HRA:</span>
                                                <span>₹{parseFloat(structure.hra).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Transport:</span>
                                                <span>₹{parseFloat(structure.transport_allowance).toLocaleString()}</span>
                                            </div>
                                            */}
                                            <div className="border-t pt-2 flex justify-between font-semibold">
                                                <span className="text-green-600">Gross Salary:</span>
                                                <span className="text-green-600">₹{parseFloat(structure.gross_salary || 0).toLocaleString()}</span>
                                            </div>
                                            {/* Hidden Deductions
                                            <div className="flex justify-between text-red-600">
                                                <span>Total Deductions:</span>
                                                <span>-₹{structure.total_deductions.toLocaleString()}</span>
                                            </div>
                                            */}
                                            <div className="border-t pt-2 flex justify-between font-bold text-lg">
                                                <span className="text-blue-600">Net Salary:</span>
                                                <span className="text-blue-600">₹{structure.net_salary.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <div className="text-xs text-gray-500">
                                            Effective from: {new Date(structure.effective_from).toLocaleDateString()}
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Add Salary Structure Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    resetStructureForm();
                }}
                title={editingStructureId ? "Edit Salary Structure" : "Add Salary Structure"}
            >
                {!editingStructureId && employees.filter(emp => !salaryStructures.some(s => s.employee === emp.id)).length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-600 mb-4">All employees in your branch already have salary structures.</p>
                        <Button variant="outline" onClick={() => setShowModal(false)}>
                            Close
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSaveStructure} className="space-y-4">
                        <Select
                            label="Employee"
                            value={structureForm.employee}
                            onChange={(e) => setStructureForm({ ...structureForm, employee: e.target.value })}
                            required
                            disabled={!!editingStructureId}
                            options={[
                                { value: '', label: 'Select Employee' },
                                ...employees
                                    .filter(emp => !salaryStructures.some(s => s.employee === emp.id && s.id !== editingStructureId))
                                    .map(emp => ({ value: emp.id, label: `${emp.name} (${emp.role})` }))
                            ]}
                        />

                        <div className="space-y-2">
                            {/* <h4 className="font-semibold text-sm text-gray-700">Salary Components</h4> */}
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Base Salary"
                                    type="number"
                                    value={structureForm.base_salary}
                                    onChange={(e) => setStructureForm({ ...structureForm, base_salary: e.target.value })}
                                    required
                                    min="0"
                                    step="0.01"
                                />
                                {/* Hidden fields as per requirement
                                <Input
                                    label="HRA"
                                    type="number"
                                    value={structureForm.hra}
                                    onChange={(e) => setStructureForm({ ...structureForm, hra: e.target.value })}
                                    min="0"
                                    step="0.01"
                                />
                                <Input
                                    label="Transport Allowance"
                                    type="number"
                                    value={structureForm.transport_allowance}
                                    onChange={(e) => setStructureForm({ ...structureForm, transport_allowance: e.target.value })}
                                    min="0"
                                    step="0.01"
                                />
                                <Input
                                    label="Other Allowances"
                                    type="number"
                                    value={structureForm.other_allowances}
                                    onChange={(e) => setStructureForm({ ...structureForm, other_allowances: e.target.value })}
                                    min="0"
                                    step="0.01"
                                />
                                */}
                            </div>
                        </div>

                        {/* Hidden Deductions
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-gray-700">Deductions</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <Input
                                    label="PF"
                                    type="number"
                                    value={structureForm.pf_deduction}
                                    onChange={(e) => setStructureForm({ ...structureForm, pf_deduction: e.target.value })}
                                    min="0"
                                    step="0.01"
                                />
                                <Input
                                    label="ESI"
                                    type="number"
                                    value={structureForm.esi_deduction}
                                    onChange={(e) => setStructureForm({ ...structureForm, esi_deduction: e.target.value })}
                                    min="0"
                                    step="0.01"
                                />
                                <Input
                                    label="TDS"
                                    type="number"
                                    value={structureForm.tds_deduction}
                                    onChange={(e) => setStructureForm({ ...structureForm, tds_deduction: e.target.value })}
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>
                        */}

                        {/* Hidden Incentives
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-gray-700">Incentives</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Per Job Completion"
                                    type="number"
                                    value={structureForm.incentive_per_job}
                                    onChange={(e) => setStructureForm({ ...structureForm, incentive_per_job: e.target.value })}
                                    min="0"
                                    step="0.01"
                                />
                                <Input
                                    label="Per QC Pass"
                                    type="number"
                                    value={structureForm.incentive_per_qc_pass}
                                    onChange={(e) => setStructureForm({ ...structureForm, incentive_per_qc_pass: e.target.value })}
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>
                        */}

                        {/* Hidden Overtime
                        <Input
                            label="Overtime Hourly Rate"
                            type="number"
                            value={structureForm.overtime_hourly_rate}
                            onChange={(e) => setStructureForm({ ...structureForm, overtime_hourly_rate: e.target.value })}
                            min="0"
                            step="0.01"
                        />
                        */}

                        {/* <Input
                            label="Effective From"
                            type="date"
                            value={structureForm.effective_from}
                            onChange={(e) => setStructureForm({ ...structureForm, effective_from: e.target.value })}
                            required
                        /> */}

                        <div className="flex justify-end gap-3 mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowModal(false);
                                    resetStructureForm();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">
                                {editingStructureId ? 'Update Salary Structure' : 'Save Salary Structure'}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Mark as Paid Modal */}
            <Modal
                isOpen={showPaymentModal}
                onClose={() => {
                    setShowPaymentModal(false);
                    setSelectedPayroll(null);
                    setShowSalaryEdit(false);
                    setPaymentForm({
                        payment_method: 'bank_transfer',
                        payment_date: new Date().toISOString().split('T')[0],
                        net_salary: '', salary_note: ''
                    });
                }}
                title="Mark Payroll as Paid"
            >
                {selectedPayroll && (
                    <div className="space-y-4">
                        {/* Employee Summary */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Employee:</span>
                                <span className="font-semibold text-gray-900">{selectedPayroll.employee_name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Role:</span>
                                <span className="text-sm text-gray-700 capitalize">{selectedPayroll.employee_role}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Period:</span>
                                <span className="font-semibold text-gray-900">{selectedPayroll.month_name} {selectedPayroll.year}</span>
                            </div>
                            <div className="border-t border-blue-200 pt-2 mt-2 space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Gross Salary:</span>
                                    <span className="font-medium">₹{parseFloat(selectedPayroll.gross_salary || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Deductions:</span>
                                    <span className="font-medium text-red-600">-₹{parseFloat(selectedPayroll.deductions || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-lg border-t border-blue-200 pt-1 mt-1">
                                    <span className="font-semibold text-gray-700">Net Salary:</span>
                                    <span className="font-bold text-green-600">₹{parseFloat(
                                        showSalaryEdit && paymentForm.net_salary !== '' ? paymentForm.net_salary : selectedPayroll.net_salary || 0
                                    ).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Salary Adjustment Toggle */}
                        <div className="border border-orange-200 rounded-xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => {
                                    const next = !showSalaryEdit;
                                    setShowSalaryEdit(next);
                                    if (next) {
                                        // Pre-fill with current net salary
                                        setPaymentForm(f => ({
                                            ...f,
                                            net_salary: parseFloat(selectedPayroll.net_salary || 0).toString(),
                                        }));
                                    } else {
                                        setPaymentForm(f => ({ ...f, net_salary: '', salary_note: '' }));
                                    }
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors ${showSalaryEdit
                                    ? 'bg-orange-50 text-orange-700 border-b border-orange-200'
                                    : 'bg-white text-gray-600 hover:bg-orange-50 hover:text-orange-700'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Edit size={15} />
                                    <span>Adjust Salary Before Payment</span>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${showSalaryEdit ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {showSalaryEdit ? 'Editing' : 'Optional'}
                                </span>
                            </button>

                            {showSalaryEdit && (
                                <div className="p-4 bg-orange-50 space-y-3">
                                    <p className="text-xs text-orange-600 bg-orange-100 rounded-lg px-3 py-2">
                                        ⚠️ Enter the net salary amount to pay. This will override the calculated net salary.
                                    </p>
                                    {/* Frozen Gross Salary — read-only */}
                                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex justify-between items-center">
                                        <span className="text-sm text-gray-500 font-medium">Gross Salary</span>
                                        <span className="text-sm font-bold text-gray-800">
                                            ₹{parseFloat(selectedPayroll.gross_salary || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    {/* Editable Net Salary to Pay */}
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Net Salary to Pay (₹)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={paymentForm.net_salary}
                                            onChange={(e) => setPaymentForm(f => ({ ...f, net_salary: e.target.value }))}
                                            placeholder="Enter net salary amount"
                                            className="w-full border border-orange-300 rounded-lg px-4 py-3 text-lg font-bold text-green-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                                        />
                                    </div>
                                    <Input
                                        label="Reason for Adjustment"
                                        type="text"
                                        value={paymentForm.salary_note}
                                        onChange={(e) => setPaymentForm(f => ({ ...f, salary_note: e.target.value }))}
                                        placeholder="e.g. Bonus added, partial month, advance deducted..."
                                    />
                                </div>
                            )}
                        </div>

                        {/* Payment Details */}
                        <Select
                            label="Payment Method"
                            value={paymentForm.payment_method}
                            onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                            options={[
                                { value: 'bank_transfer', label: 'Bank Transfer' },
                                { value: 'cash', label: 'Cash' },
                                { value: 'cheque', label: 'Cheque' },
                                { value: 'upi', label: 'UPI' }
                            ]}
                        />

                        <Input
                            label="Payment Date"
                            type="date"
                            value={paymentForm.payment_date}
                            onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                            required
                        />

                        <div className="flex justify-end gap-3 mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowPaymentModal(false);
                                    setSelectedPayroll(null);
                                    setShowSalaryEdit(false);
                                    setPaymentForm({
                                        payment_method: 'Bank Transfer',
                                        payment_date: new Date().toISOString().split('T')[0],
                                        net_salary: '', salary_note: ''
                                    });
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleMarkPaid} className="bg-green-600 hover:bg-green-700">
                                ✓ Confirm Payment
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Confirmation Modal */}
            <Modal
                isOpen={showConfirmModal}
                onClose={handleCancelAction}
                title="Confirm Action"
            >
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-blue-800">{confirmAction?.message}</p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={handleCancelAction}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmAction}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Confirm
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Payroll Detail Modal */}
            <Modal
                isOpen={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedPayroll(null);
                }}
                title="Payroll Details"
            >
                {selectedPayroll && (
                    <div className="space-y-6">
                        {/* Employee Info */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{selectedPayroll.employee_name}</h3>
                                    <p className="text-sm text-gray-600">{selectedPayroll.employee_role}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600">Period</p>
                                    <p className="font-semibold">{selectedPayroll.month_name} {selectedPayroll.year}</p>
                                </div>
                            </div>
                        </div>

                        {/* Attendance Integration */}
                        {selectedPayroll.attendance_data && (
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Calendar size={18} className="text-blue-600" />
                                    Attendance Summary
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-green-50 p-3 rounded">
                                        <p className="text-xs text-gray-600">Days Present</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            {selectedPayroll.attendance_data.days_present || 0}
                                        </p>
                                    </div>
                                    <div className="bg-red-50 p-3 rounded">
                                        <p className="text-xs text-gray-600">Days Absent</p>
                                        <p className="text-2xl font-bold text-red-600">
                                            {selectedPayroll.attendance_data.days_absent || 0}
                                        </p>
                                    </div>
                                    <div className="bg-yellow-50 p-3 rounded">
                                        <p className="text-xs text-gray-600">Half Days</p>
                                        <p className="text-2xl font-bold text-yellow-600">
                                            {selectedPayroll.attendance_data.days_half_day || 0}
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 p-3 rounded">
                                        <p className="text-xs text-gray-600">On Leave</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {selectedPayroll.attendance_data.days_on_leave || 0}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-4">
                                    <div className="bg-purple-50 p-3 rounded">
                                        <p className="text-xs text-gray-600">Total Hours Worked</p>
                                        <p className="text-xl font-semibold text-purple-600">
                                            {selectedPayroll.attendance_data.total_hours_worked || 0} hrs
                                        </p>
                                    </div>
                                    <div className="bg-orange-50 p-3 rounded">
                                        <p className="text-xs text-gray-600">Overtime Hours</p>
                                        <p className="text-xl font-semibold text-orange-600">
                                            {selectedPayroll.attendance_data.overtime_hours || 0} hrs
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Salary Breakdown */}
                        <div className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <DollarSign size={18} className="text-green-600" />
                                Salary Breakdown
                            </h4>

                            {/* Base Components */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Base Salary</span>
                                    <span className="font-medium">₹{parseFloat(selectedPayroll.base_salary || 0).toLocaleString()}</span>
                                </div>
                                {/* HRA, Transport, Other Allowances
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">HRA</span>
                                    <span className="font-medium">₹{parseFloat(selectedPayroll.hra || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Transport Allowance</span>
                                    <span className="font-medium">₹{parseFloat(selectedPayroll.transport_allowance || 0).toLocaleString()}</span>
                                </div>
                                {selectedPayroll.other_allowances > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Other Allowances</span>
                                        <span className="font-medium">₹{parseFloat(selectedPayroll.other_allowances).toLocaleString()}</span>
                                    </div>
                                )}
                                */}

                                {/* Incentives
                                {selectedPayroll.total_incentives > 0 && (
                                    <div className="flex justify-between text-sm bg-green-50 p-2 rounded">
                                        <span className="text-green-700 font-medium">Total Incentives</span>
                                        <span className="text-green-700 font-semibold">+₹{parseFloat(selectedPayroll.total_incentives).toLocaleString()}</span>
                                    </div>
                                )}
                                */}

                                {/* Overtime
                                {selectedPayroll.overtime_pay > 0 && (
                                    <div className="flex justify-between text-sm bg-orange-50 p-2 rounded">
                                        <span className="text-orange-700 font-medium">
                                            Overtime Pay ({selectedPayroll.attendance_data?.overtime_hours || 0} hrs)
                                        </span>
                                        <span className="text-orange-700 font-semibold">+₹{parseFloat(selectedPayroll.overtime_pay).toLocaleString()}</span>
                                    </div>
                                )}
                                */}

                                <div className="border-t pt-2 flex justify-between font-semibold text-green-600">
                                    <span>Gross Salary</span>
                                    <span>₹{parseFloat(selectedPayroll.gross_salary || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Deductions
                        <div className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <TrendingDown size={18} className="text-red-600" />
                                Deductions
                            </h4>
                            <div className="space-y-2">
                                {selectedPayroll.pf_deduction > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">PF Deduction</span>
                                        <span className="text-red-600">-₹{parseFloat(selectedPayroll.pf_deduction).toLocaleString()}</span>
                                    </div>
                                )}
                                {selectedPayroll.esi_deduction > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">ESI Deduction</span>
                                        <span className="text-red-600">-₹{parseFloat(selectedPayroll.esi_deduction).toLocaleString()}</span>
                                    </div>
                                )}
                                {selectedPayroll.tds_deduction > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">TDS Deduction</span>
                                        <span className="text-red-600">-₹{parseFloat(selectedPayroll.tds_deduction).toLocaleString()}</span>
                                    </div>
                                )}
                                {selectedPayroll.absence_deduction > 0 && (
                                    <div className="flex justify-between text-sm bg-red-50 p-2 rounded">
                                        <span className="text-red-700 font-medium">
                                            Absence Deduction ({selectedPayroll.attendance_data?.days_absent || 0} days)
                                        </span>
                                        <span className="text-red-700 font-semibold">-₹{parseFloat(selectedPayroll.absence_deduction).toLocaleString()}</span>
                                    </div>
                                )}
                                {selectedPayroll.other_deductions > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Other Deductions</span>
                                        <span className="text-red-600">-₹{parseFloat(selectedPayroll.other_deductions).toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="border-t pt-2 flex justify-between font-semibold text-red-600">
                                    <span>Total Deductions</span>
                                    <span>-₹{parseFloat(selectedPayroll.deductions).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        */}

                        {/* Net Salary */}
                        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-4 rounded-lg border-2 border-blue-300">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-bold text-blue-900">Net Salary</span>
                                <span className="text-2xl font-bold text-blue-600">
                                    ₹{parseFloat(selectedPayroll.net_salary).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Notes */}
                        {selectedPayroll.notes && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm font-medium text-yellow-800 mb-1">Notes:</p>
                                <p className="text-sm text-yellow-700">{selectedPayroll.notes}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowDetailModal(false);
                                    setSelectedPayroll(null);
                                }}
                            >
                                Close
                            </Button>
                            <Button
                                onClick={() => downloadSalarySlip(selectedPayroll.id)}
                                className="flex items-center gap-2"
                            >
                                <Download size={16} />
                                Download Slip
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default SalaryTab;
