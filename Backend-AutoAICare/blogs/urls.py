from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BlogCategoryViewSet, BlogViewSet, BlogFAQViewSet

router = DefaultRouter()
router.register(r'categories', BlogCategoryViewSet, basename='blog-category')
router.register(r'posts', BlogViewSet, basename='blog')
router.register(r'faqs', BlogFAQViewSet, basename='blog-faq')

urlpatterns = [
    path('', include(router.urls)),
]
