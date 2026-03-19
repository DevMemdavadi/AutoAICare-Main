from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from blogs.models import BlogCategory, Blog, BlogFAQ

User = get_user_model()


class BlogModelTestCase(TestCase):
    """Test cases for Blog models."""

    def setUp(self):
        """Set up test data."""
        # Create a blog category
        self.category = BlogCategory.objects.create(
            name='Car Maintenance',
            description='Tips for maintaining your car',
            icon='Wrench',
            color='green',
            skill_level='all',
            order=1,
            is_active=True
        )

        # Create a blog post
        self.blog = Blog.objects.create(
            title='Top 10 Car Maintenance Tips',
            summary='Essential car maintenance tips every owner should know',
            content='# Car Maintenance Guide\n\nThis is a comprehensive guide...',
            category=self.category,
            featured_image_url='https://example.com/image.jpg',
            reading_time=8,
            is_featured=True,
            status='published',
            author='K3 Car Care Team',
            published_at=timezone.now() - timedelta(days=1)
        )

        # Create a blog FAQ
        self.faq = BlogFAQ.objects.create(
            question='How often should I wash my car?',
            answer='We recommend washing your car every 2 weeks to maintain its appearance.',
            related_blog=self.blog,
            order=1,
            is_active=True
        )

    def test_blog_category_creation(self):
        """Test blog category creation."""
        self.assertEqual(BlogCategory.objects.count(), 1)
        self.assertEqual(self.category.name, 'Car Maintenance')
        self.assertEqual(self.category.slug, 'car-maintenance')
        self.assertEqual(self.category.description, 'Tips for maintaining your car')
        self.assertEqual(self.category.icon, 'Wrench')
        self.assertEqual(self.category.color, 'green')
        self.assertEqual(self.category.skill_level, 'all')
        self.assertEqual(self.category.order, 1)
        self.assertTrue(self.category.is_active)
        self.assertEqual(str(self.category), 'Car Maintenance')

    def test_blog_creation(self):
        """Test blog creation."""
        self.assertEqual(Blog.objects.count(), 1)
        self.assertEqual(self.blog.title, 'Top 10 Car Maintenance Tips')
        self.assertEqual(self.blog.slug, 'top-10-car-maintenance-tips')
        self.assertEqual(self.blog.summary, 'Essential car maintenance tips every owner should know')
        self.assertEqual(self.blog.content, '# Car Maintenance Guide\n\nThis is a comprehensive guide...')
        self.assertEqual(self.blog.category, self.category)
        self.assertEqual(self.blog.featured_image_url, 'https://example.com/image.jpg')
        self.assertEqual(self.blog.reading_time, 8)
        self.assertTrue(self.blog.is_featured)
        self.assertEqual(self.blog.status, 'published')
        self.assertEqual(self.blog.author, 'K3 Car Care Team')
        self.assertEqual(self.blog.view_count, 0)
        self.assertIsNotNone(self.blog.published_at)
        self.assertIn('Top 10 Car Maintenance Tips', str(self.blog))

    def test_blog_faq_creation(self):
        """Test blog FAQ creation."""
        self.assertEqual(BlogFAQ.objects.count(), 1)
        self.assertEqual(self.faq.question, 'How often should I wash my car?')
        self.assertEqual(self.faq.answer, 'We recommend washing your car every 2 weeks to maintain its appearance.')
        self.assertEqual(self.faq.related_blog, self.blog)
        self.assertEqual(self.faq.order, 1)
        self.assertTrue(self.faq.is_active)
        self.assertIn('How often should I wash', str(self.faq))

    def test_blog_get_image_url(self):
        """Test blog get_image_url method."""
        # Test with featured_image_url
        self.assertEqual(self.blog.get_image_url(), 'https://example.com/image.jpg')

        # Test with featured_image (this would require an actual file upload)
        self.blog.featured_image = None
        self.blog.featured_image_url = ''
        self.assertEqual(self.blog.get_image_url(), '')

    def test_blog_category_save_method(self):
        """Test blog category save method with slug generation."""
        category = BlogCategory.objects.create(
            name='Interior Cleaning',
            description='Interior cleaning techniques',
            is_active=True
        )
        self.assertEqual(category.slug, 'interior-cleaning')

    def test_blog_save_method(self):
        """Test blog save method with slug generation and meta fields."""
        blog = Blog.objects.create(
            title='Another Great Blog Post',
            summary='A summary of the blog post',
            content='Content of the blog post',
            category=self.category,
            status='published',
            published_at=timezone.now()
        )
        self.assertEqual(blog.slug, 'another-great-blog-post')
        self.assertEqual(blog.meta_title, 'Another Great Blog Post')
        self.assertEqual(blog.meta_description, 'A summary of the blog post')

    def test_blog_category_blog_count(self):
        """Test blog count calculation for category."""
        # Create another blog in the same category
        Blog.objects.create(
            title='Another Post',
            summary='Another post summary',
            content='Content here',
            category=self.category,
            status='published',
            published_at=timezone.now()
        )
        
        # Refresh the category from DB
        self.category.refresh_from_db()
        # The count should be 2 (including the one created in setUp)
        self.assertEqual(self.category.blogs.filter(status='published').count(), 2)

    def test_blog_faq_with_inactive_blog(self):
        """Test FAQ with inactive blog."""
        inactive_blog = Blog.objects.create(
            title='Draft Blog',
            summary='Draft summary',
            content='Draft content',
            category=self.category,
            status='draft',
            published_at=None
        )
        
        faq = BlogFAQ.objects.create(
            question='FAQ for draft blog?',
            answer='Answer for draft blog',
            related_blog=inactive_blog,
            is_active=True
        )
        
        self.assertEqual(faq.related_blog, inactive_blog)


