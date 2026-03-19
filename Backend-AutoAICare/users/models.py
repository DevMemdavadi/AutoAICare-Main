from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from .validators import validate_phone_number


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication."""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and return a regular user."""
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        # Explicitly call full_clean to trigger validation including custom validators
        user.full_clean()
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and return a superuser."""
        extra_fields.setdefault('role', 'super_admin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_verified', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        # Create user through create_user method which will trigger validation
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom User model with email as username."""
    
    ROLE_CHOICES = [
        ('super_admin', 'Super Admin'),
        ('company_admin', 'Company Admin'),
        ('branch_admin', 'Branch Admin'),
        ('floor_manager', 'Floor Manager'),
        ('supervisor', 'Supervisor'),
        ('applicator', 'Applicator'),
        ('customer', 'Customer'),
    ]
    
    email = models.EmailField(unique=True, max_length=255)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=15, blank=True, null=True, validators=[validate_phone_number])
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    
    # Multi-tenancy: Link user to company
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        null=True,  # Null for migration - will be required later
        blank=True,
        related_name='users',
        help_text='Company/Organization this user belongs to'
    )
    
    branch = models.ForeignKey('branches.Branch', on_delete=models.SET_NULL, null=True, blank=True, help_text='Branch assignment for branch_admin/floor_manager/supervisor')
    
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    
    # CRM Fields
    birthday = models.DateField(null=True, blank=True)
    anniversary = models.DateField(null=True, blank=True)
    
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)
    
    # OTP fields for verification
    otp = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(null=True, blank=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']
    
    def __str__(self):
        return self.email
    
    def get_full_name(self):
        return self.name
    
    def get_short_name(self):
        return self.name.split()[0] if self.name else self.email
