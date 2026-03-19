from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal

from .models import AttendanceRecord, AttendancePolicy, MonthlyAttendanceSummary
from .serializers import (
    AttendanceRecordSerializer, AttendancePolicySerializer,
    MonthlyAttendanceSummarySerializer, BulkAttendanceSerializer
)
from users.models import User
from accounting.permissions import CanManageAttendance


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    """ViewSet for attendance records"""
    queryset = AttendanceRecord.objects.all()
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAuthenticated, CanManageAttendance]
    
    def get_queryset(self):
        queryset = AttendanceRecord.objects.select_related(
            'employee', 'branch', 'leave_request', 'marked_by'
        )
        user = self.request.user

        # Apply company / branch isolation
        if user.role == 'company_admin' and user.company:
            # Use the direct company FK — captures records where branch=None too
            queryset = queryset.filter(company=user.company)
        elif user.role != 'super_admin' and user.branch:
            queryset = queryset.filter(branch=user.branch)

        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(date__range=[start_date, end_date])

        # Filter by employee
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

        # Filter by branch
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        # Derive company from the user's company or branch
        company = getattr(user, 'company', None)
        if not company and getattr(user, 'branch', None):
            company = user.branch.company
        serializer.save(marked_by=user, company=company)
    
    @action(detail=False, methods=['post'])
    def bulk_mark(self, request):
        """Bulk mark attendance for multiple employees"""
        serializer = BulkAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        date = serializer.validated_data['date']
        branch_id = serializer.validated_data.get('branch')
        attendance_data = serializer.validated_data['attendance_data']
        
        created_records = []
        errors = []
        
        for record in attendance_data:
            try:
                employee = User.objects.get(id=record['employee_id'])

                # Derive company for this record
                company = getattr(request.user, 'company', None)
                if not company and getattr(request.user, 'branch', None):
                    company = request.user.branch.company

                # Check if record already exists
                existing = AttendanceRecord.objects.filter(
                    employee=employee,
                    date=date
                ).first()

                if existing:
                    # Update existing record
                    existing.status = record['status']
                    existing.check_in_time = record.get('check_in_time')
                    existing.check_out_time = record.get('check_out_time')
                    existing.notes = record.get('notes', '')
                    existing.marked_by = request.user
                    existing.save()
                    created_records.append(existing)
                else:
                    # Create new record — set company explicitly
                    attendance = AttendanceRecord.objects.create(
                        employee=employee,
                        date=date,
                        status=record['status'],
                        check_in_time=record.get('check_in_time'),
                        check_out_time=record.get('check_out_time'),
                        branch_id=branch_id,
                        company=company,
                        notes=record.get('notes', ''),
                        marked_by=request.user
                    )
                    created_records.append(attendance)
            
            except User.DoesNotExist:
                errors.append(f"Employee {record['employee_id']} not found")
            except Exception as e:
                errors.append(f"Error for employee {record['employee_id']}: {str(e)}")
        
        return Response({
            'success': True,
            'created_count': len(created_records),
            'errors': errors,
            'records': AttendanceRecordSerializer(created_records, many=True).data
        })
    
    @action(detail=False, methods=['get'])
    def daily_summary(self, request):
        """Get daily attendance summary"""
        date = request.query_params.get('date', timezone.now().date())
        branch_id = request.query_params.get('branch')
        user = request.user

        queryset = AttendanceRecord.objects.filter(date=date)

        # Company / branch isolation
        if user.role == 'company_admin' and user.company:
            queryset = queryset.filter(company=user.company)
        elif user.role != 'super_admin' and user.branch:
            queryset = queryset.filter(branch=user.branch)

        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)

        summary = queryset.aggregate(
            total=Count('id'),
            present=Count('id', filter=Q(status='present')),
            absent=Count('id', filter=Q(status='absent')),
            half_day=Count('id', filter=Q(status='half_day')),
            on_leave=Count('id', filter=Q(status='on_leave')),
            total_hours=Sum('total_hours'),
            total_overtime=Sum('overtime_hours')
        )

        return Response(summary)


