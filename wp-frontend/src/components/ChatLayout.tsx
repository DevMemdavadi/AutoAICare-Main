import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  extraContent?: React.ReactNode;
}

const ChatLayout = ({ children, extraContent = null }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64 h-full flex flex-col overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        {/* Extra content slot for banners, alerts, etc. */}
        {extraContent && (
          <div className="w-full z-10 bg-white shadow-sm border-b border-gray-200">
            {extraContent}
          </div>
        )}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ChatLayout;
