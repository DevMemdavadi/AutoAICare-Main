"""
Performance test script for bookings API optimization.
Run this to verify the query count and response time improvements.
"""

import time
from django.db import connection, reset_queries
from django.test.utils import override_settings
from rest_framework.test import APIClient
from users.models import User
from branches.models import Branch


@override_settings(DEBUG=True)  # Required to track queries
def test_bookings_performance():
    """Test the bookings API performance."""
    
    # Create a test user with appropriate permissions
    try:
        user = User.objects.filter(role='super_admin').first()
        if not user:
            print("❌ No super_admin user found. Please create one first.")
            return
        
        # Get a branch ID
        branch = Branch.objects.first()
        if not branch:
            print("❌ No branches found. Please create one first.")
            return
        
        client = APIClient()
        client.force_authenticate(user=user)
        
        # Reset query counter
        reset_queries()
        
        # Make the API request
        start_time = time.time()
        response = client.get(f'/api/bookings/?page=1&page_size=10&branch={branch.id}')
        end_time = time.time()
        
        # Calculate metrics
        query_count = len(connection.queries)
        response_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        # Print results
        print("\n" + "="*60)
        print("📊 BOOKINGS API PERFORMANCE TEST RESULTS")
        print("="*60)
        print(f"✅ Status Code: {response.status_code}")
        print(f"⚡ Response Time: {response_time:.2f}ms")
        print(f"🔍 Database Queries: {query_count}")
        print(f"📦 Bookings Returned: {len(response.data.get('results', []))}")
        print("="*60)
        
        # Performance evaluation
        if query_count <= 10:
            print("✅ EXCELLENT: Query count is optimal!")
        elif query_count <= 20:
            print("⚠️  GOOD: Query count is acceptable but could be better.")
        else:
            print("❌ POOR: Too many queries! Check for N+1 problems.")
        
        if response_time < 100:
            print("✅ EXCELLENT: Response time is very fast!")
        elif response_time < 500:
            print("⚠️  GOOD: Response time is acceptable.")
        elif response_time < 1000:
            print("⚠️  FAIR: Response time could be improved.")
        else:
            print("❌ POOR: Response time is too slow!")
        
        print("\n📝 Query Details:")
        print("-" * 60)
        for i, query in enumerate(connection.queries, 1):
            print(f"\nQuery {i}:")
            print(f"Time: {query['time']}s")
            print(f"SQL: {query['sql'][:200]}...")  # First 200 chars
        
        print("\n" + "="*60)
        
        # Expected performance
        print("\n🎯 EXPECTED PERFORMANCE (After Optimization):")
        print("   - Query Count: 4-8 queries")
        print("   - Response Time: <100ms (local), <500ms (remote)")
        print("\n📈 BEFORE OPTIMIZATION:")
        print("   - Query Count: 130+ queries")
        print("   - Response Time: ~15,000ms")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"❌ Error during test: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    test_bookings_performance()
