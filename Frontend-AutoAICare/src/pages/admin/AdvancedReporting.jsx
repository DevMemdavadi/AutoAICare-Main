import React, { useState, useEffect } from 'react';
import {
    FileText, Download, Calendar, Filter, Clock, Plus, Trash2,
    CheckCircle, XCircle, AlertCircle, RefreshCw, BarChart2,
    Users, TrendingUp, PieChart, Mail, Settings, Send
} from 'lucide-react';
import api from '@/utils/api';

import { useBranch } from '@/contexts/BranchContext';

const AdvancedReporting = () => {
    const { getCurrentBranchId, getCurrentBranchName } = useBranch();
    const [activeTab, setActiveTab] = useState('generate');
    const [generatingReport, setGeneratingReport] = useState(null);
    const [scheduledReports, setScheduledReports] = useState([]);
    const [reportConfigs, setReportConfigs] = useState({
        revenue: { days: 30, format: 'pdf' },
        customer: { format: 'pdf', active_only: false },
        lead: { status: '', format: 'pdf' },
        analytics: { days: 30, format: 'pdf' }
    });

    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [newSchedule, setNewSchedule] = useState({
        name: '',
        description: '',
        report_type: 'revenue',
        format: 'pdf',
        frequency: 'weekly',
        email_recipients: '',
        is_active: true
    });

    useEffect(() => {
        console.log('⚡ [AdvancedReporting] branch changed:', getCurrentBranchId());
        fetchScheduledReports();
    }, [getCurrentBranchId()]);

    const fetchScheduledReports = async () => {
        try {
            const branchId = getCurrentBranchId();
            const response = await api.get('/reports/scheduled/', {
                params: { branch: branchId }
            });
            setScheduledReports(response.data.results || response.data);
        } catch (err) {
            console.error('Error fetching scheduled reports:', err);
        }
    };

    const handleGenerateReport = async (type) => {
        setGeneratingReport(type);
        try {
            const config = reportConfigs[type];
            const params = new URLSearchParams();
            if (config.days) params.append('days', config.days);
            if (config.status) params.append('status', config.status);
            if (config.active_only) params.append('active_only', 'true');

            const branchId = getCurrentBranchId();
            if (branchId) params.append('branch', branchId);

            const response = await api.get(
                `/reports/generate/${type}/${config.format}/?${params.toString()}`,
                { responseType: 'blob' }
            );

            // Create download link
            const blob = new Blob([response.data], {
                type: config.format === 'pdf'
                    ? 'application/pdf'
                    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `${type}_report_${new Date().toISOString().split('T')[0]}.${config.format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (err) {
            console.error(`Error generating ${type} report:`, err);
            alert(`Failed to generate ${type} report. Please try again.`);
        } finally {
            setGeneratingReport(null);
        }
    };

    const handleSaveSchedule = async (e) => {
        e.preventDefault();
        try {
            if (editingSchedule) {
                await api.put(`/reports/scheduled/${editingSchedule.id}/`, newSchedule);
            } else {
                await api.post('/reports/scheduled/', newSchedule);
            }
            setShowScheduleModal(false);
            setEditingSchedule(null);
            fetchScheduledReports();
            alert('Schedule saved successfully');
        } catch (err) {
            console.error('Error saving schedule:', err);
            alert('Failed to save schedule');
        }
    };

    const handleDeleteSchedule = async (id) => {
        if (!window.confirm('Are you sure you want to delete this schedule?')) return;
        try {
            await api.delete(`/reports/scheduled/${id}/`);
            fetchScheduledReports();
        } catch (err) {
            console.error('Error deleting schedule:', err);
        }
    };

    const handleRunNow = async (id) => {
        try {
            await api.post(`/reports/scheduled/${id}/run_now/`, {});
            alert('Report generation triggered and sent to recipients');
            fetchScheduledReports();
        } catch (err) {
            console.error('Error running report now:', err);
        }
    };

    const ReportCard = ({ title, icon: Icon, type, description, options }) => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className={`p-2.5 md:p-3 rounded-lg ${type === 'revenue' ? 'bg-blue-50 text-blue-600' :
                    type === 'customer' ? 'bg-purple-50 text-purple-600' :
                        type === 'lead' ? 'bg-green-50 text-green-600' :
                            'bg-orange-50 text-orange-600'
                    }`}>
                    <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
            </div>

            <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">{title}</h3>
            <p className="text-xs md:text-sm text-gray-500 mb-4 md:mb-6">{description}</p>

            <div className="space-y-3 md:space-y-4">
                {options}
                <button
                    onClick={() => handleGenerateReport(type)}
                    disabled={generatingReport !== null}
                    className="w-full py-2.5 md:py-3 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors flex items-center justify-center gap-2 group text-sm md:text-base"
                >
                    {generatingReport === type ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                            Generate Report
                        </>
                    )}
                </button>
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 md:mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Advanced Reporting</h1>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">Generate deep insights and schedule automated reports.</p>
                </div>
                <div className="flex items-center bg-gray-100/50 p-1 rounded-xl w-full md:w-auto">
                    <button
                        onClick={() => setActiveTab('generate')}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'generate' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        Generate Now
                    </button>
                    <button
                        onClick={() => setActiveTab('schedules')}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'schedules' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        Schedules
                    </button>
                </div>
            </div>

            {activeTab === 'generate' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                    {/* Revenue Report Card */}
                    <ReportCard
                        title="Revenue & Performance"
                        icon={TrendingUp}
                        type="revenue"
                        description="Detailed breakdown of sales, bookings, and revenue trends over time."
                        options={
                            <div className="flex items-center gap-3 mb-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <select
                                    className="flex-1 text-sm border-gray-200 rounded-md focus:ring-blue-500"
                                    value={reportConfigs.revenue.days}
                                    onChange={(e) => setReportConfigs({
                                        ...reportConfigs,
                                        revenue: { ...reportConfigs.revenue, days: e.target.value }
                                    })}
                                >
                                    <option value="7">Last 7 Days</option>
                                    <option value="30">Last 30 Days</option>
                                    <option value="90">Last 90 Days</option>
                                    <option value="365">Last Year</option>
                                </select>
                            </div>
                        }
                    />

                    {/* Customer Report Card */}
                    <ReportCard
                        title="Customer Analytics"
                        icon={Users}
                        type="customer"
                        description="Analyze customer segments, lifetime value, and engagement metrics."
                        options={
                            <div className="flex items-center gap-3 mb-2">
                                <Users className="w-4 h-4 text-gray-400" />
                                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={reportConfigs.customer.active_only}
                                        onChange={(e) => setReportConfigs({
                                            ...reportConfigs,
                                            customer: { ...reportConfigs.customer, active_only: e.target.checked }
                                        })}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    Active Customers Only
                                </label>
                            </div>
                        }
                    />

                    {/* Lead Report Card */}
                    <ReportCard
                        title="Lead Conversion Report"
                        icon={BarChart2}
                        type="lead"
                        description="Track lead sources, conversion rates, and sales pipeline efficiency."
                        options={
                            <div className="flex items-center gap-3 mb-2">
                                <Filter className="w-4 h-4 text-gray-400" />
                                <select
                                    className="flex-1 text-sm border-gray-200 rounded-md focus:ring-blue-500"
                                    value={reportConfigs.lead.status}
                                    onChange={(e) => setReportConfigs({
                                        ...reportConfigs,
                                        lead: { ...reportConfigs.lead, status: e.target.value }
                                    })}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="new">New Leads</option>
                                    <option value="qualified">Qualified</option>
                                    <option value="won">Won Only</option>
                                    <option value="lost">Lost</option>
                                </select>
                            </div>
                        }
                    />

                    {/* Analytics Summary Card */}
                    <ReportCard
                        title="Executive Summary"
                        icon={PieChart}
                        type="analytics"
                        description="A high-level overview of all business metrics in one comprehensive PDF."
                        options={
                            <div className="flex items-center gap-3 mb-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <select
                                    className="flex-1 text-sm border-gray-200 rounded-md focus:ring-blue-500"
                                    value={reportConfigs.analytics.days}
                                    onChange={(e) => setReportConfigs({
                                        ...reportConfigs,
                                        analytics: { ...reportConfigs.analytics, days: e.target.value }
                                    })}
                                >
                                    <option value="30">Monthly Summary</option>
                                    <option value="90">Quarterly Overview</option>
                                    <option value="365">Annual Review</option>
                                </select>
                            </div>
                        }
                    />
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between bg-white sticky top-0 z-10 gap-3">
                        <h2 className="text-lg md:text-xl font-bold text-gray-900">Automated Delivery Schedules</h2>
                        <button
                            onClick={() => {
                                setEditingSchedule(null);
                                setNewSchedule({
                                    name: '',
                                    description: '',
                                    report_type: 'revenue',
                                    format: 'pdf',
                                    frequency: 'weekly',
                                    email_recipients: '',
                                    is_active: true
                                });
                                setShowScheduleModal(true);
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Schedule
                        </button>
                    </div>

                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left min-w-[600px]">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Report Details</th>
                                    <th className="px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Frequency & Info</th>
                                    <th className="px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">Next Delivery</th>
                                    <th className="px-4 md:px-6 py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {scheduledReports.length > 0 ? (
                                    scheduledReports.map((report) => (
                                        <tr key={report.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-4 md:px-6 py-4 md:py-6">
                                                <div className="flex items-center gap-3 md:gap-4">
                                                    <div className={`p-2 rounded-lg flex-shrink-0 ${report.is_active ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'
                                                        }`}>
                                                        <FileText className="w-4 h-4 md:w-5 md:h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-gray-900 text-sm md:text-base truncate">{report.name}</div>
                                                        <div className="text-[10px] md:text-xs text-gray-500 mt-0.5 line-clamp-1">{report.description}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-6 py-4 md:py-6">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[9px] md:text-[10px] font-bold uppercase w-fit">
                                                        {report.frequency} • {report.format}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] md:text-xs text-gray-500 truncate">
                                                        <Mail className="w-3 h-3 flex-shrink-0" />
                                                        {report.email_recipients.split(',')[0]}
                                                        {report.email_recipients.split(',').length > 1 && ` +${report.email_recipients.split(',').length - 1} more`}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-6 py-4 md:py-6">
                                                <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                                                    <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
                                                    {report.next_run ? new Date(report.next_run).toLocaleDateString() : 'Pending'}
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-6 py-4 md:py-6 text-right">
                                                <div className="flex items-center justify-end gap-1 md:gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleRunNow(report.id)}
                                                        title="Run Now"
                                                        className="p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    >
                                                        <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingSchedule(report);
                                                            setNewSchedule(report);
                                                            setShowScheduleModal(true);
                                                        }}
                                                        className="p-1.5 md:p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                    >
                                                        <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSchedule(report.id)}
                                                        className="p-1.5 md:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-4 bg-gray-50 rounded-full">
                                                    <Clock className="w-8 h-8 text-gray-300" />
                                                </div>
                                                <p className="text-gray-500 font-medium">No automated schedules yet.</p>
                                                <button
                                                    onClick={() => setShowScheduleModal(true)}
                                                    className="text-blue-600 font-bold hover:underline"
                                                >
                                                    Create your first automation
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Schedule Modal */}
            {showScheduleModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto no-scrollbar">
                        <div className="p-5 md:p-6 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10">
                            <h2 className="text-xl md:text-2xl font-black text-gray-900">
                                {editingSchedule ? 'Edit Schedule' : 'New Automation Schedule'}
                            </h2>
                            <p className="text-xs md:text-sm text-gray-500 mt-1">Configure when and where to send your reports.</p>
                        </div>

                        <form onSubmit={handleSaveSchedule} className="p-5 md:p-6 space-y-4 md:space-y-5">
                            <div className="grid grid-cols-1 gap-4 md:gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs md:text-sm font-bold text-gray-700">Schedule Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Monthly Sales Overview"
                                        className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        value={newSchedule.name}
                                        onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs md:text-sm font-bold text-gray-700">Report Type</label>
                                        <select
                                            className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            value={newSchedule.report_type}
                                            onChange={(e) => setNewSchedule({ ...newSchedule, report_type: e.target.value })}
                                        >
                                            <option value="revenue">Revenue & Performance</option>
                                            <option value="customer">Customer Analytics</option>
                                            <option value="lead">Lead Conversion</option>
                                            <option value="analytics">Executive Summary</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs md:text-sm font-bold text-gray-700">Format</label>
                                        <select
                                            className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            value={newSchedule.format}
                                            onChange={(e) => setNewSchedule({ ...newSchedule, format: e.target.value })}
                                        >
                                            <option value="pdf">PDF</option>
                                            <option value="excel">Excel</option>
                                            <option value="both">Both PDF & Excel</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs md:text-sm font-bold text-gray-700">Recipients (comma separated)</label>
                                    <textarea
                                        required
                                        placeholder="manager@example.com, admin@example.com"
                                        className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none h-20 resize-none"
                                        value={newSchedule.email_recipients}
                                        onChange={(e) => setNewSchedule({ ...newSchedule, email_recipients: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs md:text-sm font-bold text-gray-700">Frequency</label>
                                        <select
                                            className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            value={newSchedule.frequency}
                                            onChange={(e) => setNewSchedule({ ...newSchedule, frequency: e.target.value })}
                                        >
                                            <option value="daily">Every Morning</option>
                                            <option value="weekly">Every Monday</option>
                                            <option value="monthly">1st of Month</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs md:text-sm font-bold text-gray-700">Active Status</label>
                                        <div className="flex items-center h-full pt-1">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={newSchedule.is_active}
                                                    onChange={(e) => setNewSchedule({ ...newSchedule, is_active: e.target.checked })}
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                <span className="ml-3 text-sm font-medium text-gray-700">{newSchedule.is_active ? 'Active' : 'Paused'}</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2 md:pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowScheduleModal(false)}
                                    className="flex-1 py-2.5 md:py-3 bg-gray-100 text-gray-700 text-sm md:text-base font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-2.5 md:py-3 bg-blue-600 text-white text-sm md:text-base font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                                >
                                    {editingSchedule ? 'Save Changes' : 'Create Automation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvancedReporting;
