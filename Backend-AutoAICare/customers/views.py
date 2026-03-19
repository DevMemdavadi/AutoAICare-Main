from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from config.permissions import IsAdmin, IsFloorManager
from .models import Customer, Vehicle, VehicleBrand, VehicleModel, VehicleColor
from .serializers import (
    CustomerSerializer, VehicleSerializer, VehicleCreateSerializer,
    VehicleBrandSerializer, VehicleModelSerializer, VehicleColorSerializer
)



class CustomerProfileView(generics.RetrieveUpdateAPIView):
    """API endpoint to view and update customer profile."""
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        customer, created = Customer.objects.get_or_create(user=self.request.user)
        return customer


class VehicleListCreateView(generics.ListCreateAPIView):
    """API endpoint to list and create vehicles."""
    serializer_class = VehicleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        customer, created = Customer.objects.get_or_create(user=self.request.user)
        return Vehicle.objects.filter(customer=customer)
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return VehicleCreateSerializer
        return VehicleSerializer
    
    def perform_create(self, serializer):
        customer, created = Customer.objects.get_or_create(user=self.request.user)
        # Derive company from the user
        company = getattr(self.request.user, 'company', None)
        serializer.save(customer=customer, company=company)


class VehicleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API endpoint to view, update, and delete a vehicle."""
    serializer_class = VehicleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        customer, created = Customer.objects.get_or_create(user=self.request.user)
        return Vehicle.objects.filter(customer=customer)


class AdminVehicleListCreateView(generics.ListCreateAPIView):
    """API endpoint for admins to list and create vehicles for any customer."""
    serializer_class = VehicleSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        user = self.request.user
        queryset = Vehicle.objects.select_related('customer', 'customer__user')

        # Company isolation
        if user.role == 'company_admin' and user.company:
            queryset = queryset.filter(company=user.company)
        elif user.role == 'branch_admin' and user.branch:
            queryset = queryset.filter(customer__user__branch=user.branch)
        elif user.role != 'super_admin':
            return queryset.none()

        customer_id = self.request.query_params.get('customer', None)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        return queryset

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return VehicleCreateSerializer
        return VehicleSerializer

    def perform_create(self, serializer):
        # For admin use, customer is passed in the serializer data
        customer_id = serializer.validated_data.pop('customer', None)
        if not customer_id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'customer': 'Customer ID is required'})

        customer = get_object_or_404(Customer, id=customer_id)
        # Derive company from the admin user
        company = getattr(self.request.user, 'company', None) or (
            self.request.user.branch.company if getattr(self.request.user, 'branch', None) else None
        )
        serializer.save(customer=customer, company=company)


class AdminVehicleDetailView(generics.RetrieveUpdateAPIView):
    """API endpoint for admins to update any vehicle by ID."""
    serializer_class = VehicleSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        user = self.request.user
        queryset = Vehicle.objects.select_related('customer', 'customer__user')
        if user.role == 'company_admin' and user.company:
            return queryset.filter(company=user.company)
        elif user.role == 'branch_admin' and user.branch:
            return queryset.filter(company=user.branch.company)
        elif user.role == 'super_admin':
            return queryset.all()
        return queryset.none()


class AdminVehicleListByUserView(generics.ListAPIView):
    """API endpoint for admins to list vehicles by user ID."""
    serializer_class = VehicleSerializer
    permission_classes = [IsFloorManager]  # floor_manager+ can look up customer vehicles
    pagination_class = None  # return all vehicles, no pagination needed here

    def get_queryset(self):
        from django.db.models import Q
        admin = self.request.user
        user_id = self.request.query_params.get('user', None)

        if not user_id:
            return Vehicle.objects.none()

        # Direct FK traversal — works even if no Customer profile exists yet
        queryset = Vehicle.objects.select_related(
            'customer', 'customer__user'
        ).filter(customer__user_id=user_id)

        # Company/branch isolation.
        # Also allow company=NULL for legacy vehicles created before company was required.
        if admin.role == 'super_admin':
            pass  # see all
        elif admin.role == 'company_admin' and admin.company:
            queryset = queryset.filter(
                Q(company=admin.company) | Q(company__isnull=True)
            )
        elif admin.role in ('branch_admin', 'floor_manager') and getattr(admin, 'branch', None):
            queryset = queryset.filter(
                Q(company=admin.branch.company) | Q(company__isnull=True)
            )
        else:
            return Vehicle.objects.none()

        return queryset


class VehicleBrandListCreateView(generics.ListCreateAPIView):
    """API endpoint to list all vehicle brands and create new ones."""
    serializer_class = VehicleBrandSerializer
    pagination_class = None
    
    def get_permissions(self):
        """Public can list brands, only admins can create."""
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [IsAdmin()]
    
    def get_queryset(self):
        queryset = VehicleBrand.objects.filter(is_active=True)
        vehicle_type = self.request.query_params.get('vehicle_type', None)
        if vehicle_type:
            queryset = queryset.filter(vehicle_type=vehicle_type)
        return queryset


class VehicleBrandRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    """API endpoint to retrieve and update a specific vehicle brand."""
    queryset = VehicleBrand.objects.all()
    serializer_class = VehicleBrandSerializer
    permission_classes = [IsAdmin]  # Only admins can update brands


class VehicleModelListCreateView(generics.ListCreateAPIView):
    """API endpoint to list vehicle models and create new ones."""
    serializer_class = VehicleModelSerializer
    pagination_class = None
    
    def get_permissions(self):
        """Public can list models, only admins can create."""
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [IsAdmin()]
    
    def get_queryset(self):
        queryset = VehicleModel.objects.filter(is_active=True).select_related('brand')
        brand_id = self.request.query_params.get('brand', None)
        if brand_id:
            queryset = queryset.filter(brand_id=brand_id)
        return queryset


class VehicleModelRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    """API endpoint to retrieve and update a specific vehicle model."""
    queryset = VehicleModel.objects.all()
    serializer_class = VehicleModelSerializer
    permission_classes = [IsAdmin]  # Only admins can update models


class VehicleColorListView(generics.ListAPIView):
    """API endpoint to list all vehicle colors."""
    serializer_class = VehicleColorSerializer
    permission_classes = [permissions.AllowAny]  # Public access for form dropdowns
    pagination_class = None
    
    def get_queryset(self):
        return VehicleColor.objects.filter(is_active=True)


class AdminCustomerDetailView(generics.RetrieveAPIView):
    """API endpoint for admins to retrieve any customer profile by user ID."""
    serializer_class = CustomerSerializer
    permission_classes = [IsAdmin]
    lookup_field = 'user_id'

    def get_queryset(self):
        user = self.request.user
        if user.role == 'company_admin' and user.company:
            return Customer.objects.filter(company=user.company)
        elif user.role == 'branch_admin' and user.branch:
            return Customer.objects.filter(user__branch=user.branch)
        elif user.role == 'super_admin':
            return Customer.objects.all()
        return Customer.objects.none()


class VehicleTypeDetectionView(generics.GenericAPIView):
    """API endpoint to detect vehicle type based on brand and model."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """
        Detect vehicle type from brand and model query parameters.
        Query params:
            - brand: Vehicle brand name
            - model: Vehicle model name
        """
        brand_name = request.query_params.get('brand', '').strip()
        model_name = request.query_params.get('model', '').strip()
        
        if not brand_name or not model_name:
            return Response({
                'error': 'Both brand and model parameters are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Try to find matching VehicleModel
        vehicle_model = VehicleModel.objects.filter(
            brand__name__iexact=brand_name,
            name__iexact=model_name,
            is_active=True
        ).select_related('brand').first()
        
        if vehicle_model:
            return Response({
                'vehicle_type': vehicle_model.vehicle_type,
                'vehicle_type_display': vehicle_model.get_vehicle_type_display(),
                'matched': True,
                'brand_id': vehicle_model.brand.id,
                'brand_name': vehicle_model.brand.name,
                'model_id': vehicle_model.id,
                'model_name': vehicle_model.name
            })
        
        # No match found, return default
        return Response({
            'vehicle_type': 'sedan',
            'vehicle_type_display': 'Sedan',
            'matched': False,
            'message': 'No exact match found. Defaulting to Sedan.'
        })
