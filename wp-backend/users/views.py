# users/views.py
from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .models import UserProfile, Address, UserPreferences, ContactMessage, DistributorEnquiry
from .serializers import (
    UserSerializer, UserCreateSerializer, UserDetailSerializer,
    UserProfileSerializer, AddressSerializer, UserPreferencesSerializer,
    ContactMessageSerializer, DistributorEnquirySerializer,
    ForgotPasswordSerializer, ResetPasswordSerializer, ChangePasswordSerializer
)

User = get_user_model()

class APIResponseMixin:
    """
    A mixin providing methods for generating consistent API responses.

    Attributes:
        None
    """
    def success_response(self, data=None, message='Success!!', status_code=status.HTTP_200_OK):
        """
        Generate a success response.

        Args:
            data (any, optional): The data to include in the response. Defaults to None.
            message (str, optional): The message to include in the response. Defaults to 'Success'.
            status_code (int, optional): The HTTP status code. Defaults to status.HTTP_200_OK.

        Returns:
            Response: A DRF Response object containing the success response.
        """
        response = {
            'status': 'success',
            'message': message,
            'data': data if data is not None else {}
        }
        return Response(response, status=status_code)

    def error_response(self, message='An error occurred', status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, error=None):
        """
        Generate an error response.

        Args:
            message (str, optional): The error message to include in the response. Defaults to 'An error occurred'.
            status_code (int, optional): The HTTP status code. Defaults to status.HTTP_500_INTERNAL_SERVER_ERROR.
            error (any, optional): Details about the error. Defaults to None.

        Returns:
            Response: A DRF Response object containing the error response.
        """
        response = {
            'status': 'error',
            'message': message,
            'error': error if error else {}
        }
        return Response(response, status=status_code)

