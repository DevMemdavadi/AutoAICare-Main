from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from config.permissions import IsStaff

from .serializers import (
    UserSerializer,
    UserListSerializer,
    UserRegistrationSerializer,
    CustomTokenObtainPairSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    SendOTPSerializer,
    VerifyOTPSerializer,
    StaffCreateSerializer,
    UserUpdateSerializer,
    UserProfileUpdateSerializer,
)
from .utils import create_and_send_otp, verify_otp

User = get_user_model()


class UserListView(generics.ListAPIView):
    """API endpoint to list users with optional role filtering."""
    serializer_class = UserListSerializer
    permission_classes = [IsStaff]
    
    def get_queryset(self):
        # Optimize queryset with select_related to avoid N+1 queries
        queryset = User.objects.select_related('branch').all()  # Include inactive users too
        user = self.request.user
        
        # Filter by role if provided
        role = self.request.query_params.get('role', None)
        if role:
            # Handle special 'staff' role that includes all staff roles
            if role == 'staff':
                staff_roles = ['branch_admin', 'floor_manager', 'supervisor', 'applicator']
                queryset = queryset.filter(role__in=staff_roles)
            # Handle special 'admin' role that includes super admins
            elif role == 'admin':
                queryset = queryset.filter(role='super_admin')
            else:
                queryset = queryset.filter(role=role)
        
        # Filter by specific role if provided (for additional filtering)
        specific_role = self.request.query_params.get('specific_role', None)
        if specific_role:
            queryset = queryset.filter(role=specific_role)
        
        # Add phone number filtering
        phone = self.request.query_params.get('phone', None)
        if phone:
            queryset = queryset.filter(phone__icontains=phone)
        
        # Add general search (name, email, phone)
        search = self.request.query_params.get('search', None)
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(phone__icontains=search) |
                Q(name__icontains=search) |
                Q(email__icontains=search)
            )
        # Apply branch filtering
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            # If branch parameter provided, use it
            queryset = queryset.filter(branch_id=branch_id)
        elif self.request.query_params.get('include_all_branches'):
            # Special parameter to include all branches (for applicator assignment)
            # Only allow this for supervisors, branch admins, company admins, and super admins
            if user.role == 'super_admin':
                # Super admin can see all branches, no filtering
                pass
            elif user.role == 'company_admin':
                # Company admin can see all branches within their company
                if user.company:
                    queryset = queryset.filter(company=user.company)
                else:
                    queryset = queryset.none()
            elif user.role in ['supervisor', 'branch_admin']:
                # Apply company filtering so they can't see users from other companies
                if user.branch and user.branch.company:
                    queryset = queryset.filter(company=user.branch.company)
                elif user.company:
                    queryset = queryset.filter(company=user.company)
                else:
                    queryset = queryset.none()
            else:
                # For other roles, still apply their branch filtering
                if user.branch:
                    queryset = queryset.filter(branch=user.branch)
                else:
                    queryset = queryset.none()
        elif user.role == 'branch_admin' and user.branch:
            # If user is branch admin, filter by their branch automatically
            queryset = queryset.filter(branch=user.branch)
        elif user.role == 'floor_manager' and user.branch:
            # If user is floor manager, filter by their branch automatically
            queryset = queryset.filter(branch=user.branch)
        elif user.role == 'supervisor' and user.branch:
            # If user is supervisor, filter by their branch automatically
            queryset = queryset.filter(branch=user.branch)
        elif user.role == 'super_admin':
            # Super admin can see all users, no filtering
            # BUT: if requesting floor managers specifically for a booking, filter by booking's branch
            role_param = self.request.query_params.get('role', '')
            booking_id = self.request.query_params.get('booking_id', None)
            
            if role_param in ['floor_manager', 'supervisor', 'applicator'] and booking_id:
                try:
                    from bookings.models import Booking
                    booking = Booking.objects.get(id=booking_id)
                    if booking.branch:
                        queryset = queryset.filter(branch=booking.branch)
                except Booking.DoesNotExist:
                    queryset = queryset.none()  # Return empty if booking doesn't exist
        elif user.role == 'company_admin':
            # Company admin can only see users from their company
            if user.company:
                queryset = queryset.filter(company=user.company)
                
                # BUT: if requesting staff specifically for a booking, filter by booking's branch
                role_param = self.request.query_params.get('role', '')
                booking_id = self.request.query_params.get('booking_id', None)
                
                if role_param in ['floor_manager', 'supervisor', 'applicator'] and booking_id:
                    try:
                        from bookings.models import Booking
                        booking = Booking.objects.get(id=booking_id)
                        if booking.branch:
                            queryset = queryset.filter(branch=booking.branch)
                    except Booking.DoesNotExist:
                        queryset = queryset.none()  # Return empty if booking doesn't exist
            else:
                # If company_admin has no company assigned, return empty queryset
                queryset = queryset.none()
        else:
            # For other roles, filter by their branch if they have one
            if user.branch:
                queryset = queryset.filter(branch=user.branch)
            else:
                queryset = queryset.none()
        
        return queryset.order_by('-date_joined')
