"""
Domain models for subdomain-based multi-tenancy.
Maps subdomains to companies for automatic tenant identification.
"""
from django.db import models
from django.core.validators import RegexValidator


class Domain(models.Model):
    """
    Maps domains/subdomains to companies.
    
    Examples:
    - k3car.autoaicare.com → K3 Car Care Company
    - cleancar.autoaicare.com → Clean Car Company
    - api.autoaicare.com → System-wide API (no company)
    """
    
    company = models.ForeignKey(
        'Company',
        on_delete=models.CASCADE,
        related_name='domains',
        help_text='Company this domain belongs to'
    )
    
    domain = models.CharField(
        max_length=255,
        unique=True,
        validators=[
            RegexValidator(
                regex=r'^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)*$',
                message='Enter a valid domain name',
                code='invalid_domain'
            )
        ],
        help_text='Full domain or subdomain (e.g., k3car.autoaicare.com)'
    )
    
    subdomain = models.CharField(
        max_length=63,
        db_index=True,
        help_text='Subdomain only (e.g., k3car)',
        blank=True
    )
    
    is_primary = models.BooleanField(
        default=False,
        help_text='Primary domain for this company'
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this domain is active'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'company_domains'
        verbose_name = 'Company Domain'
        verbose_name_plural = 'Company Domains'
        ordering = ['-is_primary', 'domain']
        indexes = [
            models.Index(fields=['subdomain', 'is_active']),
            models.Index(fields=['domain', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.domain} → {self.company.name}"
    
    def save(self, *args, **kwargs):
        # Auto-extract subdomain from domain
        if self.domain and not self.subdomain:
            parts = self.domain.split('.')
            if len(parts) > 2:  # Has subdomain
                self.subdomain = parts[0]
        
        # Ensure only one primary domain per company
        if self.is_primary:
            Domain.objects.filter(
                company=self.company,
                is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        
        super().save(*args, **kwargs)
    
    @classmethod
    def get_company_from_request(cls, request):
        """
        Get company from request's domain/subdomain.
        
        Returns:
            Company instance or None
        """
        host = request.get_host().split(':')[0]  # Remove port if present
        
        # Try exact domain match first
        domain = cls.objects.filter(domain=host, is_active=True).select_related('company').first()
        if domain:
            return domain.company
        
        # Try subdomain match
        subdomain = host.split('.')[0]
        domain = cls.objects.filter(subdomain=subdomain, is_active=True).select_related('company').first()
        if domain:
            return domain.company
        
        return None