class BlogAPITestCase(TestCase):
    """Test cases for Blog API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        
        # Create categories
        self.category1 = BlogCategory.objects.create(
            name='Car Maintenance',
            description='Tips for maintaining your car',
            icon='Wrench',
            color='green',
            skill_level='all',
            order=1,
            is_active=True
        )
        
        self.category2 = BlogCategory.objects.create(
            name='Detailing Techniques',
            description='Advanced detailing techniques',
            icon='Spray',
            color='blue',
            skill_level='intermediate',
            order=2,
            is_active=True
        )

        # Create blog posts
        self.blog1 = Blog.objects.create(
            title='Top 10 Car Maintenance Tips',
            summary='Essential car maintenance tips every owner should know',
            content='# Car Maintenance Guide\n\nThis is a comprehensive guide...',
            category=self.category1,
            featured_image_url='https://example.com/image1.jpg',
            reading_time=8,
            is_featured=True,
            status='published',
            author='K3 Car Care Team',
            published_at=timezone.now() - timedelta(days=1)
        )
        
        self.blog2 = Blog.objects.create(
            title='Advanced Interior Cleaning',
            summary='Deep cleaning techniques for car interiors',
            content='# Interior Cleaning\n\nDetailed guide...',
            category=self.category2,
            featured_image_url='https://example.com/image2.jpg',
            reading_time=12,
            is_featured=False,
            status='published',
            author='K3 Car Care Team',
            published_at=timezone.now() - timedelta(days=2)
        )
        
        self.blog_draft = Blog.objects.create(
            title='Draft Post',
            summary='This is a draft post',
            content='Draft content',
            category=self.category1,
            status='draft',
            author='K3 Car Care Team',
            published_at=None
        )

        # Create FAQs
        self.faq = BlogFAQ.objects.create(
            question='How often should I wash my car?',
            answer='We recommend washing your car every 2 weeks to maintain its appearance.',
            related_blog=self.blog1,
            order=1,
            is_active=True
        )

    def test_list_blog_categories(self):
        """Test listing blog categories."""
        response = self.client.get('/api/blogs/categories/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # Only active categories
        
        # Check if both categories are present
        category_names = [cat['name'] for cat in response.data]
        self.assertIn('Car Maintenance', category_names)
        self.assertIn('Detailing Techniques', category_names)

    def test_get_blog_category_detail(self):
        """Test getting a specific blog category by slug."""
        response = self.client.get(f'/api/blogs/categories/{self.category1.slug}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Car Maintenance')
        self.assertEqual(response.data['slug'], 'car-maintenance')
        self.assertEqual(response.data['description'], 'Tips for maintaining your car')

    def test_list_blogs(self):
        """Test listing published blogs."""
        response = self.client.get('/api/blogs/posts/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Only published blogs should be returned (not draft)
        self.assertEqual(len(response.data['results']), 2)
        
        # Check if published blogs are present
        titles = [blog['title'] for blog in response.data['results']]
        self.assertIn('Top 10 Car Maintenance Tips', titles)
        self.assertIn('Advanced Interior Cleaning', titles)
        self.assertNotIn('Draft Post', titles)

    def test_get_blog_detail(self):
        """Test getting a specific blog by slug."""
        response = self.client.get(f'/api/blogs/posts/{self.blog1.slug}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Top 10 Car Maintenance Tips')
        self.assertEqual(response.data['summary'], 'Essential car maintenance tips every owner should know')
        self.assertEqual(response.data['reading_time'], 8)
        self.assertEqual(response.data['author'], 'K3 Car Care Team')
        self.assertEqual(response.data['category']['name'], 'Car Maintenance')

    def test_get_blog_detail_increments_view_count(self):
        """Test that retrieving a blog increments the view count."""
        initial_view_count = self.blog1.view_count
        
        response = self.client.get(f'/api/blogs/posts/{self.blog1.slug}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Refresh from DB to get the updated view count
        self.blog1.refresh_from_db()
        self.assertEqual(self.blog1.view_count, initial_view_count + 1)

    def test_list_blogs_by_category(self):
        """Test filtering blogs by category."""
        response = self.client.get(f'/api/blogs/posts/?category={self.category1.slug}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only return blogs from category1 that are published
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Top 10 Car Maintenance Tips')

    def test_search_blogs(self):
        """Test searching blogs by title, summary, content, or keywords."""
        response = self.client.get('/api/blogs/posts/?search=maintenance')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should find the blog with 'maintenance' in the title
        found = False
        for blog in response.data['results']:
            if 'maintenance' in blog['title'].lower():
                found = True
        self.assertTrue(found)

    def test_list_featured_blogs(self):
        """Test getting featured blogs."""
        response = self.client.get('/api/blogs/posts/featured/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return at most 3 featured blogs
        self.assertLessEqual(len(response.data), 3)
        
        # Check if featured blog is included
        featured_titles = [blog['title'] for blog in response.data]
        self.assertIn('Top 10 Car Maintenance Tips', featured_titles)

    def test_list_popular_blogs(self):
        """Test getting popular blogs by view count."""
        # Increase view counts to make some blogs more popular
        self.blog1.view_count = 100
        self.blog1.save()
        self.blog2.view_count = 50
        self.blog2.save()
        
        response = self.client.get('/api/blogs/posts/popular/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return at most 5 popular blogs, ordered by view count
        self.assertLessEqual(len(response.data), 5)
        
        if len(response.data) > 0:
            # First blog should be the one with highest view count
            self.assertEqual(response.data[0]['title'], 'Top 10 Car Maintenance Tips')

    def test_list_blogs_by_category_grouped(self):
        """Test getting blogs grouped by category."""
        response = self.client.get('/api/blogs/posts/by_category/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return categories with their blogs
        self.assertGreaterEqual(len(response.data), 1)
        
        for category_data in response.data:
            self.assertIn('category', category_data)
            self.assertIn('blogs', category_data)
            self.assertGreaterEqual(len(category_data['blogs']), 0)

    def test_list_faqs(self):
        """Test listing blog FAQs."""
        response = self.client.get('/api/blogs/faqs/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        
        # Check if our FAQ is present
        questions = [faq['question'] for faq in response.data]
        self.assertIn('How often should I wash my car?', questions)

    def test_blog_ordering(self):
        """Test ordering blogs by published date."""
        response = self.client.get('/api/blogs/posts/?ordering=-published_at')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should be ordered with newest first
        if len(response.data['results']) > 1:
            for i in range(len(response.data['results']) - 1):
                current_pub = response.data['results'][i]['published_at']
                next_pub = response.data['results'][i + 1]['published_at']
                # Ensure the current blog is published after or at the same time as the next
                self.assertGreaterEqual(current_pub, next_pub)

    def test_blog_filtering_by_skill_level(self):
        """Test filtering blogs by skill level."""
        response = self.client.get('/api/blogs/posts/?skill_level=intermediate')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return blogs from categories with intermediate skill level
        for blog in response.data['results']:
            self.assertEqual(blog['skill_level'], 'intermediate')

    def test_unauthenticated_access(self):
        """Test that all blog endpoints are publicly accessible."""
        # All endpoints should be accessible without authentication
        endpoints = [
            '/api/blogs/categories/',
            f'/api/blogs/categories/{self.category1.slug}/',
            '/api/blogs/posts/',
            f'/api/blogs/posts/{self.blog1.slug}/',
            '/api/blogs/posts/featured/',
            '/api/blogs/posts/popular/',
            '/api/blogs/posts/by_category/',
            '/api/blogs/faqs/'
        ]
        
        for endpoint in endpoints:
            response = self.client.get(endpoint)
            # Should not return 401 or 403 - these are public endpoints
            self.assertNotIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
