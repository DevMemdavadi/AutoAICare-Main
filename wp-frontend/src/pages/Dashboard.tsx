import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardStats, getMessages } from '@/lib/whatsappService';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Clock,
  MessageSquare,
  Send,
  TrendingUp,
  Users,
  XCircle,
  Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [stats, setStats] = useState<any[]>([]);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getDashboardStats();
        const data = response.data;

        const formattedStats = [
          {
            name: 'Total Messages',
            value: data.total_messages.value.toLocaleString(),
            change: `${data.total_messages.change > 0 ? '+' : ''}${data.total_messages.change}%`,
            changeType: data.total_messages.change >= 0 ? 'positive' : 'negative',
            icon: MessageSquare,
          },
          {
            name: 'Messages Sent',
            value: data.sent.value.toLocaleString(),
            change: `${data.sent.change > 0 ? '+' : ''}${data.sent.change}%`,
            changeType: data.sent.change >= 0 ? 'positive' : 'negative',
            icon: Send,
          },
          {
            name: 'Delivered',
            value: data.delivered.value.toLocaleString(),
            change: `${data.delivered.change > 0 ? '+' : ''}${data.delivered.change}%`,
            changeType: data.delivered.change >= 0 ? 'positive' : 'negative',
            icon: CheckCircle,
          },
          {
            name: 'Failed',
            value: data.failed.value.toLocaleString(),
            change: `${data.failed.change > 0 ? '+' : ''}${data.failed.change}%`,
            changeType: data.failed.change >= 0 ? 'positive' : 'negative',
            icon: XCircle,
          },
        ];

        setStats(formattedStats);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      }
    };

    const fetchRecentMessages = async () => {
      try {
        const response = await getMessages({ ordering: '-timestamp', page_size: 5 });
        setRecentMessages(response.data.data);
      } catch (error) {
        setRecentMessages([]);
      }
    };

    fetchStats();
    fetchRecentMessages();
  }, []);

  const quickActions = [
    {
      name: 'Send Message',
      description: 'Send WhatsApp messages instantly',
      href: '/send',
      icon: Send,
      color: 'bg-blue-500',
    },
    {
      name: 'Live Messages',
      description: 'Monitor real-time message flow',
      href: '/messages',
      icon: Zap,
      color: 'bg-green-500',
    },
    {
      name: 'Message History',
      description: 'View detailed message logs',
      href: '/history',
      icon: Clock,
      color: 'bg-purple-500',
    },
    {
      name: 'Manage Contacts',
      description: 'View & Organize your contact list',
      href: '/contacts',
      icon: Users,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back! Here's what's happening with your WhatsApp messaging.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.name}
            className="hover:shadow-lg transition-shadow duration-200"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <stat.icon className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {stat.name}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                </div>
                <div
                  className={`flex items-center text-sm font-medium ${
                    stat.changeType === "positive"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {stat.changeType === "positive" ? (
                    <ArrowUp className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDown className="h-4 w-4 mr-1" />
                  )}
                  {stat.change}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="h-auto w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Jump to the most commonly used features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link key={action.name} to={action.href} className="h-full">
                <div className="group relative flex flex-col h-full overflow-hidden rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 hover:border-gray-300">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className={`p-2 rounded-lg ${action.color}`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                        {action.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
            <CardDescription>Latest WhatsApp activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMessages.length === 0 ? (
                <div className="text-gray-500 text-sm">No recent messages.</div>
              ) : (
                recentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        Message to +{msg.phone_number}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {msg.message_content || msg.template_name || 'No content'}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">{formatRelativeTime(msg.timestamp)}</div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4">
              <Link to="/messages">
                <Button variant="outline" className="w-full">
                  View All Messages
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Current system status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-900">
                    WhatsApp API
                  </span>
                </div>
                <span className="text-xs text-green-600 font-medium">
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-900">
                    WebSocket
                  </span>
                </div>
                <span className="text-xs text-green-600 font-medium">
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-900">
                    Database
                  </span>
                </div>
                <span className="text-xs text-green-600 font-medium">
                  Active
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function formatRelativeTime(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

export default Dashboard;
