import BranchSelector from '@/components/BranchSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  Bell,
  FileText,
  LogOut,
  Menu,
  CheckCircle,
  XCircle,
  List,
  AlertCircle,
  Clock,
  Check
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

const ApplicatorLayout = () => {
  const { user, logout } = useAuth();
  const { isSuperAdmin } = useBranch();
  const { unreadCount, fetchUnreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch unread notifications count on component mount and when user changes
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user, fetchUnreadCount]);

  // Applicator specific navigation
  const applicatorNavigation = [
    { name: 'Dashboard', href: '/applicator/dashboard', icon: FileText },
  ];

  const isActive = (href) => {
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-64 bg-gray-900 text-white
        transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
            <h1 className="text-xl font-bold">Applicator Panel</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              {/* <X size={24} /> */}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 min-h-0 px-4 py-6 space-y-1 custom-scrollbar">
            {applicatorNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${isActive(item.href)
                      ? 'bg-primary text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={20} />
                  {item.name}
                </Link>
              );
            })}

            {/* Guidelines Section */}
            <div className="pt-6 mt-6 border-t border-gray-800">
              <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Guidelines
              </h3>
              <ul className="mt-2 space-y-2 text-xs text-gray-400 px-4">
                <li className="flex items-start">
                  <List size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                  <span>Follow all safety protocols</span>
                </li>
                <li className="flex items-start">
                  <List size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                  <span>Document work thoroughly</span>
                </li>
                <li className="flex items-start">
                  <List size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                  <span>Upload clear progress photos</span>
                </li>
                <li className="flex items-start">
                  <List size={12} className="mr-1 mt-0.5 flex-shrink-0" />
                  <span>List all parts used accurately</span>
                </li>
              </ul>
            </div>
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-gray-800 rounded-lg">
              <div className="flex-shrink-0 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">Applicator</p>
                {user?.branch_name && (
                  <p className="text-xs text-gray-200 truncate">
                    {user.branch_name.split('-').pop().trim()}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-full px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu size={24} />
            </button>
            <div className="flex-1 lg:block hidden">
              <h2 className="text-lg font-semibold text-gray-900">
                {applicatorNavigation.find(item => isActive(item.href))?.name || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              {/* Branch Selector - Super Admin Only */}
              <BranchSelector />

              {/* Notification Bell */}
            <button
                onClick={() => navigate('/admin/notifications')}
                className="relative p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all duration-200 group"
              >
                <Bell size={20} className="group-hover:rotate-12 transition-transform duration-200" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[9px] font-black text-white bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg shadow-red-500/40 animate-pulse z-10 whitespace-nowrap">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <span className="text-sm text-gray-600">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ApplicatorLayout;