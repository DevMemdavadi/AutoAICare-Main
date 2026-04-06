import { Navigate, Route, Routes } from 'react-router-dom';

// Auth Pages
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LoginPage from './pages/auth/LoginPage';
import OTPVerificationPage from './pages/auth/OTPVerificationPage';
import SignupPage from './pages/auth/SignupPage';

// Customer Pages
import AccessoriesStorePage from './pages/customer/AccessoriesStore';
import AppointmentRequest from './pages/customer/AppointmentRequest';
import AppointmentTracker from './pages/customer/AppointmentTracker';
import BookingFlowPage from './pages/customer/BookingFlow';
import CustomerDashboard from './pages/customer/Dashboard';
import FeedbackPage from './pages/customer/Feedback';
import CustomerJobCardDetails from './pages/customer/JobCardDetails';
import JobTrackingPage from './pages/customer/JobTracking';
import MembershipsPage from './pages/customer/Memberships';
import CustomerNotifications from './pages/customer/Notifications';
import PayInvoicePage from './pages/customer/PayInvoice';
import PaymentsPage from './pages/customer/Payments';
import CustomerProfilePage from './pages/customer/Profile';
import ServicePackagesPage from './pages/customer/ServicePackages';
import CustomerReferrals from './pages/customer/Referrals';

// Admin Pages
import AccountingPage from './pages/admin/Accounting';
import AnalyticsPage from './pages/admin/Analytics';
import AdvancedReporting from './pages/admin/AdvancedReporting';
import AppointmentManagement from './pages/admin/AppointmentManagement';
import BillingManagement from './pages/admin/Billing';
import BookingDetails from './pages/admin/BookingDetails';
import BookingsManagement from './pages/admin/Bookings';
import BranchDetail from './pages/admin/BranchDetail';
import BranchManagement from './pages/admin/BranchManagement';
import BusinessAnalytics from './pages/admin/BusinessAnalytics';
import CreateWalkInBooking from './pages/admin/CreateWalkInBooking';
import Customer360View from './pages/admin/Customer360View';
import CustomersStaffPage from './pages/admin/CustomersStaff';
import AdminDashboard from './pages/admin/Dashboard';
import AutomationWorkflows from './pages/admin/AutomationWorkflows';
import WorkflowBuilder from './pages/admin/WorkflowBuilder';
import WorkflowExecutions from './pages/admin/WorkflowExecutions';
import AdminFeedbackPage from './pages/admin/Feedback';
import InventoryManagement from './pages/admin/Inventory';
import JobDetails from './pages/admin/JobCardDetails';
import JobCards from './pages/admin/JobCards';
import LeadAnalytics from './pages/admin/LeadAnalytics';
import LeadManagement from './pages/admin/LeadManagement';
import LeaveManagement from './pages/admin/LeaveManagement';
import LiveJobs from './pages/admin/LiveJobs';
import MembershipManagement from './pages/admin/MembershipManagement';
import AdminNotifications from './pages/admin/Notifications';
import PartsAnalytics from './pages/admin/PartsAnalytics';
import PartsManagement from './pages/admin/PartsManagement';
import PerformanceDashboard from './pages/admin/PerformanceDashboard';
import Performance from './pages/admin/Performance';
import PickupDrop from './pages/admin/PickupDrop';
import RewardSettings from './pages/admin/RewardSettings';
import ReferralSettings from './pages/admin/ReferralSettings';
import ServiceManagementPage from './pages/admin/ServiceManagement';
import ServicePartsConfig from './pages/admin/ServicePartsConfig';
import SettingsPage from './pages/admin/Settings';
import AdminProfile from './pages/admin/Profile';
import WorkflowConfiguration from './pages/admin/WorkflowConfiguration';
import WorkflowManagement from './pages/admin/WorkflowManagement';
import DailyFollowUp from './pages/admin/DailyFollowUp';
import ServiceReminders from './pages/admin/ServiceReminders';
import BayManagement from './pages/admin/BayManagement';
import FloorManagerNotifications from './pages/floor_manager/Notifications';
import WhatsAppLogs from './pages/admin/WhatsAppLogs';
import PendingWhatsAppMessages from './pages/admin/PendingWhatsAppMessages';
import WhatsAppPending from './pages/Admin/WhatsAppPending';
import ChatsPage from './pages/admin/ChatsPage';

// Purchase Module Pages
import { Purchases, CreatePurchase, PurchaseDetails, Payments as PurchasePayments, Reports as PurchaseReports } from './pages/admin/purchases';
import BranchStockView from './pages/admin/purchases/BranchStockView';
import StockTransfer from './pages/admin/purchases/StockTransfer';

// Applicator Pages
import ApplicatorHome from './pages/applicator';
import ApplicatorDashboard from './pages/applicator/Dashboard';
import JobDetailsApplicator from './pages/applicator/JobDetails';

