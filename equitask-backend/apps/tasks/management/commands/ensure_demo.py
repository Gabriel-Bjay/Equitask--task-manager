"""
Load the public demo: a product team with four months of finished work (enough
for retrain_weights to learn from), a live board of pending, in-progress and
overdue tasks, and notifications for the two demo logins.

It runs only when DEMO_PASSWORD is set. Once the demo is loaded it leaves the
data alone and only restores the demo logins. --refresh rebuilds the demo's
tasks and notifications around today's date, undoing whatever visitors
changed; the scheduled jobs workflow runs it weekly so deadlines stay current.
"""
import random
from datetime import timedelta
from decimal import Decimal
from io import StringIO

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.analytics.tasks import rebuild_workload_metrics
from apps.authentication.demo import DEMO_EMAIL_DOMAIN, DEMO_LOGINS
from apps.authentication.models import UserSkill
from apps.notifications.models import Notification
from apps.recommendations.models import TaskRecommendation
from apps.tasks.models import Task, TaskAssignment, TaskPerformanceLog

User = get_user_model()

DEPARTMENT = 'Product Engineering'
HISTORY_TASKS = 180
HISTORY_DAYS = 120

# first name, last name, {skill: proficiency 1-5}
MANAGER = ('Achieng', 'Otieno', {'Python': 4, 'Django': 4, 'SQL': 3, 'DevOps': 3})
MEMBER = ('Brian', 'Kiprop', {'React': 4, 'TypeScript': 4, 'Testing': 3, 'UI Design': 2})
TEAM = [
    ('Mercy', 'Wanjiku', {'React': 5, 'TypeScript': 4, 'UI Design': 4}),
    ('Daniel', 'Mutua', {'Python': 5, 'Django': 5, 'SQL': 4}),
    ('Faith', 'Chebet', {'Testing': 5, 'Python': 3, 'DevOps': 3}),
    ('Samuel', 'Kariuki', {'DevOps': 5, 'Python': 3, 'SQL': 3}),
    ('Esther', 'Njeri', {'UI Design': 5, 'React': 3, 'Documentation': 4}),
    ('Collins', 'Odhiambo', {'Machine Learning': 5, 'Python': 4, 'SQL': 4}),
    ('Joy', 'Atieno', {'Documentation': 5, 'Testing': 3, 'UI Design': 2}),
    ('Peter', 'Ndungu', {'Django': 4, 'React': 3, 'SQL': 3, 'Python': 3}),
    ('Lilian', 'Wambui', {'TypeScript': 4, 'React': 4, 'Testing': 4}),
]

TEAM_EMAILS = [f'{first.lower()}@{DEMO_EMAIL_DOMAIN}' for first, _, _ in TEAM]

AREAS = [
    'tasks', 'notifications', 'analytics', 'sign-in', 'reports',
    'search', 'admin', 'onboarding', 'mobile', 'billing',
]

# category: (title patterns, skills always needed, skills to pick one or two from, description)
WORK = {
    'development': (
        ['Build {area} filters', 'Fix the {area} bug', 'Refactor the {area} module', 'Speed up {area} queries'],
        [], ['Python', 'Django', 'React', 'TypeScript', 'SQL'],
        'Ship it behind a feature flag and update the release notes.',
    ),
    'testing': (
        ['Write tests for {area}', 'Regression-test {area}'],
        ['Testing'], ['Python', 'React', 'DevOps'],
        'Cover the main paths and known edge cases, and flag anything flaky.',
    ),
    'design': (
        ['Redesign the {area} screen', 'Accessibility pass on {area}'],
        ['UI Design'], ['React'],
        'Share mock-ups for review before handing over to development.',
    ),
    'documentation': (
        ['Document the {area} API', 'Update the {area} guide'],
        ['Documentation'], ['Django', 'UI Design'],
        'Keep it short and link to the relevant API reference.',
    ),
    'research': (
        ['Investigate {area} usage data', 'Prototype {area} improvements'],
        ['Machine Learning'], ['SQL', 'Python'],
        'Summarise the findings and a recommendation in a one-page note.',
    ),
    'review': (
        ['Review the {area} pull request', 'Security review of {area}'],
        [], ['Python', 'Django', 'React', 'SQL'],
        'Check correctness, security and test coverage before approving.',
    ),
}
PRIORITIES = ['low', 'medium', 'medium', 'high', 'critical']
HOURS = [2, 3, 4, 6, 8, 12, 16]

