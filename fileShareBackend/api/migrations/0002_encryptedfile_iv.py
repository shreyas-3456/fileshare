# Generated by Django 5.1.5 on 2025-01-31 18:53

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='encryptedfile',
            name='iv',
            field=models.CharField(default=None, max_length=16),
            preserve_default=False,
        ),
    ]
