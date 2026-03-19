from django.apps import AppConfig


class WhatsappDashboardConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'whatsapp_dashboard'

    def ready(self):
        import whatsapp_dashboard.signals  # noqa