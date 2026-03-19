from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import transaction, models
from config.permissions import IsAdmin
from .service_parts import ServicePackagePart
from .models import ServicePackage
from .serializers_parts import ServicePackagePartSerializer, ServicePackagePartListSerializer
from jobcards.models import Part


class ServicePackagePartViewSet(viewsets.ModelViewSet):
    """ViewSet for managing service-to-parts mappings."""
    queryset = ServicePackagePart.objects.all()
    serializer_class = ServicePackagePartSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['package', 'part', 'is_active', 'is_optional']
    search_fields = ['package__name', 'part__name', 'part__sku']
    ordering_fields = ['package', 'part', 'quantity', 'created_at']
    ordering = ['package', 'part']
    
    def get_serializer_class(self):
        """Use lightweight serializer for list view."""
        if self.action == 'list':
            return ServicePackagePartListSerializer
        return ServicePackagePartSerializer
    
    def get_queryset(self):
        """Filter by company and optionally by package."""
        user = self.request.user
        
        # Super admin sees everything
        if user.is_authenticated and user.role == 'super_admin':
            queryset = ServicePackagePart.objects.all_companies().select_related('package', 'part')
        else:
            queryset = ServicePackagePart.objects.select_related('package', 'part')
            # Explicit company filtering
            if hasattr(user, 'company') and user.company:
                from django.db.models import Q
                queryset = queryset.filter(
                    Q(company=user.company) | Q(company__isnull=True)
                )
            elif hasattr(user, 'branch') and user.branch:
                from django.db.models import Q
                queryset = queryset.filter(
                    Q(company=user.branch.company) | Q(company__isnull=True)
                )
            else:
                queryset = ServicePackagePart.objects.none()
        
        # Filter by package if provided
        package_id = self.request.query_params.get('package')
        if package_id:
            queryset = queryset.filter(package_id=package_id)
        
        # Filter by part if provided
        part_id = self.request.query_params.get('part')
        if part_id:
            queryset = queryset.filter(part_id=part_id)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set the company from the current user."""
        user = self.request.user
        company = getattr(user, 'company', None) or (
            user.branch.company if getattr(user, 'branch', None) else None
        )
        serializer.save(company=company)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    def check_stock_for_service(self, request):
        """
        Check if there's enough stock for all parts required by a service.
        
        Request body:
        {
            "package_id": 1,
            "vehicle_type": "sedan",
            "quantity": 1  # number of services
        }
        """
        package_id = request.data.get('package_id')
        vehicle_type = request.data.get('vehicle_type', 'sedan')
        quantity = request.data.get('quantity', 1)
        
        if not package_id:
            return Response(
                {'error': 'package_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all required parts for this service (company-specific first, then global fallback)
        user_company = request.user.company if hasattr(request.user, 'company') else None
        
        required_parts = ServicePackagePart.objects.all_companies().filter(
            package_id=package_id,
            is_active=True,
            company=user_company
        ).select_related('part')
        
        if not required_parts.exists() and user_company:
            required_parts = ServicePackagePart.objects.all_companies().filter(
                package_id=package_id,
                is_active=True,
                company__isnull=True
            ).select_related('part')
        
        if not required_parts.exists():
            return Response({
                'has_stock': True,
                'message': 'No parts configured for this service',
                'parts': []
            })
        
        parts_status = []
        all_available = True
        
        for service_part in required_parts:
            is_available, required_qty, current_stock = service_part.check_stock_availability(
                vehicle_type=vehicle_type,
                multiplier=quantity
            )
            
            if not is_available and not service_part.is_optional:
                all_available = False
            
            parts_status.append({
                'part_id': service_part.part.id,
                'part_name': service_part.part.name,
                'part_sku': service_part.part.sku,
                'required_quantity': float(required_qty),
                'current_stock': current_stock,
                'is_available': is_available,
                'is_optional': service_part.is_optional,
                'unit': service_part.part.unit,
            })
        
        return Response({
            'has_stock': all_available,
            'parts': parts_status,
            'message': 'All required parts are in stock' if all_available else 'Some required parts are out of stock'
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def test_deduction(self, request, pk=None):
        """
        Test parts deduction for a service-part mapping (dry run).
        
        Request body:
        {
            "vehicle_type": "sedan",
            "quantity": 1
        }
        """
        service_part = self.get_object()
        vehicle_type = request.data.get('vehicle_type', 'sedan')
        quantity = request.data.get('quantity', 1)
        
        is_available, required_qty, current_stock = service_part.check_stock_availability(
            vehicle_type=vehicle_type,
            multiplier=quantity
        )
        
        return Response({
            'part_name': service_part.part.name,
            'required_quantity': float(required_qty),
            'current_stock': current_stock,
            'is_available': is_available,
            'would_succeed': is_available or service_part.is_optional,
            'unit': service_part.part.unit,
        })
    
    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    @transaction.atomic
    def bulk_save(self, request):
        """
        Bulk save parts for a service package.
        Replaces all existing parts with the provided list in a single atomic transaction.
        
        Request body:
        {
            "package_id": 123,
            "parts": [
                {
                    "part": 45,
                    "quantity": 50,
                    "hatchback_quantity": 40,
                    "sedan_quantity": 50,
                    "suv_quantity": 60,
                    "bike_quantity": 30,
                    "is_optional": false
                },
                ...
            ]
        }
        
        Returns:
        {
            "message": "Successfully saved 5 parts",
            "count": 5
        }
        """
        package_id = request.data.get('package_id')
        parts_data = request.data.get('parts', [])
        
        # Validation
        if not package_id:
            return Response(
                {'error': 'package_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not isinstance(parts_data, list):
            return Response(
                {'error': 'parts must be a list'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Verify package exists and user has access
            if request.user.role == 'super_admin':
                package = ServicePackage.objects.all_companies().get(id=package_id)
            else:
                # Regular users can see global packages + their own packages
                # The CompanyManager automatically handles this via the default manager
                package = ServicePackage.objects.get(id=package_id)
            
            # Determine which company context we are managing mappings for:
            # 1. If the package is company-specific, mappings MUST belong to that company.
            # 2. If the package is global, target depends on the user role:
            #    - Company/Branch Admin: mappings are company-specific overrides.
            #    - Super Admin: mappings are global defaults (None) or company context if on a subdomain.
            target_company = package.company
            if not target_company:
                if request.user.role in ['company_admin', 'branch_admin']:
                    target_company = request.user.company
                else:
                    # Developer (Super Admin) uses detected context or platform level (None)
                    target_company = getattr(request, 'company', None)
            
            # Validate all parts exist before proceeding
            # We use all_companies() and models.Q to find parts that are either global or in our target company
            part_ids = [p.get('part') for p in parts_data if p.get('part')]
            if part_ids:
                if request.user.role == 'super_admin':
                    existing_parts = Part.objects.all_companies().filter(id__in=part_ids)
                else:
                    existing_parts = Part.objects.all_companies().filter(
                        models.Q(id__in=part_ids),
                        models.Q(company=target_company) | models.Q(company__isnull=True)
                    )
                
                existing_part_ids = set(existing_parts.values_list('id', flat=True))
                invalid_part_ids = set(part_ids) - existing_part_ids
                
                if invalid_part_ids:
                    return Response(
                        {'error': f'Invalid part IDs: {list(invalid_part_ids)}. Parts must be global or belonging to the company.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Validate quantities
            for idx, part_data in enumerate(parts_data):
                if not part_data.get('part'):
                    return Response(
                        {'error': f'Part ID is required for item at index {idx}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                quantity = part_data.get('quantity')
                if quantity is None or float(quantity) <= 0:
                    return Response(
                        {'error': f'Valid quantity is required for item at index {idx}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Delete existing parts for THIS package that this user can manage:
            # - Their own company entries (company=target_company)
            # - Global/orphaned entries (company=NULL) for this package
            # This ensures old seeded data with company=NULL gets cleaned up
            deleted_count = ServicePackagePart.objects.all_companies().filter(
                package=package
            ).filter(
                models.Q(company=target_company) | models.Q(company__isnull=True)
            ).delete()[0]
            
            # Bulk create new parts
            parts_to_create = []
            for part_data in parts_data:
                parts_to_create.append(ServicePackagePart(
                    package=package,
                    part_id=part_data['part'],
                    quantity=float(part_data.get('quantity', 1)),
                    hatchback_quantity=float(part_data['hatchback_quantity']) if part_data.get('hatchback_quantity') else None,
                    sedan_quantity=float(part_data['sedan_quantity']) if part_data.get('sedan_quantity') else None,
                    suv_quantity=float(part_data['suv_quantity']) if part_data.get('suv_quantity') else None,
                    bike_quantity=float(part_data['bike_quantity']) if part_data.get('bike_quantity') else None,
                    is_optional=part_data.get('is_optional', False),
                    is_active=True,
                    company=target_company
                ))
            
            # Bulk create (single DB query)
            created_parts = ServicePackagePart.objects.bulk_create(parts_to_create)
            
            return Response({
                'message': f'Successfully saved {len(created_parts)} parts',
                'count': len(created_parts),
                'deleted': deleted_count,
                'created': len(created_parts),
                'debug': {
                    'target_company': target_company.id if target_company else None,
                    'target_company_name': str(target_company) if target_company else None,
                    'package_company': package.company_id,
                    'user_company': request.user.company_id if hasattr(request.user, 'company_id') else None,
                    'middleware_company': request.company.id if getattr(request, 'company', None) else None,
                }
            }, status=status.HTTP_200_OK)
            
        except ServicePackage.DoesNotExist:
            return Response(
                {'error': 'Service package not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            return Response(
                {'error': f'Invalid data format: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            # Transaction will auto-rollback on exception
            return Response(
                {'error': f'Failed to save parts: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
