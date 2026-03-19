from rest_framework.pagination import PageNumberPagination


class CustomPageNumberPagination(PageNumberPagination):
    """
    Custom pagination class that allows clients to control page size via query parameter.
    """
    page_size = 20  # Default page size
    page_size_query_param = 'page_size'  # Allow client to control page size
    max_page_size = 10000  # Increased for frontend search functionality