from django.apps import AppConfig


class AutomationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'automation'
    verbose_name = 'Workflow Automation'
    
    def ready(self):
        # Import signals if any
        pass
