import { useState, useEffect } from 'react';
import api from '@/utils/api';
import { Card, Button, Alert, Modal, Input, Select } from '@/components/ui';
import {
    Calendar,
    Clock,
    Users,
    CheckCircle,
    XCircle,
    AlertCircle,
    TrendingUp,
    Download,
    Plus,
    Edit,
    Save,
    X
} from 'lucide-react';

const AttendanceTab = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [dailySummary, setDailySummary] = useState(null);
    const [monthlySummaries, setMonthlySummaries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showBulkMarkModal, setShowBulkMarkModal] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [activeView, setActiveView] = useState('daily'); // daily, monthly, summary

    // Fetch employees
    useEffect(() => {
        fetchEmployees();
    }, []);

    // Fetch attendance data when date changes
    useEffect(() => {
        if (activeView === 'daily') {
            fetchDailyAttendance();
            fetchDailySummary();
        } else if (activeView === 'monthly') {
            fetchMonthlySummaries();
        }
    }, [selectedDate, selectedMonth, selectedYear, activeView]);

    const fetchEmployees = async () => {
        try {
            const response = await api.get('/auth/users/?role=staff');
            setEmployees(response.data.results || response.data);
        } catch (err) {
            console.error('Error fetching employees:', err);
        }
    };

    const fetchDailyAttendance = async () => {
        setLoading(true);
        try {
            const response = await api.get('/attendance/records/', {
                params: {
                    start_date: selectedDate,
                    end_date: selectedDate
                }
            });
            setAttendanceRecords(response.data.results || response.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch attendance records');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDailySummary = async () => {
        try {
            const response = await api.get('/attendance/records/daily_summary/', {
                params: { date: selectedDate }
            });
            setDailySummary(response.data);
        } catch (err) {
            console.error('Error fetching daily summary:', err);
        }
    };

    const fetchMonthlySummaries = async () => {
        setLoading(true);
        try {
            const response = await api.get('/attendance/monthly-summaries/', {
                params: {
                    month: selectedMonth,
                    year: selectedYear
                }
            });
            setMonthlySummaries(response.data.results || response.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch monthly summaries');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkMark = async (attendanceData) => {
        try {
            const response = await api.post('/attendance/records/bulk_mark/', {
                date: selectedDate,
                attendance_data: attendanceData
            });
            setSuccess(`Successfully marked attendance for ${response.data.created_count} employees`);
            setShowBulkMarkModal(false);
            fetchDailyAttendance();
            fetchDailySummary();
        } catch (err) {
            setError('Failed to mark attendance');
            console.error(err);
        }
    };

    const handleGenerateMonthlySummary = async () => {
        setLoading(true);
        try {
            const response = await api.post('/attendance/monthly-summaries/generate_monthly/', {
                month: selectedMonth,
                year: selectedYear
            });
            setSuccess(`Generated summaries for ${response.data.generated_count} employees`);
            fetchMonthlySummaries();
        } catch (err) {
            setError('Failed to generate monthly summary');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRecord = async (recordId, data) => {
        try {
            await api.patch(`/attendance/records/${recordId}/`, data);
            setSuccess('Attendance record updated successfully');
            setEditingRecord(null);
            fetchDailyAttendance();
            fetchDailySummary();
        } catch (err) {
            setError('Failed to update attendance record');
            console.error(err);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            present: 'text-green-600 bg-green-50 border-green-200',
            absent: 'text-red-600 bg-red-50 border-red-200',
            half_day: 'text-yellow-600 bg-yellow-50 border-yellow-200',
            on_leave: 'text-blue-600 bg-blue-50 border-blue-200',
            holiday: 'text-purple-600 bg-purple-50 border-purple-200',
            week_off: 'text-gray-600 bg-gray-50 border-gray-200'
        };
        return colors[status] || 'text-gray-600 bg-gray-50 border-gray-200';
    };

    const getStatusIcon = (status) => {
        const icons = {
            present: CheckCircle,
            absent: XCircle,
            half_day: AlertCircle,
            on_leave: Calendar,
            holiday: Calendar,
            week_off: Calendar
        };
        const Icon = icons[status] || AlertCircle;
        return <Icon size={16} />;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Attendance Management</h2>
                    <p className="text-sm text-gray-600 mt-1">Track and manage employee attendance</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setShowBulkMarkModal(true)}
                        className="flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Bulk Mark Attendance
                    </Button>
                    {activeView === 'monthly' && (
                        <Button
                            onClick={handleGenerateMonthlySummary}
                            variant="secondary"
                            className="flex items-center gap-2"
                        >
                            <TrendingUp size={16} />
                            Generate Summary
                        </Button>
                    )}
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

            {/* View Toggle */}
            <div className="flex gap-2 border-b border-gray-200">
                {[
                    { id: 'daily', label: 'Daily Attendance' },
                    { id: 'monthly', label: 'Monthly Summary' },
                    { id: 'summary', label: 'Statistics' }
                ].map(view => (
                    <button
                        key={view.id}
                        onClick={() => setActiveView(view.id)}
                        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeView === view.id
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {view.label}
                    </button>
                ))}
            </div>

            {/* Daily View */}
            {activeView === 'daily' && (
                <div className="space-y-6">
                    {/* Date Selector */}
                    <Card>
                        <div className="flex items-center gap-4">
                            <Calendar size={20} className="text-gray-400" />
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="max-w-xs"
                            />
                        </div>
                    </Card>

                    {/* Daily Summary Cards */}
                    {dailySummary && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <CheckCircle size={20} className="text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Present</p>
                                        <p className="text-2xl font-bold text-gray-900">{dailySummary.present || 0}</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 rounded-lg">
                                        <XCircle size={20} className="text-red-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Absent</p>
                                        <p className="text-2xl font-bold text-gray-900">{dailySummary.absent || 0}</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-yellow-100 rounded-lg">
                                        <AlertCircle size={20} className="text-yellow-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Half Day</p>
                                        <p className="text-2xl font-bold text-gray-900">{dailySummary.half_day || 0}</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Calendar size={20} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">On Leave</p>
                                        <p className="text-2xl font-bold text-gray-900">{dailySummary.on_leave || 0}</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Attendance Records Table */}
                    <Card>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overtime</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                                                Loading...
                                            </td>
                                        </tr>
                                    ) : attendanceRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                                                No attendance records for this date
                                            </td>
                                        </tr>
                                    ) : (
                                        attendanceRecords.map(record => (
                                            <tr key={record.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {record.employee_details?.name || 'Unknown'}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {record.employee_details?.email}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                                                        {getStatusIcon(record.status)}
                                                        {record.status_display}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {record.check_in_time || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {record.check_out_time || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {record.total_hours ? `${record.total_hours}h` : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {record.overtime_hours ? `${record.overtime_hours}h` : '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => setEditingRecord(record)}
                                                        className="text-blue-600 hover:text-blue-800"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* Monthly View */}
            {activeView === 'monthly' && (
                <div className="space-y-6">
                    {/* Month/Year Selector */}
                    <Card>
                        <div className="flex items-center gap-4">
                            <Select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                options={[
                                    { value: 1, label: 'January' },
                                    { value: 2, label: 'February' },
                                    { value: 3, label: 'March' },
                                    { value: 4, label: 'April' },
                                    { value: 5, label: 'May' },
                                    { value: 6, label: 'June' },
                                    { value: 7, label: 'July' },
                                    { value: 8, label: 'August' },
                                    { value: 9, label: 'September' },
                                    { value: 10, label: 'October' },
                                    { value: 11, label: 'November' },
                                    { value: 12, label: 'December' }
                                ]}
                                className="max-w-xs"
                            />
                            <Input
                                type="number"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="max-w-xs"
                                min="2020"
                                max="2030"
                            />
                        </div>
                    </Card>

                    {/* Monthly Summary Table */}
                    <Card>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Working Days</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Present</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Absent</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Half Day</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Leave</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Overtime</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Attendance %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                                                Loading...
                                            </td>
                                        </tr>
                                    ) : monthlySummaries.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                                                No monthly summaries found. Click "Generate Summary" to create them.
                                            </td>
                                        </tr>
                                    ) : (
                                        monthlySummaries.map(summary => (
                                            <tr key={summary.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {summary.employee_details?.name || 'Unknown'}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {summary.employee_details?.email}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-gray-900">
                                                    {summary.total_working_days}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-green-600 font-medium">
                                                    {summary.days_present}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-red-600 font-medium">
                                                    {summary.days_absent}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-yellow-600 font-medium">
                                                    {summary.days_half_day}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-blue-600 font-medium">
                                                    {summary.days_on_leave}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-gray-900">
                                                    {summary.total_hours_worked}h
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-purple-600 font-medium">
                                                    {summary.total_overtime_hours}h
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${summary.attendance_percentage >= 90
                                                            ? 'bg-green-100 text-green-800'
                                                            : summary.attendance_percentage >= 75
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {summary.attendance_percentage?.toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* Bulk Mark Modal */}
            <BulkMarkModal
                isOpen={showBulkMarkModal}
                onClose={() => setShowBulkMarkModal(false)}
                employees={employees}
                selectedDate={selectedDate}
                onSubmit={handleBulkMark}
            />

            {/* Edit Record Modal */}
            {editingRecord && (
                <EditRecordModal
                    record={editingRecord}
                    onClose={() => setEditingRecord(null)}
                    onSave={handleUpdateRecord}
                />
            )}
        </div>
    );
};

// Bulk Mark Modal Component
const BulkMarkModal = ({ isOpen, onClose, employees, selectedDate, onSubmit }) => {
    const [attendanceData, setAttendanceData] = useState([]);

    useEffect(() => {
        if (isOpen && employees.length > 0) {
            setAttendanceData(
                employees.map(emp => ({
                    employee_id: emp.id,
                    employee_name: emp.name,
                    status: 'present',
                    check_in_time: '09:00',
                    check_out_time: '18:00',
                    notes: ''
                }))
            );
        }
    }, [isOpen, employees]);

    const handleStatusChange = (index, status) => {
        const updated = [...attendanceData];
        updated[index].status = status;
        setAttendanceData(updated);
    };

    const handleSubmit = () => {
        onSubmit(attendanceData);
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Mark Attendance - ${selectedDate}`}
            size="large"
        >
            <div className="space-y-4 max-h-96 overflow-y-auto">
                {attendanceData.map((data, index) => (
                    <div key={data.employee_id} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="flex-1">
                            <p className="font-medium text-gray-900">{data.employee_name}</p>
                        </div>
                        <Select
                            value={data.status}
                            onChange={(e) => handleStatusChange(index, e.target.value)}
                            options={[
                                { value: 'present', label: 'Present' },
                                { value: 'absent', label: 'Absent' },
                                { value: 'half_day', label: 'Half Day' },
                                { value: 'on_leave', label: 'On Leave' },
                                { value: 'holiday', label: 'Holiday' },
                                { value: 'week_off', label: 'Week Off' }
                            ]}
                            className="w-40"
                        />
                    </div>
                ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
                <Button variant="secondary" onClick={onClose}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit}>
                    Mark Attendance
                </Button>
            </div>
        </Modal>
    );
};

// Edit Record Modal Component
const EditRecordModal = ({ record, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        status: record.status,
        check_in_time: record.check_in_time || '',
        check_out_time: record.check_out_time || '',
        notes: record.notes || ''
    });

    const handleSubmit = () => {
        onSave(record.id, formData);
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Edit Attendance Record"
        >
            <div className="space-y-4">
                <div>
                    <p className="font-medium text-gray-900">{record.employee_details?.name}</p>
                    <p className="text-sm text-gray-500">{record.date}</p>
                </div>

                <Select
                    label="Status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    options={[
                        { value: 'present', label: 'Present' },
                        { value: 'absent', label: 'Absent' },
                        { value: 'half_day', label: 'Half Day' },
                        { value: 'on_leave', label: 'On Leave' },
                        { value: 'holiday', label: 'Holiday' },
                        { value: 'week_off', label: 'Week Off' }
                    ]}
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Check In Time"
                        type="time"
                        value={formData.check_in_time}
                        onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                    />
                    <Input
                        label="Check Out Time"
                        type="time"
                        value={formData.check_out_time}
                        onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
                    />
                </div>

                <Input
                    label="Notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes"
                />

                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                        <Save size={16} className="mr-2" />
                        Save Changes
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default AttendanceTab;
