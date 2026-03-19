from django.db import models
from decimal import Decimal
from customers.models import Customer, Vehicle
from services.models import ServicePackage, AddOn
from companies.managers import CompanyManager


class Booking(models.Model):
    """Booking model for service appointments with vehicle-type pricing."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('vehicle_arrived', 'Vehicle Arrived'),
        ('assigned_to_fm', 'Assigned to FM'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        # Job card synchronized statuses (aligned with workflow)
        ('qc_pending', 'QC Pending'),
        ('qc_completed', 'QC Completed'),
        ('qc_rejected', 'QC Rejected'),
        ('supervisor_approved', 'Supervisor Approved'),
        ('supervisor_rejected', 'Supervisor Rejected'),
        ('floor_manager_confirmed', 'FM Confirmed'),
        ('assigned_to_applicator', 'Assigned to Applicator'),
        ('work_in_progress', 'Work in Progress'),
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
    
    VEHICLE_TYPE_CHOICES = [
        ('hatchback', 'Hatchback'),
        ('sedan', 'Sedan'),
        ('suv', 'SUV'),
        ('bike', 'Bike'),
    ]
    
    # Multi-tenancy
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='bookings',
        null=True,  # Temporary for migration
        blank=True
    )
    
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='bookings')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='bookings')
    # Legacy single-package FK (kept for backward compatibility during migration)
    primary_package = models.ForeignKey(
        ServicePackage,
        on_delete=models.PROTECT,
        related_name='primary_bookings',
        null=True,
        blank=True,
        help_text='Deprecated: use packages M2M instead'
    )
    # New: multiple services per booking
    packages = models.ManyToManyField(
        ServicePackage,
        blank=True,
        related_name='bookings',
        help_text='One or more service packages for this booking'
    )
    addons = models.ManyToManyField(AddOn, blank=True, related_name='bookings')

    @property
    def package(self):
        """Backward-compatible alias for primary_package.
        
        All existing code that does `booking.package` continues to work.
        NOTE: Cannot be used inside select_related() — use 'primary_package' there.
        """
        return self.primary_package

    branch = models.ForeignKey('branches.Branch', on_delete=models.CASCADE, related_name='bookings', null=True, blank=True)
    coupon = models.ForeignKey('memberships.Coupon', on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings')
    
    # Vehicle type for pricing
    vehicle_type = models.CharField(
        max_length=20, 
        choices=VEHICLE_TYPE_CHOICES,
        default='sedan',
        help_text='Vehicle type for determining service price'
    )
    
    booking_datetime = models.DateTimeField(db_index=True)
    assigned_bay = models.ForeignKey(
        'branches.ServiceBay', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='bookings',
        help_text='Physical bay assigned for this service'
    )
    status = models.CharField(max_length=35, choices=STATUS_CHOICES, default='pending', db_index=True)
    
    pickup_required = models.BooleanField(default=False)
    location = models.TextField(blank=True, null=True, help_text='Pickup/Service location')
    
    # Pricing breakdown
    subtotal = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text='Sum of service + addons before GST'
    )
    gst_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text='Total GST amount'
    )
    discount_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text='Discount applied (from coupons, membership, etc.)'
    )
    total_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text='Final price after GST and discounts'
    )
    
    # Vehicle check-in fields
    vehicle_arrived_at = models.DateTimeField(null=True, blank=True, help_text='Timestamp when vehicle arrived at branch')
    checked_in_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='checked_in_bookings', help_text='Staff member who checked in the vehicle')
    initial_photos = models.JSONField(default=list, blank=True, help_text='Initial vehicle photos taken at check-in')
    initial_damages = models.TextField(blank=True, null=True, help_text='Minor damages noted at check-in')
    check_in_notes = models.TextField(blank=True, null=True, help_text='Notes from check-in process')
    
    # Additional info
    notes = models.TextField(blank=True, null=True)
    
    # Referral tracking
    referral_code_used = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text='Referral code used for this booking (only for first booking)'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use company-aware manager
    objects = CompanyManager()
    
    class Meta:
        db_table = 'bookings'
        verbose_name = 'Booking'
        verbose_name_plural = 'Bookings'
        ordering = ['-booking_datetime']
    
    def __str__(self):
        return f"Booking #{self.id} - {self.customer.user.name} - {self.status}"
    
    def get_packages_list(self):
        """Return list of packages (from M2M). Falls back to primary_package if M2M is empty."""
        if self.pk:
            pkg_list = list(self.packages.all())
            if pkg_list:
                return pkg_list
        # Fallback for legacy records
        if self.primary_package:
            return [self.primary_package]
        return []

    def calculate_prices(self, addons=None):
        """
        Calculate subtotal, GST, and total price based on vehicle type.
        Sums across ALL packages in the M2M relationship.
        Returns tuple: (subtotal, gst_amount, total_price)
        """
        from decimal import Decimal
        subtotal = Decimal('0')
        gst_total = Decimal('0')

        # Sum price + GST across all packages
        pkg_list = self.get_packages_list()
        for pkg in pkg_list:
            package_price = pkg.get_price_for_vehicle_type(self.vehicle_type)
            package_gst = pkg.calculate_gst(package_price)
            subtotal += package_price
            gst_total += package_gst

        # Calculate add-ons
        # Only access self.addons.all() if the booking has been saved (has a pk)
        if addons is not None:
            addon_list = addons
        elif self.pk:
            addon_list = self.addons.all()
        else:
            addon_list = []  # New booking without addons yet

        for addon in addon_list:
            subtotal += addon.price
            gst_total += addon.calculate_gst()

        # Calculate discount from coupon if linked (only if not already set by admin)
        if self.coupon and self.discount_amount == 0:
            # Discount applied to full subtotal across all packages
            self.discount_amount = self.coupon.calculate_discount(subtotal)

        # Calculate discount from referral if code used (only if not already set by admin)
        elif self.referral_code_used and self.discount_amount == 0:
            try:
                from config.models import ReferralSettings
                settings = ReferralSettings.load()
                referral_discount = settings.calculate_referee_reward(subtotal)
                self.discount_amount = referral_discount
            except Exception:
                pass

        # Ensure discount_amount is Decimal to avoid TypeError when value comes
        # from JSON request data (which deserialises numbers as float)
        discount = Decimal(str(self.discount_amount)) if not isinstance(self.discount_amount, Decimal) else self.discount_amount

        # Calculate final total
        total = subtotal + gst_total - discount
        
        return subtotal, gst_total, total
    
    def calculate_total_price(self, addons=None):
        """Calculate total price including package and add-ons with GST."""
        _, _, total = self.calculate_prices(addons)
        return total
    
    def save(self, *args, **kwargs):
        """Override save to calculate price breakdown."""
        # Check if addons were passed in kwargs
        addons = kwargs.pop('addons', None)
        skip_calculation = kwargs.pop('skip_calculation', False)
        
        # Only calculate prices if not already set and not skipping
        if not skip_calculation and (not self.total_price or self.total_price == 0):
            if not self.pk:  # New booking
                self.subtotal, self.gst_amount, self.total_price = self.calculate_prices(addons)
            else:
                # For existing bookings, recalculate
                self.subtotal, self.gst_amount, self.total_price = self.calculate_prices()
        
        super().save(*args, **kwargs)
    
    def get_price_breakdown(self):
        """Get detailed price breakdown for display (per-package line items)."""
        # Always calculate to ensure accuracy for older records
        calc_subtotal, calc_gst_amount, calc_total_price = self.calculate_prices()

        packages_breakdown = []
        for pkg in self.get_packages_list():
            package_price = pkg.get_price_for_vehicle_type(self.vehicle_type)
            package_gst = pkg.calculate_gst(package_price)
            packages_breakdown.append({
                'id': pkg.id,
                'name': pkg.name,
                'category': pkg.category,
                'duration': pkg.duration,
                'price': str(package_price),
                'gst_rate': str(pkg.gst_rate) if pkg.gst_applicable else '0',
                'gst_amount': str(package_gst),
                'total': str(package_price + package_gst),
            })

        breakdown = {
            'packages': packages_breakdown,
            # Keep legacy 'package' key (first package) for backward compat
            'package': packages_breakdown[0] if packages_breakdown else None,
            'addons': [],
            'subtotal': str(calc_subtotal),
            'gst_amount': str(calc_gst_amount),
            'discount_amount': str(self.discount_amount),
            'total_price': str(calc_total_price),
        }

        # Get addons from the relationship
        for addon in self.addons.all():
            addon_gst = addon.calculate_gst()
            breakdown['addons'].append({
                'name': addon.name,
                'price': str(addon.price),
                'duration': addon.duration,
                'gst_rate': str(addon.gst_rate) if addon.gst_applicable else '0',
                'gst_amount': str(addon_gst),
                'total': str(addon.price + addon_gst),
            })

        return breakdown
    
    @property
    def price_breakdown(self):
        """Property to access price breakdown."""
        return self.get_price_breakdown()

    @property
    def has_jobcard(self):
        """Check if this booking has an associated job card."""
        try:
            return hasattr(self, 'jobcard') and self.jobcard is not None
        except:
            return False

