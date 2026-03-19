from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.db.models import Q
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product, Order, OrderItem
from .serializers import ProductSerializer, OrderSerializer, OrderCreateSerializer
from customers.models import Customer


import logging

logger = logging.getLogger(__name__)

class ProductViewSet(viewsets.ModelViewSet):
    """ViewSet for Product CRUD operations with branch filtering."""
    queryset = Product.objects.filter(is_active=True)
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_global', 'branch']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'price', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter products by company + branch."""
        queryset = super().get_queryset()
        user = self.request.user
        branch_id = self.request.query_params.get('branch')
        
        # Determine company scope
        if user.is_authenticated:
            if user.role == 'super_admin':
                # Super admin sees everything; optional branch filter
                if branch_id:
                    queryset = queryset.filter(
                        Q(is_global=True) | Q(branch_id=branch_id)
                    )
                return queryset
            
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if company:
                # Company-scoped: company products + truly global (company=None)
                queryset = queryset.filter(
                    Q(company=company) | Q(company__isnull=True)
                )
            else:
                # No company context — only truly global products
                queryset = queryset.filter(company__isnull=True)
        else:
            # Anonymous — only truly global products
            queryset = queryset.filter(company__isnull=True)
        
        # Branch sub-filter
        if branch_id:
            queryset = queryset.filter(
                Q(is_global=True) | Q(branch_id=branch_id)
            )
        else:
            queryset = queryset.filter(is_global=True)
        
        return queryset
    
    def perform_create(self, serializer):
        # Derive company from user context
        user = self.request.user
        company = getattr(self.request, 'company', None)
        if not company and user.is_authenticated:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            
        # Auto-populate branch if is_global is False and branch missing
        branch = serializer.validated_data.get('branch')
        is_global = serializer.validated_data.get('is_global', True)
        
        if not is_global and not branch and hasattr(user, 'branch'):
            branch = user.branch
            
        logger.info(f"Creating product: {serializer.validated_data.get('name')} for company: {company.id if company else 'NONE'}, branch: {branch.id if branch else 'GLOBAL'}")
        
        serializer.save(company=company, branch=branch)
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]


class OrderViewSet(viewsets.ModelViewSet):
    """ViewSet for Order operations."""
    queryset = Order.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'super_admin':
            return Order.objects.all()
        elif user.role == 'company_admin' and user.company:
            return Order.objects.filter(company=user.company)
        elif user.role == 'branch_admin' and user.branch:
            return Order.objects.filter(company=user.branch.company)
        else:
            customer = Customer.objects.filter(user=user).first()
            if customer:
                return Order.objects.filter(customer=customer)
            return Order.objects.none()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return OrderCreateSerializer
        return OrderSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        customer, created = Customer.objects.get_or_create(user=request.user)
        items_data = serializer.validated_data['items']
        
        # Get company from context
        user = request.user
        company = getattr(request, 'company', None)
        if not company and user.is_authenticated:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            
        logger.info(f"Creating order for customer: {customer.user.email} for company: {company.id if company else 'NONE'}")
        
        # Calculate total — scope product lookup to the user's company
        total = 0
        products = []
        for item in items_data:
            try:
                product_qs = Product.objects.filter(id=item['product_id'], is_active=True)
                if company:
                    product_qs = product_qs.filter(
                        Q(company=company) | Q(company__isnull=True)
                    )
                product = product_qs.get()
            except Product.DoesNotExist:
                return Response(
                    {'error': f"Product {item['product_id']} not found or not available."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            total += product.price * item['quantity']
            products.append((product, item['quantity']))
        
        # Create order
        order = Order.objects.create(
            company=company,
            customer=customer,
            total_amount=total,
            shipping_address=serializer.validated_data['shipping_address'],
            notes=serializer.validated_data.get('notes', '')
        )
        
        # Create order items
        for product, qty in products:
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=qty
            )
            # Reduce stock
            product.stock -= qty
            product.save()
        
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
