from django.contrib import admin

from .models import Branch

@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'address', 'city', 'state', 'pincode', 'phone', 'email', 'google_review_url', 'is_active', 'timezone', 'opening_time', 'closing_time', 'manager_name', 'manager_phone', 'created_at', 'updated_at')
    list_filter = ('is_active', 'created_at', 'updated_at')
    search_fields = ('name', 'code', 'address', 'city', 'state', 'pincode', 'phone', 'email', 'google_review_url', 'manager_name', 'manager_phone')
    
    