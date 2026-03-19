from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import Lead, LeadActivity

@receiver(pre_save, sender=Lead)
def capture_status_change(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = Lead.objects.get(pk=instance.pk)
            if old_instance.status != instance.status:
                # Store old status to be used in post_save
                instance._old_status = old_instance.status
        except Lead.DoesNotExist:
            pass

@receiver(post_save, sender=Lead)
def create_status_change_activity(sender, instance, created, **kwargs):
    if not created and hasattr(instance, '_old_status'):
        old_status_display = dict(Lead.STATUS_CHOICES).get(instance._old_status, instance._old_status)
        new_status_display = instance.get_status_display()
        
        LeadActivity.objects.create(
            lead=instance,
            activity_type='status_changed',
            description=f"Status changed from {old_status_display} to {new_status_display}",
            created_by=getattr(instance, '_updated_by', None)
        )
