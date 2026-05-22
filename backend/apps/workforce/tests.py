from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.attendance.models import AttendanceWorker
from apps.core.models import HouseProject
from apps.workforce.models import WorkforceMember


class WorkforceAttendanceImportTestCase(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="workforce-admin",
            email="workforce@example.com",
            password="pass",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.project = HouseProject.objects.create(
            name="Import Project",
            owner_name="Owner",
            address="Site",
            total_budget=1000000,
            start_date=date(2026, 1, 1),
            expected_completion_date=date(2026, 12, 31),
            area_sqft=1200,
        )
        AttendanceWorker.objects.create(
            project=self.project,
            name="Ram Mason",
            trade="MASON",
            worker_type="LABOUR",
            daily_rate=1200,
            phone="9800000001",
            joined_date=date(2026, 1, 5),
        )
        AttendanceWorker.objects.create(
            project=self.project,
            name="Site Supervisor",
            trade="SUPERVISOR",
            worker_type="STAFF",
            daily_rate=2000,
            phone="9800000002",
            joined_date=date(2026, 1, 6),
        )

    def test_summary_stats_counts_attendance_workers_pending_workforce_import(self):
        response = self.client.get(
            f"/api/v1/workforce/members/summary_stats/?project={self.project.id}"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total"], 0)
        self.assertEqual(response.data["unlinked"], 2)

    def test_seed_from_attendance_imports_all_once_and_is_idempotent(self):
        response = self.client.post(
            "/api/v1/workforce/members/seed_from_attendance/",
            {"project": self.project.id},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")
        self.assertEqual(response.data["created"], 2)
        self.assertEqual(response.data["errors"], [])
        self.assertEqual(WorkforceMember.objects.count(), 2)
        self.assertEqual(
            AttendanceWorker.objects.filter(workforce_member__isnull=True).count(),
            0,
        )

        second_response = self.client.post(
            "/api/v1/workforce/members/seed_from_attendance/",
            {"project": self.project.id},
            format="json",
        )

        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(second_response.data["status"], "ok")
        self.assertEqual(second_response.data["created"], 0)
        self.assertEqual(WorkforceMember.objects.count(), 2)

    def test_sync_all_attendance_links_no_project_members_to_requested_project(self):
        member = WorkforceMember(
            worker_type="LABOUR",
            status="ACTIVE",
            join_date=date(2026, 1, 10),
            created_by=self.user,
        )
        member.first_name = "No"
        member.last_name = "Project"
        member.phone = "9800000099"
        member.save()

        response = self.client.post(
            "/api/v1/workforce/members/sync_all_attendance/",
            {"project": self.project.id},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")
        self.assertEqual(response.data["total_synced"], 1)
        member.refresh_from_db()
        self.assertEqual(member.current_project_id, self.project.id)
        self.assertIsNotNone(member.attendance_worker_id)
        self.assertEqual(member.attendance_worker.project_id, self.project.id)
