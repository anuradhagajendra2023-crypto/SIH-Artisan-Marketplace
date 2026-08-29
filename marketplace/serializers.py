from rest_framework import serializers
from django.db.models import Sum

from .models import Product, Order, GalleryMedia


class ProductSerializer(serializers.ModelSerializer):
    artisan_username = serializers.CharField(source="artisan.username", read_only=True)
    artisan_phone = serializers.CharField(source="artisan.phone", read_only=True)
    artisan_is_verified = serializers.BooleanField(source="artisan.is_verified", read_only=True)
    units_sold = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "artisan",
            "artisan_username",
            "artisan_phone",
            "artisan_is_verified",
            "units_sold",
            "title",
            "description",
            "tags",
            "title_hi",
            "description_hi",
            "tags_hi",
            "category",
            "craft_technique",
            "price_min_inr",
            "price_max_inr",
            "image_data_url",
            "source",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "artisan",
            "artisan_username",
            "artisan_phone",
            "artisan_is_verified",
            "units_sold",
            "created_at",
            "updated_at",
        ]

    def get_units_sold(self, obj):
        """Total quantity ordered for this listing across every order that
        wasn't cancelled — shown to buyers as a simple trust signal."""
        total = obj.orders.exclude(status=Order.Status.CANCELLED).aggregate(
            total=Sum("quantity")
        )["total"]
        return total or 0


class OrderSerializer(serializers.ModelSerializer):
    product_title = serializers.CharField(source="product.title", read_only=True)
    product_image = serializers.CharField(source="product.image_data_url", read_only=True)
    artisan_username = serializers.CharField(source="product.artisan.username", read_only=True)
    buyer_username = serializers.CharField(source="buyer.username", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "product",
            "product_title",
            "product_image",
            "artisan_username",
            "buyer",
            "buyer_username",
            "quantity",
            "total_price_inr",
            "buyer_note",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "product_title",
            "product_image",
            "artisan_username",
            "buyer",
            "buyer_username",
            "total_price_inr",
            "status",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        product = validated_data["product"]
        quantity = validated_data.get("quantity", 1)

        unit_price = product.price_min_inr or 0
        validated_data["total_price_inr"] = unit_price * quantity if unit_price else None

        return super().create(validated_data)


class OrderStatusSerializer(serializers.ModelSerializer):
    """Used only by the artisan to move an order forward in the pipeline."""

    class Meta:
        model = Order
        fields = ["status"]


class GalleryMediaSerializer(serializers.ModelSerializer):
    artisan_username = serializers.CharField(source="artisan.username", read_only=True)

    class Meta:
        model = GalleryMedia
        fields = [
            "id",
            "artisan",
            "artisan_username",
            "media_type",
            "media_data_url",
            "caption",
            "craft_type",
            "created_at",
        ]
        read_only_fields = ["id", "artisan", "artisan_username", "created_at"]