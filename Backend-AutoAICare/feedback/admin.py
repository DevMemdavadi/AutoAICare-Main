from django.contrib import admin
from .models import Feedback


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')
    search_fields = ('booking__customer__user__email', 'review')
    readonly_fields = ('created_at', 'updated_at')
