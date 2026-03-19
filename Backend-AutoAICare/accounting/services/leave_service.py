"""
Leave management service - Business logic for leave operations
"""
from decimal import Decimal
from datetime import datetime, timedelta
from django.db import transaction
from django.utils import timezone
from ..models import LeaveType, LeaveBalance, LeaveRequest, LeaveEncashment, Payroll


class LeaveService:
    """Service class for leave management operations"""
    
    @staticmethod
    def initialize_leave_balance(employee, year):
        """Initialize leave balances for an employee for a given year"""
        leave_types = LeaveType.objects.filter(is_active=True)
        
        for leave_type in leave_types:
            # Check if employee role matches (if role restriction exists)
            if leave_type.applies_to_roles and employee.role not in leave_type.applies_to_roles:
                continue
            
            # Get previous year balance for carry forward
            previous_year = year - 1
            previous_balance = LeaveBalance.objects.filter(
                employee=employee,
                leave_type=leave_type,
                year=previous_year
            ).first()
            
            opening_balance = Decimal('0')
            if previous_balance and leave_type.is_carry_forward:
                # Calculate carry forward
                available = previous_balance.available_balance
                max_carry = Decimal(str(leave_type.max_carry_forward_days))
                opening_balance = min(available, max_carry) if max_carry > 0 else available
            
            # Create or update balance
            LeaveBalance.objects.update_or_create(
                employee=employee,
                leave_type=leave_type,
                year=year,
                defaults={
                    'opening_balance': opening_balance,
                    'credited': Decimal(str(leave_type.annual_quota)),
                    'used': Decimal('0'),
                    'encashed': Decimal('0'),
                    'lapsed': Decimal('0')
                }
            )
    
    @staticmethod
    def calculate_leave_days(start_date, end_date, include_weekends=True):
        """Calculate number of leave days between two dates"""
        if not include_weekends:
            # Count only weekdays
            days = 0
            current = start_date
            while current <= end_date:
                if current.weekday() < 5:  # Monday = 0, Friday = 4
                    days += 1
                current += timedelta(days=1)
            return days
        else:
            # Include all days
            delta = end_date - start_date
            return delta.days + 1
    
    @staticmethod
    @transaction.atomic
    def approve_leave_request(leave_request, approved_by):
        """Approve a leave request and update balance"""
        if leave_request.status != 'pending':
            raise ValueError("Only pending leave requests can be approved")
        
        # Get or create leave balance
        leave_balance, created = LeaveBalance.objects.get_or_create(
            employee=leave_request.employee,
            leave_type=leave_request.leave_type,
            year=leave_request.start_date.year,
            defaults={
                'opening_balance': Decimal('0'),
                'credited': Decimal(str(leave_request.leave_type.annual_quota)),
                'used': Decimal('0'),
                'encashed': Decimal('0'),
                'lapsed': Decimal('0')
            }
        )
        
        # Check if sufficient balance
        if leave_balance.available_balance < leave_request.total_days:
            raise ValueError(f"Insufficient leave balance. Available: {leave_balance.available_balance}, Requested: {leave_request.total_days}")
        
        # Update leave request
        leave_request.status = 'approved'
        leave_request.approved_by = approved_by
        leave_request.approval_date = timezone.now()
        leave_request.leave_balance = leave_balance
        leave_request.save()
        
        # Update balance
        leave_balance.used += leave_request.total_days
        leave_balance.save()
        
        return leave_request
    
    @staticmethod
    @transaction.atomic
    def reject_leave_request(leave_request, rejected_by, reason):
        """Reject a leave request"""
        if leave_request.status != 'pending':
            raise ValueError("Only pending leave requests can be rejected")
        
        leave_request.status = 'rejected'
        leave_request.approved_by = rejected_by
        leave_request.approval_date = timezone.now()
        leave_request.rejection_reason = reason
        leave_request.save()
        
        return leave_request
    
    @staticmethod
    @transaction.atomic
    def cancel_leave_request(leave_request):
        """Cancel an approved leave request and restore balance"""
        if leave_request.status not in ['pending', 'approved']:
            raise ValueError("Only pending or approved leave requests can be cancelled")
        
        # If approved, restore balance
        if leave_request.status == 'approved' and leave_request.leave_balance:
            leave_balance = leave_request.leave_balance
            leave_balance.used -= leave_request.total_days
            leave_balance.save()
        
        leave_request.status = 'cancelled'
        leave_request.save()
        
        return leave_request
    
    @staticmethod
    def calculate_leave_deduction(employee, month, year, salary_structure):
        """Calculate leave deduction for unpaid leaves in a month"""
        from calendar import monthrange
        
        # Get all approved unpaid leave requests for the month
        start_date = datetime(year, month, 1).date()
        end_date = datetime(year, month, monthrange(year, month)[1]).date()
        
        unpaid_leaves = LeaveRequest.objects.filter(
            employee=employee,
            status='approved',
            leave_type__is_paid=False,
            start_date__lte=end_date,
            end_date__gte=start_date
        )
        
        total_unpaid_days = Decimal('0')
        for leave in unpaid_leaves:
            # Calculate overlap with the month
            leave_start = max(leave.start_date, start_date)
            leave_end = min(leave.end_date, end_date)
            
            if leave_start <= leave_end:
                days = (leave_end - leave_start).days + 1
                total_unpaid_days += Decimal(str(days))
        
        # Calculate deduction
        if total_unpaid_days > 0:
            # Calculate daily rate
            gross_salary = salary_structure.calculate_gross_salary()
            days_in_month = monthrange(year, month)[1]
            daily_rate = gross_salary / Decimal(str(days_in_month))
            deduction = daily_rate * total_unpaid_days
            
            return {
                'unpaid_days': float(total_unpaid_days),
                'daily_rate': float(daily_rate),
                'deduction_amount': float(deduction)
            }
        
        return {
            'unpaid_days': 0,
            'daily_rate': 0,
            'deduction_amount': 0
        }
    
    @staticmethod
    @transaction.atomic
    def process_leave_encashment(encashment, approved_by):
        """Process leave encashment and add to payroll"""
        if encashment.status != 'pending':
            raise ValueError("Only pending encashments can be processed")
        
        # Approve encashment
        encashment.status = 'approved'
        encashment.approved_by = approved_by
        encashment.approval_date = timezone.now()
        encashment.save()
        
        # Update leave balance
        leave_balance = encashment.leave_balance
        leave_balance.encashed += encashment.days_to_encash
        leave_balance.save()
        
        return encashment
    
    @staticmethod
    def calculate_encashment_amount(employee, leave_type, days_to_encash):
        """Calculate leave encashment amount"""
        # Get employee salary structure
        salary_structure = employee.salary_structure
        
        # Calculate daily rate
        gross_salary = salary_structure.calculate_gross_salary()
        daily_rate = gross_salary / Decimal('30')  # Assuming 30 days per month
        
        # Apply encashment rate
        encashment_rate = leave_type.encashment_rate / Decimal('100')
        amount = daily_rate * Decimal(str(days_to_encash)) * encashment_rate
        
        return {
            'daily_rate': float(daily_rate),
            'encashment_rate_percent': float(leave_type.encashment_rate),
            'total_amount': float(amount)
        }
    
    @staticmethod
    def get_employee_leave_summary(employee, year):
        """Get comprehensive leave summary for an employee"""
        balances = LeaveBalance.objects.filter(
            employee=employee,
            year=year
        ).select_related('leave_type')
        
        summary = []
        for balance in balances:
            summary.append({
                'leave_type': balance.leave_type.name,
                'leave_code': balance.leave_type.code,
                'opening_balance': float(balance.opening_balance),
                'credited': float(balance.credited),
                'used': float(balance.used),
                'encashed': float(balance.encashed),
                'lapsed': float(balance.lapsed),
                'available': float(balance.available_balance),
                'is_encashable': balance.leave_type.is_encashable
            })
        
        return summary
