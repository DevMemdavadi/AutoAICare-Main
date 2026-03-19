from django.db import models
from django.conf import settings
from django.utils import timezone
from bookings.models import Booking
from .parts_catalog import Part
from companies.managers import CompanyManager




class JobCard(models.Model):
    """Job card for tracking service work."""
    
    STATUS_CHOICES = [
        ('created', 'Job Card Created'),
        ('qc_pending', 'QC Pending'),
        ('qc_completed', 'QC Completed'),
        ('qc_rejected', 'QC Rejected'),
        ('supervisor_approved', 'Supervisor Approved'),
        ('supervisor_rejected', 'Supervisor Rejected'),
        ('floor_manager_confirmed', 'Floor Manager Confirmed'),
        ('assigned_to_applicator', 'Assigned to Applicator Team'),
        ('work_in_progress', 'Work In Progress'),
        ('work_completed', 'Work Completed'),
        ('final_qc_pending', 'Final QC Pending'),
        ('final_qc_passed', 'Final QC Passed'),
        ('final_qc_failed', 'Final QC Failed'),
        ('floor_manager_final_qc_confirmed', 'Floor Manager Final QC Confirmed'),
        ('customer_approval_pending', 'Customer Approval Pending'),
        ('customer_approved', 'Customer Approved'),
        ('customer_revision_requested', 'Customer Revision Requested'),
        ('ready_for_billing', 'Ready for Billing'),
        ('billed', 'Billed'),
        ('ready_for_delivery', 'Ready for Delivery'),
        ('delivered', 'Delivered'),
        ('closed', 'Closed'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='jobcards',
        null=True,
        blank=True
    )
    
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='jobcard')
    
    # Assignment fields
    floor_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='floor_manager_jobcards',
        limit_choices_to={'role': 'floor_manager'},
        help_text='Floor Manager / QC Manager assigned to this job'
    )
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='supervisor_jobcards',
        limit_choices_to={'role': 'supervisor'},
        help_text='Supervisor assigned to review and approve this job'
    )
    applicator_team = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='applicator_jobcards',
        limit_choices_to={'role': 'applicator'},
        help_text='Applicator team members assigned to execute the work'
    )
    technician = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='jobcards',
        limit_choices_to={'role': 'supervisor'},
        help_text='Legacy field - use supervisor instead'
    )
    branch = models.ForeignKey('branches.Branch', on_delete=models.CASCADE, related_name='jobcards', null=True, blank=True)
    
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='created')
    technician_notes = models.TextField(blank=True, null=True)
    service_checklist = models.JSONField(default=list, blank=True, help_text='Service checklist items for work execution')
    estimated_delivery_time = models.DateTimeField(null=True, blank=True)    
    # Timer tracking fields
    allowed_duration_minutes = models.IntegerField(
        null=True, 
        blank=True, 
        help_text='Time allocated for this job in minutes. Defaults to package duration if not set.'
    )
    job_started_at = models.DateTimeField(
        null=True, 
        blank=True, 
        help_text='Timestamp when technician actually started the job'
    )
    # Multi-stage timer warning tracking
    warning_sent = models.BooleanField(
        default=False,
        help_text='Track if 10-minute warning notification has been sent (legacy)'
    )
    warning_15min_sent = models.BooleanField(
        default=False,
        help_text='Track if 15-minute warning has been sent'
    )
    warning_10min_sent = models.BooleanField(
        default=False,
        help_text='Track if 10-minute warning has been sent'
    )
    warning_7min_sent = models.BooleanField(
        default=False,
        help_text='Track if 7-minute warning has been sent'
    )
    warning_5min_sent = models.BooleanField(
        default=False,
        help_text='Track if 5-minute warning has been sent'
    )
    warning_3min_sent = models.BooleanField(
        default=False,
        help_text='Track if 3-minute warning has been sent'
    )
    warning_2min_sent = models.BooleanField(
        default=False,
        help_text='Track if 2-minute warning has been sent'
    )
    warning_1min_sent = models.BooleanField(
        default=False,
        help_text='Track if 1-minute warning has been sent'
    )
    overdue_notification_sent = models.BooleanField(
        default=False,
        help_text='Track if overdue notification has been sent'
    )
    
    # Timer pause/resume and buffer tracking fields
    buffer_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=20.00,
        help_text='Buffer percentage added to service duration (default: 20%)'
    )
    buffer_minutes_allocated = models.IntegerField(
        null=True,
        blank=True,
        help_text='Calculated buffer time in minutes based on buffer_percentage'
    )
    is_timer_paused = models.BooleanField(
        default=False,
        help_text='Whether the timer is currently paused'
    )
    pause_started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when timer was paused'
    )
    total_pause_duration_seconds = models.IntegerField(
        default=0,
        help_text='Total accumulated pause duration in seconds'
    )
    PAUSE_REASON_CHOICES = [
        ('photo_upload', 'Photo Upload'),
        ('qc_review', 'QC Review'),
        ('manual', 'Manual Pause'),
        ('technical_issue', 'Technical Issue'),
    ]
    pause_reason = models.CharField(
        max_length=20,
        choices=PAUSE_REASON_CHOICES,
        null=True,
        blank=True,
        help_text='Reason for current pause'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()

    def save(self, *args, **kwargs):
        """Pre-calculate buffer minutes on save to avoid N+1 queries."""
        # Always recalculate if None or 0 to ensure changes to base duration/percentage are reflected,
        # unless it was explicitly set to a specific value in this session.
        if self.buffer_minutes_allocated is None or self.buffer_minutes_allocated == 0:
            self.buffer_minutes_allocated = self.calculate_buffer_minutes()
        # Always ensure minimum 10-minute buffer even if previously saved as lower
        elif self.buffer_minutes_allocated < 10:
            self.buffer_minutes_allocated = 10
        super().save(*args, **kwargs)
    
    class Meta:
        db_table = 'job_cards'
        verbose_name = 'Job Card'
        verbose_name_plural = 'Job Cards'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"JobCard #{self.id} - Booking #{self.booking.id}"
    
    def transfer_initial_photos(self):
        """
        Transfer initial photos from booking to job card as 'initial' type photos.
        This should be called when the job card is created.
        """
        from django.core.files.base import ContentFile
        import base64
        import uuid
        from io import BytesIO
        from PIL import Image
        import re
        
        # Check if booking has initial photos
        if hasattr(self.booking, 'initial_photos') and self.booking.initial_photos:
            for photo_data in self.booking.initial_photos:
                try:
                    # Check if it's a data URL
                    if isinstance(photo_data, str) and photo_data.startswith('data:image/'):
                        # Extract the format and base64 data
                        # Handle potential HTTP response metadata in the data
                        if 'Request URL' in photo_data or 'HTTP' in photo_data:
                            # Try to extract clean base64 data using regex
                            match = re.search(r'data:image/[^;]+;base64,([A-Za-z0-9+/=]+)', photo_data)
                            if match:
                                header = photo_data[:match.end(1)]
                                base64_data = match.group(1)
                            else:
                                continue  # Skip this photo if we can't extract clean data
                        else:
                            header, base64_data = photo_data.split(',', 1)
                        
                        # Extract image format
                        image_format_match = re.search(r'data:image/([^;]+)', header)
                        if image_format_match:
                            image_format = image_format_match.group(1)
                        else:
                            image_format = 'jpeg'  # Default to jpeg
                        
                        # Decode base64 data
                        image_data = base64.b64decode(base64_data)
                        
                        # Validate that this is actually image data
                        if len(image_data) == 0:
                            continue
                        
                        # Create a file-like object
                        image_file = BytesIO(image_data)
                        try:
                            image = Image.open(image_file)
                            image.verify()  # Verify it's a valid image
                        except Exception:
                            # Not a valid image, skip
                            continue
                        
                        # Reset file pointer after verify
                        image_file.seek(0)
                        image = Image.open(image_file)
                        
                        # Generate filename
                        filename = f"initial_photo_{uuid.uuid4().hex}.{image_format}"
                        
                        # Create Django ContentFile
                        django_file = ContentFile(image_data, name=filename)
                        
                        # Create JobCardPhoto with 'initial' type
                        from .models import JobCardPhoto
                        jc_photo = JobCardPhoto.objects.create(
                            jobcard=self,
                            photo_type='initial',
                            image=django_file
                        )
                        
                        # 🔄 Compress in background — non-blocking
                        try:
                            from .tasks import process_jobcard_photo
                            process_jobcard_photo.delay(jc_photo.id)
                        except Exception:
                            pass  # Task dispatch failure must never break jobcard creation

                    elif isinstance(photo_data, str) and photo_data.startswith('http'):
                        # Handle HTTP URLs - for now we'll skip these as we can't easily transfer them
                        # In a production environment, you might want to download and save these
                        continue
                except Exception as e:
                    # Log error but continue with other photos
                    print(f"Error transferring initial photo: {e}")
                    continue
    
    def get_initial_photos(self):
        """Get initial photos from booking if job card doesn't have them yet."""
        return self.photos.filter(photo_type='initial')

    def get_before_photos(self):
        """Get before photos (includes both job card before photos and initial photos)."""
        before_photos = list(self.photos.filter(photo_type='before'))
        # Also include initial photos as before photos for display purposes
        initial_photos = list(self.photos.filter(photo_type='initial'))
        return before_photos + initial_photos
    
    def get_all_photos(self):
        """Get all photos for the job card."""
        return self.photos.all()
    
    def get_allowed_duration_minutes(self):
        """Get allowed duration, summing across ALL packages + add-ons for accuracy."""
        total_duration = 0

        if self.booking and self.booking.pk:
            # Use the booking's get_packages_list() helper — works for both M2M and legacy FK
            packages = self.booking.get_packages_list()
            for pkg in packages:
                total_duration += pkg.duration

            # Add all add-on durations
            for addon in self.booking.addons.all():
                total_duration += addon.duration

        # If we have a calculated total, use it
        if total_duration > 0:
            return total_duration

        # Otherwise, use explicitly set duration or fallback
        if self.allowed_duration_minutes is not None:
            return self.allowed_duration_minutes

        # Final fallback to 60 minutes
        return 60
    
    def get_elapsed_minutes(self):
        """Calculate elapsed time in minutes since job started (excluding pause time)."""
        # This method now delegates to get_elapsed_work_time for consistency
        # Kept for backward compatibility with existing code
        return self.get_elapsed_work_time()
    
    def get_remaining_minutes(self):
        """Calculate remaining time in minutes including buffer. Returns negative if overdue."""
        if not self.job_started_at or self.status == 'completed':
            return None
        
        # Use effective duration (includes buffer time)
        allowed = self.get_effective_duration()
        elapsed = self.get_elapsed_work_time()
        remaining = allowed - elapsed
        
        return remaining  # Can be negative if overdue
    
    def is_warning_time(self, warning_threshold=5):
        """Check if job is in warning zone (e.g., 5 minutes remaining)."""
        if not self.job_started_at or self.status == 'completed':
            return False
        
        remaining = self.get_remaining_minutes()
        if remaining is None:
            return False
        
        return 0 < remaining <= warning_threshold
    
    def is_overdue(self):
        """Check if job has exceeded allowed duration."""
        if not self.job_started_at or self.status == 'completed':
            return False
        
        remaining = self.get_remaining_minutes()
        if remaining is None:
            return False
        
        return remaining < 0
    
    def get_timer_status(self):
        """Get timer status: 'normal', 'warning', 'overdue', or None if not started."""
        if not self.job_started_at or self.status == 'completed':
            return None
        
        if self.is_overdue():
            return 'overdue'
        elif self.is_warning_time():
            return 'warning'
        else:
            return 'normal'
    
    # Timer Pause/Resume and Buffer Methods
    
    def calculate_buffer_minutes(self):
        """Always return a fixed 10-minute buffer for all job cards.
        This keeps frontend and backend in sync (frontend also uses 10 min hardcoded).
        """
        allowed_duration = self.get_allowed_duration_minutes()
        buffer_minutes = int((allowed_duration * float(self.buffer_percentage)) / 100)
        # return max(10, buffer_minutes)  # Minimum 10 minutes guaranteed
        return 10  # Fixed 10-minute buffer
    
    def get_effective_duration(self):
        """Get effective duration including buffer time (work time + buffer)."""
        base_duration = self.get_allowed_duration_minutes()
        if self.buffer_minutes_allocated is None:
            # Calculate but DO NOT save here to avoid N+1 queries during serialization
            return base_duration + self.calculate_buffer_minutes()
        return base_duration + self.buffer_minutes_allocated
    
    def get_elapsed_work_time(self):
        """Calculate elapsed work time in minutes, excluding pause durations."""
        if not self.job_started_at:
            return 0
        
        # Calculate total elapsed time
        total_elapsed = timezone.now() - self.job_started_at
        total_elapsed_seconds = total_elapsed.total_seconds()
        
        # Subtract pause duration
        work_time_seconds = total_elapsed_seconds - self.total_pause_duration_seconds
        
        # If currently paused, subtract the current pause duration
        if self.is_timer_paused and self.pause_started_at:
            current_pause_duration = (timezone.now() - self.pause_started_at).total_seconds()
            work_time_seconds -= current_pause_duration
        
        return int(work_time_seconds / 60)
    
    def get_remaining_buffer(self):
        """Get remaining buffer time in minutes."""
        buffer_minutes = self.buffer_minutes_allocated
        if buffer_minutes is None:
            # Calculate but DO NOT save here to avoid N+1 queries during serialization
            buffer_minutes = self.calculate_buffer_minutes()
        
        # Calculate how much buffer has been used
        pause_minutes = int(self.total_pause_duration_seconds / 60)
        
        # If currently paused, add current pause duration
        if self.is_timer_paused and self.pause_started_at:
            current_pause_duration = (timezone.now() - self.pause_started_at).total_seconds()
            pause_minutes += int(current_pause_duration / 60)
        
        remaining_buffer = self.buffer_minutes_allocated - pause_minutes
        return max(0, remaining_buffer)  # Don't return negative buffer
    
    def pause_timer(self, reason='manual'):
        """
        Pause the timer with a specified reason.
        
        Args:
            reason: One of 'photo_upload', 'qc_review', 'manual', 'technical_issue'
        
        Returns:
            dict: Status of the pause operation
        """
        if self.is_timer_paused:
            return {
                'success': False,
                'message': 'Timer is already paused',
                'paused_at': self.pause_started_at
            }
        
        if not self.job_started_at:
            return {
                'success': False,
                'message': 'Cannot pause timer - job has not started yet'
            }
        
        # Check if buffer is exhausted
        remaining_buffer = self.get_remaining_buffer()
        if remaining_buffer <= 0:
            return {
                'success': False,
                'message': 'Cannot pause - buffer time exhausted',
                'remaining_buffer': 0
            }
        
        # Pause the timer
        self.is_timer_paused = True
        self.pause_started_at = timezone.now()
        self.pause_reason = reason
        self.save(update_fields=['is_timer_paused', 'pause_started_at', 'pause_reason'])
        
        return {
            'success': True,
            'message': f'Timer paused for {reason}',
            'paused_at': self.pause_started_at,
            'remaining_buffer': remaining_buffer
        }
    
    def resume_timer(self):
        """
        Resume the timer and update total pause duration.
        
        Returns:
            dict: Status of the resume operation
        """
        if not self.is_timer_paused:
            return {
                'success': False,
                'message': 'Timer is not paused'
            }
        
        if not self.pause_started_at:
            return {
                'success': False,
                'message': 'Invalid pause state - no pause start time'
            }
        
        # Calculate pause duration
        pause_duration = timezone.now() - self.pause_started_at
        pause_duration_seconds = int(pause_duration.total_seconds())
        
        # Update total pause duration
        self.total_pause_duration_seconds += pause_duration_seconds
        
        # Clear pause state
        pause_reason = self.pause_reason
        self.is_timer_paused = False
        self.pause_started_at = None
        self.pause_reason = None
        
        self.save(update_fields=[
            'is_timer_paused', 
            'pause_started_at', 
            'pause_reason', 
            'total_pause_duration_seconds'
        ])
        
        return {
            'success': True,
            'message': 'Timer resumed',
            'pause_duration_seconds': pause_duration_seconds,
            'pause_duration_minutes': int(pause_duration_seconds / 60),
            'total_pause_duration_seconds': self.total_pause_duration_seconds,
            'remaining_buffer': self.get_remaining_buffer(),
            'previous_reason': pause_reason
        }


class JobCardPhoto(models.Model):
    """Photos for job cards (before/after/in_progress)."""
    
    PHOTO_TYPE_CHOICES = [
        ('before', 'Before'),
        ('after', 'After'),
        ('in_progress', 'In Progress'),
        ('initial', 'Initial Check-in'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='jobcard_photos',
        null=True,
        blank=True
    )
    
    jobcard = models.ForeignKey(JobCard, on_delete=models.CASCADE, related_name='photos')
    photo_type = models.CharField(max_length=20, choices=PHOTO_TYPE_CHOICES)
    image = models.ImageField(upload_to='jobcard_photos/')
    description = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'job_card_photos'
        verbose_name = 'Job Card Photo'
        verbose_name_plural = 'Job Card Photos'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.photo_type} - JobCard #{self.jobcard.id}"


class PartUsed(models.Model):
    """Parts used during service."""
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='parts_used',
        null=True,
        blank=True
    )
    
    jobcard = models.ForeignKey(JobCard, on_delete=models.CASCADE, related_name='parts_used')
    
    # Link to parts catalog (nullable for backward compatibility with existing records)
    part = models.ForeignKey(
        Part,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='usage_records',
        help_text='Part from catalog (if used)'
    )
    
    # Fallback fields (used when part is not from catalog or for legacy records)
    part_name = models.CharField(
        max_length=200,
        help_text='Part name (auto-filled from catalog or manual entry)'
    )
    quantity = models.IntegerField(default=1)
    
    # Pricing fields
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Selling price per unit (charged to customer)'
    )
    cost_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Cost price per unit (for profit calculation)'
    )
    
    is_service_default = models.BooleanField(
        default=False,
        help_text='True if auto-added from service package config (cost=0 on billing)'
    )
    
    # Track which service package this part belongs to (for multi-service grouping)
    service_package = models.ForeignKey(
        'services.ServicePackage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='parts_used',
        help_text='Service package this part was auto-deducted for'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'parts_used'
        verbose_name = 'Part Used'
        verbose_name_plural = 'Parts Used'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.part_name} x{self.quantity} - JobCard #{self.jobcard.id}"
    
    @property
    def total_price(self):
        """Total selling price (charged to customer)."""
        return self.quantity * self.price
    
    @property
    def total_cost(self):
        """Total cost price (what we paid)."""
        return self.quantity * self.cost_price
    
    @property
    def profit_margin(self):
        """Profit margin for this part usage."""
        return self.total_price - self.total_cost
    
    @property
    def profit_percentage(self):
        """Profit percentage."""
        if self.total_cost == 0:
            return 0
        return (self.profit_margin / self.total_cost) * 100


