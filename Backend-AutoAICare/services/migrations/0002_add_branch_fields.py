# Generated migration for branch-aware services

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('branches', '0001_initial'),
        ('services', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='servicepackage',
            name='is_global',
            field=models.BooleanField(default=True, help_text='If True, available to all branches'),
        ),
        migrations.AddField(
            model_name='servicepackage',
            name='branch',
            field=models.ForeignKey(
                blank=True,
                help_text='Specific branch (only if is_global=False)',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='service_packages',
                to='branches.branch'
            ),
        ),
        migrations.AddField(
            model_name='addon',
            name='is_global',
            field=models.BooleanField(default=True, help_text='If True, available to all branches'),
        ),
        migrations.AddField(
            model_name='addon',
            name='branch',
            field=models.ForeignKey(
                blank=True,
                help_text='Specific branch (only if is_global=False)',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='addons',
                to='branches.branch'
            ),
        ),
    ]
