"""
Test script to verify Django Channels and WebSocket configuration.
"""

import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def test_channel_layer():
    """Test if Redis channel layer is configured correctly."""
    try:
        channel_layer = get_channel_layer()
        print("✓ Channel layer configured successfully")
        print(f"  Backend: {channel_layer.__class__.__name__}")
        
        # Test group send
        test_group = 'test_notifications'
        async_to_sync(channel_layer.group_send)(
            test_group,
            {
                'type': 'test_message',
                'data': {'message': 'Test notification'}
            }
        )
        print("✓ Group send test passed")
        
        return True
    except Exception as e:
        print(f"✗ Channel layer test failed: {str(e)}")
        return False

def test_imports():
    """Test if all required modules can be imported."""
    try:
        from notify.consumers import NotificationConsumer
        print("✓ NotificationConsumer imported successfully")
        
        from notify.middleware import JWTAuthMiddleware
        print("✓ JWTAuthMiddleware imported successfully")
        
        from config.routing import websocket_urlpatterns
        print("✓ WebSocket routing imported successfully")
        
        return True
    except Exception as e:
        print(f"✗ Import test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("=" * 50)
    print("Testing Django Channels WebSocket Setup")
    print("=" * 50)
    
    print("\n1. Testing imports...")
    imports_ok = test_imports()
    
    print("\n2. Testing channel layer...")
    channel_ok = test_channel_layer()
    
    print("\n" + "=" * 50)
    if imports_ok and channel_ok:
        print("✓ All tests passed!")
        print("\nNext steps:")
        print("1. Make sure Redis is running:")
        print("   redis-server")
        print("\n2. Start the ASGI server:")
        print("   daphne -b 0.0.0.0 -p 8000 config.asgi:application")
        print("\n3. Connect from frontend with WebSocket")
    else:
        print("✗ Some tests failed. Please check the errors above.")
    print("=" * 50)
