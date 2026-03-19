from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('companies', '0001_initial'),
        ('jobcards', '0031_add_is_service_default_to_parts_used'),
    ]

    operations = [
        # Add nullable company FK to RewardSettings
        migrations.AddField(
            model_name='rewardsettings',
            name='company',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='reward_settings',
                to='companies.company',
                help_text='Company this setting belongs to. NULL = true global default (super_admin only).',
            ),
        ),

        # Backfill company from branch for existing records that have a branch set
        migrations.RunSQL(
            sql="""
                UPDATE reward_settings rs
                SET company_id = b.company_id
                FROM branches b
                WHERE rs.branch_id = b.id
                  AND rs.company_id IS NULL
                  AND rs.branch_id IS NOT NULL;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
