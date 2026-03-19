from rest_framework import serializers
from decimal import Decimal
from .models import (
    Purchase,
    PurchaseItem,
    PurchaseReturn,
    PurchaseReturnItem,
    PurchasePayment,
    SupplierLedger,
    StockMovement
)
from accounting.models import Vendor
from jobcards.parts_catalog import Part
from jobcards.serializers import PartSerializer


class TenantSerializerMixin:
    """Mixin to automatically set company from request context."""
    
    def create(self, validated_data):
        """Auto-set company from request context."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if company and 'company' not in validated_data:
                validated_data['company'] = company
        return super().create(validated_data)


class VendorSummarySerializer(serializers.ModelSerializer):
    """Lightweight vendor serializer for nested use."""
    
    class Meta:
        model = Vendor
        fields = ['id', 'name', 'email', 'phone', 'gst_number', 'current_balance', 'supplier_rating']
        read_only_fields = ['current_balance']


class PurchaseItemSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for purchase items."""
    
    part_details = PartSerializer(source='part', read_only=True)
    part_name = serializers.CharField(source='part.name', read_only=True)
    part_sku = serializers.CharField(source='part.sku', read_only=True)
    gst_total = serializers.SerializerMethodField()
    
    class Meta:
        model = PurchaseItem
        fields = [
            'id',
            'purchase',
            'part',
            'part_details',
            'part_name',
            'part_sku',
            'quantity',
            'unit_price',
            'discount',
            'gst_rate',
            'cgst_amount',
            'sgst_amount',
            'igst_amount',
            'gst_total',
            'total_amount',
            'batch_number',
            'expiry_date',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['cgst_amount', 'sgst_amount', 'igst_amount', 'total_amount', 'created_at', 'updated_at']
    
    def get_gst_total(self, obj):
        """Calculate total GST amount."""
        return obj.cgst_amount + obj.sgst_amount + obj.igst_amount


class PurchaseSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for purchases."""
    
    items = PurchaseItemSerializer(many=True, read_only=True)
    supplier_details = VendorSummarySerializer(source='supplier', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    outstanding_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Purchase
        fields = [
            'id',
            'company',
            'branch',
            'branch_name',
            'supplier',
            'supplier_details',
            'supplier_name',
            'purchase_number',
            'supplier_invoice_number',
            'purchase_date',
            'due_date',
            'subtotal',
            'discount',
            'gst_amount',
            'total_amount',
            'payment_mode',
            'payment_status',
            'paid_amount',
            'outstanding_amount',
            'status',
            'notes',
            'invoice_file',
            'created_by',
            'created_by_name',
            'approved_by',
            'approved_by_name',
            'approved_at',
            'items',
            'items_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'purchase_number',
            'subtotal',
            'gst_amount',
            'total_amount',
            'paid_amount',
            'outstanding_amount',
            'approved_at',
            'created_at',
            'updated_at'
        ]
    
    def get_items_count(self, obj):
        """Get count of items in purchase."""
        return obj.items.count()




class PurchaseItemCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating purchase items (nested in purchase creation)."""
    
    class Meta:
        model = PurchaseItem
        fields = [
            'part',
            'quantity',
            'unit_price',
            'discount',
            'gst_rate',
            'batch_number',
            'expiry_date'
        ]


class PurchaseCreateUpdateSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for creating/updating purchases with nested items."""
    
    items = PurchaseItemCreateSerializer(many=True)
    
    class Meta:
        model = Purchase
        fields = [
            'id',
            'company',
            'branch',
            'supplier',
            'supplier_invoice_number',
            'purchase_date',
            'due_date',
            'payment_mode',
            'status',
            'notes',
            'invoice_file',
            'items'
        ]
        read_only_fields = ['company']
    
    def to_internal_value(self, data):
        """Handle items field when sent as JSON string from FormData."""
        import json
        from django.http import QueryDict
        
        # If items is a string (from FormData), parse it
        if isinstance(data.get('items'), str):
            try:
                # Handle QueryDict specially to preserve single values
                if isinstance(data, QueryDict):
                    # Create a regular dict with single values
                    mutable_data = {}
                    for key in data.keys():
                        if key == 'items':
                            mutable_data[key] = json.loads(data[key])
                        else:
                            # Get single value for non-list fields
                            values = data.getlist(key)
                            mutable_data[key] = values[0] if len(values) == 1 else values
                    data = mutable_data
                else:
                    # Regular dict
                    mutable_data = dict(data)
                    mutable_data['items'] = json.loads(data['items'])
                    data = mutable_data
            except (json.JSONDecodeError, ValueError) as e:
                raise serializers.ValidationError({'items': f'Invalid JSON format: {str(e)}'})
        
        return super().to_internal_value(data)
    
    def create(self, validated_data):
        """Create purchase with items."""
        items_data = validated_data.pop('items')
        
        # Auto-set company and created_by from request
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if company and 'company' not in validated_data:
                validated_data['company'] = company
            validated_data['created_by'] = user
        
        purchase = Purchase.objects.create(**validated_data)
        
        # Create items
        for item_data in items_data:
            PurchaseItem.objects.create(purchase=purchase, **item_data)
        
        return purchase
    
    def update(self, instance, validated_data):
        """Update purchase and items."""
        items_data = validated_data.pop('items', None)
        
        # Update purchase fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update items if provided
        if items_data is not None:
            # Delete existing items and create new ones
            instance.items.all().delete()
            for item_data in items_data:
                PurchaseItem.objects.create(purchase=instance, **item_data)
        
        return instance


class PurchaseReturnItemSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for purchase return items."""
    
    part_name = serializers.CharField(source='purchase_item.part.name', read_only=True)
    part_sku = serializers.CharField(source='purchase_item.part.sku', read_only=True)
    original_quantity = serializers.DecimalField(
        source='purchase_item.quantity',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    
    class Meta:
        model = PurchaseReturnItem
        fields = [
            'id',
            'purchase_return',
            'purchase_item',
            'part_name',
            'part_sku',
            'original_quantity',
            'quantity_returned',
            'amount',
            'created_at'
        ]
        read_only_fields = ['created_at']


class PurchaseReturnSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for purchase returns."""
    
    items = PurchaseReturnItemSerializer(many=True, read_only=True)
    purchase_number = serializers.CharField(source='purchase.purchase_number', read_only=True)
    supplier_name = serializers.CharField(source='purchase.supplier.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.name', read_only=True)
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PurchaseReturn
        fields = [
            'id',
            'company',
            'purchase',
            'purchase_number',
            'supplier_name',
            'return_number',
            'return_date',
            'reason',
            'total_amount',
            'status',
            'notes',
            'created_by',
            'created_by_name',
            'approved_by',
            'approved_by_name',
            'approved_at',
            'items',
            'items_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'return_number',
            'total_amount',
            'approved_at',
            'created_at',
            'updated_at'
        ]
    
    def get_items_count(self, obj):
        """Get count of items in return."""
        return obj.items.count()


class PurchaseReturnCreateSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for creating purchase returns with nested items."""
    
    items = PurchaseReturnItemSerializer(many=True)
    
    class Meta:
        model = PurchaseReturn
        fields = [
            'id',
            'company',
            'purchase',
            'return_date',
            'reason',
            'status',
            'notes',
            'items'
        ]
        read_only_fields = ['company']
    
    def create(self, validated_data):
        """Create purchase return with items."""
        items_data = validated_data.pop('items')
        
        # Auto-set company and created_by from request
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if company and 'company' not in validated_data:
                validated_data['company'] = company
            validated_data['created_by'] = user
        
        purchase_return = PurchaseReturn.objects.create(**validated_data)
        
        # Create items
        for item_data in items_data:
            PurchaseReturnItem.objects.create(purchase_return=purchase_return, **item_data)
        
        return purchase_return


class PurchasePaymentSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for purchase payments."""
    
    purchase_number = serializers.CharField(source='purchase.purchase_number', read_only=True)
    supplier_name = serializers.CharField(source='purchase.supplier.name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.name', read_only=True)
    
    class Meta:
        model = PurchasePayment
        fields = [
            'id',
            'company',
            'purchase',
            'purchase_number',
            'supplier_name',
            'payment_date',
            'amount',
            'payment_mode',
            'reference_number',
            'notes',
            'recorded_by',
            'recorded_by_name',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['company', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """Create payment and set recorded_by and company."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            company = getattr(user, 'company', None) or (
                user.branch.company if getattr(user, 'branch', None) else None
            )
            if company and 'company' not in validated_data:
                validated_data['company'] = company
            validated_data['recorded_by'] = user
        return super(TenantSerializerMixin, self).create(validated_data)


class SupplierLedgerSerializer(serializers.ModelSerializer):
    """Serializer for supplier ledger entries."""
    
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    purchase_number = serializers.CharField(source='purchase.purchase_number', read_only=True)
    payment_amount = serializers.DecimalField(source='payment.amount', max_digits=12, decimal_places=2, read_only=True)
    return_number = serializers.CharField(source='return_entry.return_number', read_only=True)
    
    class Meta:
        model = SupplierLedger
        fields = [
            'id',
            'company',
            'supplier',
            'supplier_name',
            'transaction_date',
            'transaction_type',
            'purchase',
            'purchase_number',
            'payment',
            'payment_amount',
            'return_entry',
            'return_number',
            'debit',
            'credit',
            'balance',
            'description',
            'created_at'
        ]
        read_only_fields = ['created_at']


class StockMovementSerializer(serializers.ModelSerializer):
    """Serializer for stock movements."""
    
    part_name = serializers.CharField(source='part.name', read_only=True)
    part_sku = serializers.CharField(source='part.sku', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    
    class Meta:
        model = StockMovement
        fields = [
            'id',
            'company',
            'branch',
            'branch_name',
            'part',
            'part_name',
            'part_sku',
            'movement_type',
            'quantity',
            'reference_type',
            'reference_id',
            'date',
            'notes',
            'created_by',
            'created_by_name',
            'created_at'
        ]
        read_only_fields = ['created_at']
