from rest_framework import viewsets, status, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
from django.db.models import Q, Sum, F
from decimal import Decimal

from .parts_catalog import Part, BranchStock, StockTransfer
from .stock_serializers import (
    BranchStockSerializer,
    BranchStockUpdateSerializer,
    StockTransferSerializer,
    StockTransferCreateSerializer,
    StockTransferActionSerializer
)


class BranchStockViewSet(viewsets.ModelViewSet):
    """ViewSet for managing branch stock levels."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = BranchStockSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['part__name', 'part__sku', 'branch__name', 'location']
    ordering_fields = ['part__name', 'quantity', 'branch__name', 'created_at']
    ordering = ['part__name']
    
    def get_queryset(self):
        """Filter stock by company and optionally by branch."""
        user = self.request.user
        
        # Determine company context (Mandatory for non-superusers)
        company = None
        if not user.is_superuser:
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if not company:
                return BranchStock.objects.none()

        # Start with company isolation
        if user.is_superuser:
            queryset = BranchStock.objects.all_companies()
        else:
            queryset = BranchStock.objects.filter(company=company)
        
        # Branch filtering - consistent with multi-branch system
        if not user.is_superuser:
            if user.role == 'branch_admin' and user.branch:
                # Branch admin is restricted to their branch
                queryset = queryset.filter(branch=user.branch)
            elif user.role == 'company_admin':
                # company_admin sees all branches in their company (already filtered)
                pass
            elif hasattr(user, 'branch') and user.branch:
                # Other roles default to their branch
                queryset = queryset.filter(branch=user.branch)
            else:
                # Other roles without branch can't see branch stock
                return BranchStock.objects.none()
        
        # Explicit branch filtering from query parameter
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            # Re-apply branch filter (will naturally intersect with above restrictions)
            if ',' in str(branch_id):
                queryset = queryset.filter(branch_id__in=branch_id.split(','))
            else:
                queryset = queryset.filter(branch_id=branch_id)
        
        # Filter by part if specified
        part_id = self.request.query_params.get('part')
        if part_id:
            queryset = queryset.filter(part_id=part_id)
        
        # Filter by stock status
        stock_status = self.request.query_params.get('stock_status')
        if stock_status == 'out_of_stock':
            queryset = queryset.filter(quantity=0)
        elif stock_status == 'low_stock':
            queryset = queryset.filter(quantity__gt=0, quantity__lte=F('min_stock_level'))
        elif stock_status == 'in_stock':
            queryset = queryset.filter(quantity__gt=F('min_stock_level'))
        
        return queryset.select_related('branch', 'part', 'company')
    
    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        """Adjust stock quantity (add or deduct)."""
        branch_stock = self.get_object()
        serializer = BranchStockUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            quantity_change = serializer.validated_data['quantity']
            notes = serializer.validated_data.get('notes', '')
            
            # Validate deduction doesn't go negative
            new_quantity = branch_stock.quantity + quantity_change
            if new_quantity < 0:
                return Response(
                    {'error': f'Cannot deduct {abs(quantity_change)}. Only {branch_stock.quantity} available.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create stock movement record instead of direct update
            # The signal in jobcards/stock_signals.py will update the BranchStock quantity
            from purchases.models import StockMovement
            StockMovement.objects.create(
                company=branch_stock.company,
                branch=branch_stock.branch,
                part=branch_stock.part,
                movement_type='adjustment',
                quantity=quantity_change,
                reference_type='manual_adjustment',
                reference_id=branch_stock.id,
                date=timezone.now(),
                notes=notes,
                created_by=request.user
            )
            
            # Re-fetch branch_stock to get updated quantity (from signal)
            branch_stock.refresh_from_db()
            
            return Response({
                'message': 'Stock adjusted successfully',
                'new_quantity': branch_stock.quantity,
                'stock_status': branch_stock.stock_status
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def by_part(self, request):
        """Get stock levels across all branches for a specific part."""
        part_id = request.query_params.get('part_id')
        if not part_id:
            return Response(
                {'error': 'part_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        stocks = self.get_queryset().filter(part_id=part_id)
        serializer = self.get_serializer(stocks, many=True)
        
        # Calculate totals
        total_quantity = stocks.aggregate(total=Sum('quantity'))['total'] or 0
        
        return Response({
            'part_id': part_id,
            'total_quantity': total_quantity,
            'branch_stocks': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def low_stock_alert(self, request):
        """Get all low stock items across branches."""
        low_stock = self.get_queryset().filter(
            Q(quantity=0) | Q(quantity__lte=F('min_stock_level'))
        )
        serializer = self.get_serializer(low_stock, many=True)
        return Response(serializer.data)
    
    def _update_total_stock(self, part):
        """Update total stock for a part based on branch stocks."""
        total = BranchStock.objects.filter(part=part).aggregate(
            total=Sum('quantity')
        )['total'] or 0
        part.stock = int(total)
        part.save(update_fields=['stock'])


class StockTransferViewSet(viewsets.ModelViewSet):
    """ViewSet for managing stock transfers between branches."""
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Use different serializers for create vs read."""
        if self.action == 'create':
            return StockTransferCreateSerializer
        return StockTransferSerializer
    
    def get_queryset(self):
        """Filter transfers by company and optionally by branch/status."""
        user = self.request.user
        queryset = StockTransfer.objects.filter(company=user.company)
        
        # Filter by status
        transfer_status = self.request.query_params.get('status')
        if transfer_status:
            queryset = queryset.filter(status=transfer_status)
        
        # Branch filtering - consistent with multi-branch system
        branch_id = self.request.query_params.get('branch')
        if not user.is_superuser:
            if user.role == 'branch_admin' and user.branch:
                # Branch admin only see transfers involving their branch
                queryset = queryset.filter(Q(from_branch=user.branch) | Q(to_branch=user.branch))
            elif user.role == 'company_admin' and user.company:
                # Company admin already filtered by company=user.company above
                pass
            elif hasattr(user, 'branch') and user.branch:
                # Other roles default to their branch
                queryset = queryset.filter(Q(from_branch=user.branch) | Q(to_branch=user.branch))
        
        # Explicit branch filtering from query parameter
        if branch_id:
            queryset = queryset.filter(Q(from_branch_id=branch_id) | Q(to_branch_id=branch_id))
        
        # Filter by from_branch
        from_branch_id = self.request.query_params.get('from_branch')
        if from_branch_id:
            queryset = queryset.filter(from_branch_id=from_branch_id)
        
        # Filter by to_branch
        to_branch_id = self.request.query_params.get('to_branch')
        if to_branch_id:
            queryset = queryset.filter(to_branch_id=to_branch_id)
        
        return queryset.select_related(
            'part', 'from_branch', 'to_branch',
            'requested_by', 'approved_by', 'received_by'
        )
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get all pending transfer requests."""
        pending_transfers = self.get_queryset().filter(status='pending')
        serializer = self.get_serializer(pending_transfers, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def approve(self, request, pk=None):
        """Approve a transfer request and deduct stock from source branch."""
        transfer = self.get_object()
        
        if transfer.status != 'pending':
            return Response(
                {'error': f'Cannot approve transfer with status: {transfer.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check stock availability again
        try:
            source_stock = BranchStock.objects.select_for_update().get(
                branch=transfer.from_branch,
                part=transfer.part
            )
            
            if source_stock.quantity < transfer.quantity:
                return Response(
                    {'error': f'Insufficient stock. Available: {source_stock.quantity}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create stock movement record instead of direct update
            from purchases.models import StockMovement
            StockMovement.objects.create(
                company=transfer.company,
                branch=transfer.from_branch,
                part=transfer.part,
                movement_type='transfer',
                quantity=-transfer.quantity,  # Negative for outbound transfer
                reference_type='transfer_out',
                reference_id=transfer.id,
                date=timezone.now(),
                notes=f'Transfer OUT to {transfer.to_branch.name} ({transfer.transfer_number})',
                created_by=request.user
            )
            
            # Update transfer status
            transfer.status = 'approved'
            transfer.approved_by = request.user
            transfer.approved_at = timezone.now()
            transfer.save()
            
            serializer = self.get_serializer(transfer)
            return Response({
                'message': 'Transfer approved successfully',
                'transfer': serializer.data
            })
            
        except BranchStock.DoesNotExist:
            return Response(
                {'error': 'Source branch stock not found'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a transfer request."""
        transfer = self.get_object()
        
        if transfer.status != 'pending':
            return Response(
                {'error': f'Cannot reject transfer with status: {transfer.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        transfer.status = 'rejected'
        transfer.approved_by = request.user
        transfer.approved_at = timezone.now()
        
        # Add rejection notes if provided
        serializer = StockTransferActionSerializer(data=request.data)
        if serializer.is_valid():
            notes = serializer.validated_data.get('notes', '')
            if notes:
                transfer.notes = f"{transfer.notes}\n\nRejection reason: {notes}" if transfer.notes else f"Rejection reason: {notes}"
        
        transfer.save()
        
        response_serializer = self.get_serializer(transfer)
        return Response({
            'message': 'Transfer rejected',
            'transfer': response_serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def mark_in_transit(self, request, pk=None):
        """Mark transfer as in transit (shipped)."""
        transfer = self.get_object()
        
        if transfer.status != 'approved':
            return Response(
                {'error': f'Can only mark approved transfers as in transit'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        transfer.status = 'in_transit'
        transfer.shipped_at = timezone.now()
        transfer.save()
        
        serializer = self.get_serializer(transfer)
        return Response({
            'message': 'Transfer marked as in transit',
            'transfer': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def mark_received(self, request, pk=None):
        """Mark transfer as received and add stock to destination branch."""
        transfer = self.get_object()
        
        if transfer.status not in ['approved', 'in_transit']:
            return Response(
                {'error': f'Cannot receive transfer with status: {transfer.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create stock movement record instead of direct update
        from purchases.models import StockMovement
        StockMovement.objects.create(
            company=transfer.company,
            branch=transfer.to_branch,
            part=transfer.part,
            movement_type='transfer',
            quantity=transfer.quantity,  # Positive for inbound transfer
            reference_type='transfer_in',
            reference_id=transfer.id,
            date=timezone.now(),
            notes=f'Transfer IN from {transfer.from_branch.name} ({transfer.transfer_number})',
            created_by=request.user
        )
        
        # Update transfer status
        transfer.status = 'received'
        transfer.received_by = request.user
        transfer.received_at = timezone.now()
        transfer.save()
        
        serializer = self.get_serializer(transfer)
        return Response({
            'message': 'Transfer received successfully',
            'transfer': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a transfer request (only if pending or approved)."""
        transfer = self.get_object()
        
        if transfer.status not in ['pending', 'approved']:
            return Response(
                {'error': f'Cannot cancel transfer with status: {transfer.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # If approved, return stock to source
        if transfer.status == 'approved':
            from purchases.models import StockMovement
            StockMovement.objects.create(
                company=transfer.company,
                branch=transfer.from_branch,
                part=transfer.part,
                movement_type='adjustment',
                quantity=transfer.quantity,  # Positive to return stock
                reference_type='transfer_cancel',
                reference_id=transfer.id,
                date=timezone.now(),
                notes=f'Transfer {transfer.transfer_number} cancelled - Stock returned',
                created_by=request.user
            )
        
        transfer.status = 'cancelled'
        transfer.save()
        
        serializer = self.get_serializer(transfer)
        return Response({
            'message': 'Transfer cancelled',
            'transfer': serializer.data
        })
    
    def _update_total_stock(self, part):
        """Update total stock for a part based on branch stocks."""
        total = BranchStock.objects.filter(part=part).aggregate(
            total=Sum('quantity')
        )['total'] or 0
        part.stock = int(total)
        part.save(update_fields=['stock'])
