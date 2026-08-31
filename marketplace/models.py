from django.conf import settings
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


class Product(models.Model):
    """A catalog listing published by an artisan, generated either from
    the photo (catalog/) or voice (voice/) AI flows and then saved here
    so buyers can browse and order it individually (separate from the
    bulk-order cluster flow).
    """

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    artisan = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="products",
    )

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)

    title_hi = models.CharField(max_length=200, blank=True)
    description_hi = models.TextField(blank=True)
    tags_hi = models.JSONField(default=list, blank=True)

    category = models.CharField(max_length=100, blank=True)
    craft_technique = models.CharField(max_length=200, blank=True)

    price_min_inr = models.PositiveIntegerField(null=True, blank=True)
    price_max_inr = models.PositiveIntegerField(null=True, blank=True)

    # Stored as a data URL (e.g. "data:image/jpeg;base64,...") so no extra
    # media/storage configuration is required for the hackathon build.
    image_data_url = models.TextField(blank=True)

    source = models.CharField(
        max_length=20,
        choices=[("photo", "Photo"), ("voice", "Voice"), ("manual", "Manual")],
        default="manual",
    )

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PUBLISHED,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} by {self.artisan.username}"


class Order(models.Model):
    """A buyer's order for a single Product listing, with a simple
    status pipeline the artisan can move forward as they fulfil it.
    """

    class Status(models.TextChoices):
        PLACED = "placed", "Placed"
        IN_PRODUCTION = "in_production", "In Production"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="orders",
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="orders_placed",
    )

    quantity = models.PositiveIntegerField(default=1)
    total_price_inr = models.PositiveIntegerField(null=True, blank=True)
    buyer_note = models.TextField(blank=True)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PLACED,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order #{self.id} — {self.product.title} x{self.quantity}"


class GalleryMedia(models.Model):
    """A photo or video showing an artisan's craft-making process,
    shown to buyers on the public Craft Gallery page.
    """

    class MediaType(models.TextChoices):
        PHOTO = "photo", "Photo"
        VIDEO = "video", "Video"

    artisan = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="gallery_items",
    )

    media_type = models.CharField(max_length=10, choices=MediaType.choices, default=MediaType.PHOTO)

    # Stored as a data URL, same approach as Product.image_data_url,
    # so no extra media/storage configuration is required.
    media_data_url = models.TextField()

    caption = models.CharField(max_length=300, blank=True)
    craft_type = models.CharField(max_length=200, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.media_type} by {self.artisan.username}"


class VerificationRequest(models.Model):
    """Trust Badge: a lightweight, reference-based KYC alternative for
    artisans who may not have formal documents. An artisan submits a
    photo + a reference person; an admin reviews it in Django admin and
    approves/rejects, which flips User.is_verified.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    artisan = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="verification_requests",
    )

    photo_data_url = models.TextField()
    reference_name = models.CharField(max_length=200)
    reference_phone = models.CharField(max_length=20, blank=True)
    reference_relation = models.CharField(max_length=200, blank=True)
    note = models.TextField(blank=True)

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    admin_note = models.TextField(blank=True)

    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"Verification for {self.artisan.username} ({self.status})"