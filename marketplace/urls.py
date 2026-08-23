from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.health),
    path("artisans/sample/", views.sample_artisans),
    path("cluster/", views.cluster),
    path("catalog/", views.catalog),
]