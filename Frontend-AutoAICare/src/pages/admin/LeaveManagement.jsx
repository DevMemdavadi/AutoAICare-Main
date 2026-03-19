import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import {
    CalendarDaysIcon,
    ClockIcon,
    BanknotesIcon,
    ChartBarIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';
import LeaveBalanceCard from '../../components/leave/LeaveBalanceCard';
import LeaveRequestForm from '../../components/leave/LeaveRequestForm';
import LeaveRequestsList from '../../components/leave/LeaveRequestsList';
import LeaveApprovalPanel from '../../components/leave/LeaveApprovalPanel';
import LeaveEncashmentPanel from '../../components/leave/LeaveEncashmentPanel';
import LeaveCalendar from '../../components/leave/LeaveCalendar';
import LeaveTypesManagement from '../../components/leave/LeaveTypesManagement';
import { StatCardSkeleton, TableSkeleton } from '../../components/common/LoadingSkeletons';
import api from '../../utils/api';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

const LeaveManagement = () => {
    const [selectedTab, setSelectedTab] = useState(0);
    const [leaveBalances, setLeaveBalances] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        fetchData();
        // Get user role from localStorage or context
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setUserRole(user.role || '');
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch leave balances
            const balancesRes = await api.get('/accounting/leave-balances/my_balance/');
            const balancesData = balancesRes.data.results || balancesRes.data;
            setLeaveBalances(Array.isArray(balancesData) ? balancesData : []);

            // Fetch user's leave requests
            const requestsRes = await api.get('/accounting/leave-requests/');
            const requestsData = requestsRes.data.results || requestsRes.data;
            setLeaveRequests(Array.isArray(requestsData) ? requestsData : []);

            // Fetch pending approvals (for admins)
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const currentUserRole = user.role || '';
            if (['super_admin', 'branch_admin'].includes(currentUserRole)) {
                const approvalsRes = await api.get('/accounting/leave-requests/pending_approvals/');
                const approvalsData = approvalsRes.data.results || approvalsRes.data;
                setPendingApprovals(Array.isArray(approvalsData) ? approvalsData : []);
            }
        } catch (error) {
            console.error('Error fetching leave data:', error);
            // Set empty arrays on error to prevent crashes
            setLeaveBalances([]);
            setLeaveRequests([]);
            setPendingApprovals([]);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        {
            name: 'My Leaves',
            icon: CalendarDaysIcon,
            show: true
        },
        {
            name: 'Apply Leave',
            icon: ClockIcon,
            show: true
        },
        {
            name: 'Leave Calendar',
            icon: ChartBarIcon,
            show: true
        },
        {
            name: 'Encashment',
            icon: BanknotesIcon,
            show: true
        },
        {
            name: 'Approvals',
            icon: UserGroupIcon,
            show: ['super_admin', 'branch_admin'].includes(userRole),
            badge: pendingApprovals.length
        },
        {
            name: 'Leave Types',
            icon: ChartBarIcon,
            show: ['super_admin', 'branch_admin'].includes(userRole)
        },
    ].filter(tab => tab.show);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                        Leave Management
                    </h1>
                    <p className="text-sm md:text-base text-slate-600">
                        Manage your leaves, view balances, and track requests
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
                    {loading ? (
                        <StatCardSkeleton count={4} />
                    ) : (
                        leaveBalances.slice(0, 4).map((balance, index) => (
                            <div
                                key={index}
                                className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs md:text-sm font-medium text-slate-600">
                                        {balance.leave_type_name}
                                    </span>
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                        {balance.leave_type_code}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl md:text-3xl font-bold text-slate-900">
                                        {balance.available_balance}
                                    </span>
                                    <span className="text-xs md:text-sm text-slate-500">
                                        / {balance.total_balance} days
                                    </span>
                                </div>
                                <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all"
                                        style={{
                                            width: `${(balance.available_balance / balance.total_balance) * 100}%`
                                        }}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Tabs */}
                <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
                    <Tab.List className="flex space-x-2 rounded-xl bg-white p-1.5 md:p-2 shadow-sm border border-slate-200 mb-4 md:mb-6 overflow-x-auto">
                        {tabs.map((tab) => (
                            <Tab
                                key={tab.name}
                                className={({ selected }) =>
                                    classNames(
                                        'whitespace-nowrap rounded-lg py-2 md:py-3 px-3 md:px-4 text-xs md:text-sm font-medium leading-5 transition-all',
                                        'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                                        selected
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                                            : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                                    )
                                }
                            >
                                <div className="flex items-center justify-center gap-1 md:gap-2">
                                    <tab.icon className="h-4 w-4 md:h-5 md:w-5" />
                                    <span>{tab.name}</span>
                                    {tab.badge > 0 && (
                                        <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                            {tab.badge}
                                        </span>
                                    )}
                                </div>
                            </Tab>
                        ))}
                    </Tab.List>

                    <Tab.Panels className="mt-6">
                        {/* My Leaves Tab */}
                        <Tab.Panel className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Leave Balances */}
                                <div className="space-y-4">
                                    <h2 className="text-xl font-semibold text-slate-900 mb-4">
                                        Leave Balances
                                    </h2>
                                    {leaveBalances.map((balance) => (
                                        <LeaveBalanceCard
                                            key={balance.id}
                                            balance={balance}
                                        />
                                    ))}
                                </div>

                                {/* Recent Requests */}
                                <div className="space-y-4">
                                    <h2 className="text-xl font-semibold text-slate-900 mb-4">
                                        Recent Requests
                                    </h2>
                                    <LeaveRequestsList
                                        requests={leaveRequests.slice(0, 5)}
                                        onUpdate={fetchData}
                                    />
                                </div>
                            </div>
                        </Tab.Panel>

                        {/* Apply Leave Tab */}
                        <Tab.Panel>
                            <div className="max-w-2xl mx-auto">
                                <LeaveRequestForm
                                    leaveBalances={leaveBalances}
                                    onSuccess={fetchData}
                                />
                            </div>
                        </Tab.Panel>

                        {/* Leave Calendar Tab */}
                        <Tab.Panel>
                            <LeaveCalendar
                                leaveRequests={leaveRequests}
                            />
                        </Tab.Panel>

                        {/* Encashment Tab */}
                        <Tab.Panel>
                            <LeaveEncashmentPanel
                                leaveBalances={leaveBalances}
                                onSuccess={fetchData}
                            />
                        </Tab.Panel>

                        {/* Approvals Tab */}
                        {['super_admin', 'branch_admin'].includes(userRole) && (
                            <Tab.Panel>
                                <LeaveApprovalPanel
                                    pendingRequests={pendingApprovals}
                                    onUpdate={fetchData}
                                />
                            </Tab.Panel>
                        )}

                        {/* Leave Types Tab */}
                        {['super_admin', 'branch_admin'].includes(userRole) && (
                            <Tab.Panel>
                                <LeaveTypesManagement />
                            </Tab.Panel>
                        )}
                    </Tab.Panels>
                </Tab.Group>
            </div>
        </div>
    );
};

export default LeaveManagement;
