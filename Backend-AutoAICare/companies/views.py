from django.http import JsonResponse
from django.contrib.auth.decorators import login_required


@login_required
def test_subdomain(request):
    """
    Debug endpoint to verify subdomain/tenant detection.
    Restricted to super_admin only — do not expose in production to other roles.

    Access via: http://newco.localhost:8000/test-subdomain/
    """
    user = request.user

    # Restrict to super_admin only
    if getattr(user, 'role', None) != 'super_admin':
        return JsonResponse(
            {'error': 'Forbidden. This endpoint is restricted to super admins.'},
            status=403
        )

    company = getattr(request, 'company', None)
    tenant_source = getattr(request, 'tenant_source', None)

    response_data = {
        'success': True,
        'host': request.get_host(),
        'subdomain_detected': company is not None,
        'company': {
            'id': company.id if company else None,
            'name': company.name if company else None,
            'slug': company.slug if company else None,
        } if company else None,
        'tenant_source': tenant_source,
        'user': {
            'email': user.email,
            'role': user.role,
        },
        'message': f'Subdomain multi-tenancy is {"WORKING ✅" if company else "NOT DETECTED ❌"}',
    }

    return JsonResponse(response_data, json_dumps_params={'indent': 2})

