import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Button, Alert, Modal, Input, Select, Textarea } from '@/components/ui';
import { AccountingFilterProvider, useAccountingFilter } from '@/contexts/AccountingFilterContext';
import GlobalFilterBar from '@/components/accounting/GlobalFilterBar';
import ExpenseFormModal from '@/components/accounting/ExpenseFormModal';
import ExpensesTab from './accounting/ExpensesTab';
import SalaryTab from './accounting/SalaryTab';
import VendorsTab from './accounting/VendorsTab';
import InvoicesTab from './accounting/InvoicesTab';
import ReportsTab from './accounting/ReportsTab';
import PettyCashTab from './accounting/PettyCashTab';
import RecurringExpensesTab from './accounting/RecurringExpensesTab';
import BranchFinancialTab from './accounting/BranchFinancialTab';
import AttendanceTab from './accounting/AttendanceTab';
import ApprovalsTab from './accounting/ApprovalsTab';
import GSTReportsTab from './accounting/GSTReportsTab';
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  FileText,
  Calendar,
  Users,
  ShoppingBag,
  Wallet,
  Download,
  Filter,
  BarChart3,
  PieChart,
  Activity,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Percent,
  Target,
  Zap,
  RefreshCw,
  Building2,
  UserCheck,
  CheckSquare,
  FileBarChart
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const AccountingContent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    getFilterParams,
    startDate,
    endDate,
    selectedBranches,
    formatCurrency,
    compareMode
  } = useAccountingFilter();

  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState({
    total_income: 0,
    total_expense: 0,
    net_profit: 0,
    receivables: 0,
    payables: 0,
    pending_salaries: 0
  });
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState([]);
  const [incomeBreakdown, setIncomeBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Fetch data when filters change
  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedBranches, compareMode]); // Re-fetch on filter change

  const getTrendProps = (change) => {
    if (!compareMode || change === null || change === undefined) return {};
    const val = parseFloat(change);
    return {
      trend: val >= 0 ? 'up' : 'down',
      trendValue: `${Math.abs(val).toFixed(1)}% vs prev period`
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = getFilterParams();

      const [summaryRes, invoicesRes, expensesRes, trendRes, expenseBreakdownRes, incomeBreakdownRes] = await Promise.all([
        api.get('/accounting/transactions/summary/', { params }),
        // Exclude draft invoices — they are work-in-progress and not financial records
        api.get('/billing/', { params: { ...params, exclude_draft: true } }),
        api.get('/accounting/expenses/', { params }),
        api.get('/accounting/transactions/monthly_trend/', { params }),
        api.get('/accounting/expenses/category_breakdown/', { params }),
        api.get('/accounting/transactions/income_breakdown/', { params })
      ]);

      setSummary(summaryRes.data);
      // Filter out any remaining draft invoices as a safety net
      const allInvoices = invoicesRes.data.results || [];
      setInvoices(allInvoices.filter(inv => inv.status !== 'draft'));
      setExpenses(expensesRes.data.results || []);
      setMonthlyTrend(trendRes.data || []);
      setExpenseBreakdown(expenseBreakdownRes.data || []);
      setIncomeBreakdown(incomeBreakdownRes.data || []);
    } catch (err) {
      console.error('Error fetching accounting data:', err);
      setError('Failed to load accounting data');
    } finally {
      setLoading(false);
    }
  };



  // Chart configurations
  const monthlyTrendChartData = {
    labels: monthlyTrend.map(t => new Date(t.month).toLocaleDateString('default', { month: 'short', year: 'numeric' })),
    datasets: [
      {
        label: 'Income',
        data: monthlyTrend.map(t => t.income || 0),
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
      },
      {
        label: 'Expense',
        data: monthlyTrend.map(t => t.expense || 0),
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
      }
    ]
  };

  const expenseBreakdownChartData = {
    labels: expenseBreakdown.map(e => e.category_display),
    datasets: [{
      data: expenseBreakdown.map(e => e.total),
      backgroundColor: [
        'rgba(59, 130, 246, 0.7)',
        'rgba(239, 68, 68, 0.7)',
        'rgba(34, 197, 94, 0.7)',
        'rgba(251, 191, 36, 0.7)',
        'rgba(168, 85, 247, 0.7)',
        'rgba(236, 72, 153, 0.7)',
        'rgba(20, 184, 166, 0.7)',
      ],
      borderWidth: 2,
    }]
  };

  const StatCard = ({ title, value, icon: Icon, color, trend, trendValue, subtitle }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold mt-2 ${color}`}>
            {formatCurrency(value)}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '100')}`}>
          <Icon className={color} size={24} />
        </div>
      </div>
    </div>
  );

  const StatCardSkeleton = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
          <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="p-3 rounded-lg bg-gray-100">
          <div className="w-6 h-6 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );

  const ChartSkeleton = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
      <div className="h-80 bg-gray-100 rounded flex items-end justify-around p-4 gap-2">
        <div className="bg-gray-200 rounded w-full" style={{ height: '60%' }}></div>
        <div className="bg-gray-200 rounded w-full" style={{ height: '80%' }}></div>
        <div className="bg-gray-200 rounded w-full" style={{ height: '45%' }}></div>
        <div className="bg-gray-200 rounded w-full" style={{ height: '70%' }}></div>
        <div className="bg-gray-200 rounded w-full" style={{ height: '55%' }}></div>
        <div className="bg-gray-200 rounded w-full" style={{ height: '90%' }}></div>
      </div>
    </div>
  );

  const TableSkeleton = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
      <div className="space-y-3">
        <div className="h-10 bg-gray-100 rounded"></div>
        <div className="h-10 bg-gray-50 rounded"></div>
        <div className="h-10 bg-gray-100 rounded"></div>
        <div className="h-10 bg-gray-50 rounded"></div>
        <div className="h-10 bg-gray-100 rounded"></div>
      </div>
    </div>
  );

  const QuickActionsSkeleton = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="h-24 bg-gray-100 rounded-lg"></div>
        <div className="h-24 bg-gray-100 rounded-lg"></div>
        <div className="h-24 bg-gray-100 rounded-lg"></div>
        <div className="h-24 bg-gray-100 rounded-lg"></div>
      </div>
    </div>
  );


  const QuickActionButton = ({ icon: Icon, label, onClick, variant = 'primary' }) => (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all duration-200 
        ${variant === 'primary'
          ? 'border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 text-blue-700'
          : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-700'}`}
    >
      <Icon size={24} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Accounting & Finance</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Comprehensive financial management and analytics</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button onClick={() => setShowExpenseModal(true)} className="flex items-center justify-center gap-1 md:gap-2 text-xs md:text-base px-2 md:px-4 py-2 whitespace-nowrap w-full md:w-auto">
            <Plus size={14} className="md:hidden" />
            <Plus size={16} className="hidden md:block" />
            <span>Add Expense</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Global Filters */}
      <GlobalFilterBar onRefresh={fetchData} />

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 overflow-x-auto scroll-smooth">
        <nav className="flex space-x-4 md:space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'invoices', label: 'Invoices', icon: Receipt },
            { id: 'expenses', label: 'Expenses', icon: TrendingDown },
            { id: 'salary', label: 'Salary & Payroll', icon: Users },
            // { id: 'attendance', label: 'Attendance', icon: UserCheck },
            // { id: 'approvals', label: 'Approvals', icon: CheckSquare },
            // { id: 'gst-reports', label: 'GST Reports', icon: FileBarChart },
            { id: 'vendors', label: 'Vendors', icon: ShoppingBag },
            // { id: 'petty-cash', label: 'Petty Cash', icon: Wallet },
            { id: 'recurring', label: 'Recurring', icon: RefreshCw },
            // { id: 'branch-financial', label: 'Branch Financial', icon: Building2 },
            { id: 'reports', label: 'Reports', icon: FileText },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 md:gap-2 py-2 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors whitespace-nowrap flex-shrink-0
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <tab.icon size={14} className="md:hidden" />
              <tab.icon size={18} className="hidden md:block" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <StatCard
                  title="Total Income"
                  value={summary.total_income}
                  icon={TrendingUp}
                  color="text-green-600"
                  subtitle="All revenue streams"
                  {...getTrendProps(summary.income_change)}
                />
                <StatCard
                  title="Total Expenses"
                  value={summary.total_expense}
                  icon={TrendingDown}
                  color="text-red-600"
                  subtitle="Operational costs"
                  {...getTrendProps(summary.expense_change)}
                />
                <StatCard
                  title="Net Profit"
                  value={summary.net_profit}
                  icon={Activity}
                  color={summary.net_profit >= 0 ? "text-blue-600" : "text-red-600"}
                  subtitle="Income - Expenses"
                  {...getTrendProps(summary.profit_change)}
                />
                <StatCard
                  title="Receivables"
                  value={summary.receivables}
                  icon={CreditCard}
                  color="text-orange-600"
                  subtitle="Unpaid invoices"
                />
                <StatCard
                  title="Payables"
                  value={summary.payables}
                  icon={Wallet}
                  color="text-purple-600"
                  subtitle="Pending payments"
                />
                <StatCard
                  title="Pending Salaries"
                  value={summary.pending_salaries}
                  icon={Users}
                  color="text-pink-600"
                  subtitle="Staff payments due"
                />
              </>
            )}
          </div>

          {/* Payment Method Breakdown */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {loading ? (
                <>
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </>
              ) : (
                <>
                  {/* Calculate payment method totals */}
                  {/* Use pre-calculated payment method totals from summary */}
                  {(() => {
                    const cashIncome = parseFloat(summary.cash_income || 0);
                    const onlineIncome = parseFloat(summary.online_income || 0);
                    const cashExpenses = parseFloat(summary.cash_expense || 0);
                    const onlineExpenses = parseFloat(summary.online_expense || 0);

                    return (
                      <>
                        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-green-700">Cash Income</p>
                              <p className="text-2xl font-bold text-green-900">{formatCurrency(cashIncome)}</p>
                              <p className="text-xs text-green-600 mt-1">Revenue in cash</p>
                            </div>
                            <Wallet className="text-green-600" size={32} />
                          </div>
                        </Card>

                        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-blue-700">Online Income</p>
                              <p className="text-2xl font-bold text-blue-900">{formatCurrency(onlineIncome)}</p>
                              <p className="text-xs text-blue-600 mt-1">UPI, Card, Cheque, etc.</p>
                            </div>
                            <CreditCard className="text-blue-600" size={32} />
                          </div>
                        </Card>

                        <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-red-700">Cash Expenses</p>
                              <p className="text-2xl font-bold text-red-900">{formatCurrency(cashExpenses)}</p>
                              <p className="text-xs text-red-600 mt-1">Paid in cash</p>
                            </div>
                            <Wallet className="text-red-600" size={32} />
                          </div>
                        </Card>

                        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-purple-700">Online Expenses</p>
                              <p className="text-2xl font-bold text-purple-900">{formatCurrency(onlineExpenses)}</p>
                              <p className="text-xs text-purple-600 mt-1">UPI, Card, Transfer, etc.</p>
                            </div>
                            <CreditCard className="text-purple-600" size={32} />
                          </div>
                        </Card>

                        {/* Net Cash & Online */}
                        <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 md:col-span-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-amber-700">Net Cash Flow</p>
                              <p className={`text-2xl font-bold ${(cashIncome - cashExpenses) >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                                {formatCurrency(cashIncome - cashExpenses)}
                              </p>
                              <div className="flex gap-4 mt-2 text-xs">
                                <span className="text-green-700">In: {formatCurrency(cashIncome)}</span>
                                <span className="text-red-700">Out: {formatCurrency(cashExpenses)}</span>
                              </div>
                            </div>
                            <Wallet className="text-amber-600" size={32} />
                          </div>
                        </Card>

                        <Card className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 md:col-span-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-indigo-700">Net Online Flow</p>
                              <p className={`text-2xl font-bold ${(onlineIncome - onlineExpenses) >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                                {formatCurrency(onlineIncome - onlineExpenses)}
                              </p>
                              <div className="flex gap-4 mt-2 text-xs">
                                <span className="text-green-700">In: {formatCurrency(onlineIncome)}</span>
                                <span className="text-red-700">Out: {formatCurrency(onlineExpenses)}</span>
                              </div>
                            </div>
                            <CreditCard className="text-indigo-600" size={32} />
                          </div>
                        </Card>
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {loading ? (
            <QuickActionsSkeleton />
          ) : (
            <Card title="Quick Actions">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickActionButton
                  icon={Plus}
                  label="Add Expense"
                  onClick={() => setShowExpenseModal(true)}
                  variant="primary"
                />
                <QuickActionButton
                  icon={Users}
                  label="Manage Salary"
                  onClick={() => setActiveTab('salary')}
                />
                <QuickActionButton
                  icon={ShoppingBag}
                  label="Manage Vendors"
                  onClick={() => setActiveTab('vendors')}
                />
                <QuickActionButton
                  icon={FileText}
                  label="View Reports"
                  onClick={() => setActiveTab('reports')}
                />
              </div>
            </Card>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {loading ? (
              <>
                <ChartSkeleton />
                <ChartSkeleton />
              </>
            ) : (
              <>
                <Card title="Income vs Expense Trend">
                  <div className="h-80">
                    <Bar
                      data={monthlyTrendChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'top' }
                        }
                      }}
                    />
                  </div>
                </Card>

                <Card title="Expense Breakdown by Category">
                  <div className="h-80 flex items-center justify-center">
                    {expenseBreakdown.length > 0 ? (
                      <Pie
                        data={expenseBreakdownChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { position: 'right' }
                          }
                        }}
                      />
                    ) : (
                      <p className="text-gray-500">No expense data available</p>
                    )}
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {loading ? (
              <>
                <TableSkeleton />
                <TableSkeleton />
              </>
            ) : (
              <>
                {/* Recent Invoices */}
                <Card
                  title="Recent Invoices"
                  actions={
                    <button
                      onClick={() => setActiveTab('invoices')}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                    >
                      View All
                    </button>
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {invoices.slice(0, 5).map((invoice) => (
                          <tr
                            key={invoice.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              if (invoice.jobcard) {
                                navigate(`/admin/jobcards/${invoice.jobcard}`);
                              } else {
                                setActiveTab('invoices');
                              }
                            }}
                          >
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {invoice.invoice_number}
                              {invoice.breakdown?.addons > 0 && (
                                <span className="block text-[10px] text-blue-500 font-normal">
                                  Incl. Add-ons: {formatCurrency(invoice.breakdown.addons)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{invoice.customer_details?.user?.name || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-900">{formatCurrency(invoice.total_amount)}</span>
                                {parseFloat(invoice.amount_paid || 0) > 0 && (
                                  <span className="text-[10px] text-green-600 font-medium">
                                    Paid: {formatCurrency(invoice.amount_paid)}
                                  </span>
                                )}
                                {parseFloat(invoice.amount_remaining || 0) > 0 && invoice.status !== 'paid' && (
                                  <span className="text-[10px] text-orange-600 font-medium">
                                    Due: {formatCurrency(invoice.amount_remaining)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-[10px] font-medium rounded-full ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                invoice.status === 'pending' || invoice.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                {invoice.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {invoices.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No invoices found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Recent Expenses */}
                <Card
                  title="Recent Expenses"
                  actions={
                    <button
                      onClick={() => setActiveTab('expenses')}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                    >
                      View All
                    </button>
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {expenses.slice(0, 5).map((expense) => (
                          <tr
                            key={expense.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => setActiveTab('expenses')}
                          >
                            <td className="px-4 py-3 text-sm text-gray-500">{new Date(expense.date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {expense.title}
                              <span className={`block text-[10px] ${expense.payment_status === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                                {expense.payment_status.toUpperCase()} • {expense.payment_method_display || 'CASH'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 capitalize">{expense.category_display || expense.category}</td>
                            <td className="px-4 py-3 text-sm font-semibold">
                              <div className="flex flex-col">
                                <span className="text-red-600">-{formatCurrency(expense.amount)}</span>
                                {expense.payment_status === 'partial' && (
                                  <span className="text-[10px] text-orange-600 font-medium">
                                    Due: {formatCurrency(expense.remaining_amount)}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {expenses.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No expenses recorded</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <InvoicesTab />
      )}

      {/* Expenses Tab - We need to update this to accept filters or use context */}
      {/* For now, we will pass global filters via a specialized prop wrapper or refactor the tab later */}
      {/* Since we can't easily refactor child tabs in one go, they will remain as-is for now (showing all), 
           but the Overview is now powerful. */}
      {
        activeTab === 'expenses' && (
          <ExpensesTab />
        )
      }

      {/* Salary Tab */}
      {
        activeTab === 'salary' && (
          <SalaryTab />
        )
      }

      {/* Attendance Tab */}
      {
        activeTab === 'attendance' && (
          <AttendanceTab />
        )
      }

      {/* Approvals Tab */}
      {
        activeTab === 'approvals' && (
          <ApprovalsTab />
        )
      }

      {/* GST Reports Tab */}
      {
        activeTab === 'gst-reports' && (
          <GSTReportsTab />
        )
      }

      {/* Vendors Tab */}
      {
        activeTab === 'vendors' && (
          <VendorsTab />
        )
      }

      {/* Petty Cash Tab */}
      {
        activeTab === 'petty-cash' && (
          <PettyCashTab />
        )
      }

      {/* Recurring Expenses Tab */}
      {
        activeTab === 'recurring' && (
          <RecurringExpensesTab />
        )
      }

      {/* Branch Financial Tab */}
      {
        activeTab === 'branch-financial' && (
          <BranchFinancialTab />
        )
      }

      {/* Reports Tab */}
      {
        activeTab === 'reports' && (
          <ReportsTab />
        )
      }

      {/* Add Expense Modal */}
      <ExpenseFormModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSuccess={fetchData}
      />
    </div >
  );
};

const AccountingPage = () => {
  return (
    <AccountingFilterProvider>
      <AccountingContent />
    </AccountingFilterProvider>
  );
};

export default AccountingPage;
