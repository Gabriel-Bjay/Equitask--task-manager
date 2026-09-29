"""
Tests for the allocation engine and the recommendation API endpoints.

- EngineComponentTests exercise the scoring logic directly (no HTTP).
- RecommendationEndpointTests drive the recommend / accept / override /
  for_task endpoints through the API.
- RetrainWeightsTests cover the logistic-regression weight learning and the
  scheduled Celery task that runs it.
"""

import importlib
from datetime import timedelta
from decimal import Decimal
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.authentication.models import UserSkill
from apps.tasks.models import Task, TaskAssignment, TaskPerformanceLog
from apps.recommendations.models import RecommendationWeights, TaskRecommendation
from apps.recommendations.engine import AllocationEngine
from apps.recommendations.tasks import retrain_recommendation_weights

User = get_user_model()


def make_user(email, skills, proficiency=4, role='team_member'):
    """Create a user with a flat skills list and matching UserSkill entries."""
    handle = email.split('@')[0]
    user = User(
        username=handle,
        email=email,
        first_name=handle.title(),
        last_name='Test',
    )
    try:
        user.role = role
    except Exception:
        pass
    user.skills = list(skills)
    user.set_password('pass12345')
    user.save()
    for skill in skills:
        UserSkill.objects.create(user=user, skill=skill, proficiency=proficiency)
    return user


class EngineComponentTests(TestCase):
    def setUp(self):
        self.manager = make_user('mgr@test.local', ['Python'], role='manager')
        self.expert = make_user('expert@test.local', ['Python', 'Django', 'SQL'], proficiency=5)
        self.novice = make_user('novice@test.local', ['UI Design'], proficiency=2)
        self.task = Task.objects.create(
            title='Build API',
            created_by=self.manager,
            required_skills=['Python', 'Django'],
            estimated_hours=Decimal('8'),
            complexity_score=5,
            priority='medium',
            status='pending',
            deadline=timezone.now() + timedelta(days=5),
        )
        self.engine = AllocationEngine()

    def test_recommend_returns_ranked_candidates(self):
        results = self.engine.recommend(self.task)
        self.assertTrue(results)
        ranks = [row['rank'] for row in results]
        self.assertEqual(ranks, list(range(1, len(results) + 1)))
        for row in results:
            for value in row['components'].values():
                self.assertGreaterEqual(value, 0.0)
                self.assertLessEqual(value, 1.0)
            self.assertGreaterEqual(row['final'], 0.0)
            self.assertLessEqual(row['final'], 1.0)

    def test_skilled_user_outranks_unskilled_on_skill_match(self):
        results = self.engine.recommend(self.task)
        by_user = {row['user_id']: row for row in results}
        self.assertGreater(
            by_user[self.expert.id]['components']['skill_match'],
            by_user[self.novice.id]['components']['skill_match'],
        )

    def test_missing_skills_are_reported(self):
        results = self.engine.recommend(self.task)
        novice = next(row for row in results if row['user_id'] == self.novice.id)
        self.assertIn('Python', novice['missing_skills'])
        self.assertIn('Django', novice['missing_skills'])

    def test_active_workload_lowers_workload_score(self):
        busy_task = Task.objects.create(
            title='Busy work',
            created_by=self.manager,
            required_skills=[],
            estimated_hours=Decimal('40'),
            complexity_score=5,
            priority='medium',
            status='in_progress',
        )
        TaskAssignment.objects.create(
            task=busy_task,
            assigned_to=self.expert,
            assigned_by=self.manager,
            assignment_type='direct_assignment',
            is_active=True,
        )
        results = self.engine.recommend(self.task)
        expert = next(row for row in results if row['user_id'] == self.expert.id)
        self.assertLess(expert['components']['workload'], 1.0)

    def test_no_candidates_returns_empty(self):
        User.objects.update(is_active=False)
        self.assertEqual(self.engine.recommend(self.task), [])


