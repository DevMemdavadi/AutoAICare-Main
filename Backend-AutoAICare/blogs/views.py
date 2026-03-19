from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from .models import BlogCategory, Blog, BlogFAQ
from .serializers import (
    BlogCategorySerializer, BlogListSerializer, 
    BlogDetailSerializer, BlogFAQSerializer
)


class BlogCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for blog categories.
    Public access for reading categories.
    """
    queryset = BlogCategory.objects.filter(is_active=True)
    serializer_class = BlogCategorySerializer
    permission_classes = [AllowAny]
    pagination_class = None  # Return all categories without pagination
    lookup_field = 'slug'
    
    def get_queryset(self):
        return BlogCategory.objects.filter(is_active=True).prefetch_related('blogs')


class BlogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for blogs.
    Public access for reading published blogs.
    """
    queryset = Blog.objects.filter(status='published')
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category__slug', 'is_featured']
    search_fields = ['title', 'summary', 'content', 'keywords']
    ordering_fields = ['published_at', 'view_count', 'reading_time']
    ordering = ['-published_at']
    lookup_field = 'slug'
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return BlogDetailSerializer
        return BlogListSerializer
    
    def get_queryset(self):
        queryset = Blog.objects.filter(
            status='published',
            published_at__lte=timezone.now()
        ).select_related('category')
        
        # Filter by category slug
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__slug=category)
        
        # Filter by skill level
        skill_level = self.request.query_params.get('skill_level')
        if skill_level and skill_level != 'all':
            queryset = queryset.filter(category__skill_level=skill_level)
        
        return queryset
    
    def retrieve(self, request, *args, **kwargs):
        """Increment view count on blog detail view."""
        instance = self.get_object()
        instance.view_count += 1
        instance.save(update_fields=['view_count'])
        return super().retrieve(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured blogs for the homepage section."""
        featured_blogs = self.get_queryset().filter(is_featured=True)[:3]
        serializer = BlogListSerializer(featured_blogs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def popular(self, request):
        """Get most popular blogs by view count."""
        popular_blogs = self.get_queryset().order_by('-view_count')[:5]
        serializer = BlogListSerializer(popular_blogs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get blogs grouped by category for the main blogs page."""
        categories = BlogCategory.objects.filter(is_active=True).prefetch_related(
            'blogs'
        ).order_by('order')
        
        result = []
        for category in categories:
            blogs = category.blogs.filter(
                status='published',
                published_at__lte=timezone.now()
            )[:4]
            
            if blogs.exists():
                result.append({
                    'category': BlogCategorySerializer(category).data,
                    'blogs': BlogListSerializer(blogs, many=True).data
                })
        
        return Response(result)


class BlogFAQViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for blog FAQs.
    Public access for reading FAQs.
    """
    queryset = BlogFAQ.objects.filter(is_active=True)
    serializer_class = BlogFAQSerializer
    permission_classes = [AllowAny]
    pagination_class = None
    
    def get_queryset(self):
        return BlogFAQ.objects.filter(is_active=True).select_related('related_blog')
