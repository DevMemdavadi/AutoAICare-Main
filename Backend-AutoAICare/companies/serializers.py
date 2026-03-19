from rest_framework import serializers

class TenantSerializerMixin:
    """
    Mixin for serializers that automatically handles the company field.
    1. Makes 'company' read-only so users can't overwrite it.
    2. Automatically populates 'company' from the request/user context during creation.
    """
    

    def create(self, validated_data):
        # Get the company from the request context provided by middleware
        request = self.context.get('request')
        if request and 'company' not in validated_data:
            if hasattr(request, 'company') and request.company:
                validated_data['company'] = request.company
            elif request.user:
                company = getattr(request.user, 'company', None) or (
                    request.user.branch.company if getattr(request.user, 'branch', None) else None
                )
                if company:
                    validated_data['company'] = company
            
        return super().create(validated_data)
