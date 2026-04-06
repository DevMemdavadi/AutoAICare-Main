import json
import logging
import re
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone
from asgiref.sync import sync_to_async


logger = logging.getLogger("whatsapp")  # Use the "whatsapp" logger from your settings

class WhatsAppConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        logger.info(f"[CONNECT] WebSocket connected: {self.channel_name}")
        await self.channel_layer.group_add("whatsapp_messages", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        logger.info(f"[DISCONNECT] WebSocket disconnected: {self.channel_name} (code {close_code})")
        await self.channel_layer.group_discard("whatsapp_messages", self.channel_name)

    async def receive(self, text_data):
        logger.info(f"[RECEIVE] Data received (unused): {text_data}")

    async def new_message(self, event):
        logger.info(f"[SEND] Sending message to client: {event['message']}")
        await self.send(text_data=json.dumps(event["message"]))

    async def status_update(self, event):
        """Handle status update broadcasts for dashboard"""
        logger.info(f"[STATUS] Sending status update to client: {event['message']}")
        await self.send(text_data=json.dumps({
            "type": "status_update",
            "message": event["message"]
        }))

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.phone_number = self.scope['url_route']['kwargs']['phone_number']
        # Sanitize phone number for group name - remove/replace invalid characters
        sanitized_phone = re.sub(r'[^a-zA-Z0-9\-_.]', '_', self.phone_number)
        self.group_name = f"chat_{sanitized_phone}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        print(f"[ChatConsumer] Received from client: {text_data}")
        data = json.loads(text_data)
        
        # Handle typing indicators
        event_type = data.get('type')
        if event_type in ['typing_start', 'typing_stop']:
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "typing_indicator",
                    "event": data,
                    "exclude_sender": self.channel_name,
                }
            )
            return
        
        # Handle the nested message structure
        if 'message' in data:
            message_data = data['message']
            content = message_data.get('content')
            sender = message_data.get('sender')  # e.g., 'admin' or 'contact'
        else:
            # Fallback for direct data structure
            content = data.get('content')
            sender = data.get('sender')
        
        print('sender', sender)
        print("sender == 'contact' and content", sender == 'contact' and content)
        
        # Handle different sender types
        if sender == 'contact' and content:
            # Save received message from contact to database
            try:
                await self.save_message_to_db(content)
                print(f"✅ Saved WebSocket message from {self.phone_number}: {content}")
                
            except Exception as e:
                print(f"❌ Error saving WebSocket message: {str(e)}")
                
        elif sender == 'admin' and content:
            # Send message to WhatsApp via API
            try:
                # Extract frontend_id if provided
                frontend_id = message_data.get('id') if 'message' in data else data.get('id')
                
                result = await self.send_whatsapp_message(content, frontend_id)
                print(f"✅ Sent WhatsApp message to {self.phone_number}: {content}")
                
                # Note: The WhatsApp service automatically broadcasts via notify_chat()
                # No need to manually broadcast here to avoid duplication
                
            except Exception as e:
                print(f"❌ Error sending WhatsApp message: {str(e)}")
                
                # Broadcast error message to sender only
                await self.send(text_data=json.dumps({
                    "phone_number": self.phone_number,
                    "content": f"Failed to send message: {str(e)}",
                    "sender": "system",
                    "status": "error",
                    "timestamp": timezone.now().isoformat(),
                }))
                return
        
        # Broadcast message to other clients (for contact messages)
        if sender == 'contact':
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "chat_message",
                    "message": {
                        "phone_number": self.phone_number,
                        "content": content,
                        "sender": sender,
                    },
                    "exclude_sender": self.channel_name,  # Exclude the sender from receiving the broadcast
                }
            )

    @sync_to_async
    def save_message_to_db(self, content):
        """Save message to database using sync_to_async"""
        from .models import WhatsAppMessage
        import uuid
        
        # Create a unique message ID for WebSocket messages
        message_id = f"ws_{uuid.uuid4().hex}"
        
        # Save the received message to database
        message = WhatsAppMessage.objects.create(
            phone_number=self.phone_number,
            message_type='text',
            message_content=content,
            message_id=message_id,
            status='received',
            timestamp=timezone.now(),
            is_read=False,
        )
        return message

    @sync_to_async
    def send_whatsapp_message(self, content, frontend_id=None):
        """Send message to WhatsApp using sync_to_async"""
        from .services import WhatsAppService
        
        # Initialize WhatsApp service
        whatsapp_service = WhatsAppService()
        
        # Send the message
        result = whatsapp_service.send_message(
            to_phone=self.phone_number,
            message_type="text",
            content=content,
            exclude_channel=self.channel_name,  # Pass channel name for exclusion
            frontend_id=frontend_id
        )
        
        return result

    async def chat_message(self, event):
        # Check if this consumer should be excluded from receiving the message
        if event.get('exclude_sender') == self.channel_name:
            print(f"[ChatConsumer] Skipping message for sender: {self.channel_name}")
            return
            
        print(f"[ChatConsumer] Received broadcast: {event}")
        print(f"[ChatConsumer] Sending to client: {event['message']}")
        await self.send(text_data=json.dumps(event["message"]))

    async def typing_indicator(self, event):
        """Broadcast typing indicator to other clients in the group"""
        if event.get('exclude_sender') == self.channel_name:
            return
            
        await self.send(text_data=json.dumps(event["event"]))

    async def status_update(self, event):
        """Handle status update broadcasts"""
        print(f"[ChatConsumer] Received status update: {event}")
        await self.send(text_data=json.dumps({
            "type": "status_update",
            "message": event["message"]
        }))


