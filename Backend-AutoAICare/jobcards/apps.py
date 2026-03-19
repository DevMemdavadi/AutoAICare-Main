from django.apps import AppConfig


class JobcardsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'jobcards'
    
    def ready(self):
        import jobcards.signals
        import jobcards.parts_signals
        import jobcards.stock_signals
