from django.urls import path
from apps.biometrics.views import FaceTrainingView, FaceLoginView

app_name = 'biometrics'

urlpatterns = [
    path('train/', FaceTrainingView.as_view(), name='face-train'),
    path('login/', FaceLoginView.as_view(), name='face-login'),
]
