from django.urls import path
from . import views


urlpatterns = [
    path("health/", views.health),
    path("artisans/sample/", views.sample_artisans),
    path("cluster/", views.cluster),
    path("catalog/", views.catalog),
    path("voice/", views.voice_catalog),
    path("products/", views.products),
    path("products/<int:product_id>/", views.product_detail),
    path("orders/", views.orders),
    path("orders/mine/", views.my_orders),
    path("orders/received/", views.orders),
    path("orders/<int:order_id>/status/", views.order_status),
    path("gallery/", views.gallery),
    path("translate/", views.translate),
    path("pricing/", views.pricing),
    path("enhance/", views.enhance_image),
    path("verification/", views.verification),
    path("products/<int:product_id>/ask/", views.ask_product_question),
]