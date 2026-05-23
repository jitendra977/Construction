from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.attendance.models import AttendanceWorker
from apps.accounts.models import Role
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

    def test_create_account_can_separate_worker_pin_from_admin_password(self):
        role = Role.objects.create(
            code="CONTRACTOR",
            name="Contractor",
            can_manage_workforce=True,
        )
        member = WorkforceMember(
            worker_type="LABOUR",
            status="ACTIVE",
            join_date=date(2026, 1, 10),
            current_project=self.project,
            created_by=self.user,
        )
        member.first_name = "Portal"
        member.last_name = "Admin"
        member.phone = "+81-90-1111-2222"
        member.email = "portal-admin@example.com"
        member.save()

        response = self.client.post(
            f"/api/v1/workforce/members/{member.id}/create_account/",
            {"pin": "123456", "admin_access": True, "role_id": role.id},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["pin"], "123456")
        self.assertTrue(response.data["password"])
        member.refresh_from_db()
        self.assertTrue(member.check_portal_pin("123456"))
        self.assertFalse(member.account.check_password("123456"))
        self.assertTrue(member.account.check_password(response.data["password"]))
        self.assertEqual(member.account.role_id, role.id)
        self.assertTrue(member.account.is_staff)

        login_response = self.client.post(
            "/api/v1/worker/login/",
            {"phone": "+81-90-1111-2222", "pin": "123456"},
            format="json",
        )
        self.assertEqual(login_response.status_code, 200)

    def test_create_account_assigns_requested_project_to_member_and_user(self):
        member = WorkforceMember(
            worker_type="LABOUR",
            status="ACTIVE",
            join_date=date(2026, 1, 10),
            created_by=self.user,
        )
        member.first_name = "Project"
        member.last_name = "Worker"
        member.phone = "+81-90-2222-3333"
        member.email = "project-worker@example.com"
        member.save()

        response = self.client.post(
            f"/api/v1/workforce/members/{member.id}/create_account/",
            {"pin": "654321", "project_id": self.project.id},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["project"], self.project.id)
        member.refresh_from_db()
        self.assertEqual(member.current_project_id, self.project.id)
        self.assertEqual(member.account.active_project_id, self.project.id)
        self.assertTrue(member.account.assigned_projects.filter(pk=self.project.id).exists())

    def test_update_account_can_enable_admin_access_for_existing_portal(self):
        role = Role.objects.create(
            code="SITE_MANAGER",
            name="Site Manager",
            can_manage_workforce=True,
            can_manage_users=True,
        )
        member = WorkforceMember(
            worker_type="LABOUR",
            status="ACTIVE",
            join_date=date(2026, 1, 10),
            current_project=self.project,
            created_by=self.user,
        )
        member.first_name = "Existing"
        member.last_name = "Portal"
        member.phone = "+81-90-4444-5555"
        member.email = "existing-portal@example.com"
        member.save()

        create_response = self.client.post(
            f"/api/v1/workforce/members/{member.id}/create_account/",
            {"pin": "123456"},
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)

        update_response = self.client.post(
            f"/api/v1/workforce/members/{member.id}/update_account/",
            {
                "admin_access": True,
                "role_id": role.id,
                "email": "existing-admin@example.com",
                "reset_admin_password": True,
                "reset_pin": False,
                "project_id": self.project.id,
            },
            format="json",
        )

        self.assertEqual(update_response.status_code, 200)
        self.assertTrue(update_response.data["admin_access"])
        self.assertTrue(update_response.data["password"])
        self.assertIsNone(update_response.data["pin"])

        member.refresh_from_db()
        self.assertTrue(member.check_portal_pin("123456"))
        self.assertTrue(member.account.is_staff)
        self.assertEqual(member.account.role_id, role.id)
        self.assertEqual(member.account.email, "existing-admin@example.com")
        self.assertTrue(member.account.check_password(update_response.data["password"]))

    def test_worker_portal_launch_mints_tokens_without_pin(self):
        member = WorkforceMember(
            worker_type="LABOUR",
            status="ACTIVE",
            join_date=date(2026, 1, 10),
            created_by=self.user,
        )
        member.first_name = "Launch"
        member.last_name = "User"
        member.phone = "+81-90-3333-4444"
        member.email = "launch-user@example.com"
        member.save()
        member.account = self.user
        member.save(update_fields=["account"])

        response = self.client.post("/api/v1/worker/launch/", {}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["worker"]["employee_id"], member.employee_id)