class AttendancePolicyViewSet(viewsets.ModelViewSet):
    """ViewSet for attendance policies"""
    queryset = AttendancePolicy.objects.all()
    serializer_class = AttendancePolicySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = AttendancePolicy.objects.prefetch_related('applies_to_branches')
        user = self.request.user

        # Apply company isolation using the direct company FK
        if user.role == 'company_admin' and user.company:
            queryset = queryset.filter(company=user.company)
        elif user.role != 'super_admin' and user.branch:
            queryset = queryset.filter(applies_to_branches=user.branch)

        # Filter active policies
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset


class MonthlyAttendanceSummaryViewSet(viewsets.ModelViewSet):
    """ViewSet for monthly attendance summaries"""
    queryset = MonthlyAttendanceSummary.objects.all()
    serializer_class = MonthlyAttendanceSummarySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = MonthlyAttendanceSummary.objects.select_related('employee')
        user = self.request.user

        # Apply branch/company filtering
        if user.role == 'company_admin' and user.company:
            queryset = queryset.filter(employee__company=user.company)
        elif user.role != 'super_admin' and user.branch:
            queryset = queryset.filter(employee__branch=user.branch)
        
        # Filter by month/year
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        if month and year:
            queryset = queryset.filter(month=month, year=year)
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def generate_monthly(self, request):
        """Generate monthly attendance summary for all employees"""
        month = request.data.get('month')
        year = request.data.get('year')
        
        if not month or not year:
            return Response(
                {'error': 'Month and year are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all active employees
        employees = User.objects.filter(is_active=True, is_staff=True)
        user = request.user
        if user.role == 'company_admin' and user.company:
            employees = employees.filter(company=user.company)
        elif user.role != 'super_admin' and user.branch:
            employees = employees.filter(branch=user.branch)
        
        summaries = []
        for employee in employees:
            summary, created = MonthlyAttendanceSummary.objects.get_or_create(
                employee=employee,
                month=month,
                year=year,
                defaults={'is_auto_generated': True}
            )
            
            # Calculate attendance data
            attendance_records = AttendanceRecord.objects.filter(
                employee=employee,
                date__month=month,
                date__year=year
            )
            
            summary.total_working_days = attendance_records.count()
            summary.days_present = attendance_records.filter(status='present').count()
            summary.days_absent = attendance_records.filter(status='absent').count()
            summary.days_half_day = attendance_records.filter(status='half_day').count()
            summary.days_on_leave = attendance_records.filter(status='on_leave').count()
            summary.days_holiday = attendance_records.filter(status='holiday').count()
            summary.days_week_off = attendance_records.filter(status='week_off').count()
            
            # Calculate hours
            hours_data = attendance_records.aggregate(
                total_hours=Sum('total_hours'),
                overtime_hours=Sum('overtime_hours')
            )
            summary.total_hours_worked = hours_data['total_hours'] or 0
            summary.total_overtime_hours = hours_data['overtime_hours'] or 0
            
            # Calculate effective days
            summary.calculate_effective_days()
            summary.save()
            
            summaries.append(summary)
        
        return Response({
            'success': True,
            'generated_count': len(summaries),
            'summaries': MonthlyAttendanceSummarySerializer(summaries, many=True).data
        })
    
    @action(detail=False, methods=['get'])
    def for_payroll(self, request):
        """Get attendance summary for payroll processing"""
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        employee_id = request.query_params.get('employee')
        user = request.user

        if not month or not year:
            return Response(
                {'error': 'Month and year are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        queryset = MonthlyAttendanceSummary.objects.filter(month=month, year=year)

        # Company / branch isolation
        if user.role == 'company_admin' and user.company:
            queryset = queryset.filter(employee__company=user.company)
        elif user.role != 'super_admin' and user.branch:
            queryset = queryset.filter(employee__branch=user.branch)

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

        summaries = queryset.select_related('employee')

        # Format for payroll
        payroll_data = []
        for summary in summaries:
            payroll_data.append({
                'employee_id': summary.employee.id,
                'employee_name': summary.employee.name,
                'days_present': summary.days_present,
                'days_absent': summary.days_absent,
                'days_half_day': summary.days_half_day,
                'days_on_leave': summary.days_on_leave,
                'effective_working_days': float(summary.effective_working_days),
                'total_hours_worked': float(summary.total_hours_worked),
                'overtime_hours': float(summary.total_overtime_hours),
                'late_arrivals': summary.late_arrivals_count,
            })

        return Response(payroll_data)
