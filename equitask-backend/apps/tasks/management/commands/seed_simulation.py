"""
Seed simulated users, tasks, assignments, recommendations and performance
logs so the allocation engine can be trained (retrain_weights) and evaluated.

All simulation data is namespaced (emails end in @sim.equitask, task titles
start with [SIM]) so --flush can remove it without touching real data.
"""

import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.authentication.models import UserSkill
from apps.tasks.models import Task, TaskAssignment, TaskPerformanceLog
from apps.recommendations.models import TaskRecommendation

User = get_user_model()

SKILL_POOL = [
    'Python', 'Django', 'React', 'TypeScript', 'SQL',
    'Testing', 'DevOps', 'UI Design', 'Documentation', 'Machine Learning',
]

DEFAULT_WEIGHTS = {
    'skill': 0.30,
    'workload': 0.25,
    'performance': 0.25,
    'fairness': 0.15,
    'urgency': 0.05,
}

SIM_EMAIL_DOMAIN = 'sim.equitask'
SIM_TITLE_PREFIX = '[SIM]'


class Command(BaseCommand):
    help = (
        'Seed simulated users, tasks, assignments, recommendations and '
        'performance logs for engine training and evaluation.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--users', type=int, default=25)
        parser.add_argument('--tasks', type=int, default=400)
        parser.add_argument('--seed', type=int, default=42)
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Delete existing simulation data before seeding.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        rng = random.Random(options['seed'])
        n_users = options['users']
        n_tasks = options['tasks']

        if options['flush']:
            self._flush()

        manager = self._make_manager(rng)
        users = self._make_users(rng, n_users)
        reliability = {user.pk: rng.uniform(0.5, 0.95) for user in users}
        skill_levels = {user.pk: self._levels(user) for user in users}

        for index in range(n_tasks):
            self._make_task_history(rng, index, manager, users, reliability, skill_levels)

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {len(users)} users and {n_tasks} completed tasks '
            f'(with assignments, recommendation snapshots, and performance logs).'
        ))

    # ---- teardown ------------------------------------------------------

    def _flush(self):
        Task.objects.filter(title__startswith=SIM_TITLE_PREFIX).delete()
        User.objects.filter(email__endswith='@' + SIM_EMAIL_DOMAIN).delete()
        self.stdout.write('Flushed existing simulation data.')

    # ---- users ---------------------------------------------------------

    def _make_manager(self, rng):
        manager = User(
            username='sim_manager',
            email=f'sim.manager@{SIM_EMAIL_DOMAIN}',
            first_name='Sim',
            last_name='Manager',
        )
        self._set_role(manager, 'manager')
        manager.skills = rng.sample(SKILL_POOL, 4)
        manager.set_password('simpassword123')
        manager.save()
        return manager

    def _make_users(self, rng, count):
        users = []
        for i in range(count):
            user = User(
                username=f'sim_user_{i:03d}',
                email=f'sim{i:03d}@{SIM_EMAIL_DOMAIN}',
                first_name=f'Sim{i:03d}',
                last_name='Member',
            )
            self._set_role(user, 'team_member')
            chosen = rng.sample(SKILL_POOL, rng.randint(3, 6))
            user.skills = chosen
            user.set_password('simpassword123')
            user.save()
            for skill in chosen:
                UserSkill.objects.create(
                    user=user, skill=skill, proficiency=rng.randint(2, 5)
                )
            users.append(user)
        return users

    def _set_role(self, user, role):
        try:
            user.role = role
        except Exception:
            pass

    def _levels(self, user):
        levels = {}
        for entry in user.skill_entries.all():
            levels[str(entry.skill).strip().lower()] = entry.proficiency
        return levels

    # ---- one task's history --------------------------------------------

    def _make_task_history(self, rng, index, manager, users, reliability, skill_levels):
        required = rng.sample(SKILL_POOL, rng.randint(1, 3))
        complexity = rng.randint(1, 10)
        estimated = Decimal(str(rng.choice([2, 4, 6, 8, 12, 16, 20])))
        priority = rng.choice(['low', 'medium', 'high', 'critical'])

        # Historical (imperfect) allocation: a random candidate was picked.
        assignee = rng.choice(users)

        coverage = self._coverage(required, skill_levels[assignee.pk])
        workload_score = rng.uniform(0.2, 1.0)
        performance_score = min(1.0, max(0.0, reliability[assignee.pk] + rng.uniform(-0.1, 0.1)))
        fairness_score = rng.uniform(0.3, 1.0)
        urgency_score = rng.uniform(0.3, 1.0)

        # Ground-truth probability of a good outcome.
        probability = (
            0.15
            + 0.55 * coverage
            + 0.20 * workload_score
            + 0.10 * performance_score
            - 0.15 * (complexity / 10.0)
        )
        probability = min(0.98, max(0.02, probability))

        on_time = rng.random() < probability
        quality = self._quality(rng, probability)

        now = timezone.now()
        completed_at = now - timedelta(days=rng.randint(1, 120))
        started_at = completed_at - timedelta(hours=float(estimated))
        deadline = completed_at + timedelta(hours=rng.uniform(-24, 48))
        hours_taken = Decimal(str(round(float(estimated) * rng.uniform(0.7, 1.5), 2)))

        task = Task.objects.create(
            title=f'{SIM_TITLE_PREFIX} Task {index:04d}',
            description='Simulated task for engine training and evaluation.',
            created_by=manager,
            category=rng.choice([
                'development', 'testing', 'design',
                'documentation', 'research', 'review',
            ]),
            priority=priority,
            status='completed',
            required_skills=required,
            estimated_hours=estimated,
            actual_hours=hours_taken,
            complexity_score=complexity,
            deadline=deadline,
            started_at=started_at,
            completed_at=completed_at,
        )

        TaskAssignment.objects.create(
            task=task,
            assigned_to=assignee,
            assigned_by=manager,
            assignment_type='ml_recommended',
            justification='',
            is_active=False,
        )

        final_score = (
            DEFAULT_WEIGHTS['skill'] * coverage
            + DEFAULT_WEIGHTS['workload'] * workload_score
            + DEFAULT_WEIGHTS['performance'] * performance_score
            + DEFAULT_WEIGHTS['fairness'] * fairness_score
            + DEFAULT_WEIGHTS['urgency'] * urgency_score
        )

        TaskRecommendation.objects.create(
            task=task,
            recommended_user=assignee,
            final_score=final_score,
            confidence_score=0.7,
            skill_match_score=coverage,
            workload_score=workload_score,
            historical_performance_score=performance_score,
            fairness_score=fairness_score,
            urgency_score=urgency_score,
            rank_position=1,
            explanation=f'{SIM_TITLE_PREFIX} historical allocation snapshot.',
        )

        early_late = round((deadline - completed_at).total_seconds() / 3600.0, 2)
        TaskPerformanceLog.objects.create(
            task=task,
            user=assignee,
            started_at=started_at,
            completed_at=completed_at,
            hours_taken=hours_taken,
            quality_rating=quality,
            on_time=on_time,
            early_late_hours=Decimal(str(early_late)),
            notes=f'{SIM_TITLE_PREFIX} simulated outcome (p={probability:.2f}).',
        )

    # ---- helpers -------------------------------------------------------

    def _coverage(self, required, levels):
        if not required:
            return 0.5
        total = 0.0
        for skill in required:
            key = str(skill).strip().lower()
            if key in levels:
                total += min(levels[key], 5) / 5.0
        return total / len(required)

    def _quality(self, rng, probability):
        base = 1 + 4 * probability + rng.uniform(-0.6, 0.6)
        return int(min(5, max(1, round(base))))
