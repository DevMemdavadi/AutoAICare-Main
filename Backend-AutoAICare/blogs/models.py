from django.db import models
from django.utils.text import slugify


class BlogCategory(models.Model):
    """Blog categories for organizing content."""
    
    SKILL_LEVEL_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'), 
        ('advanced', 'Advanced'),
        ('all', 'All Levels'),
    ]
    
    COLOR_CHOICES = [
        ('green', 'Green - Beginner'),
        ('yellow', 'Yellow - Intermediate'),
        ('blue', 'Blue - Advanced'),
        ('purple', 'Purple - Reviews'),
        ('red', 'Red - Insights'),
    ]
    
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(help_text='Short description for category intro')
    icon = models.CharField(max_length=50, blank=True, help_text='Lucide icon name (e.g., "Droplets", "Sparkles")')
    color = models.CharField(max_length=20, choices=COLOR_CHOICES, default='green')
    skill_level = models.CharField(max_length=20, choices=SKILL_LEVEL_CHOICES, default='all')
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'blog_categories'
        verbose_name = 'Blog Category'
        verbose_name_plural = 'Blog Categories'
        ordering = ['order', 'name']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Blog(models.Model):
    """Blog posts for car detailing tips, guides, and insights."""
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]
    
    # Core fields
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    summary = models.CharField(max_length=200, help_text='Brief summary (max 30 words)')
    content = models.TextField(help_text='Full blog content in Markdown or HTML')
    
    # Categorization
    category = models.ForeignKey(
        BlogCategory, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='blogs'
    )
    
    # Media
    featured_image = models.ImageField(upload_to='blogs/', null=True, blank=True)
    featured_image_url = models.URLField(blank=True, help_text='External image URL if not uploading')
    
    # SEO fields
    meta_title = models.CharField(max_length=60, blank=True, help_text='SEO title (max 60 chars)')
    meta_description = models.CharField(max_length=160, blank=True, help_text='SEO description (max 160 chars)')
    keywords = models.CharField(max_length=200, blank=True, help_text='Comma-separated keywords')
    
    # Engagement
    reading_time = models.PositiveIntegerField(default=5, help_text='Estimated reading time in minutes')
    is_featured = models.BooleanField(default=False, help_text='Show in featured section')
    view_count = models.PositiveIntegerField(default=0)
    
    # Status and dates
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    author = models.CharField(max_length=100, default='K3 Car Care Team')
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'blogs'
        verbose_name = 'Blog'
        verbose_name_plural = 'Blogs'
        ordering = ['-published_at', '-created_at']
        indexes = [
            models.Index(fields=['status', '-published_at']),
            models.Index(fields=['category', 'status']),
            models.Index(fields=['is_featured', 'status']),
        ]
    
    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        # Auto-generate meta fields if empty
        if not self.meta_title:
            self.meta_title = self.title[:60]
        if not self.meta_description:
            self.meta_description = self.summary[:160]
        super().save(*args, **kwargs)
    
    def get_image_url(self):
        """Return featured image URL or external URL."""
        if self.featured_image:
            return self.featured_image.url
        return self.featured_image_url or ''


class BlogFAQ(models.Model):
    """FAQs that can be linked to specific blogs."""
    
    question = models.CharField(max_length=200)
    answer = models.TextField()
    related_blog = models.ForeignKey(
        Blog,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='faqs_linking_to',
        help_text='Blog to link in the answer'
    )
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'blog_faqs'
        verbose_name = 'Blog FAQ'
        verbose_name_plural = 'Blog FAQs'
        ordering = ['order', 'id']
    
    def __str__(self):
        return self.question[:50]