class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API endpoint for retrieving, updating, and deleting a specific user."""
    queryset = User.objects.all()
    serializer_class = UserUpdateSerializer
    permission_classes = [IsStaff]
    
    def get_queryset(self):
        """Filter users based on branch and company permissions."""
        queryset = User.objects.all()
        user = self.request.user
        
        # Apply filtering based on user role
        if user.role == 'super_admin':
            # Super admin can see all users
            pass
        elif user.role == 'company_admin':
            # Company admin can only see users from their company
            if user.company:
                queryset = queryset.filter(company=user.company)
            else:
                queryset = queryset.none()
        else:
            # Other roles filter by their branch
            if user.branch:
                queryset = queryset.filter(branch=user.branch)
            else:
                queryset = queryset.none()
        
        return queryset
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete user by setting is_active to False."""
        instance = self.get_object()
        
        # Prevent self-deletion
        if instance.id == request.user.id:
            return Response({
                'error': 'You cannot delete your own account.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Soft delete
        instance.is_active = False
        instance.save()
        
        return Response({
            'message': 'User deleted successfully.'
        }, status=status.HTTP_200_OK)


class UserRegistrationView(generics.CreateAPIView):
    """API endpoint for user registration."""
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_permissions(self):
        """Allow authenticated staff to create users with any role."""
        if self.request.user and self.request.user.is_authenticated:
            return [IsStaff()]
        return [permissions.AllowAny()]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            # Handle email validation errors specifically
            if 'email' in str(e).lower():
                return Response(
                    {'email': ['Please enter a valid email address.']},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Re-raise other validation errors
            raise e
            
        # Auto-assign branch for admin-created customers
        branch = None
        if request.user and request.user.is_authenticated:
            # For branch admin, use their assigned branch
            if request.user.role == 'branch_admin' and request.user.branch:
                branch = request.user.branch
            # For company admin, check if branch was provided in request
            elif request.user.role == 'company_admin':
                branch_id = request.data.get('branch')
                if branch_id:
                    try:
                        from branches.models import Branch
                        branch = Branch.objects.get(id=branch_id, company=request.user.company)
                    except Branch.DoesNotExist:
                        pass
            # For super admin, check if branch was provided in request
            elif request.user.role == 'super_admin':
                branch_id = request.data.get('branch')
                if branch_id:
                    try:
                        from branches.models import Branch
                        branch = Branch.objects.get(id=branch_id)
                    except Branch.DoesNotExist:
                        pass
        
        user = serializer.save(branch=branch)
        
        # Send OTP for verification only for customer self-registration
        if not request.user or not request.user.is_authenticated:
            create_and_send_otp(user, via_email=True)
            return Response({
                'message': 'Registration successful. Please check your email for OTP verification.',
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        
        # Admin-created users are auto-verified
        user.is_verified = True
        if user.role in ['company_admin', 'branch_admin', 'floor_manager', 'supervisor', 'applicator']:
            user.is_staff = True
        user.save()
        
        return Response({
            'message': 'User created successfully.',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom JWT token view with user info."""
    serializer_class = CustomTokenObtainPairSerializer


class UserProfileView(generics.RetrieveUpdateAPIView):
    """API endpoint for user profile management."""
    serializer_class = UserProfileUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """API endpoint for changing password."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'message': 'Password changed successfully.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ForgotPasswordView(APIView):
    """API endpoint for forgot password."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            
            # Scoped user lookup for multi-tenancy
            from companies.middleware import get_current_company
            from django.db.models import Q
            current_company = get_current_company()
            
            if current_company:
                # User must belong to current company OR be a super_admin
                user = get_object_or_404(User, Q(email=email), Q(company=current_company) | Q(role='super_admin'))
            else:
                user = get_object_or_404(User, email=email)
                
            create_and_send_otp(user, via_email=True)
            return Response({'message': 'OTP sent to your email.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ResetPasswordView(APIView):
    """API endpoint for resetting password with OTP."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            otp = serializer.validated_data['otp']
            new_password = serializer.validated_data['new_password']
            
            # Scoped user lookup for multi-tenancy
            from companies.middleware import get_current_company
            from django.db.models import Q
            current_company = get_current_company()
            
            if current_company:
                user = get_object_or_404(User, Q(email=email), Q(company=current_company) | Q(role='super_admin'))
            else:
                user = get_object_or_404(User, email=email)
            
            # Verify OTP
            if verify_otp(user, otp):
                user.set_password(new_password)
                user.save()
                return Response({'message': 'Password reset successfully.'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Invalid or expired OTP.'}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SendOTPView(APIView):
    """API endpoint for sending OTP."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            
            # Scoped user lookup for multi-tenancy
            from companies.middleware import get_current_company
            from django.db.models import Q
            current_company = get_current_company()
            
            if current_company:
                user = get_object_or_404(User, Q(email=email), Q(company=current_company) | Q(role='super_admin'))
            else:
                user = get_object_or_404(User, email=email)
                
            create_and_send_otp(user, via_email=True)
            return Response({'message': 'OTP sent successfully.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyOTPView(APIView):
    """API endpoint for verifying OTP."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            otp = serializer.validated_data['otp']
            
            # Scoped user lookup for multi-tenancy
            from companies.middleware import get_current_company
            from django.db.models import Q
            current_company = get_current_company()
            
            if current_company:
                user = get_object_or_404(User, Q(email=email), Q(company=current_company) | Q(role='super_admin'))
            else:
                user = get_object_or_404(User, email=email)
            
            if verify_otp(user, otp):
                # Mark user as verified
                user.is_verified = True
                user.save()
                
                return Response({
                    'message': 'OTP verified successfully.',
                    'user': UserSerializer(user).data
                }, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Invalid or expired OTP.'}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CreateStaffView(generics.CreateAPIView):
    """API endpoint for creating staff users."""
    serializer_class = StaffCreateSerializer
    permission_classes = [IsStaff]

    def create(self, request, *args, **kwargs):
        # Only super_admin, company_admin and branch_admin can create staff
        if request.user.role not in ['super_admin', 'company_admin', 'branch_admin']:
            return Response({
                'error': 'Only administrators can create staff members.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            # Handle email validation errors specifically
            if 'email' in str(e).lower():
                return Response(
                    {'email': ['Please enter a valid email address.']},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Re-raise other validation errors
            raise e
        
        # Handle branch assignment
        if request.user.role == 'branch_admin':
            # Branch admins can only create staff for their own branch
            # Override the branch from validated_data
            user = serializer.save(
                is_staff=True,
                is_verified=True,
                branch=request.user.branch,
                company=request.user.company or (
                    request.user.branch.company if request.user.branch else None
                )
            )
        elif request.user.role == 'company_admin':
            # Company admins - use the branch from validated_data, set their company
            user = serializer.save(
                is_staff=True,
                is_verified=True,
                company=request.user.company
            )
        elif request.user.role == 'super_admin':
            # Super admin has no company — derive from chosen branch
            branch = serializer.validated_data.get('branch')
            company = branch.company if branch else None
            user = serializer.save(
                is_staff=True,
                is_verified=True,
                company=company
            )
        
        return Response({
            'message': 'Staff member created successfully.',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)