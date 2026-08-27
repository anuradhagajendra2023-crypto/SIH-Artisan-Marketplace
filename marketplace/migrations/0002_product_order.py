from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
        ('marketplace', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('tags', models.JSONField(blank=True, default=list)),
                ('title_hi', models.CharField(blank=True, max_length=200)),
                ('description_hi', models.TextField(blank=True)),
                ('tags_hi', models.JSONField(blank=True, default=list)),
                ('category', models.CharField(blank=True, max_length=100)),
                ('craft_technique', models.CharField(blank=True, max_length=200)),
                ('price_min_inr', models.PositiveIntegerField(blank=True, null=True)),
                ('price_max_inr', models.PositiveIntegerField(blank=True, null=True)),
                ('image_data_url', models.TextField(blank=True)),
                ('source', models.CharField(choices=[('photo', 'Photo'), ('voice', 'Voice'), ('manual', 'Manual')], default='manual', max_length=20)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('published', 'Published')], default='published', max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('artisan', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='products', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Order',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.PositiveIntegerField(default=1)),
                ('total_price_inr', models.PositiveIntegerField(blank=True, null=True)),
                ('buyer_note', models.TextField(blank=True)),
                ('status', models.CharField(choices=[('placed', 'Placed'), ('in_production', 'In Production'), ('shipped', 'Shipped'), ('delivered', 'Delivered'), ('cancelled', 'Cancelled')], default='placed', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('buyer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='orders_placed', to=settings.AUTH_USER_MODEL)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='orders', to='marketplace.product')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
