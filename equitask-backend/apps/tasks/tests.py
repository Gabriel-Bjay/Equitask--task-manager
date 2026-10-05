from datetime import timedelta
from decimal import Decimal
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.authentication.demo import DEMO_LOGINS
from apps.notifications.models import Notification
from apps.tasks.models import Task, TaskAssignment, TaskPerformanceLog

User = get_user_model()


def make_user(email, role='team_member'):
    handle = email.split('@')[0]
    return User.objects.create_user(
        email=email,
        username=handle,
        password='Str0ng-pass-123',
        first_name=handle.title(),
        last_name='Test',
        role=role,
    )


class TaskApiTestCase(APITestCase):
    def setUp(self):
        self.manager = make_user('manager@test.local', role='manager')
        self.alice = make_user('alice@test.local')
        self.bob = make_user('bob@test.local')
        self.task = Task.objects.create(
            title='Write API docs',
            created_by=self.manager,
            category='documentation',
            priority='medium',
            status='pending',
            estimated_hours=Decimal('6'),
            deadline=timezone.now() + timedelta(days=3),
        )

    def assign(self, task, user):
        return TaskAssignment.objects.create(
            task=task, assigned_to=user, assigned_by=self.manager
        )


class TaskPermissionTests(TaskApiTestCase):
    def test_list_requires_authentication(self):
        self.assertEqual(self.client.get('/api/tasks/').status_code, status.HTTP_401_UNAUTHORIZED)

    def test_manager_can_create_task(self):
        self.client.force_authenticate(self.manager)
        response = self.client.post(
            '/api/tasks/',
            {'title': 'New task', 'category': 'development', 'priority': 'high'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Task.objects.get(title='New task').created_by, self.manager)

    def test_team_member_cannot_create_task(self):
        self.client.force_authenticate(self.alice)
        response = self.client.post('/api/tasks/', {'title': 'Sneaky'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_team_member_cannot_edit_or_delete_task(self):
        self.client.force_authenticate(self.alice)
        url = f'/api/tasks/{self.task.id}/'
        self.assertEqual(
            self.client.patch(url, {'title': 'Changed'}, format='json').status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_403_FORBIDDEN)
        self.task.refresh_from_db()
        self.assertEqual(self.task.title, 'Write API docs')


class TaskQueryTests(TaskApiTestCase):
    def test_my_tasks_lists_only_the_current_users_active_assignments(self):
        other = Task.objects.create(title='Bob only', created_by=self.manager)
        self.assign(self.task, self.alice)
        self.assign(other, self.bob)
        self.client.force_authenticate(self.alice)
        response = self.client.get('/api/tasks/my_tasks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([row['id'] for row in response.json()], [self.task.id])

    def test_task_payload_includes_the_current_assignee(self):
        self.assign(self.task, self.alice)
        self.client.force_authenticate(self.manager)
        response = self.client.get(f'/api/tasks/{self.task.id}/')
        self.assertEqual(response.json()['assignee'], {'id': self.alice.id, 'name': 'Alice Test'})

    def test_filter_by_category(self):
        Task.objects.create(title='Design logo', created_by=self.manager, category='design')
        self.client.force_authenticate(self.alice)
        response = self.client.get('/api/tasks/', {'category': 'design'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([row['title'] for row in response.json()['results']], ['Design logo'])


class AssignActionTests(TaskApiTestCase):
    def url(self):
        return f'/api/tasks/{self.task.id}/assign/'

    def test_manager_assigns_task_and_assignee_is_notified(self):
        self.client.force_authenticate(self.manager)
        response = self.client.post(
            self.url(), {'user_id': self.alice.id, 'justification': 'Owns the docs.'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, 'assigned')
        self.assertEqual(
            TaskAssignment.objects.get(task=self.task, is_active=True).assigned_to, self.alice
        )
        self.assertTrue(
            Notification.objects.filter(user=self.alice, notification_type='task_assigned').exists()
        )

    def test_reassigning_deactivates_the_previous_assignment(self):
        self.assign(self.task, self.alice)
        self.client.force_authenticate(self.manager)
        response = self.client.post(self.url(), {'user_id': self.bob.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        active = TaskAssignment.objects.filter(task=self.task, is_active=True)
        self.assertEqual([row.assigned_to for row in active], [self.bob])

    def test_unknown_user_leaves_the_existing_assignment_intact(self):
        self.assign(self.task, self.alice)
        self.client.force_authenticate(self.manager)
        response = self.client.post(self.url(), {'user_id': 999999}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            TaskAssignment.objects.get(task=self.task, is_active=True).assigned_to, self.alice
        )

    def test_missing_user_id_is_rejected(self):
        self.client.force_authenticate(self.manager)
        response = self.client.post(self.url(), {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_team_member_cannot_assign(self):
        self.client.force_authenticate(self.alice)
        response = self.client.post(self.url(), {'user_id': self.alice.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(TaskAssignment.objects.filter(task=self.task).exists())


class StatusUpdateTests(TaskApiTestCase):
    def test_status_change_notifies_the_assignee(self):
        self.assign(self.task, self.alice)
        self.client.force_authenticate(self.manager)
        response = self.client.patch(
            f'/api/tasks/{self.task.id}/', {'status': 'in_progress'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            Notification.objects.filter(user=self.alice, related_task=self.task).exists()
        )

    def test_completing_a_task_logs_performance_for_the_assignee(self):
        self.assign(self.task, self.alice)
        self.client.force_authenticate(self.manager)
        response = self.client.patch(
            f'/api/tasks/{self.task.id}/', {'status': 'completed'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        log = TaskPerformanceLog.objects.get(task=self.task)
        self.assertEqual(log.user, self.alice)
        self.assertTrue(log.on_time)
        self.assertEqual(log.hours_taken, Decimal('6'))


class AssigneeProgressTests(TaskApiTestCase):
    def setUp(self):
        super().setUp()
        self.task.status = 'assigned'
        self.task.save()
        self.assign(self.task, self.alice)
        self.client.force_authenticate(self.alice)

    def patch(self, data, task=None):
        return self.client.patch(f'/api/tasks/{(task or self.task).id}/', data, format='json')

    def test_assignee_can_start_their_task(self):
        response = self.patch({'status': 'in_progress'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.json()['started_at'])
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, 'in_progress')

    def test_assignee_completing_notifies_creator_and_logs_performance(self):
        response = self.patch({'status': 'completed'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, 'completed')
        self.assertIsNotNone(self.task.completed_at)
        self.assertEqual(TaskPerformanceLog.objects.get(task=self.task).user, self.alice)
        self.assertTrue(
            Notification.objects.filter(user=self.manager, notification_type='task_completed').exists()
        )

    def test_assignee_cannot_edit_other_fields(self):
        response = self.patch({'status': 'in_progress', 'title': 'Renamed'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_assignee_cannot_cancel_or_reset_status(self):
        for new_status in ('cancelled', 'pending'):
            self.assertEqual(self.patch({'status': new_status}).status_code, status.HTTP_403_FORBIDDEN)

    def test_assignee_cannot_reopen_a_completed_task(self):
        self.patch({'status': 'completed'})
        self.assertEqual(self.patch({'status': 'in_progress'}).status_code, status.HTTP_403_FORBIDDEN)

    def test_other_team_members_cannot_progress_the_task(self):
        self.client.force_authenticate(self.bob)
        self.assertEqual(self.patch({'status': 'in_progress'}).status_code, status.HTTP_403_FORBIDDEN)


class TaskAssignmentEndpointTests(TaskApiTestCase):
    def setUp(self):
        super().setUp()
        self.assignment = self.assign(self.task, self.alice)

    def test_assignment_list_is_reachable(self):
        self.client.force_authenticate(self.alice)
        response = self.client.get('/api/tasks/assignments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([row['id'] for row in response.json()['results']], [self.assignment.id])

    def test_team_member_cannot_modify_or_delete_assignments(self):
        self.client.force_authenticate(self.bob)
        url = f'/api/tasks/assignments/{self.assignment.id}/'
        self.assertEqual(
            self.client.patch(url, {'assigned_to': self.bob.id}, format='json').status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_403_FORBIDDEN)
        self.assignment.refresh_from_db()
        self.assertEqual(self.assignment.assigned_to, self.alice)
        self.assertTrue(self.assignment.is_active)

    def test_manager_can_update_an_assignment(self):
        self.client.force_authenticate(self.manager)
        response = self.client.patch(
            f'/api/tasks/assignments/{self.assignment.id}/',
            {'justification': 'Best skill match.'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assignment.refresh_from_db()
        self.assertEqual(self.assignment.justification, 'Best skill match.')


@override_settings(DEMO_PASSWORD='Demo-pass-123')
class EnsureDemoCommandTests(APITestCase):
    def run_command(self, *args):
        call_command('ensure_demo', *args, stdout=StringIO())

    def test_loads_the_team_board_and_history_once(self):
        self.run_command()
        self.run_command()

        manager = User.objects.get(email=DEMO_LOGINS['manager'])
        member = User.objects.get(email=DEMO_LOGINS['team_member'])
        self.assertEqual(User.objects.filter(email__endswith='@demo.equitask').count(), 11)
        self.assertEqual(Task.objects.filter(created_by=manager, status='completed').count(), 180)
        self.assertEqual(Task.objects.filter(created_by=manager, status='pending').count(), 6)
        self.assertTrue(manager.check_password('Demo-pass-123'))
        self.assertEqual(member.role, 'team_member')
        self.assertTrue(Notification.objects.filter(user=member, is_read=False).exists())

    def test_refresh_rebuilds_the_tasks_and_drops_visitor_changes(self):
        self.run_command()
        manager = User.objects.get(email=DEMO_LOGINS['manager'])
        Task.objects.create(title='Visitor task', created_by=manager)
        Task.objects.filter(created_by=manager, status='pending').update(status='cancelled')

        self.run_command('--refresh')

        self.assertFalse(Task.objects.filter(title='Visitor task').exists())
        self.assertEqual(Task.objects.filter(created_by=manager, status='pending').count(), 6)
        self.assertEqual(Task.objects.filter(created_by=manager).count(), 180 + 23)

    @override_settings(DEMO_PASSWORD='')
    def test_does_nothing_while_the_demo_is_off(self):
        self.run_command()

        self.assertFalse(User.objects.filter(email__endswith='@demo.equitask').exists())
