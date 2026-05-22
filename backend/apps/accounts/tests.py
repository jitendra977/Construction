from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.models import Role

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
        self.assertTrue(role.can_view_resources)
        self.assertTrue(role.can_manage_resources)
        self.assertTrue(role.can_view_workforce)
        self.assertTrue(role.can_manage_workforce)
        self.assertTrue(role.can_manage_data_transfer)
        self.assertTrue(role.can_manage_settings)
