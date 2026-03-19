import json
import logging
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from whatsapp.models import PendingWhatsAppEvent
import traceback


class WPWebhookTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Clean up events
        PendingWhatsAppEvent.objects.all().delete()

    def test_webhook_meta_format(self):
        payload = {
            "object": "whatsapp_business_account",
            "entry": [
                {
                    "id": "123456789",
                    "changes": [
                        {
                            "value": {
                                "messaging_product": "whatsapp",
                                "metadata": {
                                    "display_phone_number": "12345678",
                                    "phone_number_id": "87654321"
                                },
                                "contacts": [
                                    {
                                        "profile": {
                                            "name": "John Doe"
                                        },
                                        "wa_id": "919876543210"
                                    }
                                ],
                                "messages": [
                                    {
                                        "from": "919876543210",
                                        "id": "wamid.ID12345",
                                        "timestamp": "1631551465",
                                        "text": {
                                            "body": "Hello, this is a test from Meta format!"
                                        },
                                        "type": "text"
                                    }
                                ]
                            },
                            "field": "messages"
                        }
                    ]
                }
            ]
        }
        
        response = self.client.post('/api/whatsapp/webhooks/whatsapp/incoming/', data=payload, format='json')
        print("Response:", response.status_code, response.data)
        
        # Verify event creation
        self.assertEqual(PendingWhatsAppEvent.objects.count(), 1)
        event = PendingWhatsAppEvent.objects.first()
        self.assertEqual(event.phone_number, "919876543210")
        self.assertEqual(event.message_content, "Hello, this is a test from Meta format!")
        self.assertEqual(event.event_type, "incoming")

    def test_webhook_status_event_ignored(self):
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "statuses": [
                                    {
                                        "id": "wamid.ID12345",
                                        "status": "read",
                                        "timestamp": "1631551466"
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
        response = self.client.post('/api/whatsapp/webhooks/whatsapp/incoming/', data=payload, format='json')
        print("Response:", response.status_code, response.data)
        self.assertEqual(PendingWhatsAppEvent.objects.count(), 0)
        self.assertEqual(response.data.get('status'), 'ignored_status')
