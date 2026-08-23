from django.contrib import admin
from .models import Artisan, BulkOrder


@admin.register(Artisan)
class ArtisanAdmin(admin.ModelAdmin):
    list_display = ("name", "product_type", "capacity_per_week", "rating", "created_at")
    list_filter = ("product_type",)
    search_fields = ("name",)


@admin.register(BulkOrder)
class BulkOrderAdmin(admin.ModelAdmin):
    list_display = ("product_type", "quantity_needed", "unit_price_inr", "buyer_name", "created_at")
    list_filter = ("product_type",)