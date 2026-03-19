from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db.models import Q, F
from django.db import models, IntegrityError, transaction
from django_filters.rest_framework import DjangoFilterBackend

from .parts_catalog import Part
from .serializers import PartSerializer


class PartViewSet(viewsets.ModelViewSet):
    """ViewSet for Part catalog management."""
    queryset = Part.objects.all()
    serializer_class = PartSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active', 'is_global', 'stock_tracking_mode']
    search_fields = ['name', 'sku', 'description']
    ordering_fields = ['name', 'sku', 'stock', 'selling_price', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter parts based on user role and branch."""
        user = self.request.user
        
        # Determine company context (Mandatory for non-superusers)
        company = None
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return Part.objects.none()

        # Start with company isolation
        if user.is_superuser:
            queryset = Part.objects.all_companies()
        else:
            queryset = Part.objects.filter(company=company)
        
        # For non-super admin and non-company admin users, show global parts + their branch parts
        if user.role not in ['super_admin', 'company_admin']:
            if user.branch:
                queryset = queryset.filter(
                    Q(is_global=True) | Q(branch=user.branch)
                )
            else:
                # If staff has no branch, they only see global parts for their company
                queryset = queryset.filter(is_global=True)
        
        # Explicit branch filtering if branch parameter is provided
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            if ',' in str(branch_id):
                branch_ids = branch_id.split(',')
                queryset = queryset.filter(
                    Q(branch_id__in=branch_ids) | Q(is_global=True)
                )
            else:
                queryset = queryset.filter(
                    Q(branch_id=branch_id) | Q(is_global=True)
                )
        
        # Filter by stock status if requested
        stock_status = self.request.query_params.get('stock_status')
        if stock_status == 'low_stock':
            queryset = queryset.filter(stock__lte=models.F('min_stock_level'))
        elif stock_status == 'out_of_stock':
            queryset = queryset.filter(stock=0)
        elif stock_status == 'in_stock':
            queryset = queryset.filter(stock__gt=models.F('min_stock_level'))
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a part, returning a clean 400 on duplicate SKU instead of a 500."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                self._perform_create(serializer)
        except IntegrityError as e:
            error_str = str(e).lower()
            if 'sku' in error_str or 'unique' in error_str:
                sku = serializer.validated_data.get('sku', '')
                raise ValidationError({
                    'sku': [f"A part with SKU '{sku}' already exists in your company. Please use a different SKU."]
                })
            raise

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def _perform_create(self, serializer):
        """Internal create helper — sets company/branch context."""
        user = self.request.user
        if not serializer.validated_data.get('is_global') and not serializer.validated_data.get('branch'):
            if user.branch:
                serializer.save(branch=user.branch)
            else:
                raise PermissionDenied("Branch must be specified for non-global parts.")
        else:
            serializer.save()

    
    @action(detail=True, methods=['post'])
    def add_stock(self, request, pk=None):
        """Add stock to a part and create expense record."""
        part = self.get_object()
        quantity = request.data.get('quantity')
        
        if not quantity or quantity <= 0:
            return Response(
                {'error': 'Quantity must be a positive number.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            quantity = int(quantity)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid quantity value.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Add stock
        part.add_stock(quantity)
        
        # Create expense record for inventory purchase
        from accounting.models import Expense
        from django.utils import timezone
        
        total_cost = part.cost_price * quantity
        
        # Determine company context for the expense
        company = part.company or getattr(request.user, 'company', None) or (
            request.user.branch.company if getattr(request.user, 'branch', None) else None
        )
        
        Expense.objects.create(
            company=company,
            title=f"Stock Purchase: {part.name}",
            category='inventory',
            amount=total_cost,
            date=timezone.now().date(),
            description=f"Added {quantity} {part.unit} of {part.name} (SKU: {part.sku})",
            branch=part.branch if not part.is_global else request.user.branch,
            recorded_by=request.user,
            payment_status='paid'
        )
        
        return Response({
            'message': f'Added {quantity} {part.unit} to stock. Expense record created.',
            'part': PartSerializer(part).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def low_stock_alert(self, request):
        """Get parts with low stock."""
        queryset = self.get_queryset()
        low_stock_parts = queryset.filter(
            stock__lte=models.F('min_stock_level'),
            is_active=True
        )
        
        serializer = self.get_serializer(low_stock_parts, many=True)
        return Response({
            'count': low_stock_parts.count(),
            'parts': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def stock_summary(self, request):
        """Get stock summary statistics."""
        queryset = self.get_queryset()
        
        from django.db.models import Sum, Count, F
        
        summary = {
            'total_parts': queryset.filter(is_active=True).count(),
            'out_of_stock': queryset.filter(stock=0, is_active=True).count(),
            'low_stock': queryset.filter(
                stock__lte=F('min_stock_level'),
                stock__gt=0,
                is_active=True
            ).count(),
            'total_stock_value': queryset.filter(is_active=True).aggregate(
                total=Sum(F('stock') * F('cost_price'))
            )['total'] or 0,
        }
        
        return Response(summary, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def branch_stock_breakdown(self, request, pk=None):
        """Get stock breakdown by branch for a specific part."""
        part = self.get_object()
        
        if part.stock_tracking_mode != 'branch':
            return Response({
                'message': 'This part uses global stock tracking',
                'stock_tracking_mode': part.stock_tracking_mode,
                'total_stock': part.stock
            })
        
        from .parts_catalog import BranchStock
        from .stock_serializers import BranchStockSerializer
        
        branch_stocks = BranchStock.objects.filter(part=part).select_related('branch')
        serializer = BranchStockSerializer(branch_stocks, many=True)
        
        from django.db.models import Sum
        total_quantity = branch_stocks.aggregate(total=Sum('quantity'))['total'] or 0
        
        return Response({
            'part_id': part.id,
            'part_name': part.name,
            'part_sku': part.sku,
            'stock_tracking_mode': part.stock_tracking_mode,
            'total_quantity': total_quantity,
            'branch_stocks': serializer.data
        })
