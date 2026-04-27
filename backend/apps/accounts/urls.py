"""
Accounts Module — URL Configuration

Auth routes  →  /api/v1/auth/          (legacy, kept for compatibility)
Accounts     →  /api/v1/accounts/      (new consolidated prefix)

Endpoints
─────────────────────────────────────────────────────────────
POST   /auth/login/
POST   /auth/logout/
POST   /auth/register/
GET    /auth/profile/
POST   /auth/token/refresh/

GET    /accounts/stats/
POST   /accounts/change-password/

GET/POST            /accounts/users/
GET/PATCH/DEL       /accounts/users/{id}/
POST                /accounts/users/{id}/activate/
POST                /accounts/users/{id}/deactivate/
POST                /accounts/users/{id}/reset-password/
POST                /accounts/users/invite/

GET/POST            /accounts/roles/
GET/PATCH/DEL       /accounts/roles/{id}/

GET                 /accounts/activity-logs/
GET                 /accounts/activity-logs/{id}/
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

# ── Router for ViewSets ───────────────────────────────────────────────────────
accounts_router = DefaultRouter()
accounts_router.register(r'users',         views.UserViewSet,        basename='accounts-user')
accounts_router.register(r'roles',         views.RoleViewSet,        basename='accounts-role')
accounts_router.register(r'activity-logs', views.ActivityLogViewSet, basename='accounts-activity')

# ── Auth urls (legacy /api/v1/auth/ prefix) ───────────────────────────────────
from django.http import HttpResponse

def test_view(request):
    return HttpResponse("Accounts module is alive!")

urlpatterns = [
    path('test/',          test_view,                   name='test-view'),
    path('login/',         views.login_view,            name='login'),
    path('logout/',        views.logout_view,            name='logout'),
    path('register/',      views.RegisterView.as_view(), name='register'),
    path('profile/',       views.user_profile,           name='profile'),
    path('token/refresh/', TokenRefreshView.as_view(),   name='token_refresh'),
]

# ── Accounts urls (new /api/v1/accounts/ prefix) ─────────────────────────────
accounts_urlpatterns = [
    path('stats/',           views.accounts_stats,  name='accounts-stats'),
    path('change-password/', views.change_password, name='change-password'),
    path('',                 include(accounts_router.urls)),
]
