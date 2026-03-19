from rest_framework import serializers
from decimal import Decimal
from .parts_catalog import Part, BranchStock, StockTransfer
from branches.models import Branch
from companies.serializers import TenantSerializerMixin


class BranchStockSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for branch stock levels."""
    
    part_name = serializers.CharField(source='part.name', read_only=True)
    part_sku = serializers.CharField(source='part.sku', read_only=True)
    part_unit = serializers.CharField(source='part.unit', read_only=True)
    stock_tracking_mode = serializers.CharField(source='part.stock_tracking_mode', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    stock_status = serializers.CharField(read_only=True)
    
    class Meta:
        model = BranchStock
        fields = [
            'id',
            'company',
            'branch',
            'branch_name',
            'part',
            'part_name',
            'part_sku',
            'part_unit',
            'stock_tracking_mode',
            'quantity',
            'min_stock_level',
            'location',
            'stock_status',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['company', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """Auto-set company from request."""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.company:
            validated_data['company'] = request.user.company
        return super().create(validated_data)


class BranchStockUpdateSerializer(serializers.Serializer):
    """Serializer for updating branch stock quantity."""
    
    quantity = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Quantity to add (positive) or deduct (negative)'
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text='Optional notes about the stock change'
    )


class StockTransferSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for stock transfers."""
    
    part_name = serializers.CharField(source='part.name', read_only=True)
    part_sku = serializers.CharField(source='part.sku', read_only=True)
    part_unit = serializers.CharField(source='part.unit', read_only=True)
    from_branch_name = serializers.CharField(source='from_branch.name', read_only=True)
    to_branch_name = serializers.CharField(source='to_branch.name', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True, allow_null=True)
    received_by_name = serializers.CharField(source='received_by.get_full_name', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = StockTransfer
        fields = [
            'id',
            'company',
            'transfer_number',
            'part',
            'part_name',
            'part_sku',
            'part_unit',
            'quantity',
            'from_branch',
            'from_branch_name',
            'to_branch',
            'to_branch_name',
            'status',
            'status_display',
            'reason',
            'notes',
            'requested_by',
            'requested_by_name',
            'approved_by',
            'approved_by_name',
            'received_by',
            'received_by_name',
            'requested_at',
            'approved_at',
            'shipped_at',
            'received_at',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'company',
            'transfer_number',
            'requested_by',
            'approved_by',
            'received_by',
            'requested_at',
            'approved_at',
            'shipped_at',
            'received_at',
            'created_at',
            'updated_at'
        ]


class StockTransferCreateSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for creating stock transfer requests."""
    
    class Meta:
        model = StockTransfer
        fields = [
            'part',
            'quantity',
            'from_branch',
            'to_branch',
            'reason',
            'notes'
        ]
    
    def validate(self, data):
        """Validate transfer request."""
        # Check if branches are different
        if data['from_branch'] == data['to_branch']:
            raise serializers.ValidationError({
                'to_branch': 'Cannot transfer to the same branch'
            })
        
        # Check if quantity is positive
        if data['quantity'] <= 0:
            raise serializers.ValidationError({
                'quantity': 'Quantity must be positive'
            })
        
        # All parts can be transferred if they have branch stock records
        part = data['part']
        
        # Check if source branch has enough stock
        try:
            branch_stock = BranchStock.objects.get(
                branch=data['from_branch'],
                part=part
            )
            if branch_stock.quantity < data['quantity']:
                raise serializers.ValidationError({
                    'quantity': f'Insufficient stock at {data["from_branch"].name}. Available: {branch_stock.quantity}'
                })
        except BranchStock.DoesNotExist:
            raise serializers.ValidationError({
                'from_branch': f'No stock record found for this part at {data["from_branch"].name}'
            })
        
        return data
    
    def create(self, validated_data):
        """Create transfer request with auto-set fields."""
        request = self.context.get('request')
        
        # Auto-set company and requested_by
        if request and hasattr(request, 'user'):
            if request.user.company:
                validated_data['company'] = request.user.company
            validated_data['requested_by'] = request.user
        
        return super().create(validated_data)


class StockTransferActionSerializer(serializers.Serializer):
    """Serializer for transfer actions (approve, reject, etc)."""
    
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text='Optional notes about this action'
    )
