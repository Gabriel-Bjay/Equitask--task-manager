"""
Tests for the allocation engine and the recommendation API endpoints.

- EngineComponentTests exercise the scoring logic directly (no HTTP).
- RecommendationEndpointTests drive the recommend / accept / override /
  for_task endpoints through the API.
"""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.authentication.models import UserSkill
from apps.tasks.models import Task, TaskAssignment
from apps.recommendations.models import TaskRecommendation
from apps.recommendations.engine import AllocationEngine

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