// Floor Manager Pages
import FloorManagerHome from './pages/floor_manager';
import ChecklistManagement from './pages/floor_manager/ChecklistManagement';
import FloorManagerDashboardPage from './pages/floor_manager/Dashboard';
import JobDetailsFloorManager from './pages/floor_manager/JobDetails';
import LiveJobsFloorManager from './pages/floor_manager/LiveJobs';
import PartsAnalyticsFloorManager from './pages/floor_manager/PartsAnalytics';
import PartsManagementFloorManager from './pages/floor_manager/PartsManagement';
import PerformanceMetrics from './pages/floor_manager/PerformanceMetrics';
import PhotoManagement from './pages/floor_manager/PhotoManagement';
import TeamManagement from './pages/floor_manager/TeamManagement';
import FloorManagerProfile from './pages/floor_manager/Profile';

// Supervisor Pages
import SupervisorHome from './pages/supervisor';
import SupervisorDashboard from './pages/supervisor/Dashboard';
import JobDetailsSupervisor from './pages/supervisor/JobDetails';
import SupervisorNotifications from './pages/supervisor/Notifications';
import PartsAnalyticsSupervisor from './pages/supervisor/PartsAnalytics';
import PartsManagementSupervisor from './pages/supervisor/PartsManagement';

// Technician Pages
import TechnicianDashboard from './pages/technician/Dashboard';
import TechJobDetails from './pages/technician/JobDetails';
import TechnicianNotifications from './pages/technician/Notifications';
import TechnicianProfile from './pages/technician/Profile';
import TechnicianSettings from './pages/technician/Settings';

