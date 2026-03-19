from django.contrib import admin
from .models import BlogCategory, Blog, BlogFAQ


@admin.register(BlogCategory)
class BlogCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'skill_level', 'color', 'order', 'is_active']
    list_filter = ['skill_level', 'color', 'is_active']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['order', 'name']


@admin.register(Blog)
class BlogAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'status', 'is_featured', 'reading_time', 'view_count', 'published_at']
    list_filter = ['status', 'category', 'is_featured', 'published_at']
    search_fields = ['title', 'summary', 'content', 'keywords']
    prepopulated_fields = {'slug': ('title',)}
    date_hierarchy = 'published_at'
    ordering = ['-published_at', '-created_at']
    
    fieldsets = (
        ('Content', {
            'fields': ('title', 'slug', 'summary', 'content', 'category')
        }),
        ('Media', {
            'fields': ('featured_image', 'featured_image_url')
        }),
        ('SEO', {
            'fields': ('meta_title', 'meta_description', 'keywords'),
            'classes': ('collapse',)
        }),
        ('Settings', {
            'fields': ('status', 'is_featured', 'author', 'reading_time', 'published_at')
        }),
        ('Stats', {
            'fields': ('view_count',),
            'classes': ('collapse',)
        }),
    )


@admin.register(BlogFAQ)
class BlogFAQAdmin(admin.ModelAdmin):
    list_display = ['question', 'related_blog', 'order', 'is_active']
    list_filter = ['is_active']
    search_fields = ['question', 'answer']
    raw_id_fields = ['related_blog']
    ordering = ['order', 'id']
