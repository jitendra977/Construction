from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

# Views in this router are specifically for authentication and profile management
# Main CRUD for users/roles/logs is handled in the root router in config/urls.py

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('profile/', views.user_profile, name='profile'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
