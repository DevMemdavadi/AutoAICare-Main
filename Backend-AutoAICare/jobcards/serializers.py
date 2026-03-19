from rest_framework import serializers
from .models import (
    JobCard, JobCardPhoto, PartUsed, QCReport, SupervisorReview, 
    FinalQCReport, CustomerApproval, VehicleDelivery, ApplicatorTask,
    JobCardNote, DynamicTask, JobCardActivity, RewardSettings, SupervisorReward
)
from .parts_catalog import Part
from django.contrib.auth import get_user_model
from branches.models import Branch

from companies.serializers import TenantSerializerMixin

User = get_user_model()

class BranchDetailsSerializer(serializers.ModelSerializer):
    """Serializer for branch details."""
    class Meta:
        model = Branch
        fields = ('id', 'name', 'code', 'city', 'google_review_url')
        read_only_fields = ('id', 'name', 'code', 'city', 'google_review_url')


class TechnicianSerializer(serializers.ModelSerializer):
    """Serializer for technician user details."""
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'name', 'phone', 'email', 'role', 'role_display')
        read_only_fields = ('id',)


class JobCardPhotoSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for JobCardPhoto model."""
    class Meta:
        model = JobCardPhoto
        fields = '__all__'
        read_only_fields = ('id', 'company', 'jobcard', 'created_at')


class PartSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for Part catalog."""
    stock_status = serializers.ReadOnlyField()
    profit_margin = serializers.SerializerMethodField()
    profit_percentage = serializers.SerializerMethodField()
    price_with_gst = serializers.SerializerMethodField()
    branch_details = BranchDetailsSerializer(source='branch', read_only=True)
    
    class Meta:
        model = Part
        fields = '__all__'
        read_only_fields = ('id', 'company', 'created_at', 'updated_at')
    
    def get_profit_margin(self, obj):
        return str(obj.get_profit_margin())
    
    def get_profit_percentage(self, obj):
        return str(obj.get_profit_percentage())
    
    def get_price_with_gst(self, obj):
        return str(obj.get_price_with_gst())


class PartUsedSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for PartUsed model."""
    total_price = serializers.ReadOnlyField()
    total_cost = serializers.ReadOnlyField()
    profit_margin = serializers.ReadOnlyField()
    profit_percentage = serializers.ReadOnlyField()
    part_details = PartSerializer(source='part', read_only=True)
    service_package_name = serializers.SerializerMethodField()
    
    class Meta:
        model = PartUsed
        fields = '__all__'
        read_only_fields = ('id', 'company', 'jobcard', 'created_at')
    
    def get_service_package_name(self, obj):
        """Return the name of the service package this part was deducted for."""
        if obj.service_package:
            return obj.service_package.name
        return None
    
    def validate(self, data):
        """Validate that if part is selected, it has sufficient stock."""
        if data.get('part'):
            part = data['part']
            quantity = data.get('quantity', 1)
            
            if part.stock < quantity:
                raise serializers.ValidationError({
                    'part': f'Insufficient stock for {part.name}. Available: {part.stock}, Required: {quantity}'
                })
        
        return data


class QCReportSerializer(serializers.ModelSerializer):
    """Serializer for QC Report."""
    floor_manager_details = TechnicianSerializer(source='floor_manager', read_only=True)
    
    class Meta:
        model = QCReport
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'completed_at')


class SupervisorReviewSerializer(serializers.ModelSerializer):
    """Serializer for Supervisor Review."""
    supervisor_details = TechnicianSerializer(source='supervisor', read_only=True)
    
    class Meta:
        model = SupervisorReview
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'reviewed_at')


class FinalQCReportSerializer(serializers.ModelSerializer):
    """Serializer for Final QC Report."""
    supervisor_details = TechnicianSerializer(source='supervisor', read_only=True)
    
    class Meta:
        model = FinalQCReport
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'completed_at')


class CustomerApprovalSerializer(serializers.ModelSerializer):
    """Serializer for Customer Approval."""
    
    class Meta:
        model = CustomerApproval
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'approved_at')


class VehicleDeliverySerializer(serializers.ModelSerializer):
    """Serializer for Vehicle Delivery."""
    delivered_by_details = TechnicianSerializer(source='delivered_by', read_only=True)
    
    class Meta:
        model = VehicleDelivery
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'delivered_at')


class ApplicatorTaskSerializer(serializers.ModelSerializer):
    """Serializer for Applicator Task."""
    applicator_details = TechnicianSerializer(source='applicator', read_only=True)
    status = serializers.ReadOnlyField()
    
    class Meta:
        model = ApplicatorTask
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class JobCardNoteSerializer(serializers.ModelSerializer):
    """Serializer for JobCardNote model."""
    created_by_details = TechnicianSerializer(source='created_by', read_only=True)
    
    class Meta:
        model = JobCardNote
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class DynamicTaskSerializer(serializers.ModelSerializer):
    """Serializer for DynamicTask model."""
    created_by_details = TechnicianSerializer(source='created_by', read_only=True)
    assigned_to_details = TechnicianSerializer(source='assigned_to', read_only=True)
    
    class Meta:
        model = DynamicTask
        fields = '__all__'
        read_only_fields = ('created_at', 'completed_at', 'approval_date')


class JobCardActivitySerializer(serializers.ModelSerializer):
    """Serializer for JobCardActivity model."""
    performed_by_details = TechnicianSerializer(source='performed_by', read_only=True)
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)
    
    class Meta:
        model = JobCardActivity
        fields = '__all__'
        read_only_fields = ('created_at',)


class JobCardListSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Lightweight serializer for list view - includes nested structures for frontend compatibility."""
    # Add nested structures for frontend compatibility
    booking_details = serializers.SerializerMethodField()
    floor_manager_details = serializers.SerializerMethodField()
    supervisor_details = serializers.SerializerMethodField()
    branch_details = serializers.SerializerMethodField()
    
    # Timer-related calculated fields
    elapsed_minutes = serializers.SerializerMethodField()
    timer_status = serializers.SerializerMethodField()
    allowed_duration_display = serializers.SerializerMethodField()
    effective_duration_minutes = serializers.SerializerMethodField()
    elapsed_work_time = serializers.SerializerMethodField()
    potential_reward = serializers.SerializerMethodField()
    invoice = serializers.SerializerMethodField()
    
    class Meta:
        model = JobCard
        fields = (
            'id', 'booking_details', 'floor_manager_details', 'supervisor_details',
            'branch_details', 'status', 'job_started_at', 'allowed_duration_minutes',
            'allowed_duration_display', 'effective_duration_minutes', 'elapsed_minutes', 
            'timer_status', 'potential_reward', 'invoice', 'is_timer_paused', 
            'pause_started_at', 'total_pause_duration_seconds', 'elapsed_work_time', 
            'created_at', 'updated_at'
        )
    
    def get_elapsed_work_time(self, obj):
        """Get actual work time excluding pauses."""
        return obj.get_elapsed_work_time()

    def get_invoice(self, obj):
        """Get lightweight invoice info for workflow actions."""
        try:
            # Use prefetched invoices if available
            invoices = getattr(obj, 'invoices', None)
            if invoices and invoices.all():
                invoice = invoices.all()[0]
                return {
                    'id': invoice.id,
                    'status': invoice.status,
                    'invoice_number': getattr(invoice, 'invoice_number', None)
                }
        except:
            pass
        return None
    
    def get_booking_details(self, obj):
        """Get lightweight booking details."""
        if obj.booking:
            return {
                'id': obj.booking.id,
                'customer_name': obj.booking.customer.user.name if obj.booking.customer and obj.booking.customer.user else None,
                'customer_details': {
                    'user': {
                        'name': obj.booking.customer.user.name if obj.booking.customer and obj.booking.customer.user else None,
                        'phone': obj.booking.customer.user.phone if obj.booking.customer and obj.booking.customer.user else None,
                    }
                } if obj.booking.customer and obj.booking.customer.user else None,
                'vehicle_details': {
                    'id': obj.booking.vehicle.id,
                    'registration_number': obj.booking.vehicle.registration_number,
                    'brand': obj.booking.vehicle.brand,
                    'model': obj.booking.vehicle.model,
                } if obj.booking.vehicle else None,
                'packages_details': [
                    {
                        'id': pkg.id,
                        'name': pkg.name,
                        'duration': pkg.duration,
                    }
                    for pkg in obj.booking.get_packages_list()
                ] if obj.booking.packages.exists() or obj.booking.primary_package else [],
                'package_details': {
                    'id': obj.booking.primary_package.id,
                    'name': obj.booking.primary_package.name,
                    'duration': obj.booking.primary_package.duration,
                } if obj.booking.primary_package else (
                    {
                        'id': obj.booking.packages.first().id,
                        'name': obj.booking.packages.first().name,
                        'duration': obj.booking.packages.first().duration,
                    } if obj.booking.packages.exists() else None
                ),
                'status': obj.booking.status,
                'total_price': str(obj.booking.total_price) if obj.booking.total_price else None,
            }
        return None
    
    def get_floor_manager_details(self, obj):
        """Get lightweight floor manager details."""
        if obj.floor_manager:
            return {
                'id': obj.floor_manager.id,
                'name': obj.floor_manager.name,
                'phone': obj.floor_manager.phone,
            }
        return None
    
    def get_supervisor_details(self, obj):
        """Get lightweight supervisor details."""
        if obj.supervisor:
            return {
                'id': obj.supervisor.id,
                'name': obj.supervisor.name,
            }
        return None
    
    def get_branch_details(self, obj):
        """Get lightweight branch details."""
        if obj.branch:
            return {
                'id': obj.branch.id,
                'name': obj.branch.name,
                'code': getattr(obj.branch, 'code', None),
            }
        return None
    
    def get_elapsed_minutes(self, obj):
        """Get elapsed time in minutes."""
        return obj.get_elapsed_minutes() if obj.job_started_at else None
    
    def get_timer_status(self, obj):
        """Get timer status: normal, warning, overdue, or None."""
        return obj.get_timer_status()
    
    def get_allowed_duration_display(self, obj):
        """Get allowed duration (may be from package if not explicitly set)."""
        return obj.get_allowed_duration_minutes()
    
    def get_effective_duration_minutes(self, obj):
        """Get effective duration including buffer time."""
        return obj.get_effective_duration()
    
    def get_potential_reward(self, obj):
        """Get potential reward/deduction for active jobs."""
        from .reward_service import RewardCalculationService
        
        # Calculate for jobs that are in progress or just completed
        if obj.job_started_at and obj.status in ['work_in_progress', 'in_progress', 'started', 'work_completed']:
            # Use pre-fetched settings from context if available
            settings_map = self.context.get('reward_settings_map', {})
            # Try branch-specific, then fallback to global (None)
            settings = settings_map.get(obj.branch_id)
            if settings is None:
                settings = settings_map.get(None)
            
            # Note: Service-specific settings are not handled here yet, 
            # but branch-specific fix covers most cases and reduces queries significantly.
            return RewardCalculationService.get_potential_reward(obj, settings=settings)
        return None


class JobCardEmbeddedSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for embedding in Booking responses.
    Excludes booking_details to prevent circular recursion.
    """
    floor_manager_details = TechnicianSerializer(source='floor_manager', read_only=True)
    customer_approval = serializers.SerializerMethodField()
    invoice = serializers.SerializerMethodField()
    
    # Timer-related calculated fields
    timer_status = serializers.SerializerMethodField()
    allowed_duration_display = serializers.SerializerMethodField()
    
    # Workflow-related nested serializers for notes and details
    qc_report = serializers.SerializerMethodField()
    supervisor_review = serializers.SerializerMethodField()
    final_qc_report = serializers.SerializerMethodField()
    notes = JobCardNoteSerializer(many=True, read_only=True)
    
    class Meta:
        model = JobCard
        fields = (
            'id', 'status', 'job_started_at', 'estimated_delivery_time', 
            'floor_manager_details', 'customer_approval', 'invoice',
            'timer_status', 'allowed_duration_display', 'allowed_duration_minutes',
            'qc_report', 'supervisor_review', 'final_qc_report', 'notes'
        )
        
    def get_customer_approval(self, obj):
        try:
            if hasattr(obj, 'customer_approval'):
                return CustomerApprovalSerializer(obj.customer_approval).data
        except:
            pass
        return None

    def get_invoice(self, obj):
        try:
            from billing.models import Invoice
            invoice = Invoice.objects.filter(jobcard=obj).first()
            if invoice:
                from billing.serializers import InvoiceSerializer
                return InvoiceSerializer(invoice).data
        except:
            pass
        return None
        
    def get_timer_status(self, obj):
        return obj.get_timer_status()
    
    def get_allowed_duration_display(self, obj):
        return obj.get_allowed_duration_minutes()
    
    def get_qc_report(self, obj):
        """Get QC report if exists."""
        try:
            if hasattr(obj, 'qc_report'):
                return QCReportSerializer(obj.qc_report).data
        except:
            pass
        return None
    
    def get_supervisor_review(self, obj):
        """Get supervisor review if exists."""
        try:
            if hasattr(obj, 'supervisor_review'):
                return SupervisorReviewSerializer(obj.supervisor_review).data
        except:
            pass
        return None
    
    def get_final_qc_report(self, obj):
        """Get final QC report if exists."""
        try:
            if hasattr(obj, 'final_qc_report'):
                return FinalQCReportSerializer(obj.final_qc_report).data
        except:
            pass
        return None



class JobCardSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for JobCard model."""
    booking_details = serializers.SerializerMethodField()
    photos = JobCardPhotoSerializer(many=True, read_only=True)
    parts_used = PartUsedSerializer(many=True, read_only=True)
    technician_details = TechnicianSerializer(source='technician', read_only=True)
    floor_manager_details = TechnicianSerializer(source='floor_manager', read_only=True)
    supervisor_details = TechnicianSerializer(source='supervisor', read_only=True)
    applicator_team_details = TechnicianSerializer(source='applicator_team', many=True, read_only=True)
    applicator_tasks = ApplicatorTaskSerializer(many=True, read_only=True)
    branch_details = BranchDetailsSerializer(source='branch', read_only=True)
    
    # Workflow-related nested serializers
    qc_report = serializers.SerializerMethodField()
    supervisor_review = serializers.SerializerMethodField()
    final_qc_report = serializers.SerializerMethodField()
    customer_approval = serializers.SerializerMethodField()
    delivery = serializers.SerializerMethodField()
    invoice = serializers.SerializerMethodField()
    
    # Timer-related calculated fields
    elapsed_minutes = serializers.SerializerMethodField()
    remaining_minutes = serializers.SerializerMethodField()
    timer_status = serializers.SerializerMethodField()
    allowed_duration_display = serializers.SerializerMethodField()
    
    # Buffer and pause-related fields
    remaining_buffer_minutes = serializers.SerializerMethodField()
    effective_duration_minutes = serializers.SerializerMethodField()
    elapsed_work_time = serializers.SerializerMethodField()
    
    # Custom field for before photos (includes initial photos)
    before_photos = serializers.SerializerMethodField()
    
    # Collaborative features
    notes = JobCardNoteSerializer(many=True, read_only=True)
    dynamic_tasks = DynamicTaskSerializer(many=True, read_only=True)
    recent_activities = serializers.SerializerMethodField()
    
    # Reward system fields
    rewards = serializers.SerializerMethodField()
    potential_reward = serializers.SerializerMethodField()
    
    class Meta:
        model = JobCard
        fields = (
            'id', 'booking', 'booking_details', 'floor_manager', 'floor_manager_details',
            'supervisor', 'supervisor_details', 'technician', 'technician_details',
            'applicator_team', 'applicator_team_details', 'branch', 'branch_details',
            'status', 'technician_notes', 'service_checklist', 'estimated_delivery_time',
            'allowed_duration_minutes', 'job_started_at', 'warning_sent',
            'warning_15min_sent', 'warning_10min_sent', 'warning_7min_sent',
            'warning_5min_sent', 'warning_3min_sent', 'warning_2min_sent',
            'warning_1min_sent', 'overdue_notification_sent', 'buffer_percentage',
            'buffer_minutes_allocated', 'is_timer_paused', 'pause_started_at',
            'total_pause_duration_seconds', 'pause_reason', 'created_at', 'updated_at',
            'photos', 'before_photos', 'parts_used', 'applicator_tasks',
            'qc_report', 'supervisor_review', 'final_qc_report', 'customer_approval',
            'delivery', 'invoice', 'elapsed_minutes', 'remaining_minutes',
            'timer_status', 'allowed_duration_display', 'remaining_buffer_minutes',
            'effective_duration_minutes', 'elapsed_work_time', 'notes',
            'dynamic_tasks', 'recent_activities', 'rewards', 'potential_reward'
        )
        read_only_fields = ('id', 'company', 'created_at', 'updated_at', 'branch', 'job_started_at')
    
    def get_before_photos(self, obj):
        """Get all before photos including initial photos."""
        # Use prefetched photos to avoid extra DB queries
        all_photos = list(obj.photos.all())
        
        before_photos = [p for p in all_photos if p.photo_type == 'before']
        initial_photos = [p for p in all_photos if p.photo_type == 'initial']
        
        # Combine both and serialize
        all_before_photos = before_photos + initial_photos
        return JobCardPhotoSerializer(all_before_photos, many=True).data
    
    def get_booking_details(self, obj):
        """Get booking details using prefetched data to avoid N+1 queries."""
        if not obj.booking:
            return None
        
        booking = obj.booking
        
        # Build booking details manually using prefetched relationships
        booking_data = {
            'id': booking.id,
            'status': booking.status,
            'total_price': str(booking.total_price) if booking.total_price else None,
            'notes': booking.notes,
            'initial_damages': booking.initial_damages,
            'check_in_notes': booking.check_in_notes,
            'pickup_required': booking.pickup_required,
            'location': booking.location,
            'booking_datetime': booking.booking_datetime.isoformat() if booking.booking_datetime else None,
            'vehicle_arrived_at': booking.vehicle_arrived_at.isoformat() if booking.vehicle_arrived_at else None,
        }
        
        # Customer details (prefetched via booking__customer__user)
        if booking.customer and booking.customer.user:
            booking_data['customer_name'] = booking.customer.user.name
            booking_data['customer_details'] = {
                'user': {
                    'name': booking.customer.user.name,
                    'phone': booking.customer.user.phone,
                    'email': booking.customer.user.email,
                }
            }
        
        # Vehicle details (prefetched via booking__vehicle)
        if booking.vehicle:
            booking_data['vehicle_details'] = {
                'id': booking.vehicle.id,
                'registration_number': booking.vehicle.registration_number,
                'brand': booking.vehicle.brand,
                'model': booking.vehicle.model,
                'customer_name': booking.customer.user.name if booking.customer and booking.customer.user else None,
            }
        
        # Packages details — full list (multi-service aware)
        pkg_list_all = booking.get_packages_list()
        booking_data['packages_details'] = [
            {
                'id': p.id,
                'name': p.name,
                'duration': p.duration,
                'gst_rate': p.gst_rate,
            }
            for p in pkg_list_all
        ]
        # Backward-compat alias: first package for legacy frontend code
        booking_data['package_details'] = booking_data['packages_details'][0] if booking_data['packages_details'] else None
        
        # Price breakdown - use booking's price_breakdown property which handles vehicle-type pricing
        # This ensures we get the correct price based on vehicle type (hatchback/sedan/suv)
        if hasattr(booking, 'price_breakdown') and booking.price_breakdown:
            booking_data['price_breakdown'] = booking.price_breakdown
        else:
            # Fallback: manually construct if price_breakdown not available
            addons_list = list(booking.addons.all()) if hasattr(booking, 'addons') else []
            pkg_list = booking.get_packages_list()
            
            booking_data['price_breakdown'] = {
                'packages': [
                    {
                        'id': p.id,
                        'name': p.name,
                        'price': str(p.get_price_for_vehicle_type(booking.vehicle_type)),
                        'gst_rate': str(p.gst_rate) if p.gst_applicable else '0',
                    }
                    for p in pkg_list
                ],
                'addons': [
                    {
                        'id': addon.id,
                        'name': addon.name,
                        'price': str(addon.price),
                    }
                    for addon in addons_list
                ],
                'subtotal': str(booking.subtotal) if hasattr(booking, 'subtotal') and booking.subtotal else None,
                'gst_amount': str(booking.gst_amount) if hasattr(booking, 'gst_amount') and booking.gst_amount else None,
                'discount_amount': str(booking.discount_amount) if hasattr(booking, 'discount_amount') and booking.discount_amount else '0',
                'total_price': str(booking.total_price) if booking.total_price else None,
            }
        
        # Pickup request details (if exists)
        if hasattr(booking, 'pickup_request_details') and booking.pickup_request_details:
            pickup = booking.pickup_request_details
            booking_data['pickup_request_details'] = {
                'pickup_time': pickup.pickup_time.isoformat() if hasattr(pickup, 'pickup_time') and pickup.pickup_time else None,
                'status': pickup.status if hasattr(pickup, 'status') else None,
                'driver': {
                    'name': pickup.driver.name if hasattr(pickup, 'driver') and pickup.driver else None,
                    'phone': pickup.driver.phone if hasattr(pickup, 'driver') and pickup.driver else None,
                } if hasattr(pickup, 'driver') and pickup.driver else None,
            }
        
        # Checked in by details
        if hasattr(booking, 'checked_in_by') and booking.checked_in_by:
            booking_data['checked_in_by_details'] = {
                'name': booking.checked_in_by.name,
            }
        
        return booking_data
    
    def get_elapsed_minutes(self, obj):
        """Get elapsed time in minutes."""
        return obj.get_elapsed_minutes() if obj.job_started_at else None
    
    def get_remaining_minutes(self, obj):
        """Get remaining time in minutes."""
        return obj.get_remaining_minutes()
    
    def get_timer_status(self, obj):
        """Get timer status: normal, warning, overdue, or None."""
        return obj.get_timer_status()
    
    def get_allowed_duration_display(self, obj):
        """Get allowed duration (may be from package if not explicitly set)."""
        return obj.get_allowed_duration_minutes()
    
    def get_remaining_buffer_minutes(self, obj):
        """Get remaining buffer time in minutes."""
        if obj.job_started_at:
            return obj.get_remaining_buffer()
        return None
    
    def get_effective_duration_minutes(self, obj):
        """Get effective duration including buffer time."""
        return obj.get_effective_duration()
    
    def get_elapsed_work_time(self, obj):
        """Get elapsed work time excluding pause durations."""
        if obj.job_started_at:
            return obj.get_elapsed_work_time()
        return None
    
    def get_qc_report(self, obj):
        """Get QC report if exists."""
        try:
            if hasattr(obj, 'qc_report'):
                return QCReportSerializer(obj.qc_report).data
        except:
            pass
        return None
    
    def get_supervisor_review(self, obj):
        """Get supervisor review if exists."""
        try:
            if hasattr(obj, 'supervisor_review'):
                return SupervisorReviewSerializer(obj.supervisor_review).data
        except:
            pass
        return None
    
    def get_final_qc_report(self, obj):
        """Get final QC report if exists."""
        try:
            if hasattr(obj, 'final_qc_report'):
                return FinalQCReportSerializer(obj.final_qc_report).data
        except:
            pass
        return None
    
    def get_customer_approval(self, obj):
        """Get customer approval if exists."""
        try:
            if hasattr(obj, 'customer_approval'):
                return CustomerApprovalSerializer(obj.customer_approval).data
        except:
            pass
        return None
    
    def get_delivery(self, obj):
        """Get delivery record if exists."""
        try:
            if hasattr(obj, 'delivery'):
                return VehicleDeliverySerializer(obj.delivery).data
        except:
            pass
        return None
    
    def get_recent_activities(self, obj):
        """Get recent activities (last 20)."""
        # Use the to_attr prefetch cache set by the detail queryset (avoids loading all rows)
        if hasattr(obj, 'recent_activities_prefetched'):
            activities = obj.recent_activities_prefetched  # already sliced to 20 at DB level
        else:
            # Fallback for non-detail contexts (e.g. custom actions)
            activities = list(obj.activities.all())[:20]
        return JobCardActivitySerializer(activities, many=True).data
    
    def get_invoice(self, obj):
        """Get invoice using prefetched data to avoid N+1 queries."""
        try:
            # Use prefetched invoices to avoid extra query
            invoices = getattr(obj, 'invoices', None)
            if not invoices or not invoices.all():
                return None
            
            invoice = invoices.all()[0]
            
            # Calculate payment totals from prefetched payments to avoid queries
            # Using list comprehension on prefetched payments is efficient
            payments_list = list(invoice.payments.all()) if hasattr(invoice, 'payments') else []
            completed_payments = [p for p in payments_list if p.payment_status == 'completed']
            total_paid = sum(p.amount for p in completed_payments)
            total_amount = invoice.total_amount if invoice.total_amount else 0
            amount_remaining = total_amount - total_paid
            
            # Build invoice data manually using prefetched relationships
            invoice_data = {
                'id': invoice.id,
                'invoice_number': invoice.invoice_number,
                'status': invoice.status,
                'total_amount': str(total_amount),
                'amount_paid': str(total_paid),
                'amount_remaining': str(amount_remaining),
                'subtotal': str(invoice.subtotal) if hasattr(invoice, 'subtotal') and invoice.subtotal else '0',
                'tax_rate': invoice.tax_rate if hasattr(invoice, 'tax_rate') else 0,
                'tax_amount': str(invoice.tax_amount) if hasattr(invoice, 'tax_amount') and invoice.tax_amount else '0',
                'discount_amount': str(invoice.discount_amount) if hasattr(invoice, 'discount_amount') and invoice.discount_amount else '0',
                'issued_date': invoice.issued_date.isoformat() if invoice.issued_date else None,
                'due_date': invoice.due_date.isoformat() if invoice.due_date else None,
                'paid_date': invoice.paid_date.isoformat() if invoice.paid_date else None,
                'total_paid': str(total_paid),
                'remaining_balance': str(amount_remaining),
                'is_overpaid': amount_remaining < 0,
                'payment_progress_percent': (float(total_paid) / float(total_amount) * 100) if total_amount > 0 else 0
            }
            
            # Items (prefetched via invoices__items)
            items_list = list(invoice.items.all()) if hasattr(invoice, 'items') else []
            invoice_data['items'] = [
                {
                    'id': item.id,
                    'description': item.description,
                    'quantity': float(item.quantity) if item.quantity else 0,
                    'unit_price': str(item.unit_price),
                    'total_price': str(item.total), # Field name in model is 'total', not 'total_price'
                }
                for item in items_list
            ]
            
            # Payment details
            invoice_data['payment_details'] = [
                {
                    'id': payment.id,
                    'amount': str(payment.amount),
                    'payment_method': payment.payment_method,
                    'payment_date': payment.payment_date.isoformat() if payment.payment_date else None,
                    'reference_number': payment.reference_number,
                    'notes': payment.notes,
                    'recorded_by': payment.recorded_by.name if hasattr(payment, 'recorded_by') and payment.recorded_by else None,
                }
                for payment in payments_list
            ]
            
            # Calculation warning (if exists)
            if hasattr(invoice, 'calculation_warning') and invoice.calculation_warning:
                invoice_data['calculation_warning'] = invoice.calculation_warning
            
            return invoice_data
        except Exception as e:
            # Log error but don't fail the entire serialization
            import logging
            logging.error(f"Error serializing invoice for JobCard {obj.id}: {e}")
            return None
    
    def get_potential_reward(self, obj):
        """Get potential reward/deduction for active jobs."""
        from .reward_service import RewardCalculationService
        # Only calculate for jobs that are actively in progress
        if obj.job_started_at and obj.status in ['work_in_progress', 'in_progress', 'started', 'work_completed']:
            settings_map = self.context.get('reward_settings_map')
            
            if settings_map is None:
                # Detail view lazy-load: fetch only now that we know we need it
                from .models import RewardSettings as _RewardSettings
                settings_qs = _RewardSettings.objects.filter(is_active=True)
                settings_map = {s.branch_id: s for s in settings_qs}
            
            settings = settings_map.get(obj.branch_id)
            if settings is None:
                settings = settings_map.get(None)
            
            return RewardCalculationService.get_potential_reward(obj, settings=settings)
        return None
    
    def get_rewards(self, obj):
        """Get reward records for this job card."""
        rewards = obj.rewards.all()
        return SupervisorRewardSerializer(rewards, many=True).data


class JobCardCreateSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for creating job cards."""
    # Allow both supervisor and applicator users as technicians (handle legacy field properly)
    technician = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role__in=['supervisor', 'applicator']),
        required=False
    )
    allowed_duration_minutes = serializers.IntegerField(required=False, allow_null=True)
    
    class Meta:
        model = JobCard
        fields = ('booking', 'technician', 'estimated_delivery_time', 'allowed_duration_minutes')

    def create(self, validated_data):
        # Set the branch from the booking
        booking = validated_data['booking']
        branch = booking.branch
        validated_data['branch'] = branch
        
        # Auto-set allowed_duration as sum of all package durations
        if 'allowed_duration_minutes' not in validated_data or validated_data.get('allowed_duration_minutes') is None:
            pkg_list = booking.get_packages_list()
            if pkg_list:
                total_duration = sum(p.duration for p in pkg_list if p.duration)
                if total_duration > 0:
                    validated_data['allowed_duration_minutes'] = total_duration
        
        # Ensure company is set from branch if not already provided (e.g. super_admin has no company)
        if not validated_data.get('company') and branch:
            validated_data['company'] = branch.company
        
        return super().create(validated_data)


class RewardSettingsSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for RewardSettings model."""
    branch_details = BranchDetailsSerializer(source='branch', read_only=True)
    
    class Meta:
        model = RewardSettings
        fields = '__all__'
        read_only_fields = ('id', 'company', 'created_at', 'updated_at')


class SupervisorRewardSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for SupervisorReward model."""
    recipient_details = TechnicianSerializer(source='recipient', read_only=True)
    approved_by_details = TechnicianSerializer(source='approved_by', read_only=True)
    supervisor_reward_details = serializers.SerializerMethodField()
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = SupervisorReward
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'approved_at')
    
    def get_supervisor_reward_details(self, obj):
        """Get supervisor reward details if this is an applicator share."""
        if obj.is_applicator_share and obj.supervisor_reward:
            return {
                'id': obj.supervisor_reward.id,
                'amount': str(obj.supervisor_reward.amount),
                'recipient': obj.supervisor_reward.recipient.name
            }
        return None

