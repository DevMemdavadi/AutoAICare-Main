import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import BranchSelector from '@/components/BranchSelector';
import { Button, Card, Select, Input } from '@/components/ui';
import Alert from '@/components/ui/Alert';
import { useBranch } from '@/contexts/BranchContext';
import api from '@/utils/api';
import {
  BarChart3,
  Building2,
  Calendar,
  Download,
  IndianRupee,
  RefreshCw,
  TrendingUp,
  Users,
  Clock,
  Package,
  AlertTriangle,
  TrendingDown,
  ShoppingCart,
  Boxes
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { PeakHoursChart, BookingTrendsChart, BranchPerformanceTable } from '@/components/analytics/AnalyticsCharts';
import ErrorBoundary from '@/components/ErrorBoundary';

const Analytics = () => {
  const {
    isSuperAdmin,
    getCurrentBranchId,
    getCurrentBranchName,
    selectedBranch
  } = useBranch();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week'); // week, month, year, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [analytics, setAnalytics] = useState({
    revenue: {
      total: 0,
      growth: 0,
      by_period: [],
    },
    bookings: {
      total: 0,
      completed: 0,
      cancelled: 0,
      by_status: {},
    },
    customers: {
      total: 0,
      new: 0,
      active: 0,
      retention_rate: 0,
    },
    services: {
      popular: [],
      revenue_by_service: [],
    },
    ratings: {
      average: 0,
      distribution: {},
    },
    paymentMethods: [],
    peakHours: [],
    bookingTrends: [],
    branchPerformance: [],
    parts: {
      summary: {
        total_revenue: 0,
        total_cost: 0,
        total_profit: 0,
        profit_margin: 0,
        total_parts_used: 0
      },
      inventory: {
        total_parts: 0,
        total_value: 0,
        out_of_stock: 0,
        low_stock: 0
      },
      top_used_parts: [],
      most_profitable_parts: [],
      low_stock_alerts: [],
      parts_by_category: [],
      usage_trend: []
    },
  });

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, selectedBranch]); // Re-fetch when branch changes

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      const branchId = getCurrentBranchId();

      const params = {
        branch: branchId,
        period: timeRange
      };

      if (timeRange === 'custom' && startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      }

      // Fetch all analytics data in parallel
      const apiCalls = [
        api.get('/analytics/revenue/', { params }),
        api.get('/analytics/bookings/', { params }),
        api.get('/analytics/customers/', { params }),
        api.get('/analytics/services/', { params }),
        api.get('/feedback/summary/', { params }),
        api.get('/analytics/peak-hours/', { params }),
        api.get('/analytics/booking-trends/', {
          params: {
            ...params,
            days: timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : timeRange === 'year' ? 365 : undefined
          }
        }),
        api.get('/analytics/parts/', { params }),
      ];

      // Add branch performance for super admin
      if (isSuperAdmin) {
        apiCalls.push(api.get('/analytics/branch-performance/', { params }));
      }

      const responses = await Promise.all(apiCalls);
      const [revenueRes, bookingsRes, customersRes, servicesRes, ratingsRes, peakHoursRes, bookingTrendsRes, partsRes, branchPerformanceRes] = responses;

      // Transform feedback response to match expected structure
      const ratingsData = {
        average: ratingsRes.data.average_rating || 0,
        distribution: {
          5: ratingsRes.data.by_rating?.['5'] || ratingsRes.data.rating_distribution?.['5_star'] || 0,
          4: ratingsRes.data.by_rating?.['4'] || ratingsRes.data.rating_distribution?.['4_star'] || 0,
          3: ratingsRes.data.by_rating?.['3'] || ratingsRes.data.rating_distribution?.['3_star'] || 0,
          2: ratingsRes.data.by_rating?.['2'] || ratingsRes.data.rating_distribution?.['2_star'] || 0,
          1: ratingsRes.data.by_rating?.['1'] || ratingsRes.data.rating_distribution?.['1_star'] || 0,
        },
      };

      // Transform revenue response to match expected structure
      const revenueData = {
        total: revenueRes.data.revenue_trend?.reduce((sum, item) => sum + item.total, 0) || revenueRes.data.total || 0,
        growth: revenueRes.data.growth || 0,
        by_period: revenueRes.data.revenue_trend?.map(item => ({
          label: item.date,
          amount: item.total
        })) || revenueRes.data.by_period || [],
      };

      setAnalytics({
        revenue: revenueData,
        bookings: bookingsRes.data,
        customers: customersRes.data,
        services: servicesRes.data,
        ratings: ratingsData,
        paymentMethods: revenueRes.data.payment_methods || [],
        peakHours: peakHoursRes.data.peak_hours || [],
        bookingTrends: bookingTrendsRes.data.data || [],
        branchPerformance: branchPerformanceRes?.data.branches || [],
        parts: partsRes.data || analytics.parts,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to load analytics data' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      const branchId = getCurrentBranchId();
      // For super admins, we want to be able to see "All" branches when no branch is selected
      // For regular admins/staff, we always filter by their branch
      const shouldFilterByBranch = isSuperAdmin ? branchId !== null : true;
      const params = new URLSearchParams({ period: timeRange });

      if (shouldFilterByBranch && branchId) {
        params.append('branch', branchId.toString());
      }

      const response = await api.get(`/analytics/export/?${params.toString()}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const branchName = getCurrentBranchName().replace(/\s+/g, '-');
      link.setAttribute('download', `analytics-${branchName}-${timeRange}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting report:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to export report' });
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color, trend }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 md:mb-1">
            <p className="text-xs md:text-sm font-medium text-gray-600 truncate">{title}</p>
            {trend !== undefined && (
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${trend >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
          <p className="text-xl md:text-3xl font-bold text-gray-900 truncate">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 md:p-4 rounded-xl ${color} bg-opacity-10 flex-shrink-0 ml-2`}>
          <Icon size={20} className={`md:hidden ${color.replace('bg-', 'text-')}`} />
          <Icon size={28} className={`hidden md:block ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-80 mt-2 animate-pulse"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-10 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>

        {/* Key Metrics Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-20 mt-2 animate-pulse"></div>
                </div>
                <div className="h-12 w-12 bg-gray-200 rounded-xl animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue Chart Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
          </div>
          <div className="h-64 flex items-end justify-between gap-2 p-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-gray-200 rounded-t animate-pulse" style={{ height: `${Math.floor(Math.random() * 60) + 20}%` }}></div>
                <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Booking Status & Popular Services Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Booking Status Skeleton */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
            </div>
            <div className="space-y-4 p-4">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Services Skeleton */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
            </div>
            <div className="space-y-3 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-16 mt-1 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-12 mt-1 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Customer Analytics Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Retention Skeleton */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
            <div className="p-4 text-center">
              <div className="relative inline-flex items-center justify-center w-32 h-32">
                <div className="w-32 h-32 rounded-full bg-gray-200 animate-pulse"></div>
                <div className="absolute h-6 bg-gray-200 rounded w-12 animate-pulse"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-40 mt-4 mx-auto animate-pulse"></div>
            </div>
          </div>

          {/* Rating Distribution Skeleton */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-4 bg-gray-200 rounded w-6 animate-pulse"></div>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats Skeleton */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
            </div>
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded w-8 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Service Revenue Breakdown Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-56 animate-pulse"></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[...Array(5)].map((_, i) => (
                    <th key={i} className="px-4 py-3 text-left">
                      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Peak Hours Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
          </div>
          <div className="h-64 flex items-end justify-between gap-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-gray-200 rounded-t animate-pulse" style={{ height: `${Math.floor(Math.random() * 60) + 20}%` }}></div>
                <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Booking Trends Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          <div className="p-4">
            <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="text-center">
                  <div className="h-4 bg-gray-200 rounded w-24 mx-auto mb-2 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded w-16 mx-auto animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Branch Performance Skeleton (Super Admin Only) */}
        {isSuperAdmin && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="h-6 bg-gray-200 rounded w-56 animate-pulse"></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {[...Array(6)].map((_, i) => (
                      <th key={i} className="px-4 py-3 text-left">
                        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[...Array(3)].map((_, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Pie chart component for payment methods
  const PaymentMethodsChart = () => {
    if (!analytics.paymentMethods || analytics.paymentMethods.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>No payment data available</p>
        </div>
      );
    }

    // Calculate total amount for percentages
    const totalAmount = analytics.paymentMethods.reduce((sum, method) => sum + method.total, 0);

    // Colors for different payment methods
    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280'];

    // Calculate percentages and create chart segments
    let startAngle = 0;

    return (
      <div className="flex flex-col md:flex-row items-center gap-8 p-6">
        <div className="relative w-64 h-64">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            {analytics.paymentMethods.map((method, index) => {
              const percentage = (method.total / totalAmount) * 100;
              const angle = (percentage / 100) * 360;
              const endAngle = startAngle + angle;

              // Convert angles to radians
              const startRadians = (startAngle - 90) * Math.PI / 180;
              const endRadians = (endAngle - 90) * Math.PI / 180;

              // Calculate coordinates for the arc
              const x1 = 50 + 40 * Math.cos(startRadians);
              const y1 = 50 + 40 * Math.sin(startRadians);
              const x2 = 50 + 40 * Math.cos(endRadians);
              const y2 = 50 + 40 * Math.sin(endRadians);

              // Determine if it's a large arc
              const largeArcFlag = angle > 180 ? 1 : 0;

              // Create the path
              const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

              startAngle = endAngle;

              return (
                <path
                  key={method.payment_method}
                  d={pathData}
                  fill={colors[index % colors.length]}
                  stroke="#fff"
                  strokeWidth="0.5"
                />
              );
            })}
            {/* Center circle */}
            <circle cx="50" cy="50" r="15" fill="#fff" />
            <text x="50" y="50" textAnchor="middle" dy="0.3em" fontSize="8" fontWeight="bold">
              ₹{totalAmount.toLocaleString()}
            </text>
          </svg>
        </div>

        <div className="flex-1">
          <div className="space-y-3">
            {analytics.paymentMethods.map((method, index) => {
              const percentage = totalAmount > 0 ? (method.total / totalAmount) * 100 : 0;
              return (
                <div key={method.payment_method} className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  ></div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium capitalize">{method.payment_method}</span>
                      <span>₹{method.total.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: colors[index % colors.length]
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {method.count} transactions ({percentage.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Professional Revenue Chart using Recharts
  const RevenueChart = () => {
    const revenueData = analytics.revenue.by_period || [];

    if (!revenueData || revenueData.length === 0) {
      return (
        <div className="w-full h-80 flex flex-col items-center justify-center text-gray-500 p-4">
          <BarChart3 size={48} className="opacity-50 mb-2" />
          <p>No revenue data available for the selected period</p>
        </div>
      );
    }

    const totalRevenue = revenueData.reduce((sum, p) => sum + p.amount, 0);
    const avgRevenue = revenueData.length > 0 ? totalRevenue / revenueData.length : 0;
    const peakData = revenueData.reduce((max, p) => p.amount > max.amount ? p : max, { amount: 0, label: '0' });

    const CustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-gray-900 text-white p-3 rounded-lg shadow-xl border border-gray-700">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 font-bold">{label}</p>
            <p className="text-sm font-bold">₹{payload[0].value.toLocaleString()}</p>
          </div>
        );
      }
      return null;
    };

    return (
      <div className="p-4">
        <div className="h-80 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={revenueData}
              margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
              barGap={8}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fill: '#6B7280' }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#6B7280' }}
                tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
              />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6' }} />
              <Bar
                dataKey="amount"
                radius={[4, 4, 0, 0]}
                maxBarSize={45}
              >
                {revenueData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.amount === peakData.amount && entry.amount > 0 ? '#10B981' : '#3B82F6'}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart summary metrics */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3 border-t border-gray-100 pt-6">
          <div className="bg-blue-50/50 p-3 md:p-4 rounded-xl border border-blue-100 flex flex-col items-center text-center">
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mb-1">Total Revenue</p>
            <p className="text-xl md:text-2xl font-black text-blue-900">₹{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-emerald-50/50 p-3 md:p-4 rounded-xl border border-emerald-100 flex flex-col items-center text-center">
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-1">Avg / Period</p>
            <p className="text-xl md:text-2xl font-black text-emerald-900">₹{avgRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-amber-50/50 p-3 md:p-4 rounded-xl border border-amber-100 flex flex-col items-center text-center col-span-2 md:col-span-1">
            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mb-1">Peak Data Point</p>
            <p className="text-xl md:text-2xl font-black text-amber-900 truncate w-full">{peakData.label}</p>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced Booking Status Distribution Chart
  const BookingStatusChart = () => {
    const [showEmptyStatuses, setShowEmptyStatuses] = useState(false);

    const statusLabels = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      vehicle_arrived: 'Vehicle Arrived',
      assigned_to_fm: 'Assigned to FM',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      qc_pending: 'QC Pending',
      qc_completed: 'QC Completed',
      work_in_progress: 'Work in Progress',
      work_completed: 'Work Completed',
      final_qc_pending: 'Final QC Pending',
      ready_for_billing: 'Ready for Billing',
      billed: 'Billed',
      ready_for_delivery: 'Ready for Delivery',
      delivered: 'Delivered',
      closed: 'Closed'
    };

    const statusColors = {
      pending: '#F59E0B',        // Amber
      confirmed: '#3B82F6',      // Blue
      vehicle_arrived: '#6366F1', // Indigo
      assigned_to_fm: '#8B5CF6',  // Violet
      qc_pending: '#EC4899',      // Pink - Attention needed
      qc_completed: '#F472B6',    // Light Pink
      in_progress: '#A855F7',     // Purple
      work_in_progress: '#A855F7',// Purple
      work_completed: '#818CF8',  // Indigo light
      final_qc_pending: '#DB2777',// Deep Pink
      completed: '#10B981',      // Emerald
      cancelled: '#EF4444',      // Red
      ready_for_billing: '#F97316',// Orange
      billed: '#06B6D4',         // Cyan
      ready_for_delivery: '#14B8A6',// Teal
      delivered: '#059669',      // Dark Emerald
      closed: '#4B5563',         // Slate
    };

    const totalBookings = analytics.bookings.total || 1;
    const allStatuses = Object.entries(analytics.bookings.by_status || {});
    const filteredStatuses = showEmptyStatuses
      ? allStatuses
      : allStatuses.filter(([_, count]) => count > 0);

    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs text-gray-500">
            Showing {filteredStatuses.length} of {allStatuses.length} statuses
          </p>
          <button
            onClick={() => setShowEmptyStatuses(!showEmptyStatuses)}
            className="text-xs text-primary hover:underline font-medium"
          >
            {showEmptyStatuses ? 'Hide Empty' : 'Show All'}
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar2 min-h-0 py-2">
          {filteredStatuses.length > 0 ? (
            filteredStatuses.map(([status, count]) => (
              <div key={status} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: statusColors[status] || '#6B7280' }}
                    ></div>
                    <span className="text-sm font-medium text-gray-700">
                      {analytics.bookings.status_labels?.[status] || statusLabels[status] || status.replaceAll("_", " ").split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                    <span className="text-xs text-gray-500">
                      {Math.round((count / totalBookings) * 100)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${(count / totalBookings) * 100}%`,
                      backgroundColor: statusColors[status] || '#6B7280'
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 italic">
              No active statuses found for the selected period.
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 mt-auto py-4 border-t border-gray-100 bg-gray-50/50 -mx-4 -mb-4 px-4 flex-shrink-0">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{analytics.bookings.completed || 0}</p>
            <p className="text-xs text-gray-600">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{analytics.bookings.cancelled || 0}</p>
            <p className="text-xs text-gray-600">Cancelled</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">
              {analytics.bookings.total ? Math.round((analytics.bookings.completed / analytics.bookings.total) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-600">Success Rate</p>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced Customer Analytics Section
  const CustomerAnalytics = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Retention */}
        <Card title="Customer Retention">
          <div className="p-4 text-center">
            <div className="relative inline-flex items-center justify-center w-32 h-32">
              <svg className="transform -rotate-90 w-32 h-32">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-200"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 *
                    Math.PI *
                    56 *
                    (1 - (analytics.customers.retention_rate || 0) / 100)
                    }`}
                  className="text-primary"
                />
              </svg>
              <span className="absolute text-2xl font-bold">
                {analytics.customers.retention_rate || 0}%
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Customer Retention Rate
            </p>
          </div>
        </Card>

        {/* Rating Distribution */}
        <Card title="Rating Distribution">
          <div className="p-4 space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 w-6">
                  {rating}★
                </span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${((analytics.ratings.distribution?.[rating] || 0) /
                        (analytics.bookings.total || 1)) *
                        100
                        }%`,
                    }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-8 text-right">
                  {analytics.ratings.distribution?.[rating] || 0}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Customer Quick Stats */}
        <Card title="Customer Metrics">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-700">Total Customers</p>
                <p className="text-xl font-bold text-blue-600">
                  {analytics.customers.total || 0}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-700">New ({timeRange})</p>
                <p className="text-xl font-bold text-green-600">
                  {analytics.customers.new || 0}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-700">Active ({timeRange})</p>
                <p className="text-xl font-bold text-purple-600">
                  {analytics.customers.active || 0}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: '', message: '' })}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 truncate">
            Analytics &amp; Reports
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {isSuperAdmin ? (
              <>
                <Building2 size={14} className="text-primary flex-shrink-0" />
                <p className="text-sm text-gray-600 truncate">
                  Viewing: <span className="font-semibold text-primary">{getCurrentBranchName()}</span>
                </p>
              </>
            ) : (
              <>
                <Building2 size={14} className="text-gray-600 flex-shrink-0" />
                <p className="text-sm text-gray-600 truncate">
                  Branch: <span className="font-semibold">{getCurrentBranchName()}</span>
                </p>
              </>
            )}
          </div>
        </div>

        {/* Controls — stack on mobile */}
        <div className="flex flex-col gap-2 w-full md:w-auto">
          {/* Row 1: Branch selector + Time range */}
          <div className="flex items-center gap-2">
            {isSuperAdmin && <div className="flex-1 md:flex-initial"><BranchSelector /></div>}
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              options={[
                { value: "week", label: "Last 7 Days" },
                { value: "month", label: "Last 30 Days" },
                { value: "year", label: "Last 12 Months" },
                { value: "custom", label: "Custom Range" },
              ]}
              className="flex-1 md:flex-initial md:min-w-[150px]"
            />
            {/* Refresh — icon only, always visible */}
            <button
              onClick={fetchAnalytics}
              className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Row 2: Custom date range (when selected) */}
          {timeRange === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-left-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 !py-1"
                placeholder="Start"
              />
              <span className="text-gray-400 text-xs">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 !py-1"
                placeholder="End"
              />
              <Button
                onClick={fetchAnalytics}
                size="sm"
                variant="primary"
                disabled={!startDate || !endDate}
                className="flex-shrink-0"
              >
                Apply
              </Button>
            </div>
          )}

          {/* Row 3: Export button — full width on mobile */}
          <button
            onClick={handleExportReport}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary text-white hover:bg-primary-dark transition-all rounded-lg px-4 py-2 font-semibold text-sm"
          >
            <Download size={16} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard
          icon={IndianRupee}
          title="Total Revenue"
          value={`₹${typeof analytics.revenue === 'object' ? (analytics.revenue.total?.toLocaleString() || 0) : 0}`}
          subtitle={`${timeRange} performance`}
          color="bg-green-500"
          trend={typeof analytics.revenue === 'object' ? analytics.revenue.growth : 0}
        />
        <StatCard
          icon={Calendar}
          title="Total Bookings"
          value={analytics.bookings.total || 0}
          subtitle={`${analytics.bookings.completed || 0} completed`}
          color="bg-blue-500"
        />
        <StatCard
          icon={Users}
          title="Active Customers"
          value={analytics.customers.active || 0}
          subtitle={`${analytics.customers.new || 0} new customers`}
          color="bg-purple-500"
        />
        <StatCard
          icon={TrendingUp}
          title="Avg Rating"
          value={analytics.ratings.average?.toFixed(1) || 0}
          subtitle="Customer satisfaction"
          color="bg-yellow-500"
        />
      </div>

      {/* Revenue Chart */}
      <Card title="Revenue Over Time">
        <RevenueChart />
      </Card>

      {/* Booking Status & Popular Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch mb-8">
        {/* Booking Status */}
        <Card title="Booking Status Distribution" className="h-[550px] flex flex-col overflow-hidden">
          <BookingStatusChart />
        </Card>

        {/* Popular Services */}
        <Card title="Top Performing Services" className="h-[550px] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar2 min-h-0">
            <div className="space-y-3 pb-4">
              {analytics.services.popular?.length > 0 ? (
                analytics.services.popular.slice(0, 10).map((service, index) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {service.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {service.bookings} bookings
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        ₹{service.revenue?.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600">revenue</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No service data available
                </p>
              )}
            </div>
          </div>

          {/* Internal Footer for consistency (optional, but looks better) */}
          <div className="py-4 border-t border-gray-100 bg-gray-50/50 text-center -mx-4 -mb-4 flex-shrink-0">
            <p className="text-xs text-gray-500 font-medium">
              Based on {analytics.services.popular?.length || 0} active services
            </p>
          </div>
        </Card>
      </div>

      {/* Customer Analytics */}
      <CustomerAnalytics />

      {/* Parts Analytics Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Package className="text-primary" size={24} />
          <h2 className="text-xl font-bold text-gray-900">Parts Analytics</h2>
        </div>

        {/* Parts Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <StatCard
            icon={IndianRupee}
            title="Parts Revenue"
            value={`₹${analytics.parts.summary.total_revenue?.toLocaleString() || 0}`}
            subtitle={`${analytics.parts.summary.profit_margin?.toFixed(1) || 0}% profit margin`}
            color="bg-green-500"
          />
          <StatCard
            icon={ShoppingCart}
            title="Parts Used"
            value={analytics.parts.summary.total_parts_used || 0}
            subtitle={`₹${analytics.parts.summary.total_profit?.toLocaleString() || 0} profit`}
            color="bg-blue-500"
          />
          <StatCard
            icon={Boxes}
            title="Inventory Value"
            value={`₹${analytics.parts.inventory.total_value?.toLocaleString() || 0}`}
            subtitle={`${analytics.parts.inventory.total_parts || 0} parts in stock`}
            color="bg-purple-500"
          />
          <StatCard
            icon={AlertTriangle}
            title="Stock Alerts"
            value={analytics.parts.inventory.low_stock + analytics.parts.inventory.out_of_stock || 0}
            subtitle={`${analytics.parts.inventory.out_of_stock || 0} out of stock`}
            color="bg-red-500"
          />
        </div>

        {/* Top Used Parts & Most Profitable */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Used Parts */}
          <Card title="Most Used Parts" className="h-[500px] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar2 min-h-0">
              <div className="space-y-3 pb-4">
                {analytics.parts.top_used_parts?.length > 0 ? (
                  analytics.parts.top_used_parts.map((part, index) => (
                    <div
                      key={part.part_id || index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{part.name}</p>
                          <p className="text-xs text-gray-600">
                            {part.quantity_used} units • {part.usage_count} times
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">₹{part.revenue?.toLocaleString()}</p>
                        <p className="text-xs text-gray-600">{part.profit_margin?.toFixed(1)}% margin</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">No parts usage data available</p>
                )}
              </div>
            </div>
          </Card>

          {/* Most Profitable Parts */}
          <Card title="Most Profitable Parts" className="h-[500px] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar2 min-h-0">
              <div className="space-y-3 pb-4">
                {analytics.parts.most_profitable_parts?.length > 0 ? (
                  analytics.parts.most_profitable_parts.map((part, index) => (
                    <div
                      key={part.part_id || index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{part.name}</p>
                          <p className="text-xs text-gray-600">
                            Revenue: ₹{part.revenue?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">₹{part.profit?.toLocaleString()}</p>
                        <p className="text-xs text-gray-600">{part.profit_margin?.toFixed(1)}% margin</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">No profitability data available</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Low Stock Alerts & Parts by Category */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Low Stock Alerts */}
          <Card title="Low Stock Alerts" className="h-[450px] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar2 min-h-0">
              <div className="space-y-2 pb-4">
                {analytics.parts.low_stock_alerts?.length > 0 ? (
                  analytics.parts.low_stock_alerts.map((part) => (
                    <div
                      key={part.id}
                      className={`p-3 rounded-lg border-l-4 ${part.stock_status === 'out_of_stock'
                        ? 'bg-red-50 border-red-500'
                        : 'bg-yellow-50 border-yellow-500'
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{part.name}</p>
                            <span className="text-xs text-gray-500">({part.sku})</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {part.branch_name} • {part.unit}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${part.stock_status === 'out_of_stock' ? 'text-red-600' : 'text-yellow-600'
                            }`}>
                            {part.current_stock} / {part.min_stock_level}
                          </p>
                          <p className="text-xs text-gray-600">
                            {part.stock_status === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <AlertTriangle className="mx-auto mb-2 opacity-50" size={32} />
                    <p>No low stock alerts</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Parts by Category */}
          <Card title="Parts by Category" className="h-[450px] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar2 min-h-0">
              <div className="space-y-3 pb-4">
                {analytics.parts.parts_by_category?.length > 0 ? (
                  analytics.parts.parts_by_category.map((category, index) => {
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
                    const color = colors[index % colors.length];
                    return (
                      <div
                        key={category.category}
                        className="p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${color}`}></div>
                            <p className="font-medium text-gray-900">{category.category_label}</p>
                          </div>
                          <p className="text-sm font-bold text-gray-700">{category.parts_count} parts</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="text-sm">
                            <p className="text-gray-600">Stock</p>
                            <p className="font-semibold">{category.total_stock}</p>
                          </div>
                          <div className="text-sm text-right">
                            <p className="text-gray-600">Value</p>
                            <p className="font-semibold">₹{category.inventory_value?.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-gray-500 py-8">No category data available</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Payment Methods Chart - New Section */}
      <Card title="Payment Methods Distribution">
        <PaymentMethodsChart />
      </Card>

      {/* Service Revenue Breakdown */}
      <Card title="Revenue by Service Category">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Service
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Bookings
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Revenue
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Avg Price
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Growth
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analytics.services.revenue_by_service?.length > 0 ? (
                analytics.services.revenue_by_service.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {service.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {service.bookings}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600">
                      ₹{service.revenue?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      ₹{service.avg_price?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${service.growth >= 0
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                          }`}
                      >
                        {service.growth >= 0 ? "+" : ""}
                        {service.growth}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No service revenue data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Peak Hours Analytics */}
      <ErrorBoundary title="Peak Hours Chart Error">
        <Card title="Peak Booking Hours">
          <PeakHoursChart peakHours={analytics.peakHours} />
        </Card>
      </ErrorBoundary>

      {/* Booking Trends */}
      <ErrorBoundary title="Booking Trends Chart Error">
        <Card title="Booking Trends Over Time">
          <BookingTrendsChart bookingTrends={analytics.bookingTrends} />
        </Card>
      </ErrorBoundary>

      {/* Branch Performance - Super Admin Only */}
      <ErrorBoundary title="Branch Performance Table Error">
        <BranchPerformanceTable
          branchPerformance={analytics.branchPerformance}
          isSuperAdmin={isSuperAdmin}
        />
      </ErrorBoundary>
    </div>
  );
};

export default Analytics;
