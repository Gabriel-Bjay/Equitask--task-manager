from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.notifications.models import Notification
from apps.notifications.tasks import run_deadline_reminders, run_overdue_check
from apps.notifications.utils import create_notification
from apps.tasks.models import Task, TaskAssignment

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


class NotificationApiTests(APITestCase):
    def setUp(self):
        self.alice = make_user('alice@test.local')
        self.bob = make_user('bob@test.local')
        create_notification(self.alice, 'system_announcement', 'For Alice', 'Hello Alice')
        create_notification(self.bob, 'system_announcement', 'For Bob', 'Hello Bob')
        self.client.force_authenticate(self.alice)

    def test_users_only_see_their_own_notifications(self):
        response = self.client.get('/api/notifications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([row['title'] for row in response.json()['results']], ['For Alice'])

    def test_cannot_read_another_users_notification(self):
        bobs = Notification.objects.get(user=self.bob)
        response = self.client.get(f'/api/notifications/{bobs.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_create_notifications_for_other_users(self):
        response = self.client.post(
            '/api/notifications/',
            {
                'user': self.bob.id,
                'notification_type': 'system_announcement',
                'title': 'Spoofed notice',
                'message': 'Not really from the system.',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Notification.objects.get(title='Spoofed notice').user, self.alice)
        self.assertEqual(Notification.objects.filter(user=self.bob).count(), 1)

    def test_cannot_move_a_notification_to_another_user(self):
        mine = Notification.objects.get(user=self.alice)
        self.client.patch(f'/api/notifications/{mine.id}/', {'user': self.bob.id}, format='json')
        mine.refresh_from_db()
        self.assertEqual(mine.user, self.alice)

    def test_mark_as_read(self):
        mine = Notification.objects.get(user=self.alice)
        response = self.client.patch(
            f'/api/notifications/{mine.id}/', {'is_read': True}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mine.refresh_from_db()
        self.assertTrue(mine.is_read)

    def test_unread_count_and_mark_all_read_only_touch_own_notifications(self):
        create_notification(self.alice, 'system_announcement', 'Second', 'Another one')
        self.assertEqual(self.client.get('/api/notifications/unread_count/').json()['count'], 2)

        response = self.client.post('/api/notifications/mark_all_read/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Notification.objects.filter(user=self.alice, is_read=False).exists())
        self.assertTrue(Notification.objects.filter(user=self.bob, is_read=False).exists())


class BackgroundJobTests(TestCase):
    def setUp(self):
        self.manager = make_user('manager@test.local', role='manager')
        self.alice = make_user('alice@test.local')

    def assigned_task(self, deadline, status='assigned'):
        task = Task.objects.create(
            title='Due soon', created_by=self.manager, status=status, deadline=deadline
        )
        TaskAssignment.objects.create(task=task, assigned_to=self.alice, assigned_by=self.manager)
        return task

    def test_deadline_reminder_is_sent_only_once(self):
        self.assigned_task(timezone.now() + timedelta(hours=20))
        self.assertEqual(run_deadline_reminders(hours_before=24), 1)
        self.assertEqual(run_deadline_reminders(hours_before=24), 0)
        self.assertEqual(
            Notification.objects.filter(
                user=self.alice, notification_type='deadline_reminder_24h'
            ).count(),
            1,
        )

    def test_overdue_check_marks_task_and_notifies_assignee(self):
        task = self.assigned_task(timezone.now() - timedelta(hours=1), status='in_progress')
        self.assertEqual(run_overdue_check(), (1, 1))
        task.refresh_from_db()
        self.assertEqual(task.status, 'overdue')
        self.assertTrue(
            Notification.objects.filter(user=self.alice, notification_type='task_overdue').exists()
        )
