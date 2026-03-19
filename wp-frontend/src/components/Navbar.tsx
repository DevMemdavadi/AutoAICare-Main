import React, { useState } from 'react';
import { Bell, Menu, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NavbarProps {
  onMenuClick?: () => void;
}

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const [notifications, setNotifications] = useState([
    "Welcome to the dashboard!",
    "You have a new message.",
    "System update available."
  ]);
  const [showList, setShowList] = useState(false);

  const handleBellClick = () => {
    // Only toggle the notification list, do NOT add a new notification
    setShowList((prev) => !prev);
  };

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Logo and Home link */}
      <div className="flex items-center gap-x-4 mr-6">
        <div className="flex items-center justify-center h-10 w-10 bg-green-100 rounded-full">
          {/* Replace with your logo image if available */}
          <span className="text-green-600 font-bold text-lg">YS</span>
        </div>
        <a href="/" className="text-gray-900 font-semibold text-base hover:text-green-600 transition-colors ml-2">Home</a>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onMenuClick}
        className="lg:hidden"
      >
        <Menu className="h-6 w-6" />
      </Button>

      <div className="h-6 w-px bg-gray-200 lg:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="relative flex flex-1 items-center">
          <Search className="pointer-events-none absolute left-3 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search messages, contacts..."
            className="pl-10 w-full max-w-lg border-gray-200 focus:border-green-500 focus:ring-green-500"
          />
        </div>
        <div className="flex items-center gap-x-4 lg:gap-x-8">
          <TooltipProvider>
            <div className="relative flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative"
                    onClick={handleBellClick}
                    onBlur={() => setShowList(false)}
                  >
                    <Bell className="h-6 w-6" />
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                      {notifications.length}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  You have {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                </TooltipContent>
              </Tooltip>
              {/* Notification List Popover */}
              {showList && (
                <div className="absolute right-0 top-12 w-72 bg-white border border-gray-200 rounded shadow-lg z-50 p-4 mt-2">
                  {notifications.map((note, idx) => (
                    <p key={idx} className="mb-2 last:mb-0 text-gray-700">{note}</p>
                  ))}
                </div>
              )}
            </div>
          </TooltipProvider>
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />

          <div className="flex items-center gap-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
              <User className="h-5 w-5 text-white" />
            </div>
            <span className="hidden lg:flex lg:items-center">
              <span className="ml-2 text-sm font-semibold leading-6 text-gray-900">
                Admin User
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