class QCReport(models.Model):
    """QC Report by Floor Manager (Entry QC)."""
    
    jobcard = models.OneToOneField(JobCard, on_delete=models.CASCADE, related_name='qc_report')
    floor_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='qc_reports',
        limit_choices_to={'role': 'floor_manager'}
    )
    
    # Inspection details
    scratches = models.TextField(blank=True, null=True, help_text='Scratches noted during inspection')
    dents = models.TextField(blank=True, null=True, help_text='Dents noted during inspection')
    before_photos = models.JSONField(default=list, blank=True, help_text='Before photos taken during QC')
    checklist_points = models.JSONField(default=list, blank=True, help_text='Checklist items to be completed')
    required_parts = models.JSONField(default=list, blank=True, help_text='Parts required for the job')
    additional_tasks = models.TextField(blank=True, null=True, help_text='Additional tasks identified (upselling opportunity)')
    additional_tasks_price = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='Estimated price for additional tasks')
    notes = models.TextField(blank=True, null=True)
    
    # Status
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'qc_reports'
        verbose_name = 'QC Report'
        verbose_name_plural = 'QC Reports'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"QC Report - JobCard #{self.jobcard.id}"


class SupervisorReview(models.Model):
    """Supervisor review and approval/rejection of QC."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    jobcard = models.OneToOneField(JobCard, on_delete=models.CASCADE, related_name='supervisor_review')
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='supervisor_reviews',
        limit_choices_to={'role': 'supervisor'}
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    review_notes = models.TextField(blank=True, null=True)
    stock_availability_checked = models.BooleanField(default=False)
    pricing_confirmed = models.BooleanField(default=False)
    rejection_reason = models.TextField(blank=True, null=True, help_text='Reason for rejection if rejected')
    
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'supervisor_reviews'
        verbose_name = 'Supervisor Review'
        verbose_name_plural = 'Supervisor Reviews'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Supervisor Review - JobCard #{self.jobcard.id} - {self.status}"


class FinalQCReport(models.Model):
    """Final QC Report by Supervisor after work completion."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('passed', 'Passed'),
        ('failed', 'Failed'),
    ]
    
    jobcard = models.OneToOneField(JobCard, on_delete=models.CASCADE, related_name='final_qc_report')
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='final_qc_reports',
        limit_choices_to={'role': 'supervisor'}
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    after_photos = models.JSONField(default=list, blank=True, help_text='After photos taken during final QC')
    checklist_verified = models.BooleanField(default=False, help_text='All checklist items verified')
    parts_verified = models.BooleanField(default=False, help_text='Parts used match job card')
    quality_notes = models.TextField(blank=True, null=True)
    issues_found = models.TextField(blank=True, null=True, help_text='Issues found during final QC')
    failure_reason = models.TextField(blank=True, null=True, help_text='Reason for failure if failed')
    
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'final_qc_reports'
        verbose_name = 'Final QC Report'
        verbose_name_plural = 'Final QC Reports'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Final QC - JobCard #{self.jobcard.id} - {self.status}"


