"""
WebSocket consumers for real-time notifications and updates.
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


class NotificationConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for handling real-time notifications."""
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.user = self.scope.get('user', AnonymousUser())
        
        # Reject anonymous users
        if not self.user or self.user.is_anonymous:
            await self.close(code=4001)
            return
        
        # Create user-specific group name
        self.group_name = f'notifications_user_{self.user.id}'
        
        # Join user's notification group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        # Accept the WebSocket connection
        await self.accept()
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to notification service',
            'user_id': self.user.id,
        }))
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if hasattr(self, 'group_name'):
            # Leave user's notification group
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Handle messages from WebSocket (optional - for client pings)."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            # Handle ping/pong for connection keep-alive
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp'),
                }))
        except json.JSONDecodeError:
            pass
    
    async def notification_message(self, event):
        """
        Handle notification broadcast from channel layer.
        Called when a notification is sent via group_send.
        """
        # Extract notification data from event
        notification_data = event.get('data', {})
        
        # Send notification to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'data': notification_data,
        }))

    async def booking_updated_message(self, event):
        """
        Handle booking update broadcast.
        """
        await self.send(text_data=json.dumps({
            'type': 'booking_updated',
            'data': event.get('data', {}),
        }))


class JobCardConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time job card updates.
    Handles: notes, tasks, photos, status changes, activities
    """
    
    async def connect(self):
        """Handle WebSocket connection for job card."""
        self.user = self.scope.get('user', AnonymousUser())
        
        # Reject anonymous users
        if not self.user or self.user.is_anonymous:
            await self.close(code=4001)
            return
        
        # Get job card ID from URL route
        self.jobcard_id = self.scope['url_route']['kwargs'].get('jobcard_id')
        
        if not self.jobcard_id:
            await self.close(code=4002)
            return
        
        # Create job card specific group
        self.group_name = f'jobcard_{self.jobcard_id}'
        
        # Join job card group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        # Accept the WebSocket connection
        await self.accept()
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': f'Connected to job card #{self.jobcard_id}',
            'jobcard_id': self.jobcard_id,
            'user_id': self.user.id,
        }))
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Handle messages from WebSocket."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp'),
                }))
        except json.JSONDecodeError:
            pass
    
    # Event handlers for different job card updates
    async def note_added(self, event):
        """Handle new note added to job card."""
        await self.send(text_data=json.dumps({
            'type': 'note_added',
            'data': event.get('data', {}),
        }))
    
    async def note_updated(self, event):
        """Handle note updated."""
        await self.send(text_data=json.dumps({
            'type': 'note_updated',
            'data': event.get('data', {}),
        }))
    
    async def task_created(self, event):
        """Handle new dynamic task created."""
        await self.send(text_data=json.dumps({
            'type': 'task_created',
            'data': event.get('data', {}),
        }))
    
    async def task_updated(self, event):
        """Handle dynamic task updated."""
        await self.send(text_data=json.dumps({
            'type': 'task_updated',
            'data': event.get('data', {}),
        }))
    
    async def status_changed(self, event):
        """Handle job card status change."""
        await self.send(text_data=json.dumps({
            'type': 'status_changed',
            'data': event.get('data', {}),
        }))
    
    async def photo_uploaded(self, event):
        """Handle new photo uploaded."""
        await self.send(text_data=json.dumps({
            'type': 'photo_uploaded',
            'data': event.get('data', {}),
        }))
    
    async def activity_logged(self, event):
        """Handle new activity logged."""
        await self.send(text_data=json.dumps({
            'type': 'activity_logged',
            'data': event.get('data', {}),
        }))
    
    async def assignment_changed(self, event):
        """Handle team assignment change."""
        await self.send(text_data=json.dumps({
            'type': 'assignment_changed',
            'data': event.get('data', {}),
        }))
    
    async def timer_paused(self, event):
        """Handle timer paused event."""
        await self.send(text_data=json.dumps({
            'type': 'timer_paused',
            'data': event.get('data', {}),
        }))
    
    async def timer_resumed(self, event):
        """Handle timer resumed event."""
        await self.send(text_data=json.dumps({
            'type': 'timer_resumed',
            'data': event.get('data', {}),
        }))
    
    async def jobcard_updated(self, event):
        """Handle generic job card data update — tells frontend to refresh."""
        await self.send(text_data=json.dumps({
            'type': 'jobcard_updated',
            'data': event.get('data', {}),
        }))



class TimerConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time timer updates.
    Handles: timer warnings, overdue alerts, time updates
    """
    
    async def connect(self):
        """Handle WebSocket connection for timers."""
        self.user = self.scope.get('user', AnonymousUser())
        
        # Reject anonymous users
        if not self.user or self.user.is_anonymous:
            await self.close(code=4001)
            return
        
        # Get user role and branch for group subscription
        user_role = await self.get_user_role()
        user_branch_id = await self.get_user_branch()
        
        # Create groups based on role and branch
        self.groups = []
        
        # Role-based group subscription
        if user_role in ['supervisor', 'floor_manager', 'admin', 'branch_admin', 'super_admin', 'company_admin', 'applicator']:
            self.groups.append(f'timers_role_{user_role}')
            
            # Branch-specific groups for branch-level roles (strict filtering)
            if user_role in ['floor_manager', 'branch_admin'] and user_branch_id:
                self.groups.append(f'timer_updates_branch_{user_branch_id}')
            # Global group for company-wide and super admins (see all branches)
            elif user_role in ['super_admin', 'company_admin']:
                self.groups.append('timer_updates_all')
            # Supervisors and applicators also get branch-specific updates if assigned to a branch
            elif user_role in ['supervisor', 'applicator'] and user_branch_id:
                self.groups.append(f'timer_updates_branch_{user_branch_id}')
        
        # User-specific timer group
        self.groups.append(f'timers_user_{self.user.id}')
        
        # Join all groups
        for group in self.groups:
            await self.channel_layer.group_add(
                group,
                self.channel_name
            )
        
        # Accept the WebSocket connection
        await self.accept()
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to timer service',
            'user_id': self.user.id,
            'role': user_role,
            'branch_id': user_branch_id,
        }))
    
    @database_sync_to_async
    def get_user_role(self):
        """Get user role from database."""
        return self.user.role if hasattr(self.user, 'role') else 'unknown'
    
    @database_sync_to_async
    def get_user_branch(self):
        """Get user branch ID from database."""
        return self.user.branch_id if hasattr(self.user, 'branch_id') else None
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if hasattr(self, 'groups'):
            for group in self.groups:
                await self.channel_layer.group_discard(
                    group,
                    self.channel_name
                )
    
    async def receive(self, text_data):
        """Handle messages from WebSocket."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp'),
                }))
        except json.JSONDecodeError:
            pass
    
    
    # Event handlers for timer updates
    async def timer_warning_15min(self, event):
        """Handle timer warning (15 minutes remaining)."""
        await self.send(text_data=json.dumps({
            'type': 'timer_warning_15min',
            'data': event.get('data', {}),
        }))
    
    async def timer_warning_10min(self, event):
        """Handle timer warning (10 minutes remaining)."""
        await self.send(text_data=json.dumps({
            'type': 'timer_warning_10min',
            'data': event.get('data', {}),
        }))
    
    async def timer_warning_7min(self, event):
        """Handle timer warning (7 minutes remaining)."""
        await self.send(text_data=json.dumps({
            'type': 'timer_warning_7min',
            'data': event.get('data', {}),
        }))
    
    async def timer_warning_5min(self, event):
        """Handle timer warning (5 minutes remaining)."""
        await self.send(text_data=json.dumps({
            'type': 'timer_warning_5min',
            'data': event.get('data', {}),
        }))
    
    async def timer_warning_3min(self, event):
        """Handle timer warning (3 minutes remaining)."""
        await self.send(text_data=json.dumps({
            'type': 'timer_warning_3min',
            'data': event.get('data', {}),
        }))
    
    async def timer_warning_2min(self, event):
        """Handle timer warning (2 minutes remaining)."""
        await self.send(text_data=json.dumps({
            'type': 'timer_warning_2min',
            'data': event.get('data', {}),
        }))
    
    async def timer_warning(self, event):
        """Handle timer warning (5 minutes remaining - legacy)."""
        await self.send(text_data=json.dumps({
            'type': 'timer_warning',
            'data': event.get('data', {}),
        }))
    
    async def timer_critical(self, event):
        """Handle critical timer warning (1 minute remaining)."""
        await self.send(text_data=json.dumps({
            'type': 'timer_critical',
            'data': event.get('data', {}),
        }))
    
    async def timer_overdue(self, event):
        """Handle timer overdue."""
        await self.send(text_data=json.dumps({
            'type': 'timer_overdue',
            'data': event.get('data', {}),
        }))
    
    async def timer_updated(self, event):
        """Handle timer update (time extended, etc.)."""
        await self.send(text_data=json.dumps({
            'type': 'timer_updated',
            'data': event.get('data', {}),
        }))
    
    async def timer_started(self, event):
        """Handle timer started."""
        await self.send(text_data=json.dumps({
            'type': 'timer_started',
            'data': event.get('data', {}),
        }))
    
    async def timer_stopped(self, event):
        """Handle timer stopped."""
        await self.send(text_data=json.dumps({
            'type': 'timer_stopped',
            'data': event.get('data', {}),
        }))



class DashboardConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time dashboard updates.
    Handles: metrics updates, job list changes, priority alerts
    """
    
    async def connect(self):
        """Handle WebSocket connection for dashboard."""
        self.user = self.scope.get('user', AnonymousUser())
        
        # Reject anonymous users
        if not self.user or self.user.is_anonymous:
            await self.close(code=4001)
            return
        
        # Get user role for group subscription
        user_role = await self.get_user_role()
        branch_id = await self.get_user_branch()
        
        # Create groups based on role
        self.groups = []
        
        # Role-specific dashboard group
        if user_role:
            self.groups.append(f'dashboard_{user_role}')
        
        # Branch-specific group
        if branch_id:
            self.groups.append(f'dashboard_branch_{branch_id}')
        
        # General updates group
        self.groups.append('dashboard_all')
        
        # Join all groups
        for group in self.groups:
            await self.channel_layer.group_add(
                group,
                self.channel_name
            )
        
        # Accept the WebSocket connection
        await self.accept()
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to dashboard service',
            'user_id': self.user.id,
            'role': user_role,
            'branch_id': branch_id,
        }))
    
    @database_sync_to_async
    def get_user_role(self):
        """Get user role from database."""
        return self.user.role if hasattr(self.user, 'role') else 'unknown'
    
    @database_sync_to_async
    def get_user_branch(self):
        """Get user branch ID from database."""
        return self.user.branch_id if hasattr(self.user, 'branch_id') else None
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if hasattr(self, 'groups'):
            for group in self.groups:
                await self.channel_layer.group_discard(
                    group,
                    self.channel_name
                )
    
    async def receive(self, text_data):
        """Handle messages from WebSocket."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp'),
                }))
        except json.JSONDecodeError:
            pass
    
    # Event handlers for dashboard updates
    async def metrics_updated(self, event):
        """Handle dashboard metrics update."""
        await self.send(text_data=json.dumps({
            'type': 'metrics_updated',
            'data': event.get('data', {}),
        }))
    
    async def job_list_updated(self, event):
        """Handle job list change (new job, status change)."""
        await self.send(text_data=json.dumps({
            'type': 'job_list_updated',
            'data': event.get('data', {}),
        }))
    
    async def priority_alert(self, event):
        """Handle priority alert (urgent job, overdue, etc.)."""
        await self.send(text_data=json.dumps({
            'type': 'priority_alert',
            'data': event.get('data', {}),
        }))
    
    async def booking_created(self, event):
        """Handle new booking created."""
        await self.send(text_data=json.dumps({
            'type': 'booking_created',
            'data': event.get('data', {}),
        }))
    
    async def assignment_update(self, event):
        """Handle team assignment update."""
        await self.send(text_data=json.dumps({
            'type': 'assignment_update',
            'data': event.get('data', {}),
        }))


class CustomerJobTrackingConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for customer job tracking.
    Handles: real-time progress, task approvals, status updates, photos
    """
    
    async def connect(self):
        """Handle WebSocket connection for customer job tracking."""
        self.user = self.scope.get('user', AnonymousUser())
        
        # Reject anonymous users
        if not self.user or self.user.is_anonymous:
            await self.close(code=4001)
            return
        
        # Get job card ID from URL route
        self.jobcard_id = self.scope['url_route']['kwargs'].get('jobcard_id')
        
        if not self.jobcard_id:
            await self.close(code=4002)
            return
        
        # Verify customer owns this job card
        is_authorized = await self.verify_customer_access()
        if not is_authorized:
            await self.close(code=4003)
            return
        
        # Create customer-specific job tracking group
        self.group_name = f'customer_job_{self.jobcard_id}'
        
        # Also join the general job card group for updates
        self.jobcard_group = f'jobcard_{self.jobcard_id}'
        
        # Join both groups
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.channel_layer.group_add(
            self.jobcard_group,
            self.channel_name
        )
        
        # Accept the WebSocket connection
        await self.accept()
        
        # Send connection confirmation with initial job data
        job_data = await self.get_job_data()
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': f'Connected to job tracking for Job #{self.jobcard_id}',
            'jobcard_id': self.jobcard_id,
            'job_data': job_data,
        }))
    
    @database_sync_to_async
    def verify_customer_access(self):
        """Verify customer has access to this job card."""
        from jobcards.models import JobCard
        try:
            job = JobCard.objects.select_related('booking__customer__user').get(id=self.jobcard_id)
            return job.booking.customer.user.id == self.user.id
        except JobCard.DoesNotExist:
            return False
    
    @database_sync_to_async
    def get_job_data(self):
        """Get current job card data for customer."""
        from jobcards.models import JobCard, DynamicTask
        try:
            job = JobCard.objects.select_related(
                'booking__vehicle',
                'booking__primary_package'
            ).get(id=self.jobcard_id)
            
            # Get pending approval tasks
            pending_tasks = DynamicTask.objects.filter(
                jobcard=job,
                requires_approval=True,
                approved_by_customer=False
            ).values('id', 'title', 'description', 'estimated_price')
            
            return {
                'id': job.id,
                'status': job.status,
                'progress_percentage': job.progress_percentage,
                'vehicle': f"{job.booking.vehicle.brand} {job.booking.vehicle.model}",
                'package': ', '.join(pkg.name for pkg in job.booking.get_packages_list()) or 'N/A',
                'estimated_completion': job.estimated_completion_time.isoformat() if job.estimated_completion_time else None,
                'pending_approvals': list(pending_tasks),
            }
        except:
            return {}
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
        if hasattr(self, 'jobcard_group'):
            await self.channel_layer.group_discard(
                self.jobcard_group,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Handle messages from WebSocket."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp'),
                }))
            elif message_type == 'approve_task':
                # Handle task approval from customer
                task_id = data.get('task_id')
                await self.handle_task_approval(task_id)
        except json.JSONDecodeError:
            pass
    
    @database_sync_to_async
    def handle_task_approval(self, task_id):
        """Handle customer task approval."""
        from jobcards.models import DynamicTask
        try:
            task = DynamicTask.objects.get(id=task_id, jobcard_id=self.jobcard_id)
            task.approved_by_customer = True
            task.save()
            return True
        except DynamicTask.DoesNotExist:
            return False
    
    # Event handlers
    async def status_changed(self, event):
        """Handle job status change."""
        await self.send(text_data=json.dumps({
            'type': 'status_changed',
            'data': event.get('data', {}),
        }))
    
    async def progress_updated(self, event):
        """Handle progress update."""
        await self.send(text_data=json.dumps({
            'type': 'progress_updated',
            'data': event.get('data', {}),
        }))
    
    async def task_created(self, event):
        """Handle new task requiring approval."""
        await self.send(text_data=json.dumps({
            'type': 'task_approval_required',
            'data': event.get('data', {}),
        }))
    
    async def task_updated(self, event):
        """Handle task update."""
        await self.send(text_data=json.dumps({
            'type': 'task_updated',
            'data': event.get('data', {}),
        }))
    
    async def photo_uploaded(self, event):
        """Handle new photo uploaded."""
        await self.send(text_data=json.dumps({
            'type': 'photo_uploaded',
            'data': event.get('data', {}),
        }))
    
    async def activity_logged(self, event):
        """Handle new activity."""
        await self.send(text_data=json.dumps({
            'type': 'activity_logged',
            'data': event.get('data', {}),
        }))
    
    async def note_added(self, event):
        """Handle customer-visible note."""
        note_data = event.get('data', {})
        # Only send if visible to customer
        if note_data.get('visible_to_customer'):
            await self.send(text_data=json.dumps({
                'type': 'note_added',
                'data': note_data,
            }))

