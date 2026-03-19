import BranchSelector from '@/components/BranchSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useWorkflowPermissions } from '@/hooks/useWorkflowPermissions';
import {
  Bell,
  ClipboardList,
  FileText,
  LogOut,
  Menu,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  Car,
  Users,
  Camera,
  List,
  AlertTriangle,
  TrendingUp,
  UserCheck,
  Wrench,
  Calendar,
  User,
  BarChart,
  Package,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

const FloorManagerLayout = () => {
  const { user, logout } = useAuth();
  const { isSuperAdmin } = useBranch();
  const { unreadCount, fetchUnreadCount } = useNotifications();
  const { hasPermission, loading: permissionsLoading } = useWorkflowPermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch unread notifications count on component mount and when user changes
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user, fetchUnreadCount]);

  // Floor Manager specific navigation
  const baseNavigation = [
    { name: 'Dashboard', href: '/floor-manager/dashboard', icon: ClipboardList },
    { name: 'Live Jobs', href: '/floor-manager/live-jobs', icon: Car },
    // { name: 'Photo Management', href: '/floor-manager/photos', icon: Camera },
    // { name: 'Checklists', href: '/floor-manager/checklists', icon: List },
    // { name: 'Team Management', href: '/floor-manager/team', icon: Users },
    // { name: 'Team Performance', href: '/floor-manager/performance', icon: TrendingUp },
    // { name: 'Leave Management', href: '/floor-manager/leave-management', icon: Calendar },
    // { name: 'My Performance', href: '/floor-manager/my-performance', icon: BarChart },
    { name: 'Profile', href: '/floor-manager/profile', icon: User },

  ];

  // Conditionally add Parts navigation based on permissions
  const partsNavigation = hasPermission('can_manage_parts_inventory') ? [
    { name: 'Parts Inventory', href: '/floor-manager/parts', icon: Package },
  ] : [];

  const floorManagerNavigation = [...baseNavigation, ...partsNavigation];

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
            <h1 className="text-xl font-bold">Floor Manager Panel</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 min-h-0 px-4 py-6 space-y-1 custom-scrollbar">
            {floorManagerNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                    ${isActive(item.href)
                      ? 'bg-primary text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                >
                  <Icon size={20} />
                  {item.name}
                </Link>
              );
            })}
            {/* <Link
            to="/floor-manager/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 w-full px-4 py-3 mb-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
          >
            <User size={20} />
            Profile Settings
          </Link> */}
          </nav>

          {/* QC Process Guide */}
          {/* <div className="px-4 py-4 border-t border-gray-800">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">QC Process</h3>
            <ul className="space-y-2 text-xs text-gray-300">
              <li className="flex items-start">
                <FileText size={12} className="mr-2 mt-0.5 flex-shrink-0" />
                <span>Inspect vehicle thoroughly</span>
              </li>
              <li className="flex items-start">
                <Clock size={12} className="mr-2 mt-0.5 flex-shrink-0" />
                <span>Document time estimates</span>
              </li>
              <li className="flex items-start">
                <CheckCircle size={12} className="mr-2 mt-0.5 flex-shrink-0" />
                <span>Submit for supervisor review</span>
              </li>
            </ul>
            </div> */}

          {/* User section */}
          <div className="p-4 border-t border-gray-800">
            <Link
              to="/floor-manager/profile"
              className="flex items-center gap-3 px-4 py-3 mb-2 bg-gray-800 hover:bg-gray-700/80 rounded-lg transition-all cursor-pointer group"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-semibold shadow-lg group-hover:scale-105 transition-transform">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-white">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">Floor Manager</p>
                {user?.branch_name && (
                  <p className="text-xs text-gray-200/80 truncate">
                    {user.branch_name.split('-').pop().trim()}
                  </p>
                )}
              </div>
            </Link>
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
                Floor Manager Dashboard
              </h2>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              {/* Branch Selector - Super Admin Only */}
              <BranchSelector />

              {/* Notification Bell */}
              <button
                onClick={() => navigate('/floor-manager/notifications')}
                className="relative p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all duration-200 group"
              >
                <Bell size={24} className="group-hover:rotate-12 transition-transform duration-200" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[20px] h-[20px] px-1 text-[10px] font-black text-white bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg shadow-red-500/40 animate-pulse z-10 whitespace-nowrap border-2 border-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <Link
                to="/floor-manager/profile"
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors hidden sm:inline">{user?.name}</span>
              </Link>
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

export default FloorManagerLayout;