// Layout Components
import AdminLayout from './components/layouts/AdminLayout';
import ApplicatorLayout from './components/layouts/ApplicatorLayout';
import CustomerLayout from './components/layouts/CustomerLayout';
import FloorManagerLayout from './components/layouts/FloorManagerLayout';
import SupervisorLayout from './components/layouts/SupervisorLayout';
import TechnicianLayout from './components/layouts/TechnicianLayout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-otp" element={<OTPVerificationPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Customer Routes */}
        <Route path="/customer" element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerLayout />
          </ProtectedRoute>
        }>
          <Route index element={<CustomerDashboard />} />
          <Route path="services" element={<ServicePackagesPage />} />
          <Route path="book" element={<BookingFlowPage />} />
          <Route path="track" element={<JobTrackingPage />} />
          <Route path="job-card/:id" element={<CustomerJobCardDetails />} />
          <Route path="pay-invoice/:invoiceId" element={<PayInvoicePage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="store" element={<AccessoriesStorePage />} />
          <Route path="feedback" element={<FeedbackPage />} />
          <Route path="memberships" element={<MembershipsPage />} />
          <Route path="notifications" element={<CustomerNotifications />} />
          <Route path="profile" element={<CustomerProfilePage />} />
          <Route path="referrals" element={<CustomerReferrals />} />
          <Route path="appointments" element={<AppointmentTracker />} />
          <Route path="request-appointment" element={<BookingFlowPage />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['branch_admin', 'company_admin', 'super_admin', 'company_admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="branches" element={<BranchManagement />} />
          <Route path="branches/:id" element={<BranchDetail />} />
          <Route path="bookings" element={<BookingsManagement />} />
          <Route path="bookings/create-walk-in" element={<CreateWalkInBooking />} />
          <Route path="bookings/:id" element={<BookingDetails />} />
          <Route path="jobcards" element={<JobCards />} />
          <Route path="jobcards/:id" element={<JobDetails />} />
          <Route path="live-jobs" element={<LiveJobs />} />
          <Route path="billing" element={<BillingManagement />} />
          <Route path="pickup" element={<PickupDrop />} />
          <Route path="inventory" element={<InventoryManagement />} />
          <Route path="parts" element={<PartsManagement />} />
          <Route path="parts/analytics" element={<PartsAnalytics />} />
          <Route path="services" element={<ServiceManagementPage />} />
          <Route path="services/:serviceId/parts" element={<ServicePartsConfig />} />
          <Route path="store" element={<div className="p-8 text-center text-gray-500">Accessories Store - Coming Soon</div>} />
          <Route path="campaigns" element={<div className="p-8 text-center text-gray-500">Campaigns Module - Coming Soon</div>} />
          <Route path="membership" element={<MembershipManagement />} />
          <Route path="rewards" element={<div className="p-8 text-center text-gray-500">Rewards Module - Coming Soon</div>} />
          <Route path="referrals" element={<ReferralSettings />} />
          <Route path="users" element={<CustomersStaffPage />} />
          <Route path="users/:id" element={<Customer360View />} />
          <Route path="leads" element={<LeadManagement />} />
          <Route path="leads/analytics" element={<LeadAnalytics />} />
          <Route path="feedback" element={<AdminFeedbackPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="analytics/business" element={<BusinessAnalytics />} />
          <Route path="reports" element={<AdvancedReporting />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="whatsapp-logs" element={<WhatsAppLogs />} />
          <Route path="whatsapp-pending" element={<PendingWhatsAppMessages />} />
          <Route path="wp-events" element={<WhatsAppPending />} />
          <Route path="chats" element={<ChatsPage />} />
          <Route path="accounting" element={<AccountingPage />} />
          <Route path="reward-settings" element={<RewardSettings />} />
          <Route path="appointments" element={<AppointmentManagement />} />
          <Route path="leave-management" element={<LeaveManagement />} />
          <Route path="performance" element={<Performance />} />
          <Route path="workflow" element={<WorkflowConfiguration />} />
          <Route path="workflow_management" element={<WorkflowManagement />} />
          <Route path="automation/workflows" element={<AutomationWorkflows />} />
          <Route path="automation/workflows/:id" element={<WorkflowBuilder />} />
          <Route path="automation/executions" element={<WorkflowExecutions />} />
          <Route path="daily-followup" element={<DailyFollowUp />} />
          <Route path="service-reminders" element={<ServiceReminders />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route path="bays" element={<BayManagement />} />

          {/* Inventory Hub - Unified Interface */}
          <Route path="inventory" element={<InventoryManagement />} />

          {/* Purchase Management Routes */}
          <Route path="purchases" element={<Purchases />} />
          <Route path="purchases/create" element={<CreatePurchase />} />
          <Route path="purchases/:id" element={<PurchaseDetails />} />
          <Route path="purchases/payments" element={<PurchasePayments />} />
          <Route path="purchases/reports" element={<PurchaseReports />} />
          <Route path="purchases/branch-stock" element={<BranchStockView />} />
          <Route path="purchases/stock-transfer" element={<StockTransfer />} />
        </Route>

        {/* Floor Manager Routes */}
        <Route path="/floor-manager" element={
          <ProtectedRoute allowedRoles={['floor_manager']}>
            <FloorManagerLayout />
          </ProtectedRoute>
        }>
          <Route index element={<FloorManagerHome />} />
          <Route path="dashboard" element={<FloorManagerDashboardPage />} />
          <Route path="live-jobs" element={<LiveJobsFloorManager />} />
          <Route path="photos" element={<PhotoManagement />} />
          <Route path="checklists" element={<ChecklistManagement />} />
          <Route path="team" element={<TeamManagement />} />
          <Route path="performance" element={<PerformanceMetrics />} />
          <Route path="job/:id" element={<JobDetailsFloorManager />} />
          <Route path="notifications" element={<FloorManagerNotifications />} />
          <Route path="leave-management" element={<LeaveManagement />} />
          <Route path="my-performance" element={<Performance />} />
          <Route path="parts" element={<PartsManagementFloorManager />} />
          <Route path="parts/analytics" element={<PartsAnalyticsFloorManager />} />
          <Route path="profile" element={<FloorManagerProfile />} />
        </Route>

        {/* Technician Routes */}
        <Route path="/technician" element={
          <ProtectedRoute allowedRoles={['staff']}>
            <TechnicianLayout />
          </ProtectedRoute>
        }>
          <Route index element={<TechnicianDashboard />} />
          <Route path="job/:id" element={<TechJobDetails />} />
          <Route path="notifications" element={<TechnicianNotifications />} />
          <Route path="profile" element={<TechnicianProfile />} />
          <Route path="settings" element={<TechnicianSettings />} />
        </Route>

        {/* Supervisor Routes */}
        <Route path="/supervisor" element={
          <ProtectedRoute allowedRoles={['supervisor']}>
            <SupervisorLayout />
          </ProtectedRoute>
        }>
          <Route index element={<SupervisorHome />} />
          <Route path="dashboard" element={<SupervisorDashboard />} />
          <Route path="job/:id" element={<JobDetailsSupervisor />} />
          <Route path="notifications" element={<SupervisorNotifications />} />
          <Route path="leave-management" element={<LeaveManagement />} />
          <Route path="performance" element={<Performance />} />
          <Route path="parts" element={<PartsManagementSupervisor />} />
          <Route path="parts/analytics" element={<PartsAnalyticsSupervisor />} />
        </Route>

        {/* Applicator Routes */}
        <Route path="/applicator" element={
          <ProtectedRoute allowedRoles={['applicator']}>
            <ApplicatorLayout />
          </ProtectedRoute>
        }>
          <Route index element={<ApplicatorHome />} />
          <Route path="dashboard" element={<ApplicatorDashboard />} />
          <Route path="job/:id" element={<JobDetailsApplicator />} />
          <Route path="leave-management" element={<LeaveManagement />} />
          <Route path="performance" element={<Performance />} />
        </Route>

        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default App;