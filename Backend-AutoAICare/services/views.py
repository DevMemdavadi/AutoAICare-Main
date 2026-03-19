from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from config.permissions import IsAdmin, IsStaff
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q
from django.db.models.deletion import ProtectedError
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action
from .models import ServicePackage, AddOn
from .service_parts import ServicePackagePart
from .serializers import ServicePackageSerializer, ServicePackageListSerializer, AddOnSerializer
from .serializers_parts import ServicePackagePartSerializer, ServicePackagePartListSerializer


class ServicePackageViewSet(viewsets.ModelViewSet):
    """ViewSet for ServicePackage CRUD operations with branch filtering."""
    queryset = ServicePackage.objects.all()  # Include inactive items for admin operations
    serializer_class = ServicePackageSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_global', 'is_active']  # Removed 'branch' to avoid double filtering
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'price', 'duration', 'created_at']
    ordering = ['id']
    
    def get_serializer_class(self):
        """Use lightweight serializer for list view."""
        if self.action == 'list':
            return ServicePackageListSerializer
        return ServicePackageSerializer
    
    def get_queryset(self):
        """Filter packages: show global + branch-specific (if branch param provided)."""
        user = self.request.user
        
        # Super admin sees everything
        if user.is_authenticated and user.role == 'super_admin':
            queryset = ServicePackage.objects.all_companies().select_related('branch')
        # Company admin sees company items + truly global items
        elif user.is_authenticated and user.role == 'company_admin':
            queryset = ServicePackage.objects.filter(
                Q(company=user.company) | Q(company__isnull=True)
            ).select_related('branch')
        # Others (branch_admin, staff, customers)
        elif user.is_authenticated:
            # Branch-level staff
            if hasattr(user, 'branch') and user.branch:
                queryset = ServicePackage.objects.filter(
                    Q(company=user.branch.company) | Q(company__isnull=True)
                ).select_related('branch')
            elif user.company:
                queryset = ServicePackage.objects.filter(
                    Q(company=user.company) | Q(company__isnull=True)
                ).select_related('branch')
            else:
                queryset = ServicePackage.objects.none()
        else:
            # Unauthenticated (AllowAny on list/retrieve) — rely on CompanyManager middleware
            queryset = ServicePackage.objects.select_related('branch')
                
        # For individual object access, we are done
        if self.action in ['update', 'partial_update', 'destroy', 'retrieve']:
            return queryset
        
        # For list operation, apply additional branch/active filters
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            # If a specific branch is selected, show global + that branch only
            queryset = queryset.filter(Q(is_global=True) | Q(branch_id=branch_id))
        elif user.is_authenticated and user.role == 'branch_admin' and user.branch:
            # Branch admin: always filter to global + their branch
            queryset = queryset.filter(Q(is_global=True) | Q(branch_id=user.branch.id))
        # For super_admin and company_admin with no branch filter: show all (no restriction)

        # Apply is_active filter: skip for super_admin/company_admin so they can manage inactive services
        if self.action == 'list' and 'is_active' not in self.request.query_params:
            if not (user.is_authenticated and user.role in ['super_admin', 'company_admin']):
                queryset = queryset.filter(is_active=True)
        
        return queryset

    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to handle ProtectedError when service package is referenced by bookings."""
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'error': 'Cannot delete this service package because it is associated with existing bookings. Please deactivate it instead.'},
                status=status.HTTP_409_CONFLICT
            )
    
    def create(self, request, *args, **kwargs):
        """Override create to restrict global service creation to super admin only."""
        user = request.user
        
        # Check if non-super-admin/company-admin is trying to create a global service
        if request.data.get('is_global', True) and user.role not in ['super_admin', 'company_admin']:
            return Response(
                {'error': 'Only super administrators can create global services. Branch admins can only create branch-specific services.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        """Set the company from the current user."""
        user = self.request.user
        company = getattr(user, 'company', None) or (
            user.branch.company if getattr(user, 'branch', None) else None
        )
        serializer.save(company=company)
    
    def update(self, request, *args, **kwargs):
        """Override update to restrict global service editing to super admin only."""
        instance = self.get_object()
        user = request.user
        
        # Check if trying to edit a global service without proper permissions
        if instance.is_global and user.role not in ['super_admin', 'company_admin']:
            return Response(
                {'error': 'Only super administrators can edit global services. Please contact your super admin.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if unauthorized user is trying to make a service global
        if request.data.get('is_global') and user.role not in ['super_admin', 'company_admin']:
            return Response(
                {'error': 'Only super administrators can create or modify global services.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        """Override partial_update to restrict global service editing to super admin only."""
        instance = self.get_object()
        user = request.user
        
        # Check if trying to edit a global service without proper permissions
        if instance.is_global and user.role not in ['super_admin', 'company_admin']:
            return Response(
                {'error': 'Only super administrators can edit global services. Please contact your super admin.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if unauthorized user is trying to make a service global
        if request.data.get('is_global') and user.role not in ['super_admin', 'company_admin']:
            return Response(
                {'error': 'Only super administrators can create or modify global services.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().partial_update(request, *args, **kwargs)
    
    def get_permissions(self):
        """Allow anyone to view packages, but only staff can modify.
        Also allow anyone to access the categories action."""
        if self.action in ['list', 'retrieve', 'categories']:
            return [permissions.AllowAny()]
        return [IsAdmin()]
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny()])
    def categories(self, request):
        """Get all service categories with their display names."""
        categories = ServicePackage.CATEGORY_CHOICES
        categories_data = []
        for value, label in categories:
            categories_data.append({
                'value': value,
                'label': label
            })
        return Response(categories_data)


class AddOnViewSet(viewsets.ModelViewSet):
    """ViewSet for AddOn CRUD operations with branch filtering."""
    queryset = AddOn.objects.all()  # Include inactive items for admin operations
    serializer_class = AddOnSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['package', 'is_global', 'is_active']  # Removed 'branch' to avoid double filtering
    search_fields = ['name']
    ordering_fields = ['name', 'price']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter add-ons: show global + branch-specific (if branch param provided)."""
        user = self.request.user
        
        # Super admin sees everything
        if user.is_authenticated and user.role == 'super_admin':
            queryset = AddOn.objects.all_companies()
        # Company admin sees company items + truly global items
        elif user.is_authenticated and user.role == 'company_admin':
            queryset = AddOn.objects.filter(
                Q(company=user.company) | Q(company__isnull=True)
            )
        # Others (branch_admin, staff, customers)
        elif user.is_authenticated:
            if hasattr(user, 'branch') and user.branch:
                queryset = AddOn.objects.filter(
                    Q(company=user.branch.company) | Q(company__isnull=True)
                )
            elif user.company:
                queryset = AddOn.objects.filter(
                    Q(company=user.company) | Q(company__isnull=True)
                )
            else:
                queryset = AddOn.objects.none()
        else:
            # Unauthenticated — rely on CompanyManager middleware
            queryset = AddOn.objects.all()
                
        # For individual object access, we are done
        if self.action in ['update', 'partial_update', 'destroy', 'retrieve']:
            return queryset
        
        # For list operation, apply additional branch/active filters
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            # If a specific branch is selected, show global + that branch only
            queryset = queryset.filter(Q(is_global=True) | Q(branch_id=branch_id))
        elif user.is_authenticated and user.role == 'branch_admin' and user.branch:
            # Branch admin: always filter to global + their branch
            queryset = queryset.filter(Q(is_global=True) | Q(branch_id=user.branch.id))
        # For super_admin and company_admin with no branch filter: show all (no restriction)

        # Apply is_active filter: skip for super_admin/company_admin so they can manage inactive add-ons
        if self.action == 'list' and 'is_active' not in self.request.query_params:
            if not (user.is_authenticated and user.role in ['super_admin', 'company_admin']):
                queryset = queryset.filter(is_active=True)
        
        return queryset

    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to handle ProtectedError when add-on is referenced by bookings."""
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'error': 'Cannot delete this add-on because it is associated with existing bookings. Please deactivate it instead.'},
                status=status.HTTP_409_CONFLICT
            )
    
    def create(self, request, *args, **kwargs):
        """Override create to restrict global add-on creation to super admin only."""
        user = request.user
        
        # Check if non-super-admin/company-admin is trying to create a global add-on
        if request.data.get('is_global', True) and user.role not in ['super_admin', 'company_admin']:
            return Response(
                {'error': 'Only super administrators can create global add-ons. Branch admins can only create branch-specific add-ons.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        """Set the company from the current user."""
        user = self.request.user
        company = getattr(user, 'company', None) or (
            user.branch.company if getattr(user, 'branch', None) else None
        )
        serializer.save(company=company)
    
    def update(self, request, *args, **kwargs):
        """Override update to restrict global add-on editing to super admin only."""
        instance = self.get_object()
        user = request.user
        
        # Check if trying to edit a global add-on without proper permissions
        if instance.is_global and user.role not in ['super_admin', 'company_admin']:
            return Response(
                {'error': 'Only super administrators can edit global add-ons. Please contact your super admin.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if unauthorized user is trying to make an add-on global
        if request.data.get('is_global') and user.role not in ['super_admin', 'company_admin']:
            return Response(
                {'error': 'Only super administrators can create or modify global add-ons.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        """Override partial_update to restrict global add-on editing to super admin only."""
        instance = self.get_object()
        user = request.user
        
        # Check if trying to edit a global add-on without proper permissions
        if instance.is_global and user.role not in ['super_admin', 'company_admin']:
            return Response(
                {'error': 'Only super administrators can edit global add-ons. Please contact your super admin.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if unauthorized user is trying to make an add-on global
        if request.data.get('is_global') and user.role not in ['super_admin', 'company_admin']:
            return Response(
                {'error': 'Only super administrators can create or modify global add-ons.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().partial_update(request, *args, **kwargs)
    
    def get_permissions(self):
        """Allow anyone to view add-ons, but only staff can modify."""
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsAdmin()]


class PublicServicePackagesView(APIView):
    """Public endpoint to list active service packages for a given company.

    Returns all *active* packages that either belong to the specified company
    OR are globally shared (company__isnull=True), so a booking widget or
    external app can display the right services without requiring authentication.

    Query params:
        company_id  (required) – the Company PK
        branch_id   (optional) – further restrict to global + this branch only
        vehicle_type (optional) – e.g. 'hatchback', 'sedan', 'suv', 'bike'

    URL: GET /api/services/public/packages/?company_id=<id>
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        company_id = request.query_params.get('company_id')
        if not company_id:
            return Response(
                {'error': 'company_id query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Base: active packages belonging to this company OR globally shared
        queryset = (
            ServicePackage.objects
            .filter(
                Q(company_id=company_id) | Q(company__isnull=True),
                is_active=True,
            )
            .select_related('branch')
        )

        # Optional: narrow down to a specific branch (global + that branch)
        branch_id = request.query_params.get('branch_id')
        if branch_id:
            queryset = queryset.filter(
                Q(is_global=True) | Q(branch_id=branch_id)
            )

        # Optional: filter by vehicle compatibility
        vehicle_type = request.query_params.get('vehicle_type')
        if vehicle_type:
            # compatible_vehicle_types is a JSONField (list)
            queryset = queryset.filter(compatible_vehicle_types__contains=[vehicle_type])

        queryset = queryset.order_by('category', 'name')
        serializer = ServicePackageListSerializer(
            queryset, many=True, context={'request': request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class PublicAddOnsView(APIView):
    """Public endpoint to list active add-ons for a given company.

    Returns all *active* add-ons that either belong to the specified company
    OR are globally shared (company__isnull=True), without requiring auth.

    Query params:
        company_id  (required) – the Company PK
        branch_id   (optional) – narrow to global + that branch only
        package_id  (optional) – filter add-ons linked to a specific package

    URL: GET /api/services/public/addons/?company_id=<id>
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        company_id = request.query_params.get('company_id')
        if not company_id:
            return Response(
                {'error': 'company_id query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Base: active add-ons belonging to this company OR globally shared
        queryset = (
            AddOn.objects
            .filter(
                Q(company_id=company_id) | Q(company__isnull=True),
                is_active=True,
            )
            .select_related('branch', 'package')
        )

        # Optional: narrow to a specific branch (global + that branch)
        branch_id = request.query_params.get('branch_id')
        if branch_id:
            queryset = queryset.filter(
                Q(is_global=True) | Q(branch_id=branch_id)
            )

        # Optional: filter by parent package
        package_id = request.query_params.get('package_id')
        if package_id:
            queryset = queryset.filter(package_id=package_id)

        queryset = queryset.order_by('name')
        serializer = AddOnSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