class CustomerApproval(models.Model):
    """Customer approval for completed work."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('revision_requested', 'Revision Requested'),
    ]
    
    jobcard = models.OneToOneField(JobCard, on_delete=models.CASCADE, related_name='customer_approval')
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.CASCADE,
        related_name='job_approvals'
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approval_notes = models.TextField(blank=True, null=True)
    revision_notes = models.TextField(blank=True, null=True, help_text='Customer notes for requested revisions')
    photos_viewed = models.BooleanField(default=False)
    tasks_reviewed = models.BooleanField(default=False)
    qc_report_viewed = models.BooleanField(default=False)
    
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customer_approvals'
        verbose_name = 'Customer Approval'
        verbose_name_plural = 'Customer Approvals'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Customer Approval - JobCard #{self.jobcard.id} - {self.status}"


class VehicleDelivery(models.Model):
    """Vehicle delivery/handover tracking."""
    
    jobcard = models.OneToOneField(JobCard, on_delete=models.CASCADE, related_name='delivery')
    delivered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='deliveries',
        help_text='Staff member who delivered the vehicle'
    )
    
    delivery_notes = models.TextField(blank=True, null=True)
    customer_satisfaction_confirmed = models.BooleanField(default=False)
    keys_delivered = models.BooleanField(default=False)
    final_walkthrough_completed = models.BooleanField(default=False)
    
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vehicle_deliveries'
        verbose_name = 'Vehicle Delivery'
        verbose_name_plural = 'Vehicle Deliveries'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Delivery - JobCard #{self.jobcard.id}"


class ApplicatorTask(models.Model):
    """Individual task assignments for applicators."""
    
    jobcard = models.ForeignKey(JobCard, on_delete=models.CASCADE, related_name='applicator_tasks')
    applicator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assigned_tasks',
        limit_choices_to={'role': 'applicator'}
    )
    task_description = models.TextField(help_text='Description of the specific task assigned to this applicator')
    supervisor_notes = models.TextField(blank=True, null=True, help_text='Notes added by supervisor for this task')
    started_at = models.DateTimeField(null=True, blank=True, help_text='When this specific task was started')
    completed_at = models.DateTimeField(null=True, blank=True, help_text='When this specific task was completed')
    is_active = models.BooleanField(default=True, help_text='Whether this task is currently active')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'applicator_tasks'
        verbose_name = 'Applicator Task'
        verbose_name_plural = 'Applicator Tasks'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Task for {self.applicator.name} on JobCard #{self.jobcard.id}"
    
    @property
    def status(self):
        """Return status based on timestamps."""
        if self.completed_at:
            return 'completed'
        elif self.started_at:
            return 'in_progress'
        else:
            return 'assigned'


class JobCardNote(models.Model):
    """Collaborative notes for job cards across all roles."""
    
    NOTE_TYPES = [
        ('internal', 'Internal Note'),
        ('customer', 'Customer Note'),
        ('task', 'Task Note'),
        ('issue', 'Issue/Problem'),
        ('reminder', 'Reminder'),
    ]
    
    jobcard = models.ForeignKey(JobCard, on_delete=models.CASCADE, related_name='notes')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_notes'
    )
    note_type = models.CharField(max_length=20, choices=NOTE_TYPES, default='internal')
    content = models.TextField()
    is_pinned = models.BooleanField(default=False, help_text='Pin important notes to top')
    visible_to_customer = models.BooleanField(default=False, help_text='Show this note to customer')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'job_card_notes'
        verbose_name = 'Job Card Note'
        verbose_name_plural = 'Job Card Notes'
        ordering = ['-is_pinned', '-created_at']
    
    def __str__(self):
        return f"{self.get_note_type_display()} - JobCard #{self.jobcard.id}"


class DynamicTask(models.Model):
    """Dynamic tasks added during job execution (extra customer requests, issues found, etc.)."""
    
    TASK_STATUS = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    jobcard = models.ForeignKey(JobCard, on_delete=models.CASCADE, related_name='dynamic_tasks')
    title = models.CharField(max_length=200)
    description = models.TextField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_dynamic_tasks'
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_dynamic_tasks'
    )
    status = models.CharField(max_length=20, choices=TASK_STATUS, default='pending')
    estimated_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Estimated price for this extra task'
    )
    requires_approval = models.BooleanField(
        default=True,
        help_text='Requires customer approval before execution'
    )
    approved_by_customer = models.BooleanField(default=False)
    approval_date = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'dynamic_tasks'
        verbose_name = 'Dynamic Task'
        verbose_name_plural = 'Dynamic Tasks'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - JobCard #{self.jobcard.id}"


class JobCardActivity(models.Model):
    """Activity log for all job card actions."""
    
    ACTIVITY_TYPES = [
        ('status_change', 'Status Changed'),
        ('note_added', 'Note Added'),
        ('task_added', 'Task Added'),
        ('task_updated', 'Task Updated'),
        ('photo_uploaded', 'Photo Uploaded'),
        ('assignment', 'Team Assignment'),
        ('approval', 'Approval/Rejection'),
        ('qc_completed', 'QC Completed'),
        ('work_started', 'Work Started'),
        ('work_completed', 'Work Completed'),
        ('date_update', 'Booking Date Updated'),
        ('service_update', 'Services/Estimate Updated'),
    ]
    
    jobcard = models.ForeignKey(JobCard, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=30, choices=ACTIVITY_TYPES)
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='performed_activities'
    )
    description = models.TextField()
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional activity data in JSON format'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'job_card_activities'
        verbose_name = 'Job Card Activity'
        verbose_name_plural = 'Job Card Activities'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_activity_type_display()} - JobCard #{self.jobcard.id}"


class RewardSettings(models.Model):
    """Admin-configurable reward and deduction settings"""
    
    # Reward tiers based on early completion
    tier_1_minutes = models.IntegerField(default=15, help_text="Minutes early for tier 1 reward")
    tier_1_amount = models.DecimalField(max_digits=10, decimal_places=2, default=100, help_text="Reward amount for tier 1")
    
    tier_2_minutes = models.IntegerField(default=30, help_text="Minutes early for tier 2 reward")
    tier_2_amount = models.DecimalField(max_digits=10, decimal_places=2, default=200, help_text="Reward amount for tier 2")
    
    tier_3_minutes = models.IntegerField(default=45, help_text="Minutes early for tier 3 reward")
    tier_3_amount = models.DecimalField(max_digits=10, decimal_places=2, default=300, help_text="Reward amount for tier 3")
    
    # Deduction rules for late completion
    deduction_enabled = models.BooleanField(default=True)
    deduction_threshold_minutes = models.IntegerField(default=15, help_text="Minutes late before deduction applies")
    deduction_per_minute = models.DecimalField(max_digits=10, decimal_places=2, default=5, help_text="Deduction amount per minute late")
    max_deduction_per_job = models.DecimalField(max_digits=10, decimal_places=2, default=500, help_text="Maximum deduction per job")
    
    # Applicator distribution settings
    applicator_share_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=50.00,
        help_text="Default percentage of reward to distribute to applicator team (0-100)"
    )
    
    # Deduction applicability - applies to both supervisor and applicators
    apply_deduction_to_applicators = models.BooleanField(
        default=True,
        help_text="Whether deductions also apply to applicator team members"
    )
    
    # Percentage-based reward system
    use_percentage_based_rewards = models.BooleanField(
        default=False,
        help_text="Use percentage of job value instead of fixed amounts"
    )
    
    # Percentage tiers based on job value
    tier_1_job_value_min = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=5000,
        help_text="Minimum job value for tier 1 percentage reward"
    )
    tier_1_reward_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=1.00,
        help_text="Reward percentage for tier 1 (e.g., 1.00 = 1%)"
    )
    
    tier_2_job_value_min = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=10000,
        help_text="Minimum job value for tier 2 percentage reward"
    )
    tier_2_reward_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=1.50,
        help_text="Reward percentage for tier 2 (e.g., 1.50 = 1.5%)"
    )
    
    tier_3_job_value_min = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=12000,
        help_text="Minimum job value for tier 3 percentage reward"
    )
    tier_3_reward_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=1.80,
        help_text="Reward percentage for tier 3 (e.g., 1.80 = 1.8%)"
    )
    
    tier_4_job_value_min = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=15000,
        help_text="Minimum job value for tier 4 percentage reward"
    )
    tier_4_reward_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=2.00,
        help_text="Reward percentage for tier 4 (e.g., 2.00 = 2%)"
    )
    
    # Performance multiplier (optional)
    apply_time_bonus = models.BooleanField(
        default=True,
        help_text="Apply additional bonus percentage for time saved"
    )
    time_bonus_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.50,
        help_text="Additional percentage for every 15 minutes saved (e.g., 0.50 = 0.5%)"
    )
    time_bonus_interval_minutes = models.IntegerField(
        default=15,
        help_text="Time interval in minutes for applying bonus (default: 15 min)"
    )
    
    # Settings metadata
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reward_settings',
        help_text=(
            "Company this setting belongs to. "
            "NULL = true global default (super_admin only)."
        )
    )
    branch = models.ForeignKey(
        'branches.Branch',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text=(
            "Branch-specific override. NULL = applies to all branches in the company. "
            "When both company and branch are set, this is a branch-level override."
        )
    )
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reward_settings'
        verbose_name = 'Reward Settings'
        verbose_name_plural = 'Reward Settings'
        ordering = ['-created_at']
        # Enforce one setting per company+branch combination
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'branch'],
                name='unique_reward_settings_per_company_branch',
            )
        ]

    def __str__(self):
        if self.branch:
            return f"Reward Settings - {self.branch.name} ({self.company or 'Global'})"
        elif self.company:
            return f"Reward Settings - {self.company.name} (Company Default)"
        return "Reward Settings - Global Default"


class SupervisorReward(models.Model):
    """Track supervisor and applicator rewards/deductions per job"""
    
    TRANSACTION_TYPE_CHOICES = [
        ('reward', 'Reward'),
        ('deduction', 'Deduction'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
    ]
    
    jobcard = models.ForeignKey(
        JobCard,
        on_delete=models.CASCADE,
        related_name='rewards'
    )
    
    # Recipient (supervisor or applicator)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_rewards'
    )
    
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Calculation details
    allowed_duration_minutes = models.IntegerField(help_text="Allowed job duration")
    actual_duration_minutes = models.IntegerField(help_text="Actual job duration")
    time_difference_minutes = models.IntegerField(help_text="Difference (negative = early, positive = late)")
    
    # Reward tier or deduction reason
    tier = models.CharField(max_length=50, blank=True, null=True, help_text="Reward tier (tier_1, tier_2, tier_3)")
    calculation_notes = models.TextField(blank=True, null=True)
    
    # Supervisor-defined split percentage (for applicators)
    split_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Custom split percentage for this applicator (overrides default)"
    )
    
    # Applicator distribution
    is_applicator_share = models.BooleanField(default=False, help_text="True if this is an applicator's share")
    supervisor_reward = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='applicator_shares',
        help_text="Reference to supervisor's reward if this is an applicator share"
    )
    
    # Status and approval
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_rewards'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Payroll integration
    payroll = models.ForeignKey(
        'accounting.Payroll',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rewards'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'supervisor_rewards'
        verbose_name = 'Supervisor Reward'
        verbose_name_plural = 'Supervisor Rewards'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'status']),
            models.Index(fields=['jobcard', 'transaction_type']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_transaction_type_display()} - {self.recipient.name} - ₹{self.amount}"