from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
# from .models import ChatAssignment, AgentAvailability, ChatQueue

class TeamInboxConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time team inbox updates.
    Handles chat assignments, agent availability, and queue updates.
    """
    async def connect(self):
        """Handle WebSocket connection"""
        # Join the team inbox group
        await self.channel_layer.group_add(
            "team_inbox",
            self.channel_name
        )
        
        # Join user-specific group for personal updates
        if self.scope["user"].is_authenticated:
            await self.channel_layer.group_add(
                f"agent_{self.scope['user'].id}",
                self.channel_name
            )
        
        await self.accept()
        
        # Send initial data
        await self.send_initial_data()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        # Leave groups
        await self.channel_layer.group_discard(
            "team_inbox",
            self.channel_name
        )
        
        if self.scope["user"].is_authenticated:
            await self.channel_layer.group_discard(
                f"agent_{self.scope['user'].id}",
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'update_availability':
                await self.handle_availability_update(data)
            elif message_type == 'assign_chat':
                await self.handle_chat_assignment(data)
            elif message_type == 'transfer_chat':
                await self.handle_chat_transfer(data)
            elif message_type == 'mark_resolved':
                await self.handle_mark_resolved(data)
            elif message_type == 'update_activity':
                await self.handle_activity_update(data)
            else:
                await self.send(text_data=json.dumps({
                    'error': 'Unknown message type'
                }))
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'error': 'Invalid JSON'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'error': str(e)
            }))
    
    async def send_initial_data(self):
        """Send initial data when connecting"""
        if not self.scope["user"].is_authenticated:
            return
        
        # Get user's assigned chats
        assigned_chats = await self.get_assigned_chats()
        
        # Get user's availability status
        availability = await self.get_user_availability()
        
        await self.send(text_data=json.dumps({
            'type': 'initial_data',
            'assigned_chats': assigned_chats,
            'availability': availability
        }))
    
    async def handle_availability_update(self, data):
        """Handle agent availability status updates"""
        if not self.scope["user"].is_authenticated:
            return
        
        status = data.get('status')
        max_concurrent_chats = data.get('max_concurrent_chats')
        
        availability = await self.update_availability(status, max_concurrent_chats)
        
        # Broadcast to team inbox
        await self.channel_layer.group_send(
            "team_inbox",
            {
                "type": "availability_update",
                "agent_id": self.scope["user"].id,
                "status": status,
                "availability": availability
            }
        )
    
    async def handle_chat_assignment(self, data):
        """Handle chat assignment requests"""
        if not self.scope["user"].is_authenticated:
            return
        
        chat_id = data.get('chat_id')
        agent_id = data.get('agent_id')
        
        if agent_id:
            # Assign to specific agent
            assignment = await self.assign_chat_to_agent(chat_id, agent_id)
        else:
            # Assign to current user
            assignment = await self.assign_chat_to_me(chat_id)
        
        if assignment:
            # Broadcast assignment update
            await self.channel_layer.group_send(
                "team_inbox",
                {
                    "type": "chat_assignment_update",
                    "assignment": assignment
                }
            )
    
    async def handle_chat_transfer(self, data):
        """Handle chat transfer requests"""
        if not self.scope["user"].is_authenticated:
            return
        
        chat_id = data.get('chat_id')
        new_agent_id = data.get('new_agent_id')
        reason = data.get('reason', '')
        
        transfer_result = await self.transfer_chat(chat_id, new_agent_id, reason)
        
        if transfer_result:
            # Broadcast transfer update
            await self.channel_layer.group_send(
                "team_inbox",
                {
                    "type": "chat_transfer_update",
                    "transfer": transfer_result
                }
            )
    
    async def handle_mark_resolved(self, data):
        """Handle marking chats as resolved"""
        if not self.scope["user"].is_authenticated:
            return
        
        chat_id = data.get('chat_id')
        resolved = await self.mark_chat_resolved(chat_id)
        
        if resolved:
            # Broadcast resolution update
            await self.channel_layer.group_send(
                "team_inbox",
                {
                    "type": "chat_resolved_update",
                    "chat_id": chat_id
                }
            )
    
    async def handle_activity_update(self, data):
        """Handle agent activity updates"""
        if not self.scope["user"].is_authenticated:
            return
        
        await self.update_agent_activity()
    
    # Database operations
    @database_sync_to_async
    def get_assigned_chats(self):
        """Get chats assigned to the current user"""
        from whatsapp_dashboard.models import ChatAssignment
        chats = ChatAssignment.objects.filter(
            assigned_agent=self.scope["user"],
            status='active'
        ).select_related('assigned_agent')
        
        return [
            {
                'id': chat.id,
                'phone_number': chat.phone_number,
                'status': chat.status,
                'priority': chat.priority,
                'unread_count': chat.unread_count,
                'last_activity_at': chat.last_activity_at.isoformat(),
                'notes': chat.notes
            }
            for chat in chats
        ]
    
    @database_sync_to_async
    def get_user_availability(self):
        """Get current user's availability status"""
        from whatsapp_dashboard.models import AgentAvailability
        try:
            availability = AgentAvailability.objects.get(agent=self.scope["user"])
            return {
                'status': availability.status,
                'max_concurrent_chats': availability.max_concurrent_chats,
                'current_chat_count': availability.current_chat_count,
                'is_available': availability.is_available
            }
        except AgentAvailability.DoesNotExist:
            return None
    
    @database_sync_to_async
    def update_availability(self, status, max_concurrent_chats=None):
        """Update user's availability status"""
        from whatsapp_dashboard.models import AgentAvailability
        availability, created = AgentAvailability.objects.get_or_create(
            agent=self.scope["user"]
        )
        
        availability.status = status
        if max_concurrent_chats:
            availability.max_concurrent_chats = max_concurrent_chats
        
        availability.last_activity = timezone.now()
        availability.save()
        
        return {
            'status': availability.status,
            'max_concurrent_chats': availability.max_concurrent_chats,
            'current_chat_count': availability.current_chat_count,
            'is_available': availability.is_available
        }
    
    @database_sync_to_async
    def assign_chat_to_me(self, chat_id):
        """Assign a chat to the current user"""
        from whatsapp_dashboard.models import ChatAssignment, AgentAvailability
        try:
            chat = ChatAssignment.objects.get(id=chat_id, assigned_agent__isnull=True)
            chat.assigned_agent = self.scope["user"]
            chat.assigned_by = self.scope["user"]
            chat.save()
            
            # Update availability
            availability, _ = AgentAvailability.objects.get_or_create(agent=self.scope["user"])
            availability.update_chat_count()
            
            return {
                'id': chat.id,
                'phone_number': chat.phone_number,
                'assigned_agent': chat.assigned_agent.username,
                'status': chat.status
            }
        except ChatAssignment.DoesNotExist:
            return None
    
    @database_sync_to_async
    def assign_chat_to_agent(self, chat_id, agent_id):
        """Assign a chat to a specific agent"""
        from users.models import User
        from whatsapp_dashboard.models import ChatAssignment, AgentAvailability
        try:
            chat = ChatAssignment.objects.get(id=chat_id, assigned_agent__isnull=True)
            agent = User.objects.get(id=agent_id)
            
            chat.assigned_agent = agent
            chat.assigned_by = self.scope["user"]
            chat.save()
            
            # Update availability
            availability, _ = AgentAvailability.objects.get_or_create(agent=agent)
            availability.update_chat_count()
            
            return {
                'id': chat.id,
                'phone_number': chat.phone_number,
                'assigned_agent': chat.assigned_agent.username,
                'status': chat.status
            }
        except (ChatAssignment.DoesNotExist, User.DoesNotExist):
            return None
    
    @database_sync_to_async
    def transfer_chat(self, chat_id, new_agent_id, reason):
        """Transfer a chat to another agent"""
        from users.models import User
        from whatsapp_dashboard.models import ChatAssignment, AgentAvailability
        try:
            chat = ChatAssignment.objects.get(id=chat_id)
            new_agent = User.objects.get(id=new_agent_id)
            
            old_agent = chat.assigned_agent
            chat.transfer_to_agent(new_agent, self.scope["user"])
            
            # Update chat counts
            if old_agent:
                old_availability, _ = AgentAvailability.objects.get_or_create(agent=old_agent)
                old_availability.update_chat_count()
            
            new_availability, _ = AgentAvailability.objects.get_or_create(agent=new_agent)
            new_availability.update_chat_count()
            
            return {
                'id': chat.id,
                'phone_number': chat.phone_number,
                'from_agent': old_agent.username if old_agent else None,
                'to_agent': new_agent.username,
                'reason': reason
            }
        except (ChatAssignment.DoesNotExist, User.DoesNotExist):
            return None
    
    @database_sync_to_async
    def mark_chat_resolved(self, chat_id):
        """Mark a chat as resolved"""
        from whatsapp_dashboard.models import ChatAssignment, AgentAvailability
        try:
            chat = ChatAssignment.objects.get(id=chat_id)
            chat.mark_resolved()
            
            # Update agent's chat count
            if chat.assigned_agent:
                availability, _ = AgentAvailability.objects.get_or_create(agent=chat.assigned_agent)
                availability.update_chat_count()
            
            return True
        except ChatAssignment.DoesNotExist:
            return False
    
    @database_sync_to_async
    def update_agent_activity(self):
        """Update agent's last activity timestamp"""
        from whatsapp_dashboard.models import AgentAvailability
        try:
            availability = AgentAvailability.objects.get(agent=self.scope["user"])
            availability.last_activity = timezone.now()
            availability.save()
        except AgentAvailability.DoesNotExist:
            pass
    
    # WebSocket message handlers
    async def availability_update(self, event):
        """Send availability update to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'availability_update',
            'agent_id': event['agent_id'],
            'status': event['status'],
            'availability': event['availability']
        }))
    
    async def chat_assignment_update(self, event):
        """Send chat assignment update to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'chat_assignment_update',
            'assignment': event['assignment']
        }))
    
    async def chat_transfer_update(self, event):
        """Send chat transfer update to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'chat_transfer_update',
            'transfer': event['transfer']
        }))
    
    async def chat_resolved_update(self, event):
        """Send chat resolved update to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'chat_resolved_update',
            'chat_id': event['chat_id']
        }))
    
    async def new_chat_assignment(self, event):
        """Handle new chat assignment from external source"""
        await self.send(text_data=json.dumps({
            'type': 'new_chat_assignment',
            'assignment': event['assignment']
        }))
    
    async def queue_update(self, event):
        """Handle queue updates"""
        await self.send(text_data=json.dumps({
            'type': 'queue_update',
            'queue_data': event['queue_data']
        })) 