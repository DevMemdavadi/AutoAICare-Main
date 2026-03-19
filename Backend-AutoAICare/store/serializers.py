from rest_framework import serializers
from .models import Product, Order, OrderItem
from branches.serializers import BranchListSerializer
from companies.serializers import TenantSerializerMixin


class ProductSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for Product model."""
    branch_details = BranchListSerializer(source='branch', read_only=True)
    
    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ('id', 'company', 'created_at', 'updated_at')


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for OrderItem model."""
    product_details = ProductSerializer(source='product', read_only=True)
    
    class Meta:
        model = OrderItem
        fields = '__all__'
        read_only_fields = ('order', 'subtotal', 'created_at')


class OrderSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for Order model."""
    items = OrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ('id', 'company', 'customer', 'total_amount', 'created_at', 'updated_at')


class OrderCreateSerializer(serializers.Serializer):
    """Serializer for creating orders."""
    items = serializers.ListField(child=serializers.DictField(), write_only=True)
    shipping_address = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True)
