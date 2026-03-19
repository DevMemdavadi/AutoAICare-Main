from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Count, F
from django.utils import timezone
from decimal import Decimal
from datetime import datetime, timedelta

from .models import (
    Purchase,
    PurchaseItem,
    PurchaseReturn,
    PurchaseReturnItem,
    PurchasePayment,
    SupplierLedger,
    StockMovement
)
from .serializers import (
    PurchaseSerializer,
    PurchaseCreateUpdateSerializer,
    PurchaseItemSerializer,
    PurchaseReturnSerializer,
    PurchaseReturnCreateSerializer,
    PurchaseReturnItemSerializer,
    PurchasePaymentSerializer,
    SupplierLedgerSerializer,
    StockMovementSerializer
)


class PurchaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing purchases.
    
    Provides CRUD operations plus:
    - approve: Approve a purchase
    - cancel: Cancel a purchase
    - summary: Get purchase summary statistics
    """
    
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_status', 'supplier', 'branch', 'purchase_date']
    search_fields = ['purchase_number', 'supplier_invoice_number', 'supplier__name']
    ordering_fields = ['purchase_date', 'total_amount', 'created_at']
    ordering = ['-purchase_date', '-created_at']
    
    def get_queryset(self):
        """Filter purchases by company and user role."""
        user = self.request.user
        queryset = Purchase.objects.select_related(
            'company', 'branch', 'supplier', 'created_by', 'approved_by'
        ).prefetch_related('items', 'items__part')
        
        # Filter by company
        if user.role == 'super_admin':
            return queryset
        
        company = getattr(user, 'company', None) or (
            user.branch.company if getattr(user, 'branch', None) else None
        )
        if not company:
            return queryset.none()
        
        queryset = queryset.filter(company=company)
        
        # Branch-level filtering for branch admins
        if user.role == 'branch_admin' and user.branch:
            queryset = queryset.filter(branch=user.branch)
        
        return queryset
    
    def get_serializer_class(self):
        """Use different serializers for create/update vs list/retrieve."""
        if self.action in ['create', 'update', 'partial_update']:
            return PurchaseCreateUpdateSerializer
        return PurchaseSerializer
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a purchase."""
        purchase = self.get_object()
        
        # Check if already approved
        if purchase.status == 'approved':
            return Response(
                {'error': 'Purchase is already approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if purchase has items
        if not purchase.items.exists():
            return Response(
                {'error': 'Cannot approve purchase without items'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Approve purchase
        purchase.status = 'approved'
        purchase.approved_by = request.user
        purchase.approved_at = timezone.now()
        purchase.save()
        
        serializer = self.get_serializer(purchase)
        return Response({
            'message': 'Purchase approved successfully',
            'purchase': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a purchase."""
        purchase = self.get_object()
        
        # Check if already approved
        if purchase.status == 'approved':
            return Response(
                {'error': 'Cannot cancel approved purchase. Create a return instead.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        purchase.status = 'cancelled'
        purchase.save()
        
        serializer = self.get_serializer(purchase)
        return Response({
            'message': 'Purchase cancelled successfully',
            'purchase': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get purchase summary statistics."""
        queryset = self.get_queryset()
        
        # Filters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        branch_id = request.query_params.get('branch')
        
        if start_date:
            queryset = queryset.filter(purchase_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(purchase_date__lte=end_date)
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        
        # Calculate statistics
        stats = queryset.aggregate(
            total_purchases=Count('id'),
            total_amount=Sum('total_amount'),
            total_paid=Sum('paid_amount'),
            approved_count=Count('id', filter=Q(status='approved')),
            pending_count=Count('id', filter=Q(status__in=['draft', 'pending_approval'])),
        )
        
        # Outstanding amount
        stats['outstanding_amount'] = (stats['total_amount'] or 0) - (stats['total_paid'] or 0)
        
        # Top suppliers
        top_suppliers = queryset.values(
            'supplier__id',
            'supplier__name'
        ).annotate(
            total_amount=Sum('total_amount'),
            purchase_count=Count('id')
        ).order_by('-total_amount')[:5]
        
        return Response({
            'statistics': stats,
            'top_suppliers': top_suppliers
        })
    
    @action(detail=False, methods=['get'])
    def pending_approvals(self, request):
        """Get purchases pending approval."""
        queryset = self.get_queryset().filter(status='pending_approval')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class PurchaseItemViewSet(viewsets.ModelViewSet):
    """ViewSet for managing purchase items."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = PurchaseItemSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['purchase', 'part']
    search_fields = ['part__name', 'part__sku']
    
    def get_queryset(self):
        """Filter items by company."""
        user = self.request.user
        queryset = PurchaseItem.objects.select_related('purchase', 'part')
        
        if user.role == 'super_admin':
            return queryset
        
        company = getattr(user, 'company', None) or (
            user.branch.company if getattr(user, 'branch', None) else None
        )
        if not company:
            return queryset.none()
        
        return queryset.filter(purchase__company=company)


class PurchaseReturnViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing purchase returns.
    
    Provides CRUD operations plus:
    - approve: Approve a return
    - cancel: Cancel a return
    """
    
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'purchase', 'return_date']
    search_fields = ['return_number', 'purchase__purchase_number']
    ordering_fields = ['return_date', 'total_amount', 'created_at']
    ordering = ['-return_date', '-created_at']
    
    def get_queryset(self):
        """Filter returns by company."""
        user = self.request.user
        queryset = PurchaseReturn.objects.select_related(
            'company', 'purchase', 'purchase__supplier', 'created_by', 'approved_by'
        ).prefetch_related('items', 'items__purchase_item__part')
        
        if user.role == 'super_admin':
            return queryset
        
        company = getattr(user, 'company', None) or (
            user.branch.company if getattr(user, 'branch', None) else None
        )
        if not company:
            return queryset.none()
        
        queryset = queryset.filter(company=company)
        
        # Branch-level filtering
        if user.role == 'branch_admin' and user.branch:
            queryset = queryset.filter(purchase__branch=user.branch)
        
        return queryset
    
    def get_serializer_class(self):
        """Use different serializers for create vs list/retrieve."""
        if self.action in ['create', 'update', 'partial_update']:
            return PurchaseReturnCreateSerializer
        return PurchaseReturnSerializer
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a purchase return."""
        purchase_return = self.get_object()
        
        # Check if already approved
        if purchase_return.status == 'approved':
            return Response(
                {'error': 'Return is already approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if return has items
        if not purchase_return.items.exists():
            return Response(
                {'error': 'Cannot approve return without items'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Approve return
        purchase_return.status = 'approved'
        purchase_return.approved_by = request.user
        purchase_return.approved_at = timezone.now()
        purchase_return.save()
        
        serializer = self.get_serializer(purchase_return)
        return Response({
            'message': 'Return approved successfully',
            'return': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a purchase return."""
        purchase_return = self.get_object()
        
        # Check if already approved
        if purchase_return.status == 'approved':
            return Response(
                {'error': 'Cannot cancel approved return'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        purchase_return.status = 'cancelled'
        purchase_return.save()
        
        serializer = self.get_serializer(purchase_return)
        return Response({
            'message': 'Return cancelled successfully',
            'return': serializer.data
        })


class PurchasePaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing purchase payments."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = PurchasePaymentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['purchase', 'payment_mode', 'payment_date']
    search_fields = ['purchase__purchase_number', 'reference_number']
    ordering_fields = ['payment_date', 'amount', 'created_at']
    ordering = ['-payment_date', '-created_at']
    
    def get_queryset(self):
        """Filter payments by company."""
        user = self.request.user
        queryset = PurchasePayment.objects.select_related(
            'company', 'purchase', 'purchase__supplier', 'recorded_by'
        )
        
        if user.role == 'super_admin':
            return queryset
        
        company = getattr(user, 'company', None) or (
            user.branch.company if getattr(user, 'branch', None) else None
        )
        if not company:
            return queryset.none()
        
        return queryset.filter(company=company)
    
    @action(detail=False, methods=['get'])
    def outstanding_purchases(self, request):
        """Get purchases with outstanding payments."""
        user = request.user
        
        if user.role == 'super_admin':
            base_qs = Purchase.objects.all()
        else:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return Response([])
            base_qs = Purchase.objects.filter(company=company)
        
        # Get purchases with outstanding amounts
        queryset = base_qs.filter(
            status='approved'
        ).annotate(
            outstanding=F('total_amount') - F('paid_amount')
        ).filter(outstanding__gt=0).select_related('supplier')
        
        # Serialize
        data = []
        for purchase in queryset:
            data.append({
                'id': purchase.id,
                'purchase_number': purchase.purchase_number,
                'supplier_name': purchase.supplier.name,
                'total_amount': purchase.total_amount,
                'paid_amount': purchase.paid_amount,
                'outstanding_amount': purchase.outstanding_amount,
                'purchase_date': purchase.purchase_date,
                'due_date': purchase.due_date
            })
        
        return Response(data)


class SupplierLedgerViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for supplier ledger.
    Ledger entries are created automatically via signals.
    """
    
    permission_classes = [IsAuthenticated]
    serializer_class = SupplierLedgerSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['supplier', 'transaction_type', 'transaction_date']
    ordering_fields = ['transaction_date', 'created_at']
    ordering = ['-transaction_date', '-created_at']
    
    def get_queryset(self):
        """Filter ledger by company."""
        user = self.request.user
        queryset = SupplierLedger.objects.select_related(
            'company', 'supplier', 'purchase', 'payment', 'return_entry'
        )
        
        if user.role == 'super_admin':
            return queryset
        
        company = getattr(user, 'company', None) or (
            user.branch.company if getattr(user, 'branch', None) else None
        )
        if not company:
            return queryset.none()
        
        return queryset.filter(company=company)
    
    @action(detail=False, methods=['get'])
    def supplier_statement(self, request):
        """Get detailed statement for a supplier."""
        supplier_id = request.query_params.get('supplier_id')
        
        if not supplier_id:
            return Response(
                {'error': 'supplier_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(supplier_id=supplier_id)
        
        # Date range filter
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(transaction_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(transaction_date__lte=end_date)
        
        serializer = self.get_serializer(queryset, many=True)
        
        # Calculate totals
        totals = queryset.aggregate(
            total_debit=Sum('debit'),
            total_credit=Sum('credit')
        )
        
        return Response({
            'entries': serializer.data,
            'totals': totals,
            'final_balance': queryset.last().balance if queryset.exists() else 0
        })


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for stock movements.
    Movements are created automatically via signals.
    """
    
    permission_classes = [IsAuthenticated]
    serializer_class = StockMovementSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['part', 'movement_type', 'branch', 'date']
    ordering_fields = ['date', 'created_at']
    ordering = ['-date', '-created_at']
    
    def get_queryset(self):
        """Filter movements by company."""
        user = self.request.user
        queryset = StockMovement.objects.select_related(
            'company', 'branch', 'part', 'created_by'
        )
        
        if user.role == 'super_admin':
            return queryset
        
        company = getattr(user, 'company', None) or (
            user.branch.company if getattr(user, 'branch', None) else None
        )
        if not company:
            return queryset.none()
        
        queryset = queryset.filter(company=company)
        
        # Branch-level filtering
        if user.role == 'branch_admin' and user.branch:
            queryset = queryset.filter(branch=user.branch)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def part_history(self, request):
        """Get movement history for a specific part."""
        part_id = request.query_params.get('part_id')
        
        if not part_id:
            return Response(
                {'error': 'part_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(part_id=part_id)
        
        # Date range filter
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        serializer = self.get_serializer(queryset, many=True)
        
        # Calculate totals
        totals = queryset.aggregate(
            total_in=Sum('quantity', filter=Q(quantity__gt=0)),
            total_out=Sum('quantity', filter=Q(quantity__lt=0))
        )
        
        return Response({
            'movements': serializer.data,
            'totals': totals
        })


class PurchaseReportsViewSet(viewsets.ViewSet):
    """ViewSet for purchase reports and analytics."""
    
    permission_classes = [IsAuthenticated]
    
    def get_base_queryset(self):
        """Get base queryset filtered by company."""
        user = self.request.user
        queryset = Purchase.objects.filter(status='approved')
        
        if user.role == 'super_admin':
            return queryset
        
        company = getattr(user, 'company', None) or (
            user.branch.company if getattr(user, 'branch', None) else None
        )
        if not company:
            return queryset.none()
        
        return queryset.filter(company=company)
    
    @action(detail=False, methods=['get'])
    def gst_input_report(self, request):
        """Generate GST input tax credit report."""
        queryset = self.get_base_queryset()
        
        # Date range filter
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(purchase_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(purchase_date__lte=end_date)
        
        # Get all purchase items
        items = PurchaseItem.objects.filter(purchase__in=queryset)
        
        # Calculate GST totals
        gst_summary = items.aggregate(
            total_cgst=Sum('cgst_amount'),
            total_sgst=Sum('sgst_amount'),
            total_igst=Sum('igst_amount'),
            total_taxable_value=Sum(F('quantity') * F('unit_price') - F('discount'))
        )
        
        gst_summary['total_gst'] = (
            (gst_summary['total_cgst'] or 0) +
            (gst_summary['total_sgst'] or 0) +
            (gst_summary['total_igst'] or 0)
        )
        
        # Group by GST rate
        by_gst_rate = items.values('gst_rate').annotate(
            taxable_value=Sum(F('quantity') * F('unit_price') - F('discount')),
            cgst=Sum('cgst_amount'),
            sgst=Sum('sgst_amount'),
            igst=Sum('igst_amount'),
            total_gst=Sum(F('cgst_amount') + F('sgst_amount') + F('igst_amount'))
        ).order_by('gst_rate')
        
        return Response({
            'summary': gst_summary,
            'by_gst_rate': by_gst_rate,
            'period': {
                'start_date': start_date,
                'end_date': end_date
            }
        })
    
    @action(detail=False, methods=['get'])
    def supplier_wise_report(self, request):
        """Generate supplier-wise purchase report."""
        queryset = self.get_base_queryset()
        
        # Date range filter
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(purchase_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(purchase_date__lte=end_date)
        
        # Group by supplier
        supplier_data = queryset.values(
            'supplier__id',
            'supplier__name',
            'supplier__gst_number'
        ).annotate(
            total_purchases=Count('id'),
            total_amount=Sum('total_amount'),
            total_paid=Sum('paid_amount'),
            outstanding=Sum(F('total_amount') - F('paid_amount'))
        ).order_by('-total_amount')
        
        return Response({
            'suppliers': supplier_data,
            'period': {
                'start_date': start_date,
                'end_date': end_date
            }
        })
    
    @action(detail=False, methods=['get'])
    def monthly_trend(self, request):
        """Get monthly purchase trend."""
        queryset = self.get_base_queryset()
        
        # Get last 12 months
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=365)
        
        queryset = queryset.filter(
            purchase_date__gte=start_date,
            purchase_date__lte=end_date
        )
        
        # Group by month
        from django.db.models.functions import TruncMonth
        
        monthly_data = queryset.annotate(
            month=TruncMonth('purchase_date')
        ).values('month').annotate(
            purchase_count=Count('id'),
            total_amount=Sum('total_amount')
        ).order_by('month')
        
        return Response({
            'monthly_trend': monthly_data
        })
