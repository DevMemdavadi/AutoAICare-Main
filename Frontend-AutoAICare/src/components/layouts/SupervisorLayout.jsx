import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useWorkflowPermissions } from '@/hooks/useWorkflowPermissions';
import {
  LayoutDashboard,
  Briefcase,
  FileCheck,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  User,
  Calendar,
  BarChart,
  Package
} from 'lucide-react';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import BranchSelector from '@/components/BranchSelector';

const SupervisorLayout = () => {
  const { user, logout } = useAuth();
  const { unreadCount, fetchUnreadCount } = useNotifications();
  const { hasPermission } = useWorkflowPermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(!user);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch unread notifications count on component mount and when user changes
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      setLoading(false);
    }
  }, [user, fetchUnreadCount]);

  // Base navigation Items
  const baseNavigationItems = [
    { name: 'Dashboard', href: '/supervisor/dashboard', state: { tab: 'pending_qc' }, icon: LayoutDashboard },
    { name: 'Job Management', href: '/supervisor/dashboard', state: { tab: 'pending_assignment' }, icon: Briefcase },
    { name: 'QC Reviews', href: '/supervisor/dashboard', state: { tab: 'pending_qc' }, icon: FileCheck },
  ];

  // Conditional Parts navigation based on permissions
  const partsNavigation = hasPermission('can_manage_parts_inventory') ? [
    { name: 'Parts Inventory', href: '/supervisor/parts', icon: Package },
  ] : [];

  // Other navigation
  const otherNavigation = [
    { name: 'Leave Management', href: '/supervisor/leave-management', icon: Calendar },
    { name: 'My Performance', href: '/supervisor/performance', icon: BarChart },
  ];

  // Combine all navigation
  const navigationItems = [
    ...baseNavigationItems,
    ...partsNavigation,
    ...otherNavigation,
  ];

  const isActive = (item) => {
    if (location.pathname !== item.href) return false;
    // We could add sophisticated state matching here, but simple path matching is likely sufficient 
    // given they all point to dashboard. To differentiate, we'd need to track local state of clicked item.
    // For now, if on dashboard, they are all "active" in a sense, or we just highlight the first one.
    // Let's rely on click to set active logic if we wanted visual distinction, but for strict path matching:
    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-4xl p-6 space-y-6">
          <SkeletonLoader type="header" className="w-full h-16" />
          <div className="flex gap-6">
            <div className="w-64 h-96 bg-gray-200 hidden lg:block rounded" />
            <div className="flex-1 h-96 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* 1️⃣ HEADER / TOP BAR - Sticky Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Car Detailing Software
            </span>
          </div>
        </div>

        {/* Center Search Bar */}
        <div className="hidden md:flex flex-1 max-w-lg mx-8 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition duration-150 ease-in-out"
            placeholder="Search Job ID / Vehicle No / Customer..."
          />
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          {/* Branch Selector */}
          <div className="hidden sm:block">
            <BranchSelector />
          </div>

          {/* Alerts */}
          <button
            onClick={() => navigate('/supervisor/notifications')}
            className="relative p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all duration-200 group"
          >
            <Bell size={20} className="group-hover:rotate-12 transition-transform duration-200" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[9px] font-black text-white bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg shadow-red-500/40 animate-pulse z-10 whitespace-nowrap">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Menu */}
          <div className="flex items-center gap-3 pl-4 border-l border-gray-200 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.name || 'Supervisor'}</p>
              <p className="text-xs text-gray-500">Supervisor</p>
              {user?.branch_name && (
                <p className="text-xs text-gray-1000 truncate">
                  {user.branch_name.split('-').pop().trim()}
                </p>
              )}
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <User size={18} />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* 9️⃣ LEFT NAVIGATION (MINIMAL) */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-auto lg:shadow-none
          ${sidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'}
        `}>
          <div className="flex flex-col h-full pt-5 pb-4 bg-white">
            <div className="flex items-center justify-between px-4 mb-6 lg:hidden">
              <span className="text-lg font-bold text-gray-900">Menu</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <nav className="flex-1 px-3 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                // Simple active check: if mapped href is dashboard, and we are on dashboard.
                // You can refine this by matching `location.state?.tab === item.state?.tab` if you want per-tab highlighting
                const active = location.pathname === item.href && (
                  !item.state?.tab || location.state?.tab === item.state?.tab
                );

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    state={item.state}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                      ${active
                        ? 'bg-blue-50 text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon size={20} className={active ? 'text-blue-600' : 'text-gray-400'} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-gray-200">
              <button
                onClick={logout}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-white p-4 sm:p-6 lg:p-8">
          <Outlet context={{ searchTerm }} />
        </main>
      </div>
    </div>
  );
};

export default SupervisorLayout;