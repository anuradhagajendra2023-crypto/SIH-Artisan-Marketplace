from django.db import models


class Artisan(models.Model):
    name = models.CharField(max_length=200)
    product_type = models.CharField(max_length=200)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    capacity_per_week = models.PositiveIntegerField(default=10)
    rating = models.FloatField(default=4.0)
    phone_number = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.product_type})"


class BulkOrder(models.Model):
    product_type = models.CharField(max_length=200)
    quantity_needed = models.PositiveIntegerField()
    unit_price_inr = models.PositiveIntegerField(default=0)
    buyer_name = models.CharField(max_length=200, blank=True)
    buyer_latitude = models.FloatField(null=True, blank=True)
    buyer_longitude = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product_type} x{self.quantity_needed}"