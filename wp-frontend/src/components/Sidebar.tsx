import { cn } from '@/lib/utils';
import {
  Activity,
  FileText,
  History,
  LayoutDashboard,
  MessageSquare,
  Send,
  Settings,
  Users,
  Zap,
  MessageCircle,
  TrendingUp,
  LogOut
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Send Message', href: '/send', icon: Send },
  { name: 'Live Messages', href: '/messages', icon: MessageSquare },
  { name: 'Chat', href: '/chat', icon: MessageCircle },
  { name: 'Drip Campaigns', href: '/drip-campaigns', icon: TrendingUp },
  { name: 'History', href: '/history', icon: History },
  { name: 'Templates', href: '/templates', icon: FileText },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar = ({ isOpen = false, onClose }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth(); // Import unified logout function

  const handleLogout = () => {
    // This securely removes the token from local storage and nullifies context state
    logout();

    // Fallback: If any other tokens exist, destroy them too
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    // Redirect to login
    navigate('/login', { replace: true });
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-50 flex lg:hidden ${isOpen ? '' : 'pointer-events-none'}`}>
        {/* Overlay */}
        <div
          className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
        />
        {/* Sidebar Drawer */}
        <div className={`relative w-64 bg-gradient-to-b from-green-600 to-green-700 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex grow flex-col gap-y-5 overflow-y-auto px-6 pb-4 pt-4">
            <div className="flex h-16 shrink-0 items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Yogi Sarbat</h1>
                  <p className="text-xs text-green-100">WhatsApp Manager</p>
                </div>
              </div>
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {navigation.map((item) => {
                      const isActive = location.pathname === item.href;
                      return (
                        <li key={item.name}>
                          <Link
                            to={item.href}
                            className={cn(
                              'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all duration-200',
                              isActive
                                ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                                : 'text-green-100 hover:text-white hover:bg-white/10'
                            )}
                            onClick={onClose}
                          >
                            <item.icon
                              className={cn(
                                'h-6 w-6 shrink-0 transition-colors',
                                isActive ? 'text-white' : 'text-green-200'
                              )}
                            />
                            {item.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all duration-200 text-green-100 hover:text-white hover:bg-white/10"
                  >
                    <LogOut className="h-6 w-6 shrink-0 text-green-200 group-hover:text-white transition-colors" />
                    Logout
                  </button>
                </li>
                <li className="mt-auto">
                  <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
                        <Activity className="h-4 w-4 text-white animate-pulse" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">System Status</p>
                        <p className="text-xs text-green-100">All services running</p>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gradient-to-b from-green-600 to-green-700 px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Yogi Sarbat</h1>
                <p className="text-xs text-green-100">WhatsApp Manager</p>
              </div>
            </div>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          className={cn(
                            'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all duration-200',
                            isActive
                              ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                              : 'text-green-100 hover:text-white hover:bg-white/10'
                          )}
                        >
                          <item.icon
                            className={cn(
                              'h-6 w-6 shrink-0 transition-colors',
                              isActive ? 'text-white' : 'text-green-200'
                            )}
                          />
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}

                  <li>
                    <button
                      onClick={handleLogout}
                      className="group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all duration-200 text-green-100 hover:text-white hover:bg-white/10"
                    >
                      <LogOut className="h-6 w-6 shrink-0 text-green-200 group-hover:text-white transition-colors" />
                      Logout
                    </button>
                  </li>
                </ul>
              </li>
              <li className="mt-auto">
                <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
                      <Activity className="h-4 w-4 text-white animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">System Status</p>
                      <p className="text-xs text-green-100">All services running</p>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
