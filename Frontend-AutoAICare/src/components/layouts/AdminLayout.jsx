import BranchSelector from '@/components/BranchSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useWorkflowPermissions } from '@/hooks/useWorkflowPermissions';
import api from '@/utils/api';
import {
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  Clock,
  CreditCard,
  Crown,
  FileText,
  Gift,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  Target,
  Truck,
  UserPlus,
  Users,
  User,
  Wrench,
  X,
  WalletCards,
  IndianRupee,
  CalendarDays,
  Workflow,
  Trophy,
  CheckCircle2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import './AdminLayout.css';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const { isSuperAdmin, isCompanyAdmin } = useBranch();
  const { unreadCount, fetchUnreadCount } = useNotifications();
  const { hasPermission } = useWorkflowPermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingWhatsAppCount, setPendingWhatsAppCount] = useState(0);

  // Fetch unread notifications count on component mount and when user changes
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      fetchPendingWhatsAppCount();
    }
  }, [user, fetchUnreadCount]);

  // Fetch pending WhatsApp messages count
  const fetchPendingWhatsAppCount = async () => {
    try {
      const response = await api.get('/notify/whatsapp/pending/stats/');
      setPendingWhatsAppCount(response.data.pending || 0);
    } catch (error) {
      // Silently fail — badge is non-critical
      console.error('Failed to fetch pending WhatsApp count:', error);
    }
  };

  const isFloorManager = user?.role === 'floor_manager';

  // Grouped navigation for better organization
  const navGroups = [
    {
      name: 'Overview',
      items: [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Daily Follow-up', href: '/admin/daily-followup', icon: CheckCircle2 },
        { name: 'Service Reminders', href: '/admin/service-reminders', icon: Bell },
        { name: 'Performance', href: '/admin/performance', icon: Trophy },
        { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
        { name: 'Advanced Reports', href: '/admin/reports', icon: FileText },
      ]
    },
    {
      name: 'Operations',
      items: [
        ...(isFloorManager ? [{ name: 'Floor Manager QC', href: '/admin/floor-qc', icon: ClipboardList }] : []),
        { name: 'Bookings', href: '/admin/bookings', icon: ClipboardList },
        { name: 'Job Cards', href: '/admin/jobcards', icon: WalletCards },
        { name: 'Live Jobs', href: '/admin/live-jobs', icon: Clock },
        { name: 'Appointments', href: '/admin/appointments', icon: CalendarDays },
        // { name: 'Bay Management', href: '/admin/bays', icon: LayoutDashboard },
        { name: 'Pickup & Drop', href: '/admin/pickup', icon: Truck },
      ]
    },
    {
      name: 'Inventory & Services',
      items: [
        { name: 'Services', href: '/admin/services', icon: Wrench },
        { name: 'Inventory Hub', href: '/admin/inventory', icon: Package },
        // Legacy routes - kept for backward compatibility
        // { name: 'Parts', href: '/admin/parts', icon: Package },
        // { name: 'Purchases', href: '/admin/purchases', icon: ShoppingCart },
      ]
    },
    {
      name: 'Sales & Marketing',
      items: [
        { name: 'Membership', href: '/admin/membership', icon: Crown },
        // { name: 'Leads', href: '/admin/leads', icon: Target },
        { name: 'Reward Settings', href: '/admin/reward-settings', icon: Gift },
        { name: 'Referrals', href: '/admin/referrals', icon: UserPlus },
        { name: 'Feedback', href: '/admin/feedback', icon: MessageSquare },
      ]
    },
    {
      name: 'Management',
      items: [
        { name: 'Accounting', href: '/admin/accounting', icon: IndianRupee },
        { name: 'Users & Staff', href: '/admin/users', icon: Users },
        ...(isSuperAdmin || isCompanyAdmin ? [
          { name: 'Branches', href: '/admin/branches', icon: Building2 },
        ] : []),
        ...(isSuperAdmin ? [
          { name: 'Workflow Config', href: '/admin/workflow', icon: Workflow },
        ] : []),
      ]
    },
    {
      name: 'System',
      items: [
        { name: 'Profile', href: '/admin/profile', icon: User },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
        { name: 'WhatsApp Logs', href: '/admin/whatsapp-logs', icon: MessageSquare },
        { name: 'Pending WhatsApp', href: '/admin/whatsapp-pending', icon: Clock },
        { name: 'WP Hub Events', href: '/admin/wp-events', icon: MessageSquare },
        { name: 'Chats', href: '/admin/chats', icon: MessageSquare },
      ]
    }
  ];

  const isActive = (href) => {
    if (href === '/admin') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white shadow-2xl
        transform transition-all duration-300 ease-in-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full relative">
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none"></div>

          {/* Logo */}
          <div className="relative flex items-center justify-between h-16 px-6 border-b border-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Crown size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Car Service</h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">


                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg"
            >
              <X size={22} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 min-h-0 px-3 py-6 space-y-6 custom-scrollbar relative">
            {navGroups.map((group) => (
              <div key={group.name} className="space-y-1.5">
                {/* Group Header */}
                <div className="px-4 mb-3">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="flex-1">{group.name}</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-700 to-transparent"></div>
                  </h3>
                </div>

                {/* Group Items */}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        group relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                        ${active
                          ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-primary/30 scale-[1.02]'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white hover:translate-x-1'
                        }
                      `}
                    >
                      <Icon size={20} className={`transition-transform duration-200 ${active ? '' : 'group-hover:scale-110'}`} />
                      <span className="flex-1">{item.name}</span>

                      {/* Badge for Pending WhatsApp */}
                      {item.href === '/admin/whatsapp-pending' && pendingWhatsAppCount > 0 && (
                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 rounded-full shadow-lg shadow-orange-500/50 border-2 border-slate-800">
                          {pendingWhatsAppCount > 9 ? '9+' : pendingWhatsAppCount}
                        </span>
                      )}

                      {active && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                      )}
                      {/* Active indicator line */}
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg shadow-white/50"></div>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User section */}
          <div className="relative p-4 border-t border-slate-800/50 bg-slate-950/50">
            <Link
              to="/admin/profile"
              className="flex items-center gap-3 px-3 py-3 mb-3 bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200 cursor-pointer group/profile"
            >
              <div className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-primary via-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center font-bold shadow-lg shadow-primary/30 ring-2 ring-slate-700/50">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate uppercase tracking-wide">{user?.role?.replace(/_/g, ' ')}</p>
                {user?.branch_name && (
                  <p className="text-[10px] text-primary/80 truncate font-medium mt-0.5">
                    {user.branch_name.split('-').pop().trim()}
                  </p>
                )}
              </div>
            </Link>
            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded-xl transition-all duration-200 group"
            >
              <LogOut size={18} className="group-hover:rotate-12 transition-transform duration-200" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all duration-200"
              >
                <Menu size={24} />
              </button>
              <div className="hidden lg:flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-primary to-blue-600 rounded-full"></div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {navGroups.flatMap(g => g.items).find(item => isActive(item.href))?.name || 'Dashboard'}
                  </h2>
                  <p className="text-xs text-slate-500">Manage your operations</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Branch Selector */}
              <BranchSelector />

              {/* Notification Bell */}
              <button
                onClick={() => navigate('/admin/notifications')}
                className="relative p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all duration-200 group"
              >
                <Bell size={24} className="group-hover:rotate-12 transition-transform duration-200" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[20px] h-[20px] px-1 text-[10px] font-black text-white bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg shadow-red-500/40 animate-pulse z-10 whitespace-nowrap border-2 border-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* User Avatar */}
              <Link
                to="/admin/profile"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-200 cursor-pointer group"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-md">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{user?.name}</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;