class RecommendationEndpointTests(APITestCase):
    def setUp(self):
        self.manager = make_user('mgr2@test.local', ['Python'], role='manager')
        self.alice = make_user('alice@test.local', ['Python', 'Django'], proficiency=5)
        self.bob = make_user('bob@test.local', ['UI Design'], proficiency=3)
        self.task = Task.objects.create(
            title='Ship feature',
            created_by=self.manager,
            required_skills=['Python', 'Django'],
            estimated_hours=Decimal('8'),
            complexity_score=5,
            priority='high',
            status='pending',
            deadline=timezone.now() + timedelta(days=3),
        )
        self.client.force_authenticate(user=self.manager)

    def _make_recommendation(self, user):
        return TaskRecommendation.objects.create(
            task=self.task,
            recommended_user=user,
            final_score=0.8,
            confidence_score=0.7,
            skill_match_score=0.9,
            workload_score=0.8,
            historical_performance_score=0.6,
            fairness_score=0.5,
            urgency_score=0.5,
            rank_position=1,
            explanation='test snapshot',
        )

    def test_recommend_endpoint_returns_scores_and_persists(self):
        response = self.client.get(f'/api/tasks/{self.task.id}/recommend/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('recommendations', data)
        self.assertIn('weights', data)
        self.assertTrue(data['recommendations'])
        top = data['recommendations'][0]
        self.assertIn('scores', top)
        self.assertIn('final', top['scores'])
        self.assertTrue(
            TaskRecommendation.objects.filter(task=self.task).exists()
        )

    def test_accept_creates_ml_assignment(self):
        rec = self._make_recommendation(self.alice)
        response = self.client.post(f'/api/recommendations/{rec.id}/accept/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        assignment = TaskAssignment.objects.get(task=self.task, is_active=True)
        self.assertEqual(assignment.assigned_to_id, self.alice.id)
        self.assertEqual(assignment.assignment_type, 'ml_recommended')
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, 'assigned')

    def test_override_requires_justification(self):
        response = self.client.post(
            '/api/recommendations/override/',
            {'task_id': self.task.id, 'user_id': self.bob.id},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_override_creates_manual_assignment(self):
        response = self.client.post(
            '/api/recommendations/override/',
            {
                'task_id': self.task.id,
                'user_id': self.bob.id,
                'justification': 'Bob has domain context the model cannot see.',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        assignment = TaskAssignment.objects.get(task=self.task, is_active=True)
        self.assertEqual(assignment.assigned_to_id, self.bob.id)
        self.assertEqual(assignment.assignment_type, 'manual_override')

    def test_for_task_lists_recommendations(self):
        self._make_recommendation(self.alice)
        response = self.client.get(f'/api/recommendations/task/{self.task.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.json()), 1)

    def test_recommend_returns_snapshot_ids_that_can_be_accepted(self):
        data = self.client.get(f'/api/tasks/{self.task.id}/recommend/').json()
        top = data['recommendations'][0]
        self.assertIsNotNone(top['recommendation_id'])

        response = self.client.post(
            f"/api/recommendations/{top['recommendation_id']}/accept/",
            {'justification': top['explanation']},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        assignment = TaskAssignment.objects.get(task=self.task, is_active=True)
        self.assertEqual(assignment.assigned_to_id, top['user']['id'])
        self.assertEqual(assignment.justification, top['explanation'])

    def test_team_member_cannot_run_the_recommender(self):
        self.client.force_authenticate(user=self.bob)
        response = self.client.get(f'/api/tasks/{self.task.id}/recommend/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(TaskRecommendation.objects.exists())

    def test_team_member_can_read_recommendations(self):
        self._make_recommendation(self.alice)
        self.client.force_authenticate(user=self.bob)
        response = self.client.get(f'/api/recommendations/task/{self.task.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_team_member_cannot_accept_or_override(self):
        rec = self._make_recommendation(self.alice)
        self.client.force_authenticate(user=self.bob)
        accept = self.client.post(f'/api/recommendations/{rec.id}/accept/')
        override = self.client.post(
            '/api/recommendations/override/',
            {'task_id': self.task.id, 'user_id': self.bob.id, 'justification': 'I want it.'},
            format='json',
        )
        self.assertEqual(accept.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(override.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(TaskAssignment.objects.filter(task=self.task).exists())

    def test_team_member_cannot_write_training_snapshots(self):
        self.client.force_authenticate(user=self.bob)
        response = self.client.post(
            '/api/recommendations/',
            {
                'task': self.task.id,
                'recommended_user': self.bob.id,
                'final_score': 1.0,
                'confidence_score': 1.0,
                'skill_match_score': 1.0,
                'workload_score': 1.0,
                'historical_performance_score': 1.0,
                'fairness_score': 1.0,
                'urgency_score': 1.0,
                'rank_position': 1,
                'explanation': 'fabricated',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(TaskRecommendation.objects.exists())


class RetrainWeightsTests(TestCase):
    def setUp(self):
        self.manager = make_user('mgr3@test.local', ['Python'], role='manager')
        self.member = make_user('member3@test.local', ['Python'])

    def record_outcome(self, index, skill_score, success):
        now = timezone.now()
        task = Task.objects.create(
            title=f'Historic task {index}', created_by=self.manager, status='completed'
        )
        TaskRecommendation.objects.create(
            task=task,
            recommended_user=self.member,
            final_score=0.5,
            confidence_score=0.5,
            skill_match_score=skill_score,
            workload_score=0.5,
            historical_performance_score=0.5,
            fairness_score=0.5,
            urgency_score=0.5,
            rank_position=1,
            explanation='historic snapshot',
        )
        TaskPerformanceLog.objects.create(
            task=task,
            user=self.member,
            started_at=now - timedelta(hours=8),
            completed_at=now,
            hours_taken=Decimal('8'),
            quality_rating=5 if success else 2,
            on_time=success,
        )

    def test_learns_weights_that_favour_the_predictive_component(self):
        for index in range(40):
            success = index % 2 == 0
            self.record_outcome(index, 0.9 if success else 0.2, success)

        call_command('retrain_weights', '--min-samples', '20', stdout=StringIO())

        active = RecommendationWeights.get_active()
        self.assertEqual((active.source, active.n_samples), ('learned', 40))
        weights = active.as_dict()
        self.assertAlmostEqual(sum(weights.values()), 1.0, places=3)
        self.assertEqual(max(weights, key=weights.get), 'skill')

    def test_cold_start_guard_keeps_current_weights(self):
        for index in range(5):
            self.record_outcome(index, 0.9, index % 2 == 0)
        call_command('retrain_weights', stdout=StringIO())
        self.assertFalse(RecommendationWeights.objects.filter(source='learned').exists())

    def test_scheduled_task_runs_the_retrain_command(self):
        self.assertIn('Not enough data', retrain_recommendation_weights())

    def test_seeded_history_trains_the_engine_and_keeps_owners(self):
        call_command('seed_simulation', '--users', '4', '--tasks', '80', stdout=StringIO())
        seeded = Task.objects.filter(title__startswith='[SIM]')
        self.assertEqual(seeded.count(), 80)
        self.assertEqual(
            TaskAssignment.objects.filter(task__in=seeded, is_active=True).count(), 80
        )

        call_command('retrain_weights', '--min-samples', '40', stdout=StringIO())
        self.assertEqual(RecommendationWeights.get_active().source, 'learned')


class BeatScheduleTests(SimpleTestCase):
    def test_every_scheduled_entry_points_at_a_real_celery_task(self):
        from equitask_backend.celery import app

        schedule = app.conf.beat_schedule
        self.assertIn('retrain-recommendation-weights', schedule)
        for name, entry in schedule.items():
            module_path, attr = entry['task'].rsplit('.', 1)
            task = getattr(importlib.import_module(module_path), attr, None)
            self.assertTrue(hasattr(task, 'delay'), f'{name}: {entry["task"]} is not a Celery task')
