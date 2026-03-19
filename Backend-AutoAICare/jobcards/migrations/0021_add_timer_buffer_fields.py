# Generated migration for timer buffer and pause/resume functionality

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobcards', '0020_jobcard_warning_2min_sent'),
    ]

    operations = [
        migrations.AddField(
            model_name='jobcard',
            name='buffer_percentage',
            field=models.DecimalField(
                decimal_places=2,
                default=20.0,
                help_text='Buffer percentage added to service duration (default: 20%)',
                max_digits=5
            ),
        ),
        migrations.AddField(
            model_name='jobcard',
            name='buffer_minutes_allocated',
            field=models.IntegerField(
                blank=True,
                help_text='Calculated buffer time in minutes based on buffer_percentage',
                null=True
            ),
        ),
        migrations.AddField(
            model_name='jobcard',
            name='is_timer_paused',
            field=models.BooleanField(
                default=False,
                help_text='Whether the timer is currently paused'
            ),
        ),
        migrations.AddField(
            model_name='jobcard',
            name='pause_started_at',
            field=models.DateTimeField(
                blank=True,
                help_text='Timestamp when timer was paused',
                null=True
            ),
        ),
        migrations.AddField(
            model_name='jobcard',
            name='total_pause_duration_seconds',
            field=models.IntegerField(
                default=0,
                help_text='Total accumulated pause duration in seconds'
            ),
        ),
        migrations.AddField(
            model_name='jobcard',
            name='pause_reason',
            field=models.CharField(
                blank=True,
                choices=[
                    ('photo_upload', 'Photo Upload'),
                    ('qc_review', 'QC Review'),
                    ('manual', 'Manual Pause'),
                    ('technical_issue', 'Technical Issue')
                ],
                help_text='Reason for current pause',
                max_length=20,
                null=True
            ),
        ),
    ]