class UserViewSet(APIResponseMixin, viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['retrieve', 'me']:
            return UserDetailSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = self.perform_create(serializer)
            # Send password setup email if password was generated
            if hasattr(user, '_password_generated') and user._password_generated:
                from django.contrib.auth.tokens import default_token_generator
                from django.core.mail import send_mail
                from django.urls import reverse
                from django.utils.http import urlsafe_base64_encode
                from django.utils.encoding import force_bytes
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                # You may want to customize this URL to point to your frontend
                reset_url = request.build_absolute_uri(
                    reverse('password_reset_confirm', kwargs={'uidb64': uid, 'token': token})
                )
                send_mail(
                    'Set your password for Yogi Sarbat',
                    f'Welcome! Please set your password here: {reset_url}',
                    'no-reply@yogisarbat.com',
                    [user.email],
                    fail_silently=True,
                )
            return self.success_response(
                data=serializer.data,
                message='User created successfully',
                status_code=status.HTTP_201_CREATED
            )
        return self.error_response(
            message='Failed to create user',
            error=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(
            data=serializer.data,
            message='Users retrieved successfully'
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return self.success_response(
            data=serializer.data,
            message='User details retrieved successfully'
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if serializer.is_valid():
            self.perform_update(serializer)
            return self.success_response(
                data=serializer.data,
                message='User updated successfully'
            )
        return self.error_response(
            message='Failed to update user',
            error=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return self.success_response(
                message='User deleted successfully',
                status_code=status.HTTP_204_NO_CONTENT
            )
        except Exception as e:
            return self.error_response(
                message='Failed to delete user',
                error=str(e)
            )

    @action(detail=False, methods=['get', 'put', 'patch'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return self.success_response(
            data=serializer.data,
            message='Current user details retrieved successfully'
        )

class CustomTokenObtainPairView(APIResponseMixin, TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            if serializer.is_valid():
                return self.success_response(
                    data=serializer.validated_data,
                    message='Login successful',
                    status_code=status.HTTP_200_OK
                )
            return self.error_response(
                message='Invalid credentials',
                error=serializer.errors,
                status_code=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            return self.error_response(
                message='Login failed',
                error=str(e)
            )

class LogoutView(APIResponseMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return self.error_response(
                    message='Refresh token is required',
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            return self.success_response(
                message='Successfully logged out',
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return self.error_response(
                message='Invalid token',
                error=str(e),
                status_code=status.HTTP_400_BAD_REQUEST
            )

class UserProfileViewSet(APIResponseMixin, viewsets.ModelViewSet):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserProfile.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(data=serializer.data, message="User profiles retrieved successfully.")

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return self.success_response(data=serializer.data, message="User profile retrieved successfully.")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return self.success_response(data=serializer.data, message="User profile created successfully.", status_code=status.HTTP_201_CREATED)
        return self.error_response(message="Failed to create user profile.", error=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if serializer.is_valid():
            self.perform_update(serializer)
            return self.success_response(data=serializer.data, message="User profile updated successfully.")
        return self.error_response(message="Failed to update user profile.", error=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return self.success_response(message="User profile deleted successfully.", status_code=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return self.error_response(message="Failed to delete user profile.", error=str(e), status_code=status.HTTP_400_BAD_REQUEST)

class AddressViewSet(APIResponseMixin, viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(data=serializer.data, message="Addresses retrieved successfully.")

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return self.success_response(data=serializer.data, message="Address retrieved successfully.")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return self.success_response(data=serializer.data, message="Address created successfully.", status_code=status.HTTP_201_CREATED)
        return self.error_response(message="Failed to create address.", error=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if serializer.is_valid():
            self.perform_update(serializer)
            return self.success_response(data=serializer.data, message="Address updated successfully.")
        return self.error_response(message="Failed to update address.", error=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return self.success_response(message="Address deleted successfully.", status_code=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return self.error_response(message="Failed to delete address.", error=str(e), status_code=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        address = self.get_object()
        address.is_default = True
        address.save()
        serializer = self.get_serializer(address)
        return self.success_response(data=serializer.data, message="Address set as default successfully.")

class UserPreferencesViewSet(APIResponseMixin, viewsets.ModelViewSet):
    serializer_class = UserPreferencesSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserPreferences.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_object(self):
        preferences, created = UserPreferences.objects.get_or_create(user=self.request.user)
        return preferences

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(data=serializer.data, message="User preferences retrieved successfully.")

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return self.success_response(data=serializer.data, message="User preferences retrieved successfully.")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return self.success_response(data=serializer.data, message="User preferences created successfully.", status_code=status.HTTP_201_CREATED)
        return self.error_response(message="Failed to create user preferences.", error=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if serializer.is_valid():
            self.perform_update(serializer)
            return self.success_response(data=serializer.data, message="User preferences updated successfully.")
        return self.error_response(message="Failed to update user preferences.", error=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return self.success_response(message="User preferences deleted successfully.", status_code=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return self.error_response(message="Failed to delete user preferences.", error=str(e), status_code=status.HTTP_400_BAD_REQUEST)

# CustomTokenRefreshView at the end
class CustomTokenRefreshView(APIResponseMixin, TokenRefreshView):
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            if serializer.is_valid():
                return self.success_response(
                    data=serializer.validated_data,
                    message='Token refreshed successfully',
                    status_code=status.HTTP_200_OK
                )
            return self.error_response(
                message='Invalid refresh token',
                error=serializer.errors,
                status_code=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            return self.error_response(
                message='Token refresh failed',
                error=str(e)
            )

class ContactMessageCreateView(APIResponseMixin, generics.CreateAPIView):
    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageSerializer
    permission_classes = [permissions.AllowAny]

class DistributorEnquiryCreateView(APIResponseMixin, generics.CreateAPIView):
    queryset = DistributorEnquiry.objects.all()
    serializer_class = DistributorEnquirySerializer
    permission_classes = [permissions.AllowAny]

# Optionally, for admin listing (not exposed to public):
class ContactMessageListView(APIResponseMixin, generics.ListAPIView):
    queryset = ContactMessage.objects.all().order_by('-created_at')
    serializer_class = ContactMessageSerializer
    # permission_classes = [permissions.AllowAny]
    permission_classes = [permissions.IsAdminUser]

class DistributorEnquiryListView(APIResponseMixin, generics.ListAPIView):
    queryset = DistributorEnquiry.objects.all().order_by('-created_at')
    serializer_class = DistributorEnquirySerializer
    permission_classes = [permissions.IsAdminUser]
    # permission_classes = [permissions.AllowAny]

# Password Reset Views
class ForgotPasswordView(APIResponseMixin, APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            try:
                user = User.objects.get(email=email)
                if not user.pk:
                    import logging
                    logging.error(f"[ForgotPassword] User object for {email} has no primary key!")
                    return self.error_response(
                        message='User account error. Please contact support.',
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                # Generate password reset token
                from django.contrib.auth.tokens import default_token_generator
                from django.utils.http import urlsafe_base64_encode
                from django.utils.encoding import force_bytes
                from django.conf import settings
                from django.template.loader import render_to_string
                from django.utils.html import strip_tags
                from django.core.mail import send_mail
                import logging
                
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"
                html_message = render_to_string('password_reset_email.html', {
                    'user': user,
                    'reset_url': reset_url
                })
                plain_message = strip_tags(html_message)
                subject = 'Password Reset Request - Yogi Sarbat'
                send_mail(
                    subject,
                    plain_message,
                    getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@yogisarbat.com'),
                    [user.email],
                    fail_silently=False,
                    html_message=html_message
                )
                logging.info(f"[ForgotPassword] Password reset email sent to {user.email} (uidb64={uid})")
                return self.success_response(
                    message='Password reset email sent successfully. Please check your email.',
                    status_code=status.HTTP_200_OK
                )
            except User.DoesNotExist:
                import logging
                logging.warning(f"[ForgotPassword] Password reset requested for non-existent email: {email}")
                return self.error_response(
                    message='No user found with this email address.',
                    status_code=status.HTTP_404_NOT_FOUND
                )
            except Exception as e:
                import logging
                logging.error(f"[ForgotPassword] Error for {email}: {e}")
                return self.error_response(
                    message='Failed to send password reset email.',
                    error=str(e),
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return self.error_response(
            message='Invalid email address.',
            error=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )

class ResetPasswordView(APIResponseMixin, APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            try:
                from django.contrib.auth.tokens import default_token_generator
                from django.utils.http import urlsafe_base64_decode
                from django.utils.encoding import force_str
                
                uidb64 = serializer.validated_data['uidb64']
                token = serializer.validated_data['token']
                new_password = serializer.validated_data['new_password']
                
                # Decode user ID
                try:
                    uid = force_str(urlsafe_base64_decode(uidb64))
                    user = User.objects.get(pk=uid)
                except (TypeError, ValueError, OverflowError, User.DoesNotExist):
                    user = None
                
                if user is not None and default_token_generator.check_token(user, token):
                    # Set new password
                    user.set_password(new_password)
                    user.save()
                    
                    return self.success_response(
                        message='Password reset successfully. You can now login with your new password.',
                        status_code=status.HTTP_200_OK
                    )
                else:
                    return self.error_response(
                        message='Invalid or expired reset link.',
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
                    
            except Exception as e:
                return self.error_response(
                    message='Failed to reset password.',
                    error=str(e),
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return self.error_response(
            message='Invalid data provided.',
            error=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )

class ChangePasswordView(APIResponseMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = request.user
                old_password = serializer.validated_data['old_password']
                new_password = serializer.validated_data['new_password']
                
                # Check if old password is correct
                if not user.check_password(old_password):
                    return self.error_response(
                        message='Current password is incorrect.',
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
                
                # Set new password
                user.set_password(new_password)
                user.save()
                
                return self.success_response(
                    message='Password changed successfully. Please login again with your new password.',
                    status_code=status.HTTP_200_OK
                )
                
            except Exception as e:
                return self.error_response(
                    message='Failed to change password.',
                    error=str(e),
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return self.error_response(
            message='Invalid data provided.',
            error=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )

class ValidateResetTokenView(APIResponseMixin, APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        uidb64 = request.data.get('uidb64')
        token = request.data.get('token')
        
        if not uidb64 or not token:
            return self.error_response(
                message='Token and UID are required.',
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from django.contrib.auth.tokens import default_token_generator
            from django.utils.http import urlsafe_base64_decode
            from django.utils.encoding import force_str
            
            # Decode user ID
            try:
                uid = force_str(urlsafe_base64_decode(uidb64))
                user = User.objects.get(pk=uid)
            except (TypeError, ValueError, OverflowError, User.DoesNotExist):
                user = None
            
            if user is not None and default_token_generator.check_token(user, token):
                return self.success_response(
                    message='Token is valid.',
                    status_code=status.HTTP_200_OK
                )
            else:
                return self.error_response(
                    message='Invalid or expired reset link.',
                    status_code=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            return self.error_response(
                message='Failed to validate token.',
                error=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        