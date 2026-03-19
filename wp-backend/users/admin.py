# # users/admin.py
# from django.contrib import admin
# from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
# from django.utils.html import format_html
# from django.urls import reverse
# from django.db.models import Count, Sum
# from .models import User, UserProfile, Address, UserPreferences, ContactMessage, DistributorEnquiry
# from core.admin import admin_site
# from django.utils import timezone
# from datetime import timedelta
# from django.contrib.admin import SimpleListFilter


# # Inline for UserProfile
# class UserProfileInline(admin.StackedInline):
#     model = UserProfile
#     can_delete = False
#     verbose_name_plural = 'Profile'
#     fields = ('full_name', 'phone', 'created_at', 'updated_at')
#     readonly_fields = ('created_at', 'updated_at')


# # Inline for Address
# class AddressInline(admin.TabularInline):
#     model = Address
#     extra = 0
#     fields = ('full_name', 'address_line1', 'city', 'state', 'postal_code', 'phone', 'label', 'is_default')
#     readonly_fields = ['created_at', 'updated_at']


# # Inline for UserPreferences
# class UserPreferencesInline(admin.StackedInline):
#     model = UserPreferences
#     can_delete = False
#     verbose_name_plural = 'Preferences'
#     fields = ('order_updates', 'promotional_emails', 'sms_notifications', 'created_at', 'updated_at')
#     readonly_fields = ('created_at', 'updated_at')


# class CreatedAtRangeFilter(SimpleListFilter):
#     title = 'Signup date'
#     parameter_name = 'created_at_range'

#     def lookups(self, request, model_admin):
#         return [
#             ('7', 'Last 7 days'),
#             ('30', 'Last 30 days'),
#             ('90', 'Last 90 days'),
#             ('month', 'This month'),
#             ('last_month', 'Last month'),
#             ('year', 'This year'),
#         ]

#     def queryset(self, request, queryset):
#         value = self.value()
#         now = timezone.now()
#         if value == '7':
#             return queryset.filter(created_at__gte=now - timedelta(days=7))
#         elif value == '30':
#             return queryset.filter(created_at__gte=now - timedelta(days=30))
#         elif value == '90':
#             return queryset.filter(created_at__gte=now - timedelta(days=90))
#         elif value == 'month':
#             start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
#             return queryset.filter(created_at__gte=start)
#         elif value == 'last_month':
#             first_this = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
#             last_month_end = first_this - timedelta(microseconds=1)
#             start_last = last_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
#             return queryset.filter(created_at__range=[start_last, last_month_end])
#         elif value == 'year':
#             start_year = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
#             return queryset.filter(created_at__gte=start_year)
#         return queryset


# class UserAdmin(BaseUserAdmin):
#     list_display = [
#         'email',
#         'full_name',
#         'phone',
#         'role',
#         'is_active',
#         'order_count',
#         'total_spent',
#         'last_login',
#         'created_at',
#         'view_orders'
#     ]
#     list_filter = [
#         CreatedAtRangeFilter,
#         'role',
#         'is_active',
#         'is_staff',
#         'is_superuser',
#         ('created_at', admin.DateFieldListFilter),
#         ('last_login', admin.DateFieldListFilter)
#     ]
#     search_fields = ['email', 'full_name', 'phone']
#     ordering = ['-created_at']
#     readonly_fields = ['created_at', 'last_login', 'date_joined', 'order_count', 'total_spent']
    
#     fieldsets = (
#         (None, {
#             'fields': ('email', 'password')
#         }),
#         ('Personal info', {
#             'fields': ('full_name', 'phone', 'role')
#         }),
#         ('Permissions', {
#             'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
#             'classes': ('collapse',)
#         }),
#         ('Important dates', {
#             'fields': ('last_login', 'created_at', 'date_joined'),
#             'classes': ('collapse',)
#         }),
#         ('Statistics', {
#             'fields': ('order_count', 'total_spent'),
#             'classes': ('collapse',)
#         })
#     )
    
