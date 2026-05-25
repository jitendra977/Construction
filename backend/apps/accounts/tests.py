from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core import mail
from datetime import date
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch
from apps.accounts.models import Role
from apps.core.models import HouseProject, ProjectMember, ProjectRole

User = get_user_model()


class AuthenticationTestCase(TestCase):
    """Test cases for authentication endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_login_success(self):
        """Test successful login"""
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)

    def test_login_sends_alert_email_with_login_details(self):
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123',
            'login_context': {
                'browser': 'Google Chrome',
                'os': 'macOS',
                'deviceType': 'Desktop',
                'deviceName': 'MacBook Pro',
                'platform': 'MacIntel',
                'language': 'en-US',
                'timezone': 'Asia/Tokyo',
                'screenWidth': 1512,
                'screenHeight': 982,
                'viewportWidth': 1280,
                'viewportHeight': 720,
                'latitude': 27.7172,
                'longitude': 85.3240,
                'accuracy': 22.4,
            },
        }, format='json', HTTP_USER_AGENT='Mozilla/5.0 Test Browser')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('New login to your ConstructPro account', mail.outbox[0].subject)
        self.assertIn('27.7172, 85.324', mail.outbox[0].alternatives[0][0])
        self.assertIn('MacBook Pro', mail.outbox[0].alternatives[0][0])

    @patch('apps.accounts.views.send_login_alert_email')
    def test_login_succeeds_if_login_alert_fails(self, mocked_send_login_alert_email):
        mocked_send_login_alert_email.side_effect = RuntimeError('SMTP failure')

        response = self.client.post('/api/v1/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123',
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = self.client.post('/api/v1/auth/login/', {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_user_profile(self):
        """Test getting user profile"""
        # Login first
        login_response = self.client.post('/api/v1/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        })
        token = login_response.data['access']
        
        # Get profile
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/v1/auth/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')

    def test_profile_exposes_effective_role_permissions(self):
        role = Role.objects.create(
            code='FINANCE_VIEWER',
            name='Finance Viewer',
            can_view_projects=True,
            can_view_dashboard=True,
            can_view_profile=True,
            can_manage_admin_config=True,
            can_view_finances=True,
            can_view_structure=True,
            can_view_resources=True,
            can_view_workforce=True,
        )
        self.user.role = role
        self.user.save(update_fields=['role'])

        login_response = self.client.post('/api/v1/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        })
        token = login_response.data['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/v1/auth/profile/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['can_view_finances'])
        self.assertTrue(response.data['can_view_structure'])
        self.assertTrue(response.data['can_view_projects'])
        self.assertTrue(response.data['can_view_dashboard'])
        self.assertTrue(response.data['can_view_profile'])
        self.assertTrue(response.data['can_manage_admin_config'])
        self.assertTrue(response.data['can_view_resources'])
        self.assertTrue(response.data['can_view_workforce'])
        self.assertFalse(response.data['can_manage_finances'])
        self.assertFalse(response.data['can_manage_structure'])

    def test_role_api_saves_full_permission_matrix(self):
        role = Role.objects.create(code='SITE_AUDITOR', name='Site Auditor')
        self.user.is_superuser = True
        self.user.save(update_fields=['is_superuser'])
        self.client.force_authenticate(self.user)

        response = self.client.patch(f'/api/v1/accounts/roles/{role.id}/', {
            'can_view_projects': True,
            'can_manage_projects': True,
            'can_view_dashboard': True,
            'can_view_profile': True,
            'can_manage_admin_config': True,
            'can_view_resources': True,
            'can_manage_resources': True,
            'can_view_workforce': True,
            'can_manage_workforce': True,
            'can_manage_data_transfer': True,
            'can_manage_settings': True,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        role.refresh_from_db()
        self.assertTrue(role.can_manage_projects)
        self.assertTrue(role.can_view_profile)
        self.assertTrue(role.can_manage_admin_config)
        self.assertTrue(role.can_view_resources)
        self.assertTrue(role.can_manage_resources)
        self.assertTrue(role.can_view_workforce)
        self.assertTrue(role.can_manage_workforce)
        self.assertTrue(role.can_manage_data_transfer)
        self.assertTrue(role.can_manage_settings)

    def test_project_role_api_supports_custom_dynamic_roles(self):
        self.user.is_superuser = True
        self.user.save(update_fields=['is_superuser'])
        self.client.force_authenticate(self.user)

        response = self.client.post('/api/v1/project-roles/', {
            'code': 'SITE_COORDINATOR',
            'name': 'Site Coordinator',
            'name_ne': 'साइट कोअर्डिनेटर',
            'description': 'Coordinates site operations',
            'icon': '🧭',
            'color': '#0f766e',
            'sort_order': 70,
            'can_manage_members': False,
            'can_manage_finances': False,
            'can_view_finances': True,
            'can_manage_phases': True,
            'can_manage_structure': False,
            'can_manage_resources': True,
            'can_upload_media': True,
            'can_manage_workforce': True,
            'can_approve_purchases': False,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(ProjectRole.objects.filter(code='SITE_COORDINATOR').exists())

    def test_set_project_uses_dynamic_project_role_defaults(self):
        admin_role = Role.objects.create(
            code='PROJECT_ADMIN',
            name='Project Admin',
            can_manage_all_systems=True,
        )
        self.user.role = admin_role
        self.user.save(update_fields=['role'])
        self.client.force_authenticate(self.user)

        project = HouseProject.objects.create(
            name='Dynamic Role Project',
            owner_name='Owner',
            address='Tokyo Site',
            total_budget='100000.00',
            start_date=date(2026, 5, 1),
            expected_completion_date=date(2026, 12, 31),
            area_sqft=1200,
        )
        target = User.objects.create_user(
            username='memberuser',
            email='member@example.com',
            password='testpass123',
        )
        ProjectRole.objects.create(
            code='SITE_COORDINATOR',
            name='Site Coordinator',
            can_manage_members=False,
            can_manage_finances=False,
            can_view_finances=True,
            can_manage_phases=True,
            can_manage_structure=False,
            can_manage_resources=True,
            can_upload_media=True,
            can_manage_workforce=True,
            can_approve_purchases=False,
        )

        response = self.client.post(f'/api/v1/accounts/users/{target.id}/set-project/', {
            'project_id': project.id,
            'action': 'add',
            'role': 'SITE_COORDINATOR',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        member = ProjectMember.objects.get(user=target, project=project)
        self.assertEqual(member.role, 'SITE_COORDINATOR')
        self.assertTrue(member.can_manage_phases)
        self.assertTrue(member.can_manage_resources)
        self.assertTrue(member.can_manage_workforce)
        self.assertTrue(member.can_upload_media)
        self.assertFalse(member.can_manage_finances)
