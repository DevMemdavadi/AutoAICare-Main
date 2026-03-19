"""
Django management command to clean transactional data while preserving configuration.

Usage:
    python manage.py clean_data --dry-run                    # Preview what will be deleted
    python manage.py clean_data --confirm                    # Delete all transactional data
    python manage.py clean_data --confirm --preserve-staff   # Keep staff users
    python manage.py clean_data --confirm --customers-only   # Delete only customer data
    python manage.py clean_data --confirm --accounting-only  # Delete only accounting data
    python manage.py clean_data --confirm --company k3-car-care  # Clean specific company only
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.conf import settings
from django.db.models import Q
import sys


class Command(BaseCommand):
    help = 'Clean transactional data while preserving configuration data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview what will be deleted without actually deleting',
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm deletion (required to actually delete data)',
        )
        parser.add_argument(
            '--preserve-staff',
            action='store_true',
            help='Preserve staff user accounts (floor_manager, supervisor, applicator)',
        )
        parser.add_argument(
            '--customers-only',
            action='store_true',
            help='Delete only customer-related data (bookings, job cards, customers)',
        )
        parser.add_argument(
            '--accounting-only',
            action='store_true',
            help='Delete only accounting data (expenses, transactions, payroll)',
        )
        parser.add_argument(
            '--company',
            type=str,
            help='Clean data for specific company only (by slug). Use "none" to target orphaned data.',
        )
        parser.add_argument(
            '--include-none',
            action='store_true',
            help='Include records with no company assigned (orphaned data)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Skip environment check (use with caution)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        confirm = options['confirm']
        preserve_staff = options['preserve_staff']
        customers_only = options['customers_only']
        accounting_only = options['accounting_only']
        company_slug = options.get('company')
        include_none = options.get('include_none', False)
        force = options['force']

        # Safety check: prevent running in production without force flag
        if not force and not settings.DEBUG:
            self.stdout.write(self.style.ERROR(
                'ERROR: This command cannot be run in production environment!'
            ))
            self.stdout.write(self.style.WARNING(
                'Use --force flag to override this check (use with extreme caution)'
            ))
            sys.exit(1)

        # Require confirmation
        if not dry_run and not confirm:
            self.stdout.write(self.style.ERROR(
                'ERROR: You must use either --dry-run or --confirm flag'
            ))
            sys.exit(1)
        
        # Get company if specified
        company = None
        target_only_none = False
        if company_slug:
            if company_slug.lower() == 'none':
                target_only_none = True
                self.stdout.write(self.style.SUCCESS('[OK] Targeting records with NO company assigned (orphaned data)'))
            else:
                from companies.models import Company
                try:
                    company = Company.objects.get(slug=company_slug)
                    self.stdout.write(self.style.SUCCESS(f'[OK] Found company: {company.name} ({company.slug})'))
                except Company.DoesNotExist:
                    self.stdout.write(self.style.ERROR(f'ERROR: Company with slug "{company_slug}" not found'))
                    sys.exit(1)

        # Display mode
        mode = "DRY RUN" if dry_run else "DELETION"
        if company:
            scope = f" - {company.name}"
            if include_none:
                scope += " (+ orphaned data)"
        elif target_only_none or include_none:
            scope = " - ORPHANED DATA ONLY"
        else:
            scope = " - ALL COMPANIES"
        self.stdout.write(self.style.WARNING(f'\n{"="*60}'))
        self.stdout.write(self.style.WARNING(f'  DATABASE CLEANING - {mode} MODE{scope}'))
        self.stdout.write(self.style.WARNING(f'{"="*60}\n'))

        # Import models
        from customers.models import Customer, Vehicle
        from bookings.models import Booking
        from jobcards.models import (
            JobCard, JobCardPhoto, PartUsed, QCReport, SupervisorReview,
            FinalQCReport, CustomerApproval, VehicleDelivery, ApplicatorTask,
            JobCardNote, DynamicTask, JobCardActivity
        )
        from jobcards.parts_catalog import Part
        from accounting.models import (
            Expense, Transaction, Payroll, PettyCash, InterBranchTransfer,
            LeaveBalance, LeaveRequest, LeaveEncashment, TaxDeclaration, Form16,
            Vendor, EmployeeSalaryStructure
        )
        from users.models import User
        from notify.models import NotificationLog, InAppNotification
        
        # Import performance models
        try:
            from jobcards.performance_models import PerformanceMetrics, TeamPerformance, FloorManagerPerformance
        except ImportError:
            PerformanceMetrics = None
            TeamPerformance = None
            FloorManagerPerformance = None
        
        # Try to import optional models
        try:
            from billing.models import Invoice
        except ImportError:
            Invoice = None
        
        try:
            from payments.models import Payment
        except ImportError:
            Payment = None
        
        try:
            from appointments.models import Appointment
        except ImportError:
            Appointment = None
        
        try:
            from feedback.models import Feedback
        except ImportError:
            Feedback = None
        
        try:
            from pickup.models import PickupDropRequest
        except ImportError:
            PickupDropRequest = None
        
        try:
            from memberships.models import Membership, Coupon
        except ImportError:
            Membership = None
            Coupon = None
        
        try:
            from leads.models import Lead
        except ImportError:
            Lead = None

        # Count records before deletion
        counts = {}
        
        # Helper function to get base Q object for filtering
        def get_base_q(filter_field='company'):
            q = Q()
            if company:
                q |= Q(**{filter_field: company})
            if target_only_none or include_none:
                q |= Q(**{f"{filter_field}__isnull": True})
            return q

        # Helper function to get queryset filtered by company
        def get_queryset(model, filter_field='company'):
            if not company and not target_only_none and not include_none:
                return model.objects.all()
            
            # Check if the filter field exists in the model
            try:
                return model.objects.filter(get_base_q(filter_field))
            except Exception as e:
                # If field doesn't exist, return empty queryset (no company filtering possible)
                self.stdout.write(self.style.WARNING(f'Warning: Cannot filter {model.__name__} by {filter_field}, returning NONE for safety'))
                return model.objects.none()
        
        if not accounting_only:
            # Customer & Booking Data
            # JobCard related - filter by company
            counts['JobCardActivity'] = get_queryset(JobCardActivity, 'jobcard__company').count()
            counts['DynamicTask'] = get_queryset(DynamicTask, 'jobcard__company').count()
            counts['JobCardNote'] = get_queryset(JobCardNote, 'jobcard__company').count()
            counts['ApplicatorTask'] = get_queryset(ApplicatorTask, 'jobcard__company').count()
            counts['VehicleDelivery'] = get_queryset(VehicleDelivery, 'jobcard__company').count()
            counts['CustomerApproval'] = get_queryset(CustomerApproval, 'jobcard__company').count()
            counts['FinalQCReport'] = get_queryset(FinalQCReport, 'jobcard__company').count()
            counts['SupervisorReview'] = get_queryset(SupervisorReview, 'jobcard__company').count()
            counts['QCReport'] = get_queryset(QCReport, 'jobcard__company').count()
            counts['PartUsed'] = get_queryset(PartUsed, 'jobcard__company').count()
            counts['JobCardPhoto'] = get_queryset(JobCardPhoto, 'jobcard__company').count()
            counts['JobCard'] = get_queryset(JobCard).count()
            counts['Booking'] = get_queryset(Booking).count()
            counts['Vehicle'] = get_queryset(Vehicle, 'customer__company').count()
            counts['Customer'] = get_queryset(Customer).count()
            
            # Performance Records
            if PerformanceMetrics:
                counts['PerformanceMetrics'] = get_queryset(PerformanceMetrics).count()
            if TeamPerformance:
                counts['TeamPerformance'] = get_queryset(TeamPerformance).count()
            if FloorManagerPerformance:
                counts['FloorManagerPerformance'] = get_queryset(FloorManagerPerformance).count()
            
            # counts['Part'] = get_queryset(Part).count()  # Parts are preserved as configuration data
            
            # Optional models
            if Invoice:
                counts['Invoice'] = get_queryset(Invoice).count()
            if Payment:
                counts['Payment'] = get_queryset(Payment, 'booking__company').count()
            if Appointment:
                counts['Appointment'] = get_queryset(Appointment, 'branch__company').count()
            if Feedback:
                counts['Feedback'] = get_queryset(Feedback, 'booking__company').count()
            if PickupDropRequest:
                counts['PickupRequest'] = get_queryset(PickupDropRequest, 'booking__company').count()
            if Membership:
                counts['Membership'] = get_queryset(Membership).count()
            if Coupon:
                counts['Coupon'] = get_queryset(Coupon).count()
            if Lead:
                counts['Lead'] = get_queryset(Lead).count()
            
            # Notifications - filter by company if possible
            if company or target_only_none or include_none:
                q = get_base_q('recipient__company')
                counts['NotificationLog'] = NotificationLog.objects.filter(q).count()
                counts['InAppNotification'] = InAppNotification.objects.filter(q).count()
            else:
                counts['NotificationLog'] = NotificationLog.objects.count()
                counts['InAppNotification'] = InAppNotification.objects.count()
            
            # Customer users
            if company or target_only_none or include_none:
                q = get_base_q('company')
                counts['CustomerUsers'] = User.objects.filter(q, role='customer').count()
            else:
                counts['CustomerUsers'] = User.objects.filter(role='customer').count()
        
        if not customers_only:
            # Accounting Data
            counts['Form16'] = get_queryset(Form16, 'employee__company').count()
            counts['TaxDeclaration'] = get_queryset(TaxDeclaration, 'employee__company').count()
            counts['LeaveEncashment'] = get_queryset(LeaveEncashment, 'employee__company').count()
            counts['LeaveRequest'] = get_queryset(LeaveRequest, 'employee__company').count()
            counts['LeaveBalance'] = get_queryset(LeaveBalance, 'employee__company').count()
            counts['InterBranchTransfer'] = get_queryset(InterBranchTransfer, 'from_branch__company').count()
            counts['PettyCash'] = get_queryset(PettyCash, 'branch__company').count()
            counts['Payroll'] = get_queryset(Payroll, 'employee__company').count()
            counts['Transaction'] = get_queryset(Transaction).count()
            counts['Expense'] = get_queryset(Expense).count()
            counts['Vendor'] = get_queryset(Vendor).count()
            counts['EmployeeSalaryStructure'] = get_queryset(EmployeeSalaryStructure, 'employee__company').count()

        # Display summary
        self.stdout.write(self.style.WARNING('\nRecords to be deleted:\n'))
        total_records = 0
        for model_name, count in counts.items():
            if count > 0:
                self.stdout.write(f'  {model_name:30} : {count:6} records')
                total_records += count
        
        self.stdout.write(self.style.WARNING(f'\n  {"TOTAL":30} : {total_records:6} records\n'))

        # Show what will be preserved
        from services.models import ServicePackage, AddOn
        from branches.models import Branch
        from customers.vehicle_data_models import VehicleBrand, VehicleModel, VehicleColor
        
        if company:
            preserved_counts = {
                'ServicePackage': ServicePackage.objects.filter(company=company).count(),
                'AddOn': AddOn.objects.filter(company=company).count(),
                'Part': Part.objects.filter(company=company).count(),
                'Branch': Branch.objects.filter(company=company).count(),
                'VehicleBrand': VehicleBrand.objects.count(),  # Global
                'VehicleModel': VehicleModel.objects.count(),  # Global
                'VehicleColor': VehicleColor.objects.count(),  # Global
                'Admin/Staff Users': User.objects.filter(company=company).exclude(role='customer').count(),
            }
        else:
            preserved_counts = {
                'ServicePackage': ServicePackage.objects.count(),
                'AddOn': AddOn.objects.count(),
                'Branch': Branch.objects.count(),
                'VehicleBrand': VehicleBrand.objects.count(),
                'VehicleModel': VehicleModel.objects.count(),
                'VehicleColor': VehicleColor.objects.count(),
                'Admin/Staff Users': User.objects.exclude(role='customer').count(),
            }
        
        self.stdout.write(self.style.SUCCESS('\nConfiguration data to be PRESERVED:\n'))
        for model_name, count in preserved_counts.items():
            if count > 0:
                self.stdout.write(self.style.SUCCESS(f'  {model_name:30} : {count:6} records'))

        # Dry run mode - exit here
        if dry_run:
            self.stdout.write(self.style.SUCCESS('\n[OK] Dry run completed. No data was deleted.'))
            return

        # Final confirmation
        self.stdout.write(self.style.ERROR(f'\n{"!"*60}'))
        self.stdout.write(self.style.ERROR('  WARNING: This will permanently delete data!'))
        self.stdout.write(self.style.ERROR(f'{"!"*60}\n'))
        
        confirmation = input('Type "DELETE" to confirm: ')
        if confirmation != 'DELETE':
            self.stdout.write(self.style.WARNING('Deletion cancelled.'))
            return

        # Perform deletion
        self.stdout.write(self.style.WARNING('\nDeleting data...\n'))
        
        deleted_counts = {}
        
        try:
            with transaction.atomic():
                if not accounting_only:
                    # Delete in correct order (respecting foreign key constraints)
                    
                    # Job card related data (delete from child to parent)
                    deleted_counts['JobCardActivity'] = get_queryset(JobCardActivity, 'jobcard__company').delete()[0]
                    deleted_counts['DynamicTask'] = get_queryset(DynamicTask, 'jobcard__company').delete()[0]
                    deleted_counts['JobCardNote'] = get_queryset(JobCardNote, 'jobcard__company').delete()[0]
                    deleted_counts['ApplicatorTask'] = get_queryset(ApplicatorTask, 'jobcard__company').delete()[0]
                    deleted_counts['VehicleDelivery'] = get_queryset(VehicleDelivery, 'jobcard__company').delete()[0]
                    deleted_counts['CustomerApproval'] = get_queryset(CustomerApproval, 'jobcard__company').delete()[0]
                    deleted_counts['FinalQCReport'] = get_queryset(FinalQCReport, 'jobcard__company').delete()[0]
                    deleted_counts['SupervisorReview'] = get_queryset(SupervisorReview, 'jobcard__company').delete()[0]
                    deleted_counts['QCReport'] = get_queryset(QCReport, 'jobcard__company').delete()[0]
                    deleted_counts['PartUsed'] = get_queryset(PartUsed, 'jobcard__company').delete()[0]
                    deleted_counts['JobCardPhoto'] = get_queryset(JobCardPhoto, 'jobcard__company').delete()[0]
                    
                    # Performance Records (delete before JobCard due to CASCADE, though safe either way)
                    if PerformanceMetrics:
                        deleted_counts['PerformanceMetrics'] = get_queryset(PerformanceMetrics).delete()[0]
                    if TeamPerformance:
                        deleted_counts['TeamPerformance'] = get_queryset(TeamPerformance).delete()[0]
                    if FloorManagerPerformance:
                        deleted_counts['FloorManagerPerformance'] = get_queryset(FloorManagerPerformance).delete()[0]
                    
                    deleted_counts['JobCard'] = get_queryset(JobCard).delete()[0]
                    
                    # Optional models
                    if Invoice:
                        deleted_counts['Invoice'] = get_queryset(Invoice).delete()[0]
                    if Payment:
                        deleted_counts['Payment'] = get_queryset(Payment, 'booking__company').delete()[0]
                    if Appointment:
                        deleted_counts['Appointment'] = get_queryset(Appointment, 'branch__company').delete()[0]
                    if Feedback:
                        deleted_counts['Feedback'] = get_queryset(Feedback, 'booking__company').delete()[0]
                    if PickupDropRequest:
                        deleted_counts['PickupRequest'] = get_queryset(PickupDropRequest, 'booking__company').delete()[0]
                    if Membership:
                        deleted_counts['Membership'] = get_queryset(Membership).delete()[0]
                    if Coupon:
                        deleted_counts['Coupon'] = get_queryset(Coupon).delete()[0]
                    if Lead:
                        deleted_counts['Lead'] = get_queryset(Lead).delete()[0]
                    
                    # Bookings
                    deleted_counts['Booking'] = get_queryset(Booking).delete()[0]
                    
                    # Notifications
                    if company or target_only_none or include_none:
                        q = get_base_q('recipient__company')
                        deleted_counts['NotificationLog'] = NotificationLog.objects.filter(q).delete()[0]
                        deleted_counts['InAppNotification'] = InAppNotification.objects.filter(q).delete()[0]
                    else:
                        deleted_counts['NotificationLog'] = NotificationLog.objects.all().delete()[0]
                        deleted_counts['InAppNotification'] = InAppNotification.objects.all().delete()[0]
                    
                    # Vehicles and Customers
                    deleted_counts['Vehicle'] = get_queryset(Vehicle, 'customer__company').delete()[0]
                    deleted_counts['Customer'] = get_queryset(Customer).delete()[0]
                    
                    # Parts catalog
                    # deleted_counts['Part'] = get_queryset(Part).delete()[0]
                    
                    # Customer users
                    if company or target_only_none or include_none:
                        q = get_base_q('company')
                        deleted_counts['CustomerUsers'] = User.objects.filter(q, role='customer').delete()[0]
                    else:
                        deleted_counts['CustomerUsers'] = User.objects.filter(role='customer').delete()[0]
                
                if not customers_only:
                    # Accounting data
                    deleted_counts['Form16'] = get_queryset(Form16, 'employee__company').delete()[0]
                    deleted_counts['TaxDeclaration'] = get_queryset(TaxDeclaration, 'employee__company').delete()[0]
                    deleted_counts['LeaveEncashment'] = get_queryset(LeaveEncashment, 'employee__company').delete()[0]
                    deleted_counts['LeaveRequest'] = get_queryset(LeaveRequest, 'employee__company').delete()[0]
                    deleted_counts['LeaveBalance'] = get_queryset(LeaveBalance, 'employee__company').delete()[0]
                    deleted_counts['InterBranchTransfer'] = get_queryset(InterBranchTransfer, 'from_branch__company').delete()[0]
                    deleted_counts['PettyCash'] = get_queryset(PettyCash, 'branch__company').delete()[0]
                    deleted_counts['Payroll'] = get_queryset(Payroll, 'employee__company').delete()[0]
                    deleted_counts['Transaction'] = get_queryset(Transaction).delete()[0]
                    deleted_counts['Expense'] = get_queryset(Expense).delete()[0]
                    deleted_counts['EmployeeSalaryStructure'] = get_queryset(EmployeeSalaryStructure, 'employee__company').delete()[0]
                    deleted_counts['Vendor'] = get_queryset(Vendor).delete()[0]

            # Display deletion summary
            self.stdout.write(self.style.SUCCESS('\n[OK] Data deletion completed successfully!\n'))
            self.stdout.write(self.style.SUCCESS('Deleted records:\n'))
            total_deleted = 0
            for model_name, count in deleted_counts.items():
                if count > 0:
                    self.stdout.write(self.style.SUCCESS(f'  {model_name:30} : {count:6} records'))
                    total_deleted += count
            
            self.stdout.write(self.style.SUCCESS(f'\n  {"TOTAL DELETED":30} : {total_deleted:6} records\n'))
            
            # Verify preserved data
            self.stdout.write(self.style.SUCCESS('Verified preserved data:\n'))
            for model_name, count in preserved_counts.items():
                current_count = 0
                if model_name == 'ServicePackage':
                    current_count = ServicePackage.objects.filter(company=company).count() if company else ServicePackage.objects.count()
                elif model_name == 'AddOn':
                    current_count = AddOn.objects.filter(company=company).count() if company else AddOn.objects.count()
                elif model_name == 'Branch':
                    current_count = Branch.objects.filter(company=company).count() if company else Branch.objects.count()
                elif model_name == 'VehicleBrand':
                    current_count = VehicleBrand.objects.count()
                elif model_name == 'VehicleModel':
                    current_count = VehicleModel.objects.count()
                elif model_name == 'VehicleColor':
                    current_count = VehicleColor.objects.count()
                elif model_name == 'Admin/Staff Users':
                    if company:
                        current_count = User.objects.filter(company=company).exclude(role='customer').count()
                    else:
                        current_count = User.objects.exclude(role='customer').count()
                
                status = '[OK]' if current_count == count else '[ERR]'
                self.stdout.write(self.style.SUCCESS(f'  {status} {model_name:26} : {current_count:6} records'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n[ERROR] Error during deletion: {str(e)}'))
            raise
