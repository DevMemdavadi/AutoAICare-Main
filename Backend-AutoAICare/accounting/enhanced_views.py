"""
Enhanced accounting views for payroll enhancements
Leave management, tax compliance, and performance tracking
"""
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count, Q, Avg
from datetime import datetime, timedelta
from decimal import Decimal

from .models import (
    LeaveType, LeaveBalance, LeaveRequest, LeaveEncashment,
    TaxSlab, TaxDeclaration, Form16, PerformanceMetrics, Payroll
)
from .serializers import (
    LeaveTypeSerializer, LeaveBalanceSerializer, LeaveRequestSerializer, LeaveEncashmentSerializer,
    TaxSlabSerializer, TaxDeclarationSerializer, Form16Serializer,
    PerformanceMetricsSerializer, LeaderboardSerializer, PerformanceDashboardSerializer,
    PayrollDetailedSerializer
)
from .services import LeaveService, TaxService, PerformanceService


# ==================== LEAVE MANAGEMENT VIEWS ====================

class LeaveTypeViewSet(viewsets.ModelViewSet):
    """ViewSet for managing leave types"""
    
    queryset = LeaveType.objects.all()
    serializer_class = LeaveTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'annual_quota']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by role applicability
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(
                Q(applies_to_roles__contains=[role]) | Q(applies_to_roles=[])
            )
        
        return queryset


class LeaveBalanceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing leave balances"""
    
    queryset = LeaveBalance.objects.all()
    serializer_class = LeaveBalanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['year', 'employee']
    
    def get_queryset(self):
        queryset = super().get_queryset().select_related('employee', 'leave_type')
        user = self.request.user
        
        # Branch/Company isolation
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return queryset.none()
            
            # Everyone except super admin should be scoped by company
            queryset = queryset.filter(employee__company=company)
            
            # Additional role-based filtering
            if user.role not in ['super_admin', 'company_admin', 'branch_admin']:
                queryset = queryset.filter(employee=user)
            elif user.role == 'branch_admin' and user.branch:
                queryset = queryset.filter(employee__branch=user.branch)
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Filter by year
        year = self.request.query_params.get('year')
        if year:
            queryset = queryset.filter(year=year)
        
        # Filter by leave type
        leave_type_id = self.request.query_params.get('leave_type')
        if leave_type_id:
            queryset = queryset.filter(leave_type_id=leave_type_id)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def my_balance(self, request):
        """Get current user's leave balance"""
        current_year = timezone.now().year
        balances = LeaveBalance.objects.filter(
            employee=request.user,
            year=current_year
        ).select_related('leave_type')
        
        serializer = self.get_serializer(balances, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def initialize_balances(self, request):
        """Initialize leave balances for an employee"""
        employee_id = request.data.get('employee_id')
        year = request.data.get('year', timezone.now().year)
        
        if not employee_id:
            return Response(
                {'error': 'employee_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from users.models import User
        try:
            employee = User.objects.get(id=employee_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Employee not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        LeaveService.initialize_leave_balance(employee, year)
        
        balances = LeaveBalance.objects.filter(
            employee=employee,
            year=year
        )
        serializer = self.get_serializer(balances, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def credit_annual_leaves(self, request):
        """Credit annual leaves for all employees"""
        year = request.data.get('year', timezone.now().year)
        
        from users.models import User
        employees = User.objects.filter(
            role__in=['supervisor', 'applicator', 'floor_manager', 'branch_admin']
        )
        
        for employee in employees:
            LeaveService.initialize_leave_balance(employee, year)
        
        return Response({
            'message': f'Annual leaves credited for {employees.count()} employees for year {year}'
        })


class LeaveRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for managing leave requests"""
    
    queryset = LeaveRequest.objects.all()
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['start_date', 'created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset().select_related('employee', 'leave_type', 'approved_by')
        user = self.request.user
        
        # Branch/Company isolation
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return queryset.none()
            
            queryset = queryset.filter(employee__company=company)
            
            # Additional role-based filtering
            if user.role not in ['super_admin', 'company_admin', 'branch_admin']:
                queryset = queryset.filter(employee=user)
            elif user.role == 'branch_admin' and user.branch:
                queryset = queryset.filter(employee__branch=user.branch)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(start_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(end_date__lte=end_date)
        
        return queryset
    
    def perform_create(self, serializer):
        """Create leave request"""
        leave_request = serializer.save(employee=self.request.user)
        
        # Calculate total days if not provided
        if not leave_request.total_days:
            total_days = LeaveService.calculate_leave_days(
                leave_request.start_date,
                leave_request.end_date
            )
            leave_request.total_days = Decimal(str(total_days))
            leave_request.save()
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a leave request"""
        leave_request = self.get_object()
        
        try:
            LeaveService.approve_leave_request(leave_request, request.user)
            serializer = self.get_serializer(leave_request)
            return Response(serializer.data)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a leave request"""
        leave_request = self.get_object()
        reason = request.data.get('reason', '')
        
        try:
            LeaveService.reject_leave_request(leave_request, request.user, reason)
            serializer = self.get_serializer(leave_request)
            return Response(serializer.data)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a leave request"""
        leave_request = self.get_object()
        
        # Only employee or admin can cancel
        if leave_request.employee != request.user and request.user.role not in ['super_admin', 'branch_admin']:
            return Response(
                {'error': 'You do not have permission to cancel this leave request'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            LeaveService.cancel_leave_request(leave_request)
            serializer = self.get_serializer(leave_request)
            return Response(serializer.data)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def pending_approvals(self, request):
        """Get all pending leave requests for approval"""
        if request.user.role not in ['super_admin', 'branch_admin']:
            return Response(
                {'error': 'Only admins can view pending approvals'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.get_queryset().filter(status='pending')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class LeaveEncashmentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing leave encashments"""
    
    queryset = LeaveEncashment.objects.all()
    serializer_class = LeaveEncashmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['requested_date', 'total_amount']
    
    def get_queryset(self):
        queryset = super().get_queryset().select_related('employee', 'leave_type', 'leave_balance')
        user = self.request.user
        
        # Branch/Company isolation
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return queryset.none()
            
            queryset = queryset.filter(employee__company=company)
            
            # Additional role-based filtering
            if user.role not in ['super_admin', 'company_admin', 'branch_admin']:
                queryset = queryset.filter(employee=user)
            elif user.role == 'branch_admin' and user.branch:
                queryset = queryset.filter(employee__branch=user.branch)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset
    
    def perform_create(self, serializer):
        """Create leave encashment request"""
        serializer.save(employee=self.request.user)
    
    @action(detail=False, methods=['post'])
    def calculate_amount(self, request):
        """Calculate encashment amount before creating request"""
        employee_id = request.data.get('employee_id')
        leave_type_id = request.data.get('leave_type_id')
        days_to_encash = request.data.get('days_to_encash')
        
        if not all([employee_id, leave_type_id, days_to_encash]):
            return Response(
                {'error': 'employee_id, leave_type_id, and days_to_encash are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from users.models import User
        try:
            employee = User.objects.get(id=employee_id)
            leave_type = LeaveType.objects.get(id=leave_type_id)
        except (User.DoesNotExist, LeaveType.DoesNotExist):
            return Response(
                {'error': 'Employee or Leave Type not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        calculation = LeaveService.calculate_encashment_amount(
            employee,
            leave_type,
            days_to_encash
        )
        
        return Response(calculation)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve leave encashment"""
        encashment = self.get_object()
        
        try:
            LeaveService.process_leave_encashment(encashment, request.user)
            serializer = self.get_serializer(encashment)
            return Response(serializer.data)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def process_to_payroll(self, request, pk=None):
        """Process encashment and add to payroll"""
        encashment = self.get_object()
        month = request.data.get('month')
        year = request.data.get('year')
        
        if not month or not year:
            return Response(
                {'error': 'month and year are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create payroll
        payroll, created = Payroll.objects.get_or_create(
            employee=encashment.employee,
            month=month,
            year=year,
            defaults={
                'salary_structure': encashment.employee.salary_structure,
                'base_salary': encashment.employee.salary_structure.base_salary,
                'gross_salary': encashment.employee.salary_structure.calculate_gross_salary(),
                'net_salary': encashment.employee.salary_structure.calculate_net_salary(),
                'generated_by': request.user
            }
        )
        
        # Add encashment amount
        payroll.leave_encashment_amount += encashment.total_amount
        payroll.net_salary += encashment.total_amount
        payroll.save()
        
        # Update encashment
        encashment.status = 'processed'
        encashment.payroll = payroll
        encashment.processed_date = timezone.now().date()
        encashment.save()
        
        serializer = self.get_serializer(encashment)
        return Response(serializer.data)


# ==================== TAX COMPLIANCE VIEWS ====================

class TaxSlabViewSet(viewsets.ModelViewSet):
    """ViewSet for managing tax slabs"""
    
    queryset = TaxSlab.objects.all()
    serializer_class = TaxSlabSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['financial_year', 'min_income']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by financial year
        financial_year = self.request.query_params.get('financial_year')
        if financial_year:
            queryset = queryset.filter(financial_year=financial_year)
        
        # Filter by regime
        regime = self.request.query_params.get('regime')
        if regime:
            queryset = queryset.filter(regime=regime)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def calculate_tds(self, request):
        """Calculate TDS for given income"""
        annual_income = request.data.get('annual_income')
        employee_id = request.data.get('employee_id')
        financial_year = request.data.get('financial_year', '2024-25')
        
        if not annual_income:
            return Response(
                {'error': 'annual_income is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tax_declaration = None
        if employee_id:
            from users.models import User
            try:
                employee = User.objects.get(id=employee_id)
                tax_declaration = TaxDeclaration.objects.filter(
                    employee=employee,
                    financial_year=financial_year,
                    status='verified'
                ).first()
            except User.DoesNotExist:
                pass
        
        calculation = TaxService.calculate_tds(
            Decimal(str(annual_income)),
            tax_declaration,
            financial_year
        )
        
        return Response(calculation)


class TaxDeclarationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing tax declarations"""
    
    queryset = TaxDeclaration.objects.all()
    serializer_class = TaxDeclarationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['financial_year', 'submitted_date']
    
    def get_queryset(self):
        queryset = super().get_queryset().select_related('employee', 'verified_by')
        user = self.request.user
        
        # Branch/Company isolation
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return queryset.none()
            
            queryset = queryset.filter(employee__company=company)
            
            # Additional role-based filtering
            if user.role not in ['super_admin', 'company_admin', 'branch_admin']:
                queryset = queryset.filter(employee=user)
            elif user.role == 'branch_admin' and user.branch:
                queryset = queryset.filter(employee__branch=user.branch)
        
        # Filter by financial year
        financial_year = self.request.query_params.get('financial_year')
        if financial_year:
            queryset = queryset.filter(financial_year=financial_year)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset
    
    def perform_create(self, serializer):
        """Create tax declaration"""
        serializer.save(employee=self.request.user)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit tax declaration"""
        declaration = self.get_object()
        
        if declaration.employee != request.user:
            return Response(
                {'error': 'You can only submit your own declarations'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        declaration.status = 'submitted'
        declaration.submitted_date = timezone.now()
        declaration.save()
        
        serializer = self.get_serializer(declaration)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify tax declaration"""
        declaration = self.get_object()
        notes = request.data.get('notes', '')
        
        declaration.status = 'verified'
        declaration.verified_by = request.user
        declaration.verification_date = timezone.now()
        declaration.verification_notes = notes
        declaration.save()
        
        serializer = self.get_serializer(declaration)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject tax declaration"""
        declaration = self.get_object()
        notes = request.data.get('notes', '')
        
        declaration.status = 'rejected'
        declaration.verified_by = request.user
        declaration.verification_date = timezone.now()
        declaration.verification_notes = notes
        declaration.save()
        
        serializer = self.get_serializer(declaration)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def compare_regimes(self, request, pk=None):
        """Compare tax liability between old and new regimes"""
        declaration = self.get_object()
        annual_income = request.data.get('annual_income')
        
        if not annual_income:
            return Response(
                {'error': 'annual_income is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        comparison = TaxService.compare_tax_regimes(
            Decimal(str(annual_income)),
            declaration
        )
        
        return Response(comparison)


class Form16ViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Form 16 generation and viewing"""
    
    queryset = Form16.objects.all()
    serializer_class = Form16Serializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['financial_year', 'generated_date']
    
    def get_queryset(self):
        queryset = super().get_queryset().select_related('employee', 'generated_by')
        user = self.request.user
        
        # Branch/Company isolation
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return queryset.none()
            
            queryset = queryset.filter(employee__company=company)
            
            # Additional role-based filtering
            if user.role not in ['super_admin', 'company_admin', 'branch_admin']:
                queryset = queryset.filter(employee=user)
            elif user.role == 'branch_admin' and user.branch:
                queryset = queryset.filter(employee__branch=user.branch)
        
        # Filter by financial year
        financial_year = self.request.query_params.get('financial_year')
        if financial_year:
            queryset = queryset.filter(financial_year=financial_year)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate Form 16 for an employee"""
        employee_id = request.data.get('employee_id')
        financial_year = request.data.get('financial_year')
        
        if not all([employee_id, financial_year]):
            return Response(
                {'error': 'employee_id and financial_year are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from users.models import User
        try:
            employee = User.objects.get(id=employee_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Employee not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        form16 = TaxService.generate_form16(employee, financial_year)
        serializer = self.get_serializer(form16)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pf_esi_report(self, request):
        """Generate PF/ESI report"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        branch_id = request.query_params.get('branch')
        
        if not all([start_date, end_date]):
            return Response(
                {'error': 'start_date and end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from datetime import datetime
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        branch = None
        if branch_id:
            from branches.models import Branch
            try:
                branch = Branch.objects.get(id=branch_id)
            except Branch.DoesNotExist:
                pass
        
        report = TaxService.generate_pf_esi_report(start, end, branch)
        return Response(report)


# ==================== PERFORMANCE METRICS VIEWS ====================

class PerformanceMetricsViewSet(viewsets.ModelViewSet):
    """ViewSet for performance metrics"""
    
    queryset = PerformanceMetrics.objects.all()
    serializer_class = PerformanceMetricsSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['year', 'month', 'net_incentive']
    
    def get_queryset(self):
        queryset = super().get_queryset().select_related('employee')
        user = self.request.user
        
        # Branch/Company isolation
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return queryset.none()
            
            queryset = queryset.filter(employee__company=company)
            
            # Additional role-based filtering
            if user.role not in ['super_admin', 'company_admin', 'branch_admin']:
                queryset = queryset.filter(employee=user)
            elif user.role == 'branch_admin' and user.branch:
                queryset = queryset.filter(employee__branch=user.branch)
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Filter by month/year
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        
        if month:
            queryset = queryset.filter(month=month)
        if year:
            queryset = queryset.filter(year=year)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def calculate_metrics(self, request):
        """Calculate metrics for an employee for a month"""
        employee_id = request.data.get('employee_id')
        month = request.data.get('month')
        year = request.data.get('year')
        
        if not all([employee_id, month, year]):
            return Response(
                {'error': 'employee_id, month, and year are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from users.models import User
        try:
            employee = User.objects.get(id=employee_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Employee not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        metrics = PerformanceService.calculate_monthly_metrics(employee, month, year)
        serializer = self.get_serializer(metrics)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def calculate_rankings(self, request):
        """Calculate rankings for all employees"""
        month = request.data.get('month')
        year = request.data.get('year')
        branch_id = request.data.get('branch')
        
        if not all([month, year]):
            return Response(
                {'error': 'month and year are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        branch = None
        if branch_id:
            from branches.models import Branch
            try:
                branch = Branch.objects.get(id=branch_id)
            except Branch.DoesNotExist:
                pass
        
        metrics = PerformanceService.calculate_rankings(month, year, branch)
        serializer = self.get_serializer(metrics, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def leaderboard(self, request):
        """Get leaderboard of top performers"""
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        branch_id = request.query_params.get('branch')
        limit = int(request.query_params.get('limit', 10))
        
        if not all([month, year]):
            return Response(
                {'error': 'month and year are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        branch = None
        if branch_id and branch_id != 'null':
            from branches.models import Branch
            try:
                branch = Branch.objects.get(id=branch_id)
            except Branch.DoesNotExist:
                pass
        
        leaderboard = PerformanceService.get_leaderboard(
            int(month), int(year), branch, limit
        )
        serializer = LeaderboardSerializer(leaderboard, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get performance dashboard for an employee"""
        employee_id = request.query_params.get('employee_id', request.user.id)
        month = request.query_params.get('month', timezone.now().month)
        year = request.query_params.get('year', timezone.now().year)
        
        from users.models import User
        try:
            employee = User.objects.get(id=employee_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Employee not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        dashboard = PerformanceService.get_performance_dashboard(
            employee, int(month), int(year)
        )
        
        # If user is admin/super_admin and viewing their own dashboard, 
        # the metrics might be empty. This is expected.
        # Future enhancement: Return branch aggregates for admins.
        
        return Response(dashboard)
    
    @action(detail=False, methods=['get'])
    def incentive_preview(self, request):
        """Preview incentive calculation"""
        employee_id = request.query_params.get('employee_id', request.user.id)
        month = request.query_params.get('month', timezone.now().month)
        year = request.query_params.get('year', timezone.now().year)
        
        from users.models import User
        try:
            employee = User.objects.get(id=employee_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Employee not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        preview = PerformanceService.preview_incentive(
            employee, int(month), int(year)
        )
        return Response(preview)
