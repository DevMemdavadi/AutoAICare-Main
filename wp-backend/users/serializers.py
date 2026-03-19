# users/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import UserProfile, Address, UserPreferences, ContactMessage, DistributorEnquiry

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'phone', 'role', 'created_at')
        read_only_fields = ('id', 'created_at')

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=False)
    full_name = serializers.CharField(max_length=255, required=True)
    phone = serializers.CharField(max_length=15, required=False)
    email = serializers.EmailField(required=True)
    username = serializers.CharField(required=False, allow_blank=True)  # Make username optional
    role = serializers.ChoiceField(choices=['admin', 'employee', 'customer'], default='customer', required=False)
    password_generated = False  # Will be set in create

    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'username', 'password', 'confirm_password', 'phone', 'role')

    def validate(self, attrs):
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')
        if password or confirm_password:
            if password != confirm_password:
                raise serializers.ValidationError({"password": "Password fields didn't match."})
        
        # Check if email already exists
        email = attrs.get('email')
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})
        
        # Generate username from email if not provided
        if not attrs.get('username'):
            email = attrs.get('email')
            username = email.split('@')[0]
            # Ensure username is unique
            counter = 1
            original_username = username
            while User.objects.filter(username=username).exists():
                username = f"{original_username}{counter}"
                counter += 1
            attrs['username'] = username
        
        return attrs

    def create(self, validated_data):
        import secrets, string
        password = validated_data.pop('password', None)
        confirm_password = validated_data.pop('confirm_password', None)
        phone = validated_data.pop('phone', '')
        role = validated_data.pop('role', 'customer')
        full_name = validated_data.pop('full_name', '')
        password_generated = False
        if not password:
            password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
            password_generated = True
        user = User.objects.create_user(password=password, **validated_data)
        user.phone = phone
        user.role = role
        user.full_name = full_name
        user.save()
        # Attach flag for view
        user._password_generated = password_generated
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ('id', 'full_name', 'phone', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ('id', 'full_name', 'address_line1', 'address_line2', 'city', 'state', 
                 'postal_code', 'country', 'phone', 'label', 'is_default', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

class UserPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreferences
        fields = ('id', 'order_updates', 'promotional_emails', 'sms_notifications',
                 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

class UserDetailSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    addresses = AddressSerializer(many=True, read_only=True)
    preferences = UserPreferencesSerializer(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'phone', 'role', 'created_at',
                 'profile', 'addresses', 'preferences')
        read_only_fields = ('id', 'created_at', 'role')

class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = '__all__'
        read_only_fields = ('created_at',)

class DistributorEnquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = DistributorEnquiry
        fields = '__all__'
        read_only_fields = ('created_at',)

# Password Reset Serializers
class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user found with this email address.")
        return value

class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    uidb64 = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        new_password = attrs.get('new_password')
        confirm_password = attrs.get('confirm_password')
        
        if new_password != confirm_password:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        
        return attrs

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        new_password = attrs.get('new_password')
        confirm_password = attrs.get('confirm_password')
        
        if new_password != confirm_password:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        
        return attrs 
        