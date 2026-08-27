from django.contrib import admin
from .models import Artisan, BulkOrder, Product, Order


@admin.register(Artisan)
class ArtisanAdmin(admin.ModelAdmin):
    list_display = ("name", "product_type", "capacity_per_week", "rating", "created_at")
    list_filter = ("product_type",)
    search_fields = ("name",)


@admin.register(BulkOrder)
class BulkOrderAdmin(admin.ModelAdmin):
    list_display = ("product_type", "quantity_needed", "unit_price_inr", "buyer_name", "created_at")
    list_filter = ("product_type",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("title", "artisan", "category", "price_min_inr", "price_max_inr", "status", "created_at")
    list_filter = ("status", "category", "source")
    search_fields = ("title", "description", "category")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "buyer", "quantity", "total_price_inr", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("product__title", "buyer__username")