# The live board. Assignee is 'member' (the team member login), an index into
# TEAM, or None for unassigned work. Deadline is in hours from now. Mercy and
# Daniel are deliberately overloaded while Joy and Lilian have nothing, so the
# fairness dashboard and the recommendations have something to show.
BOARD = [
    ('member', 'Fix the sign-in bug on mobile', 'development', ['React', 'TypeScript'], 'high', 'in_progress', 20, 6),
    ('member', 'Write tests for notifications', 'testing', ['Testing', 'React'], 'medium', 'assigned', 40, 4),
    ('member', 'Accessibility pass on reports', 'design', ['UI Design', 'React'], 'high', 'overdue', -50, 6),
    ('member', 'Build search filters', 'development', ['React', 'TypeScript'], 'medium', 'in_progress', 144, 8),
    (0, 'Redesign the analytics screen', 'design', ['UI Design', 'React'], 'high', 'in_progress', 30, 12),
    (0, 'Refactor the tasks module', 'development', ['React', 'TypeScript'], 'medium', 'in_progress', 72, 8),
    (0, 'Build reports filters', 'development', ['React', 'TypeScript'], 'medium', 'assigned', 120, 6),
    (0, 'Update the onboarding guide', 'documentation', ['Documentation', 'UI Design'], 'low', 'assigned', 192, 3),
    (1, 'Speed up analytics queries', 'development', ['SQL', 'Django'], 'critical', 'in_progress', 18, 8),
    (1, 'Fix the billing bug', 'development', ['Python', 'Django'], 'high', 'overdue', -26, 4),
    (1, 'Review the search pull request', 'review', ['Python', 'Django'], 'medium', 'assigned', 60, 2),
    (2, 'Regression-test sign-in', 'testing', ['Testing', 'Python'], 'high', 'in_progress', 46, 6),
    (3, 'Set up staging deploys', 'development', ['DevOps'], 'high', 'overdue', -75, 8),
    (3, 'Investigate slow builds', 'research', ['DevOps', 'Python'], 'medium', 'assigned', 96, 4),
    (4, 'Redesign the notifications screen', 'design', ['UI Design'], 'medium', 'in_progress', 100, 6),
    (5, 'Prototype smarter recommendations', 'research', ['Machine Learning', 'Python'], 'high', 'in_progress', 168, 16),
    (7, 'Document the admin API', 'documentation', ['Documentation', 'Django'], 'low', 'assigned', 140, 4),
    (None, 'Build mobile push notifications', 'development', ['React', 'TypeScript'], 'high', 'pending', 96, 12),
    (None, 'Write tests for billing', 'testing', ['Testing', 'Python'], 'medium', 'pending', 120, 6),
    (None, 'Security review of sign-in', 'review', ['Django', 'Python'], 'critical', 'pending', 72, 4),
    (None, 'Investigate onboarding drop-off', 'research', ['Machine Learning', 'SQL'], 'medium', 'pending', 240, 10),
    (None, 'Update the reports guide', 'documentation', ['Documentation'], 'low', 'pending', 288, 3),
    (None, 'Accessibility pass on admin', 'design', ['UI Design', 'React'], 'medium', 'pending', 168, 6),
]


def clamp(value, low=0.0, high=1.0):
    return min(high, max(low, value))


def coverage(required, levels):
    """Share of the required skills the person has, weighted by proficiency."""
    if not required:
        return 0.5
    return sum(min(levels.get(skill, 0), 5) / 5.0 for skill in required) / len(required)


def stamp(value):
    return f'{timezone.localtime(value):%d %b %Y %H:%M}'