#     add_fieldsets = (
#         (None, {
#             'classes': ('wide',),
#             'fields': ('email', 'full_name', 'phone', 'password1', 'password2', 'role'),
#         }),
#     )
    
#     inlines = [UserProfileInline, AddressInline, UserPreferencesInline]
    
#     actions = ['make_customer', 'make_employee', 'activate_users', 'deactivate_users']
    
#     def order_count(self, obj):
#         count = obj.orders.count()
#         if count > 0:
#             url = reverse('admin:orders_order_changelist') + f'?user__id__exact={obj.id}'
#             return format_html('<a href="{}">{}</a>', url, count)
#         return 0
#     order_count.short_description = 'Orders'
    
#     def total_spent(self, obj):
#         total = obj.orders.aggregate(total=Sum('total_amount'))['total']
#         return f'₹{total or 0}'
#     total_spent.short_description = 'Total Spent'
    
#     def view_orders(self, obj):
#         url = reverse('admin:orders_order_changelist') + f'?user__id__exact={obj.id}'
#         return format_html('<a href="{}" class="btn btn-sm btn-info">View Orders</a>', url)
#     view_orders.short_description = 'Actions'
    
#     def make_customer(self, request, queryset):
#         updated = queryset.update(role='customer')
#         self.message_user(request, f"{updated} users marked as customers.")
#     make_customer.short_description = "Mark selected users as customers"
    
#     def make_employee(self, request, queryset):
#         updated = queryset.update(role='employee')
#         self.message_user(request, f"{updated} users marked as employees.")
#     make_employee.short_description = "Mark selected users as employees"
    
#     def activate_users(self, request, queryset):
#         updated = queryset.update(is_active=True)
#         self.message_user(request, f"{updated} users activated.")
#     activate_users.short_description = "Activate selected users"
    
#     def deactivate_users(self, request, queryset):
#         updated = queryset.update(is_active=False)
#         self.message_user(request, f"{updated} users deactivated.")
#     deactivate_users.short_description = "Deactivate selected users"
    
#     def get_queryset(self, request):
#         return super().get_queryset(request).annotate(
#             order_count=Count('orders'),
#             total_spent=Sum('orders__total_amount')
#         )

# class UserProfileAdmin(admin.ModelAdmin):
#     list_display = ('full_name', 'user', 'phone', 'created_at', 'updated_at')
#     search_fields = ('full_name', 'user__email', 'phone')
#     list_filter = ('created_at', 'updated_at')
#     readonly_fields = ('created_at', 'updated_at')
#     ordering = ('-created_at',)


# class AddressAdmin(admin.ModelAdmin):
#     list_display = [
#         'user',
#         'full_name',
#         'address_line1',
#         'city',
#         'state',
#         'postal_code',
#         'phone',
#         'label',
#         'is_default'
#     ]
#     list_filter = ['state', 'city', 'is_default', 'created_at']
#     search_fields = ['user__email', 'user__full_name', 'full_name', 'city', 'state', 'postal_code']
#     list_editable = ['is_default']
#     readonly_fields = ['created_at', 'updated_at']
    
#     fieldsets = (
#         ('User Information', {
#             'fields': ('user', 'full_name', 'phone', 'label')
#         }),
#         ('Address Details', {
#             'fields': ('address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country')
#         }),
#         ('Settings', {
#             'fields': ('is_default',)
#         }),
#         ('Timestamps', {
#             'fields': ('created_at', 'updated_at'),
#             'classes': ('collapse',)
#         })
#     )


# class UserPreferencesAdmin(admin.ModelAdmin):
#     list_display = [
#         'user',
#         'order_updates',
#         'promotional_emails',
#         'sms_notifications',
#         'updated_at'
#     ]
#     list_filter = ['order_updates', 'promotional_emails', 'sms_notifications', 'updated_at']
#     search_fields = ['user__email', 'user__full_name']
#     readonly_fields = ['created_at', 'updated_at']


