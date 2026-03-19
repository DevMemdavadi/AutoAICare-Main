# Generated migration for feedback enhancements

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('feedback', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='feedback',
            name='category',
            field=models.CharField(
                choices=[
                    ('service_quality', 'Service Quality'),
                    ('staff_behavior', 'Staff Behavior'),
                    ('pricing', 'Pricing'),
                    ('timeliness', 'Timeliness'),
                    ('facility', 'Facility')
                ],
                default='service_quality',
                max_length=50
            ),
        ),
        migrations.AddField(
            model_name='feedback',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('reviewed', 'Reviewed'),
                    ('resolved', 'Resolved')
                ],
                default='pending',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='feedback',
            name='suggestions',
            field=models.TextField(
                blank=True,
                help_text='Customer suggestions for improvement',
                null=True
            ),
        ),
        migrations.AddField(
            model_name='feedback',
            name='helpful_count',
            field=models.IntegerField(
                default=0,
                help_text='Number of people who found this helpful'
            ),
        ),
    ]
