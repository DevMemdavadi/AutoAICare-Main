import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  LayoutDashboard,
  Wrench,
  Calendar,
  CreditCard,
  ShoppingBag,
  Star,
  User,
  LogOut,
  Menu,
  X,
  Bell,
  Crown,
  Gift
} from 'lucide-react';
import { useState } from 'react';

const CustomerLayout = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/customer', icon: LayoutDashboard },
    { name: 'Services', href: '/customer/services', icon: Wrench },
    { name: 'Request Appointment', href: '/customer/book', icon: Calendar },
    { name: 'My Appointments', href: '/customer/appointments', icon: Calendar },
    { name: 'Track Job', href: '/customer/track', icon: Calendar },
    { name: 'Memberships', href: '/customer/memberships', icon: Crown },
    { name: 'Referrals', href: '/customer/referrals', icon: Gift },
    { name: 'Payments', href: '/customer/payments', icon: CreditCard },
    // { name: 'Store', href: '/customer/store', icon: ShoppingBag },
    { name: 'Feedback', href: '/customer/feedback', icon: Star },
    { name: 'Notifications', href: '/customer/notifications', icon: Bell },
    { name: 'Profile', href: '/customer/profile', icon: User },
  ];

  const isActive = (href) => {
    if (href === '/customer') {
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
                <p className="text-[10px] text-primary/60 uppercase tracking-widest font-bold">Customer Portal</p>
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
          <nav className="flex-1 min-h-0 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar relative">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    group relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${active
                      ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-primary/30 scale-[1.02]'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white hover:translate-x-1'
                    }
                  `}
                >
                  <Icon size={20} className={`transition-transform duration-200 ${active ? '' : 'group-hover:scale-110'}`} />
                  <span className="flex-1">{item.name}</span>
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg shadow-white/50"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="relative p-4 border-t border-slate-800/50 bg-slate-950/50">
            {/* <div className="px-2 mb-3">
                <p className="text-[10px] text-primary/60 uppercase tracking-widest font-bold">Welcome Back</p>
              </div> */}
            <Link
              to="/customer/profile"
              className="flex items-center gap-3 px-3 py-3 mb-3 bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200 cursor-pointer group/profile"
            >
              <div className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-primary via-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center font-bold shadow-lg shadow-primary/30 ring-2 ring-slate-700/50 group-hover/profile:scale-105 transition-transform">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate uppercase tracking-wide">{user?.role?.replace(/_/g, ' ')}</p>
                {user?.branch_name && (
                  <p className="text-[11px] text-primary/80 truncate font-semibold mt-0.5 uppercase tracking-wider">
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
                    {navigation.find(item => isActive(item.href))?.name || 'Dashboard'}
                  </h2>
                  {/* <p className="text-xs text-slate-500 font-medium">Welcome back, {user?.name}</p> */}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <button
                onClick={() => navigate('/customer/notifications')}
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
                to="/customer/profile"
                className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-slate-100/50 hover:bg-slate-200 rounded-2xl transition-all duration-200 cursor-pointer group"
              >
                <div className="flex flex-col items-end mr-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Welcome</span>
                  <span className="text-sm font-extrabold text-slate-900 group-hover:text-primary transition-colors">{user?.name}</span>
                </div>
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-md">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
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

export default CustomerLayout;
