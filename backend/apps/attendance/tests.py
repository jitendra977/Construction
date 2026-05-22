from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.attendance.models import ProjectAttendanceSettings
from apps.core.models import HouseProject


User = get_user_model()


class AttendanceSettingsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="attendance-user",
            email="attendance@example.com",
            password="testpass123",
        )
        self.client.force_authenticate(self.user)

    def test_missing_project_returns_400(self):
        response = self.client.get("/api/v1/attendance/settings/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "project is required.")

    def test_unknown_project_returns_404_without_creating_settings(self):
        response = self.client.get("/api/v1/attendance/settings/?project=999")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "project not found.")
        self.assertFalse(ProjectAttendanceSettings.objects.exists())

    def test_existing_project_get_or_creates_settings(self):
        project = HouseProject.objects.create(
            name="Test Project",
            owner_name="Owner",
            address="Site",
            total_budget=100000,
            start_date=date(2026, 1, 1),
            expected_completion_date=date(2026, 12, 31),
            area_sqft=1200,
        )

        response = self.client.get(f"/api/v1/attendance/settings/?project={project.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["project"], project.id)
        self.assertTrue(ProjectAttendanceSettings.objects.filter(project=project).exists())
