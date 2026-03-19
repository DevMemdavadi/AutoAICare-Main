# core/pagination.py
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework import status

class CustomPagination(PageNumberPagination):
    page_size = 5100
    page_size_query_param = 'page_size'
    max_page_size = 10000  # Increased to allow fetching all products
    
    def get_page_size(self, request):
        """
        Override to ensure page_size parameter is properly handled
        """
        page_size = request.query_params.get(self.page_size_query_param)
        print(f"DEBUG: Requested page_size: {page_size}")
        if page_size is not None:
            try:
                page_size = int(page_size)
                print(f"DEBUG: Parsed page_size: {page_size}, max_page_size: {self.max_page_size}")
                if page_size > 0 and (self.max_page_size is None or page_size <= self.max_page_size):
                    print(f"DEBUG: Returning page_size: {page_size}")
                    return page_size
                else:
                    print(f"DEBUG: Page size {page_size} exceeds max_page_size {self.max_page_size}")
            except (KeyError, ValueError) as e:
                print(f"DEBUG: Error parsing page_size: {e}")
                pass
        print(f"DEBUG: Using default page_size: {self.page_size}")
        return self.page_size

    def get_paginated_response(self, data):
        return Response({
            'msg': 'Success!!',
            'meta': {
                'current_page': self.page.number,
                'is_next_page': self.page.has_next(),
                'next_page': self.get_next_link(),
                'total_count': self.page.paginator.count,
                'total_pages': self.page.paginator.num_pages
            },
            'data': data,
        }, status=status.HTTP_200_OK)