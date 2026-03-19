from django.contrib import admin
from .models import (
    Purchase,
    PurchaseItem,
    PurchaseReturn,
    PurchaseReturnItem,
    PurchasePayment,
    SupplierLedger,
    StockMovement
)


class PurchaseItemInline(admin.TabularInline):
    """Inline admin for purchase items."""
    model = PurchaseItem
    extra = 1
    fields = ('part', 'quantity', 'unit_price', 'discount', 'gst_rate', 'total_amount')
    readonly_fields = ('total_amount',)


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    """Admin for Purchase model."""
    list_display = (
        'purchase_number',
        'supplier',
        'purchase_date',
        'total_amount',
        'payment_status',
        'status',
        'company'
    )
    list_filter = ('status', 'payment_status', 'purchase_date', 'company')
    search_fields = ('purchase_number', 'supplier__name', 'supplier_invoice_number')
    readonly_fields = ('purchase_number', 'created_at', 'updated_at', 'approved_at')
    inlines = [PurchaseItemInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('company', 'branch', 'supplier', 'purchase_number')
        }),
        ('Purchase Details', {
            'fields': ('purchase_date', 'due_date', 'supplier_invoice_number', 'invoice_file')
        }),
        ('Financial Details', {
            'fields': ('subtotal', 'discount', 'gst_amount', 'total_amount')
        }),
        ('Payment Information', {
            'fields': ('payment_mode', 'payment_status', 'paid_amount')
        }),
        ('Status & Tracking', {
            'fields': ('status', 'created_by', 'approved_by', 'approved_at', 'notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(PurchaseItem)
class PurchaseItemAdmin(admin.ModelAdmin):
    """Admin for PurchaseItem model."""
    list_display = ('purchase', 'part', 'quantity', 'unit_price', 'total_amount')
    list_filter = ('purchase__company', 'purchase__purchase_date')
    search_fields = ('purchase__purchase_number', 'part__name', 'part__sku')
    readonly_fields = ('total_amount', 'cgst_amount', 'sgst_amount', 'igst_amount')


class PurchaseReturnItemInline(admin.TabularInline):
    """Inline admin for purchase return items."""
    model = PurchaseReturnItem
    extra = 1
    fields = ('purchase_item', 'quantity_returned', 'amount')


@admin.register(PurchaseReturn)
class PurchaseReturnAdmin(admin.ModelAdmin):
    """Admin for PurchaseReturn model."""
    list_display = (
        'return_number',
        'purchase',
        'return_date',
        'total_amount',
        'status',
        'company'
    )
    list_filter = ('status', 'return_date', 'company')
    search_fields = ('return_number', 'purchase__purchase_number')
    readonly_fields = ('return_number', 'created_at', 'updated_at', 'approved_at')
    inlines = [PurchaseReturnItemInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('company', 'purchase', 'return_number')
        }),
        ('Return Details', {
            'fields': ('return_date', 'reason', 'total_amount', 'status')
        }),
        ('Tracking', {
            'fields': ('created_by', 'approved_by', 'approved_at', 'notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(PurchaseReturnItem)
class PurchaseReturnItemAdmin(admin.ModelAdmin):
    """Admin for PurchaseReturnItem model."""
    list_display = ('purchase_return', 'purchase_item', 'quantity_returned', 'amount')
    list_filter = ('purchase_return__company', 'purchase_return__return_date')
    search_fields = ('purchase_return__return_number', 'purchase_item__part__name')


@admin.register(PurchasePayment)
class PurchasePaymentAdmin(admin.ModelAdmin):
    """Admin for PurchasePayment model."""
    list_display = (
        'purchase',
        'payment_date',
        'amount',
        'payment_mode',
        'company'
    )
    list_filter = ('payment_mode', 'payment_date', 'company')
    search_fields = ('purchase__purchase_number', 'reference_number')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('company', 'purchase')
        }),
        ('Payment Details', {
            'fields': ('payment_date', 'amount', 'payment_mode', 'reference_number')
        }),
        ('Tracking', {
            'fields': ('recorded_by', 'notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(SupplierLedger)
class SupplierLedgerAdmin(admin.ModelAdmin):
    """Admin for SupplierLedger model."""
    list_display = (
        'supplier',
        'transaction_date',
        'transaction_type',
        'debit',
        'credit',
        'balance',
        'company'
    )
    list_filter = ('transaction_type', 'transaction_date', 'company', 'supplier')
    search_fields = ('supplier__name', 'description')
    readonly_fields = ('created_at',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('company', 'supplier', 'transaction_date', 'transaction_type')
        }),
        ('References', {
            'fields': ('purchase', 'payment', 'return_entry')
        }),
        ('Amounts', {
            'fields': ('debit', 'credit', 'balance', 'description')
        }),
        ('Timestamp', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    """Admin for StockMovement model."""
    list_display = (
        'part',
        'movement_type',
        'quantity',
        'date',
        'branch',
        'company'
    )
    list_filter = ('movement_type', 'date', 'company', 'branch')
    search_fields = ('part__name', 'part__sku', 'notes')
    readonly_fields = ('created_at',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('company', 'branch', 'part')
        }),
        ('Movement Details', {
            'fields': ('movement_type', 'quantity', 'date')
        }),
        ('Reference', {
            'fields': ('reference_type', 'reference_id', 'notes')
        }),
        ('Tracking', {
            'fields': ('created_by', 'created_at')
        }),
    )
