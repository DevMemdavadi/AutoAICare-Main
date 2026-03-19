from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .validators import validate_phone_number

User = get_user_model()
class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile (customer use)."""
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    branch_code = serializers.CharField(source='branch.code', read_only=True)
    phone = serializers.CharField(required=False, validators=[validate_phone_number], help_text='Phone number should be exactly 10 digits')
    
    class Meta:
        model = User
        fields = ('name', 'phone', 'branch', 'branch_name', 'branch_code')
        # Email is excluded from update to prevent unique constraint issues
    
    def update(self, instance, validated_data):
        """Update user profile fields."""
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    branch_code = serializers.CharField(source='branch.code', read_only=True)
    is_email_verified = serializers.BooleanField(source='is_verified', read_only=True)
    company_id = serializers.IntegerField(source='company.id', read_only=True, allow_null=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'name', 'phone', 'role', 'branch', 'branch_name', 'branch_code', 'company_id', 'is_active', 'is_verified', 'is_email_verified', 'date_joined')
        read_only_fields = ('id', 'role', 'is_active', 'is_verified', 'date_joined')  # Role is read-only for profile updates


class UserListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list view - minimal data for faster response."""
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'name', 'phone', 'role', 'branch', 'branch_name', 'is_active', 'date_joined')


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    phone = serializers.CharField(required=False, validators=[validate_phone_number], help_text='Phone number should be exactly 10 digits')
    
    class Meta:
        model = User
        fields = ('email', 'name', 'phone', 'password', 'password2', 'role', 'branch', 'is_active')
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password2": "Password fields didn't match."})
        
        # Check if the request is from an authenticated branch_admin/staff
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            # Branch admin can create any role
            pass
        else:
            # Public registration - only allow customer role
            if attrs.get('role') and attrs['role'] not in ['customer']:
                attrs['role'] = 'customer'
        
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        
        # Set company from current context if not provided
        if 'company' not in validated_data:
            from companies.middleware import get_current_company
            current_company = get_current_company()
            if current_company:
                validated_data['company'] = current_company
                
        user = User.objects.create_user(**validated_data)
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT token serializer with additional user info.
    Supports login with either email or phone number."""
    
    def validate(self, attrs):
        # Get the identifier from email field (can be email or phone)
        identifier = attrs.get('email', '').strip()
        
        if not identifier:
            raise serializers.ValidationError({
                'email': 'Email or phone number is required.'
            })
        
        # Try to find user by email first
        user = None
        if '@' in identifier:
            # Looks like an email, try email lookup first
            try:
                user = User.objects.get(email=identifier)
            except User.DoesNotExist:
                # If not found by email, also try phone (in case of edge cases)
                try:
                    user = User.objects.get(phone=identifier)
                    attrs['email'] = user.email
                except User.DoesNotExist:
                    pass
        else:
            # Doesn't look like email, try phone lookup
            try:
                user = User.objects.get(phone=identifier)
                # Replace phone with email for JWT authentication
                attrs['email'] = user.email
            except User.DoesNotExist:
                # If not found by phone, also try email (in case phone format was entered as email)
                try:
                    user = User.objects.get(email=identifier)
                except User.DoesNotExist:
                    pass
        
        # If user not found, let parent class handle the error
        # The parent will raise appropriate authentication error
        if not user:
            attrs['email'] = identifier
        else:
            # Multi-tenancy check: Ensure user belongs to the current company context
            # Exempt super_admin from this restriction
            if user.role != 'super_admin':
                from companies.middleware import get_current_company
                current_company = get_current_company()
                
                if current_company and user.company:
                    if user.company.id != current_company.id:
                        raise serializers.ValidationError({
                            'detail': f'Access denied. You are trying to login to {current_company.name} but your account belongs to {user.company.name}. Please use your correct subdomain.'
                        })
                elif current_company and not user.company:
                    # User has no company but is trying to login to a specific company domain
                    raise serializers.ValidationError({
                        'detail': f'Access denied. This account is not associated with {current_company.name}.'
                    })
        
        # Call parent validate which will authenticate with password
        data = super().validate(attrs)
        
        # Add custom claims
        data['user'] = UserSerializer(self.user).data
        
        return data


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change."""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password2 = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    """Serializer for forgot password request."""
    email = serializers.EmailField(required=True)


class ResetPasswordSerializer(serializers.Serializer):
    """Serializer for password reset."""
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True, max_length=6)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password2 = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return attrs


class SendOTPSerializer(serializers.Serializer):
    """Serializer for sending OTP."""
    email = serializers.EmailField(required=True)


class VerifyOTPSerializer(serializers.Serializer):
    """Serializer for OTP verification."""
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True, max_length=6)


class StaffCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating staff/admin users."""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    
    class Meta:
        model = User
        fields = ('email', 'name', 'phone', 'role', 'branch', 'password')
    
    def validate_role(self, value):
        """Only allow branch_admin/floor_manager/supervisor/applicator roles."""
        if value not in ['branch_admin', 'floor_manager', 'supervisor', 'applicator']:
            raise serializers.ValidationError("Role must be either 'branch_admin', 'floor_manager', 'supervisor', or 'applicator'.")
        return value
    
    def validate(self, data):
        """Validate that branch is provided for staff roles."""
        # Check if branch is required but not provided
        if data.get('role') in ['branch_admin', 'floor_manager', 'supervisor', 'applicator']:
            if not data.get('branch'):
                raise serializers.ValidationError({
                    'branch': ['Please select a branch']
                })
        return data
    
    def create(self, validated_data):
        """Create staff user with is_staff flag."""
        user = User.objects.create_user(**validated_data)
        user.is_staff = True
        user.is_verified = True  # Auto-verify staff
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user details (admin use)."""
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    branch_code = serializers.CharField(source='branch.code', read_only=True)
    phone = serializers.CharField(required=False, validators=[validate_phone_number], help_text='Phone number should be exactly 10 digits')
    
    class Meta:
        model = User
        fields = ('id', 'email', 'name', 'phone', 'role', 'branch', 'branch_name', 'branch_code', 'is_active', 'is_verified', 'password', 'date_joined')
        read_only_fields = ('id', 'date_joined')
    
    def update(self, instance, validated_data):
        """Update user with optional password change."""
        password = validated_data.pop('password', None)
        
        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Update password if provided
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance
