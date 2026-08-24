from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ARTISAN = 'artisan', 'Artisan'
        BUYER = 'buyer', 'Buyer'
        ADMIN = 'admin', 'Admin'

    role = models.CharField(max_length=10, choices=Role.choices, default=Role.BUYER)
    phone = models.CharField(max_length=15, blank=True)
    is_verified = models.BooleanField(default=False)  # for artisan KYC later
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.username} ({self.role})"