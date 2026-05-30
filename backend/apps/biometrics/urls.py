from django.urls import path
from apps.biometrics.views import FaceTrainingView, FaceLoginView, BiometricKioskCheckInView, FaceDeleteView

app_name = 'biometrics'

urlpatterns = [
    path('train/', FaceTrainingView.as_view(), name='face-train'),
    path('login/', FaceLoginView.as_view(), name='face-login'),
    path('kiosk-checkin/', BiometricKioskCheckInView.as_view(), name='face-kiosk-checkin'),
    path('delete/', FaceDeleteView.as_view(), name='face-delete'),
]
