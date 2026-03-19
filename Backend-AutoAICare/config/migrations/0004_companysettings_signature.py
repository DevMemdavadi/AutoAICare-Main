from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('config', '0003_referralsettings'),
    ]

    operations = [
        migrations.AddField(
            model_name='companysettings',
            name='signature',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to='company/signatures/',
                help_text='Authorised signatory signature image for invoices'
            ),
        ),
    ]
