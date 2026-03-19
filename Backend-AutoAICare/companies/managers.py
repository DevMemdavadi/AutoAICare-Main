from django.db import models


class CompanyManager(models.Manager):
    """
    Manager that automatically filters querysets by company.
    """
    
    def __init__(self, *args, **kwargs):
        self.company = None
        super().__init__(*args, **kwargs)
    
    def get_queryset(self):
        """Override to automatically filter by company + include global items."""
        # Get current company from thread-local storage
        from companies.middleware import get_current_company
        company = get_current_company()
        
        # If we have a detected company, show it + global items
        if company:
            return super().get_queryset().filter(
                models.Q(company=company) | models.Q(company__isnull=True)
            )
            
        # If NO company is detected (e.g., super admin on main domain), show everything
        return super().get_queryset()
    
    def all_companies(self):
        """Bypass company filtering (for super admins)."""
        return super().get_queryset()
    
    def for_company(self, company):
        """Explicitly filter by a specific company."""
        return super().get_queryset().filter(company=company)


class CompanyQuerySet(models.QuerySet):
    """Custom queryset for company filtering."""
    
    def for_company(self, company):
        return self.filter(company=company)
