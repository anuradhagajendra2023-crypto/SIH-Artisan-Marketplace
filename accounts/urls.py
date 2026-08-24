from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import RegisterView, MyTokenObtainPairView, MeView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),
]