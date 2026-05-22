from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.core.models import HouseProject
from apps.data_transfer.views import _normalize_sql_for_connection


User = get_user_model()


class DataTransferSqlImportTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="sql-admin",
            email="sql-admin@example.com",
            password="testpass123",
            is_staff=True,
        )
        self.client.force_authenticate(self.user)

    def test_normalizes_postgres_casts_for_local_sqlite_import(self):
        sql = "INSERT INTO x VALUES ('2026-05-22'::date, '08:00:00'::time, '2026-05-22T01:02:03+00:00'::timestamptz);"

        normalized = _normalize_sql_for_connection(sql)

        self.assertNotIn("::date", normalized)
        self.assertNotIn("::time", normalized)
        self.assertNotIn("::timestamptz", normalized)
        self.assertIn("'2026-05-22'", normalized)

    def test_full_system_import_accepts_exported_project_sql(self):
        sql = """
        -- ConstructPro FULL SYSTEM EXPORT
        BEGIN;
        INSERT INTO "core_houseproject"
        ("id", "name", "owner_name", "address", "total_budget", "start_date", "expected_completion_date", "area_sqft", "created_at", "updated_at")
        VALUES (901, 'Imported Project', 'Owner', 'Site', 100000, '2026-01-01'::date, '2026-12-31'::date, 1200, '2026-01-01T00:00:00+00:00'::timestamptz, '2026-01-01T00:00:00+00:00'::timestamptz)
        ON CONFLICT DO NOTHING;
        COMMIT;
        """
        upload = SimpleUploadedFile("full_system_backup.sql", sql.encode("utf-8"), content_type="application/sql")

        response = self.client.post("/api/v1/data-transfer/import/", {"sql_file": upload}, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["statements_executed"], 1)
        self.assertTrue(HouseProject.objects.filter(pk=901, name="Imported Project").exists())
