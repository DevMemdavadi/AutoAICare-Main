from rest_framework import serializers
from .models import Conversation

class ConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = ['phone_number', 'last_message', 'last_message_time', 'unread_count']
