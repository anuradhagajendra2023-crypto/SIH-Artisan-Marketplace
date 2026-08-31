"""
Seeds a handful of published Product rows so the Dynamic Pricing Assistant
has comparable listings to work with during the demo.

Usage (from the Django project root, same level as manage.py):
    python manage.py seed_demo_products

Safe to re-run — it skips creation if a demo artisan already has products.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from marketplace.models import Product

User = get_user_model()

DEMO_ARTISAN_USERNAME = "demo_artisan_seed"

SAMPLE_PRODUCTS = [
    dict(
        title="Handcrafted Wooden Storage Basket",
        category="Wood Carvings",
        craft_technique="Hand carving",
        tags=["wood", "storage", "handmade", "basket"],
        price_min_inr=550,
        price_max_inr=1250,
        description="A handmade wooden storage basket crafted by skilled artisans.",
    ),
    dict(
        title="Carved Wooden Jewellery Box",
        category="Wood Carvings",
        craft_technique="Hand carving",
        tags=["wood", "jewellery", "box", "handmade"],
        price_min_inr=650,
        price_max_inr=1400,
        description="An intricately carved wooden box for storing jewellery.",
    ),
    dict(
        title="Wooden Wall Hanging",
        category="Wood Carvings",
        craft_technique="Relief carving",
        tags=["wood", "wall decor", "handmade"],
        price_min_inr=400,
        price_max_inr=900,
        description="A decorative relief-carved wooden wall hanging.",
    ),
    dict(
        title="Handcrafted Bankura Terracotta Horse Pair",
        category="Terracotta",
        craft_technique="Bankura terracotta",
        tags=["terracotta", "horse", "handmade", "figurine"],
        price_min_inr=650,
        price_max_inr=950,
        description="A traditional pair of Bankura terracotta horses, exquisitely handcrafted.",
    ),
    dict(
        title="Terracotta Decorative Vase",
        category="Terracotta",
        craft_technique="Bankura terracotta",
        tags=["terracotta", "vase", "handmade", "decor"],
        price_min_inr=500,
        price_max_inr=850,
        description="A hand-molded terracotta vase with traditional motifs.",
    ),
    dict(
        title="Handmade Floral Embroidered Jute Tote Bag",
        category="Jute Products",
        craft_technique="Embroidery",
        tags=["jute", "bag", "embroidery", "handmade"],
        price_min_inr=300,
        price_max_inr=650,
        description="A floral embroidered jute tote bag, handmade by local artisans.",
    ),
    dict(
        title="Jute Table Runner",
        category="Jute Products",
        craft_technique="Weaving",
        tags=["jute", "table runner", "handmade", "home decor"],
        price_min_inr=250,
        price_max_inr=500,
        description="A woven jute table runner with a natural finish.",
    ),
]


class Command(BaseCommand):
    help = "Seeds sample published products so the pricing endpoint has comparable data for demos."

    def handle(self, *args, **options):
        artisan, created = User.objects.get_or_create(
            username=DEMO_ARTISAN_USERNAME,
            defaults={"email": "demo_artisan_seed@example.com"},
        )
        if created:
            artisan.set_unusable_password()
            artisan.save()
            self.stdout.write(self.style.SUCCESS(f"Created demo artisan user '{DEMO_ARTISAN_USERNAME}'"))

        existing = Product.objects.filter(artisan=artisan).count()
        if existing >= len(SAMPLE_PRODUCTS):
            self.stdout.write(self.style.WARNING(
                f"Demo artisan already has {existing} products — skipping seed. "
                f"Delete them first if you want to reseed."
            ))
            return

        created_count = 0
        for data in SAMPLE_PRODUCTS:
            _, was_created = Product.objects.get_or_create(
                artisan=artisan,
                title=data["title"],
                defaults=dict(
                    description=data["description"],
                    tags=data["tags"],
                    category=data["category"],
                    craft_technique=data["craft_technique"],
                    price_min_inr=data["price_min_inr"],
                    price_max_inr=data["price_max_inr"],
                    source="manual",
                    status=Product.Status.PUBLISHED,
                ),
            )
            if was_created:
                created_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {created_count} new demo products "
            f"({Product.objects.filter(artisan=artisan).count()} total for demo artisan)."
        ))
