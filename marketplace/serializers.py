from rest_framework import serializers

from .models import Product, Order


class ProductSerializer(serializers.ModelSerializer):
    artisan_username = serializers.CharField(source="artisan.username", read_only=True)
    artisan_phone = serializers.CharField(source="artisan.phone", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "artisan",
            "artisan_username",
            "artisan_phone",
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
        read_only_fields = ["id", "artisan", "artisan_username", "artisan_phone", "created_at", "updated_at"]


class OrderSerializer(serializers.ModelSerializer):
    # Read-only, nested-ish product info so the buyer/artisan UI doesn't
    # need a second request just to show what the order is for.
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

        # Best-effort total using the product's minimum price, since the
        # AI-suggested price is a range rather than a fixed number.
        unit_price = product.price_min_inr or 0
        validated_data["total_price_inr"] = unit_price * quantity if unit_price else None

        return super().create(validated_data)


class OrderStatusSerializer(serializers.ModelSerializer):
    """Used only by the artisan to move an order forward in the pipeline."""

    class Meta:
        model = Order
        fields = ["status"]