# class ContactMessageAdmin(admin.ModelAdmin):
#     list_display = [
#         'name',
#         'email',
#         'phone_number',
#         'message_preview',
#         'created_at',
#         'reply_action'
#     ]
#     list_filter = [('created_at', admin.DateFieldListFilter)]
#     search_fields = ['name', 'email', 'phone_number', 'message']
#     readonly_fields = ['created_at']
    
#     fieldsets = (
#         ('Contact Information', {
#             'fields': ('name', 'email', 'phone_number')
#         }),
#         ('Message', {
#             'fields': ('message',)
#         }),
#         ('Metadata', {
#             'fields': ('created_at',),
#             'classes': ('collapse',)
#         })
#     )
    
#     def message_preview(self, obj):
#         return obj.message[:100] + ('...' if len(obj.message) > 100 else '')
#     message_preview.short_description = 'Message Preview'
    
#     def reply_action(self, obj):
#         return format_html(
#             '<a href="mailto:{}?subject=Re: Contact Form&body=Hi {}," class="btn btn-sm btn-success">Reply via Email</a>',
#             obj.email, obj.name
#         )
#     reply_action.short_description = 'Actions'


# class DistributorEnquiryAdmin(admin.ModelAdmin):
#     list_display = [
#         'full_name',
#         'email',
#         'phone_number',
#         'city',
#         'state',
#         'business_type',
#         'product_interest',
#         'created_at',
#         'contact_action'
#     ]
#     list_filter = [
#         'product_interest',
#         'business_type',
#         'state',
#         ('created_at', admin.DateFieldListFilter)
#     ]
#     search_fields = [
#         'full_name',
#         'email',
#         'phone_number',
#         'city',
#         'state',
#         'business_type',
#         'gst_number'
#     ]
#     readonly_fields = ['created_at']
    
#     fieldsets = (
#         ('Personal Information', {
#             'fields': ('full_name', 'email', 'phone_number')
#         }),
#         ('Location', {
#             'fields': ('city', 'state', 'country')
#         }),
#         ('Business Details', {
#             'fields': ('business_type', 'product_interest', 'gst_number')
#         }),
#         ('Additional Information', {
#             'fields': ('message',)
#         }),
#         ('Metadata', {
#             'fields': ('created_at',),
#             'classes': ('collapse',)
#         })
#     )
    
#     actions = ['export_to_csv']
    
#     def contact_action(self, obj):
#         return format_html(
#             '<a href="mailto:{}?subject=Distributor Partnership&body=Hi {}," class="btn btn-sm btn-success">Contact</a>',
#             obj.email, obj.full_name
#         )
#     contact_action.short_description = 'Actions'
    
#     def export_to_csv(self, request, queryset):
#         import csv
#         from django.http import HttpResponse
        
#         response = HttpResponse(content_type='text/csv')
#         response['Content-Disposition'] = 'attachment; filename="distributor_enquiries.csv"'
        
#         writer = csv.writer(response)
#         writer.writerow([
#             'Name', 'Email', 'Phone', 'City', 'State', 'Business Type',
#             'Product Interest', 'GST Number', 'Message', 'Date'
#         ])
        
#         for enquiry in queryset:
#             writer.writerow([
#                 enquiry.full_name,
#                 enquiry.email,
#                 enquiry.phone_number,
#                 enquiry.city,
#                 enquiry.state,
#                 enquiry.business_type,
#                 enquiry.product_interest,
#                 enquiry.gst_number,
#                 enquiry.message,
#                 enquiry.created_at.strftime('%Y-%m-%d %H:%M')
#             ])
        
#         return response
#     export_to_csv.short_description = "Export selected enquiries to CSV"


# # Register all admin classes with custom admin site
# admin_site.register(User, UserAdmin)
# # admin_site.register(UserProfile, UserProfileAdmin)
# # admin_site.register(Address, AddressAdmin)
# # admin_site.register(UserPreferences, UserPreferencesAdmin)
# admin_site.register(ContactMessage, ContactMessageAdmin)
# admin_site.register(DistributorEnquiry, DistributorEnquiryAdmin)
    