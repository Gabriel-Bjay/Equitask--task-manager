import os
from io import StringIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.authentication.demo import DEMO_LOGINS
from apps.authentication.models import UserSkill

User = get_user_model()

PASSWORD = 'Str0ng-pass-123'


def make_user(email, role='team_member'):
    handle = email.split('@')[0]
    return User.objects.create_user(
        email=email,
        username=handle,
        password=PASSWORD,
        first_name=handle.title(),
        last_name='Test',
        role=role,
    )


class RegistrationTests(APITestCase):
    url = '/api/auth/register/'

    def payload(self, **overrides):
        data = {
            'email': 'new@test.local',
            'username': 'newbie',
            'password': PASSWORD,
            'password2': PASSWORD,
            'first_name': 'New',
            'last_name': 'User',
        }
        data.update(overrides)
        return data

    def test_register_returns_user_and_tokens(self):
        response = self.client.post(self.url, self.payload(), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()
        self.assertEqual(body['user']['email'], 'new@test.local')
        self.assertIn('access', body['tokens'])
        self.assertIn('refresh', body['tokens'])

    def test_register_cannot_self_assign_a_role(self):
        response = self.client.post(
            self.url, self.payload(role='administrator'), format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.get(email='new@test.local').role, 'team_member')

    def test_register_rejects_mismatched_passwords(self):
        response = self.client.post(
            self.url, self.payload(password2='Different-pass-456'), format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email='new@test.local').exists())

    def test_register_rejects_common_password(self):
        response = self.client.post(
            self.url, self.payload(password='password', password2='password'), format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTests(APITestCase):
    url = '/api/auth/login/'

    def setUp(self):
        self.user = make_user('member@test.local')

    def test_valid_credentials_return_tokens(self):
        response = self.client.post(
            self.url, {'email': 'member@test.local', 'password': PASSWORD}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.json()['tokens'])

    def test_wrong_password_is_rejected(self):
        response = self.client.post(
            self.url, {'email': 'member@test.local', 'password': 'not-the-password'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_inactive_user_cannot_log_in(self):
        self.user.is_active = False
        self.user.save()
        response = self.client.post(
            self.url, {'email': 'member@test.local', 'password': PASSWORD}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TokenLifecycleTests(APITestCase):
    def setUp(self):
        make_user('member@test.local')
        response = self.client.post(
            '/api/auth/login/',
            {'email': 'member@test.local', 'password': PASSWORD},
            format='json',
        )
        self.tokens = response.json()['tokens']

    def refresh(self, token):
        return self.client.post('/api/auth/token/refresh/', {'refresh': token}, format='json')

    def test_refresh_rotates_and_blacklists_the_old_refresh_token(self):
        response = self.refresh(self.tokens['refresh'])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rotated = response.json()['refresh']
        self.assertNotEqual(rotated, self.tokens['refresh'])

        self.assertEqual(self.refresh(self.tokens['refresh']).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.refresh(rotated).status_code, status.HTTP_200_OK)

    def test_logout_blacklists_the_refresh_token(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens['access']}")
        response = self.client.post(
            '/api/auth/logout/', {'refresh': self.tokens['refresh']}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.client.credentials()
        self.assertEqual(self.refresh(self.tokens['refresh']).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_requires_the_refresh_token(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens['access']}")
        response = self.client.post('/api/auth/logout/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class CurrentUserTests(APITestCase):
    url = '/api/auth/me/'

    def setUp(self):
        self.user = make_user('member@test.local')
        self.client.force_authenticate(user=self.user)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_returns_the_current_user(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['email'], 'member@test.local')

    def test_can_update_own_profile(self):
        response = self.client.patch(
            self.url, {'first_name': 'Renamed', 'skills': ['Python']}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Renamed')
        self.assertEqual(self.user.skills, ['Python'])

    def test_skill_edits_keep_engine_proficiencies_in_sync(self):
        UserSkill.objects.create(user=self.user, skill='Python', proficiency=5)
        UserSkill.objects.create(user=self.user, skill='SQL', proficiency=4)

        response = self.client.patch(self.url, {'skills': ['python', 'React']}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        levels = dict(self.user.skill_entries.values_list('skill', 'proficiency'))
        self.assertEqual(levels, {'Python': 5, 'React': 3})

    def test_delete_deactivates_the_account_and_revokes_sessions(self):
        self.client.force_authenticate(user=None)
        login = self.client.post(
            '/api/auth/login/', {'email': 'member@test.local', 'password': PASSWORD}, format='json'
        )
        tokens = login.json()['tokens']
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

        self.client.credentials()
        refresh = self.client.post(
            '/api/auth/token/refresh/', {'refresh': tokens['refresh']}, format='json'
        )
        self.assertEqual(refresh.status_code, status.HTTP_401_UNAUTHORIZED)
        relogin = self.client.post(
            '/api/auth/login/', {'email': 'member@test.local', 'password': PASSWORD}, format='json'
        )
        self.assertEqual(relogin.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cannot_change_own_role_or_active_flag(self):
        response = self.client.patch(
            self.url, {'role': 'administrator', 'is_active': False}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, 'team_member')
        self.assertTrue(self.user.is_active)


class ChangePasswordTests(APITestCase):
    url = '/api/auth/change-password/'

    def setUp(self):
        self.user = make_user('member@test.local')
        self.client.force_authenticate(user=self.user)

    def test_changes_password_when_current_password_matches(self):
        response = self.client.post(
            self.url,
            {'current_password': PASSWORD, 'new_password': 'An0ther-pass-789'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('An0ther-pass-789'))

    def test_rejects_wrong_current_password(self):
        response = self.client.post(
            self.url,
            {'current_password': 'not-it', 'new_password': 'An0ther-pass-789'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(PASSWORD))


class EnsureAdminCommandTests(APITestCase):
    env = {'ADMIN_EMAIL': 'owner@test.local', 'ADMIN_PASSWORD': PASSWORD}

    def run_command(self):
        call_command('ensure_admin', stdout=StringIO())

    def test_creates_an_administrator_who_can_sign_in(self):
        with mock.patch.dict(os.environ, self.env):
            self.run_command()

        admin = User.objects.get(email='owner@test.local')
        self.assertEqual(admin.role, 'administrator')
        self.assertTrue(admin.is_superuser)
        response = self.client.post(
            '/api/auth/login/',
            {'email': 'owner@test.local', 'password': PASSWORD},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_running_again_restores_the_role_and_password_without_duplicating(self):
        with mock.patch.dict(os.environ, self.env):
            self.run_command()
        User.objects.filter(email='owner@test.local').update(role='team_member')
        with mock.patch.dict(os.environ, {**self.env, 'ADMIN_PASSWORD': 'An0ther-pass-456'}):
            self.run_command()

        admin = User.objects.get(email='owner@test.local')
        self.assertEqual(User.objects.filter(email='owner@test.local').count(), 1)
        self.assertEqual(admin.role, 'administrator')
        self.assertTrue(admin.check_password('An0ther-pass-456'))

    def test_does_nothing_without_credentials(self):
        with mock.patch.dict(os.environ, {'ADMIN_EMAIL': '', 'ADMIN_PASSWORD': ''}):
            self.run_command()

        self.assertFalse(User.objects.filter(role='administrator').exists())


@override_settings(DEMO_PASSWORD='Demo-pass-123')
class DemoLoginTests(APITestCase):
    def setUp(self):
        self.manager = make_user(DEMO_LOGINS['manager'], role='manager')
        self.member = make_user(DEMO_LOGINS['team_member'])

    def test_lists_the_demo_logins(self):
        response = self.client.get('/api/auth/demo-accounts/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([a['role'] for a in response.data['accounts']], ['manager', 'team_member'])

    def test_signs_in_as_a_demo_role_without_a_password(self):
        response = self.client.post('/api/auth/demo-login/', {'role': 'manager'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['email'], DEMO_LOGINS['manager'])
        self.assertIn('access', response.data['tokens'])

    def test_administrator_is_never_offered(self):
        response = self.client.post('/api/auth/demo-login/', {'role': 'administrator'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(DEMO_PASSWORD='')
    def test_nothing_is_offered_while_the_demo_is_off(self):
        self.assertEqual(self.client.get('/api/auth/demo-accounts/').data['accounts'], [])
        response = self.client.post('/api/auth/demo-login/', {'role': 'manager'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_demo_accounts_cannot_be_changed_or_closed(self):
        self.client.force_authenticate(self.member)

        edit = self.client.patch('/api/auth/me/', {'email': 'mine@test.local'}, format='json')
        password = self.client.post(
            '/api/auth/change-password/',
            {'current_password': PASSWORD, 'new_password': 'N3w-pass-456'},
            format='json',
        )
        close = self.client.delete('/api/auth/me/')

        self.assertEqual(
            [edit.status_code, password.status_code, close.status_code],
            [status.HTTP_403_FORBIDDEN] * 3,
        )
        self.member.refresh_from_db()
        self.assertTrue(self.member.is_active)
        self.assertEqual(self.member.email, DEMO_LOGINS['team_member'])
        self.assertTrue(self.member.check_password(PASSWORD))

    def test_demo_addresses_cannot_be_registered(self):
        response = self.client.post('/api/auth/register/', {
            'email': 'mercy@demo.equitask',
            'username': 'mercy',
            'password': PASSWORD,
            'password2': PASSWORD,
            'first_name': 'Mercy',
            'last_name': 'Copy',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
