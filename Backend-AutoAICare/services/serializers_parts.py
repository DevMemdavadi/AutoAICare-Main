from rest_framework import serializers
from .service_parts import ServicePackagePart
from companies.serializers import TenantSerializerMixin


class ServicePackagePartSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for ServicePackagePart model."""
    
    # Nested part details
    part_details = serializers.SerializerMethodField()
    package_name = serializers.CharField(source='package.name', read_only=True)
    
    # Stock availability check
    stock_status = serializers.SerializerMethodField()
    
    class Meta:
        model = ServicePackagePart
        fields = '__all__'
        read_only_fields = ('id', 'company', 'created_at', 'updated_at')
    
    def get_part_details(self, obj):
        """Get detailed part information."""
        return {
            'id': obj.part.id,
            'name': obj.part.name,
            'sku': obj.part.sku,
            'category': obj.part.category,
            'unit': obj.part.unit,
            'current_stock': obj.part.stock,
            'min_stock_level': obj.part.min_stock_level,
            'stock_status': obj.part.stock_status,
            'selling_price': str(obj.part.selling_price),
            'cost_price': str(obj.part.cost_price),
        }
    
    def get_stock_status(self, obj):
        """Check if there's enough stock for this part."""
        # Default to sedan for stock check
        is_available, required_qty, current_stock = obj.check_stock_availability('sedan')
        
        return {
            'is_available': is_available,
            'required_quantity': float(required_qty),
            'current_stock': current_stock,
            'is_low_stock': obj.part.is_low_stock(),
        }


class ServicePackagePartListSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Lightweight serializer for listing service package parts."""
    
    part_name = serializers.CharField(source='part.name', read_only=True)
    part_sku = serializers.CharField(source='part.sku', read_only=True)
    part_unit = serializers.CharField(source='part.unit', read_only=True)
    current_stock = serializers.IntegerField(source='part.stock', read_only=True)
    
    class Meta:
        model = ServicePackagePart
        fields = [
            'id', 'part', 'part_name', 'part_sku', 'part_unit',
            'quantity', 'hatchback_quantity', 'sedan_quantity', 'suv_quantity', 'bike_quantity',
            'current_stock', 'is_optional', 'is_active'
        ]
