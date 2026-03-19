from rest_framework import serializers
from .models import Invoice, InvoiceItem
from customers.serializers import CustomerSerializer, CustomerLightSerializer
from companies.serializers import TenantSerializerMixin


class InvoiceItemSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for InvoiceItem model."""
    
    class Meta:
        model = InvoiceItem
        fields = ['id', 'item_type', 'description', 'quantity', 'unit_price', 'total', 'product', 'company']
        read_only_fields = ['id', 'company', 'total']


class InvoiceSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for Invoice model."""
    items = InvoiceItemSerializer(many=True, read_only=True)
    customer_details = CustomerSerializer(source='customer', read_only=True)
    
    # Payment tracking fields
    amount_paid = serializers.SerializerMethodField()
    amount_remaining = serializers.SerializerMethodField()
    payment_details = serializers.SerializerMethodField()
    payments = serializers.SerializerMethodField()  # Alias for payment_details
    
    # Wallet fields
    wallet_balance = serializers.SerializerMethodField()
    can_use_wallet = serializers.SerializerMethodField()
    
    # Validation field
    calculated_total = serializers.SerializerMethodField()
    breakdown = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['id', 'company', 'invoice_number', 'subtotal', 'tax_amount', 'discount_amount', 'total_amount', 
                           'issued_date', 'paid_date', 'created_at', 'updated_at']
    
    def get_breakdown(self, obj):
        """Get summary of items by type using prefetched items."""
        breakdown = {
            'services': 0.0,
            'parts': 0.0,
            'products': 0.0,
            'addons': 0.0,
            'others': 0.0
        }
        # Use .all() to leverage prefetched items
        for item in obj.items.all():
            val = float(item.total)
            if item.item_type == 'service': breakdown['services'] += val
            elif item.item_type == 'part': breakdown['parts'] += val
            elif item.item_type == 'product': breakdown['products'] += val
            elif item.item_type == 'addon': breakdown['addons'] += val
            else: breakdown['others'] += val
        return breakdown
    
    def get_amount_paid(self, obj):
        """Calculate total amount paid using prefetched payments."""
        # Filter completed payments in memory to avoid DB query
        total_paid = sum(
            p.amount for p in obj.payments.all() if p.payment_status == 'completed'
        )
        return float(total_paid)
    
    def get_amount_remaining(self, obj):
        """Calculate remaining amount to be paid."""
        amount_paid = self.get_amount_paid(obj)
        return float(obj.total_amount) - amount_paid
    
    def get_payment_details(self, obj):
        """Get complete payment history using prefetched payments."""
        # Sort in memory since it's already prefetched
        payments = sorted(obj.payments.all(), key=lambda p: p.payment_date or p.created_at, reverse=True)
        return [{
            'id': p.id,
            'amount': float(p.amount),
            'payment_method': p.payment_method,
            'payment_method_display': p.get_payment_method_display(),
            'payment_status': p.payment_status,
            'payment_status_display': p.get_payment_status_display(),
            'transaction_id': p.transaction_id,
            'reference_number': p.reference_number,
            'payment_date': p.payment_date.isoformat() if p.payment_date else None,
            'recorded_by': p.recorded_by.name if p.recorded_by else None,
            'notes': p.notes,
            'coupon_discount': float(p.coupon_discount) if p.coupon_discount else 0,
            'gift_card_amount': float(p.gift_card_amount) if p.gift_card_amount else 0,
            'wallet_amount': float(p.wallet_amount) if p.wallet_amount else 0,
        } for p in payments]

    def get_payments(self, obj):
        """Alias for payment_details to support frontend."""
        return self.get_payment_details(obj)
    
    def get_wallet_balance(self, obj):
        """Get customer's current wallet balance using prefetched relation."""
        # Use getattr to leverage prefetched customer__wallet
        wallet = getattr(obj.customer, 'wallet', None)
        if wallet:
            return float(wallet.balance)
        return 0.0
    
    def get_can_use_wallet(self, obj):
        """Check if customer has wallet balance available."""
        wallet_balance = self.get_wallet_balance(obj)
        return wallet_balance > 0 and obj.status != 'paid'
    
    def get_calculated_total(self, obj):
        """Calculate what the total should be based on the formula."""
        from decimal import Decimal
        # Ensure discount_amount is Decimal (not string)
        discount_amount = Decimal(str(obj.discount_amount)) if obj.discount_amount else Decimal('0')
        calculated = obj.subtotal + obj.tax_amount - discount_amount
        return float(calculated)
    
    def to_representation(self, instance):
        """Add validation warning if total_amount doesn't match calculation."""
        data = super().to_representation(instance)
        
        # Check if total_amount matches the calculation
        from decimal import Decimal
        # Ensure discount_amount is Decimal (not string)
        discount_amount = Decimal(str(instance.discount_amount)) if instance.discount_amount else Decimal('0')
        calculated = instance.subtotal + instance.tax_amount - discount_amount
        difference = abs(instance.total_amount - calculated)
        
        # Add warning if difference is more than 0.01 (1 paisa)
        if difference > Decimal('0.01'):
            data['calculation_warning'] = {
                'message': 'Total amount does not match calculation',
                'stored_total': float(instance.total_amount),
                'calculated_total': float(calculated),
                'difference': float(difference)
            }
        
        return data


class InvoiceListSerializer(InvoiceSerializer):
    """Lighter version of InvoiceSerializer for list views."""
    customer_details = CustomerLightSerializer(source='customer', read_only=True)
    
    # Prune heavy nested items for list view if items aren't needed
    items = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    
    class Meta(InvoiceSerializer.Meta):
        # We can also omit fields that aren't used in the list view table
        fields = [
            'id', 'invoice_number', 'customer', 'customer_details', 'status', 
            'total_amount', 'amount_paid', 'amount_remaining', 'issued_date', 
            'due_date', 'branch', 'jobcard', 'breakdown', 'payment_details',
            'tax_rate'
        ]


class InvoiceCreateSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for creating invoices with line items."""
    items = InvoiceItemSerializer(many=True)
    
    class Meta:
        model = Invoice
        fields = ['customer', 'booking', 'jobcard', 'tax_rate', 'discount_type', 
                 'discount_percentage', 'discount_amount', 'discount_reason', 'notes', 'due_date', 'items',
                 'system_discount_amount', 'additional_discount_type', 'additional_discount_percentage', 'additional_discount_amount', 'company']
        read_only_fields = ['id', 'company']
    
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # Generate invoice number
        import datetime
        import random
        invoice_number = f"INV-{datetime.datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
        
        invoice = Invoice.objects.create(invoice_number=invoice_number, **validated_data)
        
        # Bulk create invoice items
        invoice_items = [
            InvoiceItem(invoice=invoice, **item_data)
            for item_data in items_data
        ]
        if invoice_items:
            InvoiceItem.objects.bulk_create(invoice_items)
        
        # Calculate totals
        invoice.calculate_totals()
        
        return invoice


class InvoiceUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating invoice."""
    
    class Meta:
        model = Invoice
        fields = ['status', 'tax_rate', 'discount_type', 'discount_percentage', 
                 'discount_amount', 'discount_reason', 'notes', 'due_date',
                 'system_discount_amount', 'additional_discount_type', 'additional_discount_percentage', 'additional_discount_amount']