class Command(BaseCommand):
    help = (
        'Load the public demo team, task history and live board when DEMO_PASSWORD '
        'is set (once). --refresh rebuilds the demo tasks around today.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--refresh',
            action='store_true',
            help="Rebuild the demo's tasks and notifications around today's date.",
        )

    def handle(self, *args, **options):
        if options['refresh']:
            self.refresh()
            return

        password = settings.DEMO_PASSWORD
        if not password:
            self.stdout.write('DEMO_PASSWORD is not set; the demo is not loaded.')
            return

        manager = User.objects.filter(email=DEMO_LOGINS['manager']).first()
        if manager is not None:
            self.restore_logins(password)
            self.stdout.write('The demo is already loaded; demo logins restored.')
            return

        with transaction.atomic():
            manager, member, team = self.create_team(password)
            self.load_work(manager, member, team)
        self.finish()
        self.stdout.write(self.style.SUCCESS(
            f'Loaded the demo: {len(team) + 1} people, {HISTORY_TASKS} finished tasks '
            f'and {len(BOARD)} on the board.'
        ))

    def refresh(self):
        manager = User.objects.filter(email=DEMO_LOGINS['manager']).first()
        member = User.objects.filter(email=DEMO_LOGINS['team_member']).first()
        if manager is None or member is None:
            self.stdout.write('The demo is not loaded; nothing to refresh.')
            return

        people = {user.email: user for user in User.objects.filter(email__in=TEAM_EMAILS)}
        team = [member] + [people[email] for email in TEAM_EMAILS if email in people]
        with transaction.atomic():
            # Everything the demo manager owns, including tasks visitors added.
            Task.objects.filter(created_by=manager).delete()
            Notification.objects.filter(user__in=[manager, *team]).delete()
            self.load_work(manager, member, team)
        self.finish()
        self.stdout.write(self.style.SUCCESS('Refreshed the demo tasks around today.'))

    # ---- people --------------------------------------------------------

    def create_team(self, password):
        manager = self.person(*MANAGER, 'manager', DEMO_LOGINS['manager'], password)
        member = self.person(*MEMBER, 'team_member', DEMO_LOGINS['team_member'], password)
        team = [member] + [
            self.person(first, last, skills, 'team_member', email, None)
            for (first, last, skills), email in zip(TEAM, TEAM_EMAILS)
        ]
        return manager, member, team

    def person(self, first, last, skills, role, email, password):
        user = User(
            email=email,
            username=email,
            first_name=first,
            last_name=last,
            role=role,
            department=DEPARTMENT,
            skills=list(skills),
        )
        # Only the two demo logins can sign in; the rest of the team is sample data.
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        UserSkill.objects.bulk_create([
            UserSkill(user=user, skill=skill, proficiency=level) for skill, level in skills.items()
        ])
        return user

    def restore_logins(self, password):
        for role, email in DEMO_LOGINS.items():
            user = User.objects.filter(email=email).first()
            if user is not None:
                user.role = role
                user.is_active = True
                user.set_password(password)
                user.save()

    # ---- work ----------------------------------------------------------

    def load_work(self, manager, member, team):
        rng = random.Random(2026)
        now = timezone.now()
        levels = {
            user.pk: {entry.skill: entry.proficiency for entry in user.skill_entries.all()}
            for user in team
        }
        finished = self.history(rng, now, manager, team, levels)
        board = self.board(rng, now, manager, member, team)
        self.notifications(now, manager, member, finished, board)

    def history(self, rng, now, manager, team, levels):
        reliability = {user.pk: rng.uniform(0.55, 0.95) for user in team}
        tasks, outcomes = [], []
        for _ in range(HISTORY_TASKS):
            category = rng.choice(list(WORK))
            patterns, base, extra, description = WORK[category]
            skills = base + rng.sample(extra, rng.randint(1, 2) if not base else rng.randint(0, 1))
            assignee = rng.choice(team)

            skill_score = coverage(skills, levels[assignee.pk])
            workload = rng.uniform(0.2, 1.0)
            performance = clamp(reliability[assignee.pk] + rng.uniform(-0.1, 0.1))
            fairness = rng.uniform(0.3, 1.0)
            urgency = rng.uniform(0.3, 1.0)
            complexity = rng.randint(1, 10)
            # How likely a good outcome was: mostly skill fit and spare capacity.
            chance = clamp(
                0.15 + 0.55 * skill_score + 0.20 * workload + 0.10 * performance - 0.15 * complexity / 10,
                0.02, 0.98,
            )

            estimated = Decimal(rng.choice(HOURS))
            completed_at = now - timedelta(days=rng.uniform(1, HISTORY_DAYS))
            started_at = completed_at - timedelta(hours=float(estimated) * rng.uniform(1.0, 3.0))
            on_time = rng.random() < chance
            deadline = completed_at + timedelta(hours=rng.uniform(2, 48) if on_time else -rng.uniform(2, 36))

            tasks.append(Task(
                title=rng.choice(patterns).format(area=rng.choice(AREAS)),
                description=description,
                created_by=manager,
                category=category,
                priority=rng.choice(PRIORITIES),
                status='completed',
                required_skills=skills,
                estimated_hours=estimated,
                actual_hours=Decimal(str(round(float(estimated) * rng.uniform(0.7, 1.5), 2))),
                complexity_score=complexity,
                deadline=deadline,
                started_at=started_at,
                completed_at=completed_at,
            ))
            outcomes.append({
                'assignee': assignee,
                'created_at': started_at - timedelta(days=rng.uniform(0.5, 4)),
                'scores': (skill_score, workload, performance, fairness, urgency),
                'on_time': on_time,
                'quality': int(clamp(round(1 + 4 * chance + rng.uniform(-0.6, 0.6)), 1, 5)),
                'recommended': rng.random() < 0.75,
            })

        Task.objects.bulk_create(tasks)
        for task, outcome in zip(tasks, outcomes):
            task.created_at = outcome['created_at']
        Task.objects.bulk_update(tasks, ['created_at'])

        assignments = TaskAssignment.objects.bulk_create([
            TaskAssignment(
                task=task,
                assigned_to=outcome['assignee'],
                assigned_by=manager,
                assignment_type='ml_recommended' if outcome['recommended'] else 'manual_override',
                justification=(
                    'Accepted the top recommendation.' if outcome['recommended']
                    else 'Assigned by the manager after reviewing the recommendations.'
                ),
                accepted_at=task.started_at,
                is_active=True,
            )
            for task, outcome in zip(tasks, outcomes)
        ])
        for assignment, outcome in zip(assignments, outcomes):
            assignment.assigned_at = outcome['created_at'] + timedelta(hours=2)
        TaskAssignment.objects.bulk_update(assignments, ['assigned_at'])

        TaskRecommendation.objects.bulk_create([
            TaskRecommendation(
                task=task,
                recommended_user=outcome['assignee'],
                final_score=0.30 * s[0] + 0.25 * s[1] + 0.25 * s[2] + 0.15 * s[3] + 0.05 * s[4],
                confidence_score=0.7,
                skill_match_score=s[0],
                workload_score=s[1],
                historical_performance_score=s[2],
                fairness_score=s[3],
                urgency_score=s[4],
                rank_position=1,
                explanation='Strongest match on skills and current workload.',
            )
            for task, outcome in zip(tasks, outcomes)
            for s in [outcome['scores']]
        ])

        TaskPerformanceLog.objects.bulk_create([
            TaskPerformanceLog(
                task=task,
                user=outcome['assignee'],
                started_at=task.started_at,
                completed_at=task.completed_at,
                hours_taken=task.actual_hours,
                quality_rating=outcome['quality'],
                on_time=outcome['on_time'],
                early_late_hours=Decimal(str(round(
                    (task.deadline - task.completed_at).total_seconds() / 3600.0, 2
                ))),
            )
            for task, outcome in zip(tasks, outcomes)
        ])
        return list(zip(tasks, (outcome['assignee'] for outcome in outcomes)))

    def board(self, rng, now, manager, member, team):
        others = [user for user in team if user.pk != member.pk]
        tasks, assignees, created = [], [], []
        for who, title, category, skills, priority, status, due_in, hours in BOARD:
            assignee = member if who == 'member' else (others[who] if who is not None else None)
            created_at = now - timedelta(days=rng.uniform(1, 6))
            tasks.append(Task(
                title=title,
                description=WORK[category][3],
                created_by=manager,
                category=category,
                priority=priority,
                status=status,
                required_skills=skills,
                estimated_hours=Decimal(hours),
                complexity_score=rng.randint(3, 8),
                deadline=now + timedelta(hours=due_in),
                started_at=created_at + timedelta(hours=6) if status in ('in_progress', 'overdue') else None,
            ))
            assignees.append(assignee)
            created.append(created_at)

        Task.objects.bulk_create(tasks)
        for task, created_at in zip(tasks, created):
            task.created_at = created_at
        Task.objects.bulk_update(tasks, ['created_at'])

        assigned = [(task, user, at) for task, user, at in zip(tasks, assignees, created) if user is not None]
        assignments = TaskAssignment.objects.bulk_create([
            TaskAssignment(
                task=task,
                assigned_to=user,
                assigned_by=manager,
                assignment_type='ml_recommended' if index % 3 else 'direct_assignment',
                justification='Accepted the top recommendation.' if index % 3 else 'Assigned directly.',
                accepted_at=task.started_at,
                is_active=True,
            )
            for index, (task, user, _) in enumerate(assigned)
        ])
        for assignment, (_, _, created_at) in zip(assignments, assigned):
            assignment.assigned_at = created_at + timedelta(hours=1)
        TaskAssignment.objects.bulk_update(assignments, ['assigned_at'])
        return list(zip(tasks, assignees))

    def notifications(self, now, manager, member, finished, board):
        mine = [task for task, user in board if user is not None and user.pk == member.pk]
        due_tomorrow, due_in_two_days, overdue, later = mine
        late_elsewhere = next(task for task, user in board if task.status == 'overdue' and user.pk != member.pk)
        recent = sorted(finished, key=lambda pair: pair[0].completed_at, reverse=True)[:2]
        lead = manager.get_full_name()

        # (user, type, title, message, task, priority, read, hours ago)
        entries = [
            (member, 'task_assigned', 'New Task Assigned',
             f'{lead} assigned you "{later.title}".', later, 'normal', True, 70),
            (member, 'task_overdue', 'Task Overdue',
             f'"{overdue.title}" passed its deadline on {stamp(overdue.deadline)}.', overdue, 'high', False, 26),
            (member, 'task_assigned', 'New Task Assigned',
             f'{lead} assigned you "{due_in_two_days.title}".', due_in_two_days, 'normal', False, 8),
            (member, 'deadline_reminder_48h', 'Deadline in about 48 hours',
             f'"{due_in_two_days.title}" is due {stamp(due_in_two_days.deadline)}.', due_in_two_days, 'normal', False, 3),
            (member, 'deadline_reminder_24h', 'Deadline in about 24 hours',
             f'"{due_tomorrow.title}" is due {stamp(due_tomorrow.deadline)}.', due_tomorrow, 'high', False, 1),
            (manager, 'system_announcement', 'Welcome to the EquiTask demo',
             'This is shared sample data that resets every week. Try assigning a pending task with '
             'the recommendations, then compare workloads on the fairness dashboard.', None, 'normal', False, 0.5),
            (manager, 'task_overdue', 'Task Overdue',
             f'"{late_elsewhere.title}" passed its deadline on {stamp(late_elsewhere.deadline)}.',
             late_elsewhere, 'high', False, 20),
        ] + [
            (manager, 'task_completed', 'Task Completed',
             f'{user.get_full_name()} completed "{task.title}".', task, 'normal', True, 30 + 12 * index)
            for index, (task, user) in enumerate(recent)
        ]

        notes = Notification.objects.bulk_create([
            Notification(
                user=user, notification_type=kind, title=title, message=message,
                related_task=task, priority=priority, is_read=read,
                read_at=now if read else None,
            )
            for user, kind, title, message, task, priority, read, _ in entries
        ])
        for note, entry in zip(notes, entries):
            note.created_at = now - timedelta(hours=entry[-1])
        Notification.objects.bulk_update(notes, ['created_at'])

    def finish(self):
        # Fresh workload metrics for the dashboards, and weights learned from
        # the history so recommendations reflect what worked.
        rebuild_workload_metrics()
        call_command('retrain_weights', stdout=StringIO(), stderr=StringIO())
