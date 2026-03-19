from rest_framework import serializers
from .models import BlogCategory, Blog, BlogFAQ


class BlogCategorySerializer(serializers.ModelSerializer):
    """Serializer for blog categories."""
    blog_count = serializers.SerializerMethodField()
    
    class Meta:
        model = BlogCategory
        fields = [
            'id', 'name', 'slug', 'description', 'icon', 
            'color', 'skill_level', 'order', 'blog_count'
        ]
    
    def get_blog_count(self, obj):
        return obj.blogs.filter(status='published').count()


class BlogListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for blog listing."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
    skill_level = serializers.CharField(source='category.skill_level', read_only=True)
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Blog
        fields = [
            'id', 'title', 'slug', 'summary', 'image_url',
            'category_name', 'category_slug', 'category_color', 'skill_level',
            'reading_time', 'is_featured', 'author', 'published_at'
        ]
    
    def get_image_url(self, obj):
        return obj.get_image_url()


class BlogDetailSerializer(serializers.ModelSerializer):
    """Full serializer for single blog view."""
    category = BlogCategorySerializer(read_only=True)
    image_url = serializers.SerializerMethodField()
    related_blogs = serializers.SerializerMethodField()
    
    class Meta:
        model = Blog
        fields = [
            'id', 'title', 'slug', 'summary', 'content', 'image_url',
            'category', 'meta_title', 'meta_description', 'keywords',
            'reading_time', 'is_featured', 'view_count', 'author',
            'published_at', 'created_at', 'updated_at', 'related_blogs'
        ]
    
    def get_image_url(self, obj):
        return obj.get_image_url()
    
    def get_related_blogs(self, obj):
        """Get up to 3 related blogs from the same category."""
        if obj.category:
            related = Blog.objects.filter(
                category=obj.category,
                status='published'
            ).exclude(id=obj.id)[:3]
            return BlogListSerializer(related, many=True).data
        return []


class BlogFAQSerializer(serializers.ModelSerializer):
    """Serializer for blog FAQs."""
    related_blog_title = serializers.CharField(source='related_blog.title', read_only=True)
    related_blog_slug = serializers.CharField(source='related_blog.slug', read_only=True)
    
    class Meta:
        model = BlogFAQ
        fields = [
            'id', 'question', 'answer', 
            'related_blog_title', 'related_blog_slug', 'order'
        ]
