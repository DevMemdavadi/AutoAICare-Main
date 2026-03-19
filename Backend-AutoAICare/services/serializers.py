from rest_framework import serializers
from decimal import Decimal
from .models import ServicePackage, AddOn
from .service_parts import ServicePackagePart
from branches.serializers import BranchListSerializer
from rest_framework.exceptions import ValidationError


from companies.serializers import TenantSerializerMixin

class AddOnSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for AddOn model."""
    branch_details = BranchListSerializer(source='branch', read_only=True)
    
    # Computed fields
    gst_amount = serializers.SerializerMethodField()
    price_with_gst = serializers.SerializerMethodField()
    
    class Meta:
        model = AddOn
        fields = '__all__'
        read_only_fields = ('id', 'company', 'created_at', 'updated_at')
    
    def get_gst_amount(self, obj):
        """Calculate GST amount."""
        return str(obj.calculate_gst())
    
    def get_price_with_gst(self, obj):
        """Get price including GST."""
        return str(obj.get_price_with_gst())


class ServicePackageSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Serializer for ServicePackage model with vehicle-type pricing."""
    addons = AddOnSerializer(many=True, read_only=True)
    branch_details = BranchListSerializer(source='branch', read_only=True)
    
    def validate(self, attrs):
        # Validate that bike services are only assigned to bike vehicle types
        category = attrs.get('category')
        compatible_vehicle_types = attrs.get('compatible_vehicle_types', [])
        
        if category == 'bike_services':
            # Bike services should only be compatible with bike vehicle type
            if compatible_vehicle_types and 'bike' not in compatible_vehicle_types:
                raise ValidationError("Bike services must be compatible with bike vehicle type.")
            if len(compatible_vehicle_types) > 1 and any(vt != 'bike' for vt in compatible_vehicle_types):
                raise ValidationError("Bike services cannot be compatible with car vehicle types.")
        elif category and category != 'bike_services':
            # Car services should not be compatible with bike vehicle type
            if 'bike' in compatible_vehicle_types:
                raise ValidationError(f"{category.replace('_', ' ').title()} services cannot be compatible with bike vehicle type.")
        
        return attrs
    
    # Computed fields
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    duration_display = serializers.SerializerMethodField()
    
    # Price calculations (for default/base price)
    gst_amount = serializers.SerializerMethodField()
    price_with_gst = serializers.SerializerMethodField()
    
    # Vehicle-type price breakdowns with GST
    hatchback_gst = serializers.SerializerMethodField()
    hatchback_total = serializers.SerializerMethodField()
    sedan_gst = serializers.SerializerMethodField()
    sedan_total = serializers.SerializerMethodField()
    suv_gst = serializers.SerializerMethodField()
    suv_total = serializers.SerializerMethodField()
    bike_gst = serializers.SerializerMethodField()
    bike_total = serializers.SerializerMethodField()
    
    # Reward configuration
    reward_status = serializers.SerializerMethodField()
    reward_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = ServicePackage
        fields = '__all__'
        read_only_fields = ('id', 'company', 'created_at', 'updated_at')
    
    def get_duration_display(self, obj):
        """Get formatted duration string."""
        return obj.get_duration_display()
    
    def get_gst_amount(self, obj):
        """Calculate GST amount for base price."""
        return str(obj.calculate_gst(obj.price))
    
    def get_price_with_gst(self, obj):
        """Get base price with GST."""
        return str(obj.get_price_with_gst())
    
    def _calculate_vehicle_gst(self, obj, vehicle_price):
        """Helper to calculate GST for a vehicle-type price."""
        if vehicle_price and obj.gst_applicable:
            return str((vehicle_price * obj.gst_rate) / Decimal('100'))
        return "0.00"
    
    def _calculate_vehicle_total(self, obj, vehicle_price):
        """Helper to calculate total for a vehicle-type price."""
        if vehicle_price:
            gst = (vehicle_price * obj.gst_rate) / Decimal('100') if obj.gst_applicable else Decimal('0')
            return str(vehicle_price + gst)
        return None
    
    def get_hatchback_gst(self, obj):
        return self._calculate_vehicle_gst(obj, obj.hatchback_price)
    
    def get_hatchback_total(self, obj):
        return self._calculate_vehicle_total(obj, obj.hatchback_price)
    
    def get_sedan_gst(self, obj):
        return self._calculate_vehicle_gst(obj, obj.sedan_price)
    
    def get_sedan_total(self, obj):
        return self._calculate_vehicle_total(obj, obj.sedan_price)
    
    def get_suv_gst(self, obj):
        return self._calculate_vehicle_gst(obj, obj.suv_price)
    
    def get_suv_total(self, obj):
        return self._calculate_vehicle_total(obj, obj.suv_price)
    
    def get_bike_gst(self, obj):
        return self._calculate_vehicle_gst(obj, obj.bike_price)
    
    def get_bike_total(self, obj):
        return self._calculate_vehicle_total(obj, obj.bike_price)
    
    def get_reward_status(self, obj):
        """Get reward configuration status."""
        if obj.has_custom_rewards:
            return 'custom'
        return 'global'
    
    def get_reward_preview(self, obj):
        """Get reward preview showing example scenarios."""
        if not obj.has_custom_rewards:
            return None
        
        return {
            'has_custom_rewards': True,
            'tiers': [
                {
                    'tier': 'tier_1',
                    'minutes_early': obj.tier_1_minutes,
                    'amount': str(obj.tier_1_amount) if obj.tier_1_amount else None
                },
                {
                    'tier': 'tier_2',
                    'minutes_early': obj.tier_2_minutes,
                    'amount': str(obj.tier_2_amount) if obj.tier_2_amount else None
                },
                {
                    'tier': 'tier_3',
                    'minutes_early': obj.tier_3_minutes,
                    'amount': str(obj.tier_3_amount) if obj.tier_3_amount else None
                }
            ],
            'deduction': {
                'enabled': obj.deduction_enabled,
                'threshold_minutes': obj.deduction_threshold_minutes,
                'per_minute': str(obj.deduction_per_minute) if obj.deduction_per_minute else None,
                'max_per_job': str(obj.max_deduction_per_job) if obj.max_deduction_per_job else None
            }
        }


class ServicePackageListSerializer(TenantSerializerMixin, serializers.ModelSerializer):
    """Lightweight serializer for listing service packages - optimized for faster response."""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    duration_display = serializers.SerializerMethodField()
    branch_details = serializers.SerializerMethodField()
    is_bike_service = serializers.SerializerMethodField()
    is_car_service = serializers.SerializerMethodField()
    
    class Meta:
        model = ServicePackage
        fields = [
            'id', 'name', 'description', 'category', 'category_display',
            'price', 'hatchback_price', 'sedan_price', 'suv_price', 'bike_price',
            'gst_applicable', 'gst_rate',
            'duration', 'duration_max', 'duration_display',
            'is_active', 'is_global', 'branch', 'branch_details', 'image',
            'compatible_vehicle_types', 'is_bike_service', 'is_car_service'
        ]
    
    def get_duration_display(self, obj):
        return obj.get_duration_display()
    
    def get_branch_details(self, obj):
        """Get lightweight branch details."""
        if obj.branch:
            return {
                'id': obj.branch.id,
                'name': obj.branch.name,
                'code': getattr(obj.branch, 'code', None)
            }
        return None
    
    def get_is_bike_service(self, obj):
        return obj.category == 'bike_services'
    
    def get_is_car_service(self, obj):
        return obj.category != 'bike_services'
