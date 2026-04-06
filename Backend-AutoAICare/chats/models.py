from django.db import models
from django.utils import timezone

class Conversation(models.Model):
    phone_number = models.CharField(max_length=20, unique=True, db_index=True)
    last_message = models.TextField(blank=True, null=True)
    last_message_time = models.DateTimeField(db_index=True, default=timezone.now)
    unread_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Conversation with {self.phone_number}"

    class Meta:
        ordering = ['-last_message_time']
