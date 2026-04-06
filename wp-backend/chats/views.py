from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Conversation
from .serializers import ConversationSerializer

class ContactListAPIView(generics.ListAPIView):
    """
    Returns a paginated list of conversations mapped to contacts
    """
    queryset = Conversation.objects.all().order_by('-last_message_time')
    serializer_class = ConversationSerializer
    # Will use DRF defaults for pagination and authentication


# The following views are stubs to satisfy the router requirement cleanly:

class MessageListAPIView(APIView):
    def get(self, request, phone_number):
        return Response({"status": "success", "phone_number": phone_number, "data": []})

class SendMessageAPIView(APIView):
    def post(self, request):
        return Response({"status": "simulate send"})

class MarkReadAPIView(APIView):
    def post(self, request, phone_number):
        try:
            conv = Conversation.objects.get(phone_number=phone_number)
            conv.unread_count = 0
            conv.save()
            return Response({"status": "success", "message": "Conversation marked as read"})
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation not found"}, status=404)
