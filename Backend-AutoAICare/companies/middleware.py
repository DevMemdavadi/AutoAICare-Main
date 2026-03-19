import threading
import logging

logger = logging.getLogger(__name__)

# Thread-local storage
_thread_locals = threading.local()


def get_current_company():
    """Get the current company from thread-local storage."""
    return getattr(_thread_locals, 'company', None)


def set_current_company(company):
    """Set the current company in thread-local storage."""
    _thread_locals.company = company


def clear_current_company():
    """Clear the current company from thread-local storage."""
    if hasattr(_thread_locals, 'company'):
        delattr(_thread_locals, 'company')


class CompanyMiddleware:
    """
    Enhanced middleware for multi-tenant security.
    
    Identifies tenant from:
    1. Subdomain (e.g., k3car.autoaicare.com → K3 Car company)
    2. JWT token (user's company)
    3. Origin/Referer headers (for API calls from frontend)
    
    Security features:
    - Validates company matches between subdomain and user
    - Logs tenant identification for audit
    - Prevents cross-tenant access
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Clear previous company context
        clear_current_company()
        
        company = None
        tenant_source = None
        
        # Method 1 & 2: Identify company from Domain sources (Host, Origin, Referer)
        # We consolidate these to avoid multiple redundant DB queries
        company, tenant_source = self._identify_company_from_domains(request)
        
        # Method 3: Fallback to user's company from JWT token
        # Method 3: Check user's company from JWT token (always check if authenticated)
        if request.user.is_authenticated:
            user_company = self._get_company_from_user(request)
            
            # Security validation: If both domain/origin and user company exist, they must match
            if company and user_company:
                if company.id != user_company.id:
                    logger.warning(
                        f"Company mismatch: domain/origin={company.name} (ID:{company.id}), "
                        f"user={user_company.name} (ID:{user_company.id}), "
                        f"user={getattr(request.user, 'email', 'unknown')}"
                    )
                    # Use user's company for security (prevent unauthorized access)
                    company = user_company
                    tenant_source = 'user_override'
            elif not company and user_company:
                # No domain found, use user's company
                company = user_company
                tenant_source = 'user'
        
        # Set company context if found
        if company:
            set_current_company(company)
            request.company = company
            request.tenant_source = tenant_source
        else:
            request.company = None
            request.tenant_source = None
        
        response = self.get_response(request)
        
        # Clean up after request
        clear_current_company()

        return response

    def _identify_company_from_domains(self, request):
        """Domain lookup — always queries DB fresh per request for correct multi-tenant isolation."""
        host = request.get_host().split(':')[0]

        from .domain_models import Domain
        from django.db.models import Q

        candidates = set()
        candidates.add(host)
        candidates.add(host.split('.')[0])  # Subdomain

        # Add Origin/Referer headers to candidates
        for header in ['Origin', 'Referer']:
            val = request.headers.get(header, '')
            if val:
                h = val.replace('https://', '').replace('http://', '').split('/')[0].split(':')[0]
                candidates.add(h)
                candidates.add(h.split('.')[0])

        candidates.discard('')
        if not candidates:
            return None, None

        # Single query for all candidates
        domain_obj = Domain.objects.filter(
            Q(domain__in=candidates) | Q(subdomain__in=candidates),
            is_active=True
        ).select_related('company').first()

        if domain_obj:
            return domain_obj.company, 'host'

        return None, None

    def _get_company_from_user(self, request):
        """Extract company from authenticated user (JWT token) with request-level caching."""
        try:
            # check if already authenticated in this request
            if hasattr(request, '_cached_authenticated_user'):
                user = request._cached_authenticated_user
            else:
                user = request.user
                
                # If middleware is high up, user might not be in request yet
                if not user or not user.is_authenticated:
                    from rest_framework_simplejwt.authentication import JWTAuthentication
                    from django.conf import settings
                    auth = JWTAuthentication()
                    header = auth.get_header(request)
                    if header:
                        raw_token = auth.get_raw_token(header)
                        if raw_token:
                            try:
                                validated_token = auth.get_validated_token(raw_token)
                                # Get user ID from claim (usually 'user_id')
                                user_id_claim = settings.SIMPLE_JWT.get('USER_ID_CLAIM', 'user_id')
                                user_id = validated_token.get(user_id_claim)
                                
                                if user_id:
                                    from users.models import User
                                    # Use select_related to fetch company and branch in the same query
                                    user = User.objects.select_related('company', 'branch').get(pk=user_id)
                                    # Cache for this request to avoid re-authentication in DRF
                                    request._cached_authenticated_user = user
                            except Exception:
                                pass
            
            if user and user.is_authenticated:
                return getattr(user, 'company', None)
        except Exception:
            pass
        return None
