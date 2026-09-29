from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.analytics.models import UserWorkloadMetrics
from apps.analytics.tasks import rebuild_workload_metrics
from apps.analytics.views import _fairness_band, _gini
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


class FairnessMathTests(SimpleTestCase):
    def test_gini_is_zero_for_equal_loads(self):
        self.assertEqual(_gini([8, 8, 8, 8]), 0.0)

    def test_gini_for_fully_concentrated_load(self):
        self.assertEqual(_gini([0, 0, 0, 40]), 0.75)

    def test_gini_handles_empty_and_zero_totals(self):
        self.assertEqual(_gini([]), 0.0)
        self.assertEqual(_gini([0, 0]), 0.0)

    def test_fairness_bands_are_relative_to_the_team_mean(self):
        self.assertEqual(_fairness_band(2, 10), 'underloaded')
        self.assertEqual(_fairness_band(10, 10), 'balanced')
        self.assertEqual(_fairness_band(18, 10), 'high')
        self.assertEqual(_fairness_band(25, 10), 'overloaded')
        self.assertEqual(_fairness_band(5, 0), 'balanced')

    def test_workload_intensity_thresholds(self):
        classify = UserWorkloadMetrics.determine_workload_intensity
        self.assertEqual(classify(10), 'underutilized')
        self.assertEqual(classify(40), 'optimal')
        self.assertEqual(classify(55), 'heavy')
        self.assertEqual(classify(61), 'overloaded')


class AnalyticsEndpointTests(APITestCase):
    def setUp(self):
        self.manager = make_user('manager@test.local', role='manager')
        self.alice = make_user('alice@test.local')
        self.bob = make_user('bob@test.local')
        heavy = Task.objects.create(
            title='Heavy', created_by=self.manager, status='in_progress',
            estimated_hours=Decimal('30'),
        )
        light = Task.objects.create(
            title='Light', created_by=self.manager, status='assigned',
            estimated_hours=Decimal('10'),
        )
        TaskAssignment.objects.create(
            task=heavy, assigned_to=self.alice, assigned_by=self.manager,
            justification='Most context on this area.',
        )
        TaskAssignment.objects.create(task=light, assigned_to=self.bob, assigned_by=self.manager)
        self.client.force_authenticate(self.manager)

    def test_endpoints_require_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get('/api/analytics/dashboard/rapid_scores/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_fairness_reports_member_hours_and_distribution(self):
        response = self.client.get('/api/analytics/dashboard/fairness/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        hours = {row['name']: row['workload_hours'] for row in data['members']}
        self.assertEqual(hours, {'Alice Test': 30.0, 'Bob Test': 10.0, 'Manager Test': 0.0})
        self.assertEqual(data['distribution']['members_counted'], 3)
        self.assertEqual(data['distribution']['mean_hours'], 13.33)
        self.assertEqual(data['distribution']['gini_coefficient'], 0.5)

    def test_rapid_scores_reflect_justification_and_coverage(self):
        response = self.client.get('/api/analytics/dashboard/rapid_scores/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        scores = response.json()['scores']
        self.assertEqual(
            set(scores),
            {'responsibility', 'accountability', 'professionalism', 'inclusivity', 'diversity'},
        )
        self.assertEqual(scores['accountability'], 50)
        self.assertEqual(scores['inclusivity'], 67)
        for value in scores.values():
            self.assertTrue(0 <= value <= 100)

    def test_team_overview_counts_tasks_by_status(self):
        response = self.client.get('/api/analytics/dashboard/team_overview/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stats = response.json()['task_stats']
        self.assertEqual((stats['total'], stats['in_progress'], stats['assigned']), (2, 1, 1))

    def test_user_stats_are_scoped_to_the_current_user(self):
        self.client.force_authenticate(self.alice)
        response = self.client.get('/api/analytics/user/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual((response.json()['total'], response.json()['in_progress']), (1, 1))


class UpcomingWorkloadTests(APITestCase):
    url = '/api/analytics/dashboard/upcoming_workload/'

    def setUp(self):
        self.manager = make_user('manager@test.local', role='manager')
        self.alice = make_user('alice@test.local')
        now = timezone.now()

        def task(title, days, status='assigned', hours=Decimal('8')):
            return Task.objects.create(
                title=title, created_by=self.manager, status=status,
                estimated_hours=hours, deadline=now + timedelta(days=days),
            )

        mine = task('Mine tomorrow', 1)
        TaskAssignment.objects.create(task=mine, assigned_to=self.alice, assigned_by=self.manager)
        task('Unestimated in three days', 3, status='pending', hours=None)
        task('Already done', 1, status='completed')
        task('Next month', 30)

    def test_team_scope_sums_open_work_per_day(self):
        self.client.force_authenticate(self.manager)
        days = self.client.get(self.url).json()['days']
        self.assertEqual(len(days), 7)
        self.assertEqual((days[1]['hours'], days[1]['tasks']), (8.0, 1))
        self.assertEqual((days[3]['hours'], days[3]['tasks']), (8.0, 1))
        self.assertEqual(sum(day['tasks'] for day in days), 2)

    def test_mine_scope_only_counts_my_assignments(self):
        self.client.force_authenticate(self.alice)
        days = self.client.get(self.url, {'scope': 'mine'}).json()['days']
        self.assertEqual(sum(day['tasks'] for day in days), 1)
        self.assertEqual(days[1]['hours'], 8.0)


class RebuildWorkloadMetricsTests(TestCase):
    def test_rebuild_is_idempotent_and_classifies_load(self):
        manager = make_user('manager@test.local', role='manager')
        alice = make_user('alice@test.local')
        task = Task.objects.create(
            title='Big', created_by=manager, status='in_progress',
            estimated_hours=Decimal('45'),
        )
        TaskAssignment.objects.create(task=task, assigned_to=alice, assigned_by=manager)

        rebuild_workload_metrics()
        rebuild_workload_metrics()

        metrics = UserWorkloadMetrics.objects.get(user=alice)
        self.assertEqual(metrics.active_tasks_count, 1)
        self.assertEqual(metrics.total_estimated_hours, Decimal('45'))
        self.assertEqual(metrics.workload_intensity, 'heavy')
