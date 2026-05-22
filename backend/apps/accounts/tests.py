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
            can_view_finances=True,
            can_view_structure=True,
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
        self.assertFalse(response.data['can_manage_finances'])
        self.assertFalse(response.data['can_manage_structure'])
