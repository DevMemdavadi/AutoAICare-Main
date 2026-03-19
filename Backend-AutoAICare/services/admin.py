from django.contrib import admin
from .models import ServicePackage, AddOn
from .service_parts import ServicePackagePart




class ServicePackagePartInline(admin.TabularInline):
    """Inline admin for parts required by a service package"""
    model = ServicePackagePart
    extra = 1
    fields = ('part', 'quantity', 'hatchback_quantity', 'sedan_quantity', 'suv_quantity', 'bike_quantity', 'is_optional', 'is_active', 'notes')
    autocomplete_fields = ['part']


@admin.register(ServicePackage)
class ServicePackageAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_prices', 'duration', 'is_global', 'branch', 'is_active', 'created_at')
    list_filter = ('is_active', 'is_global', 'branch', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [ServicePackagePartInline]
    
    def display_prices(self, obj):
        return f"H:{obj.hatchback_price}/S:{obj.sedan_price}/SUV:{obj.suv_price}/B:{obj.bike_price}"
    display_prices.short_description = 'Prices (H/S/SUV/B)'
    display_prices.admin_order_field = 'sedan_price'


@admin.register(AddOn)
class AddOnAdmin(admin.ModelAdmin):
    list_display = ('name', 'package', 'price', 'duration', 'is_global', 'branch', 'is_active')
    list_filter = ('is_active', 'is_global', 'branch', 'package')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ServicePackagePart)
class ServicePackagePartAdmin(admin.ModelAdmin):
    list_display = ('package', 'part', 'quantity', 'get_part_unit', 'is_optional', 'is_active', 'created_at')
    list_filter = ('is_active', 'is_optional', 'package', 'created_at')
    search_fields = ('package__name', 'part__name', 'part__sku')
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ['package', 'part']
    
    def get_part_unit(self, obj):
        return obj.part.unit
    get_part_unit.short_description = 'Unit'
    get_part_unit.admin_order_field = 'part__unit'
