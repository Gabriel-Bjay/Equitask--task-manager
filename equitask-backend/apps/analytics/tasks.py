"""
Background jobs for the analytics app.

The scoring/aggregation logic lives in plain functions so it can be run three
ways: as a Celery task (beat schedule), as a management command (no broker
needed), and directly in tests.
"""

from decimal import Decimal

from celery import shared_task
from django.contrib.auth import get_user_model
from django.db.models import Avg, Sum
from django.utils import timezone

User = get_user_model()

# A task counts toward current load while it is assigned or being worked on.
ACTIVE_STATUSES = ['assigned', 'in_progress']


def rebuild_workload_metrics(for_date=None):
    """Recompute the daily UserWorkloadMetrics row for every active user.

    Idempotent: uses update_or_create keyed on (user, date), so re-running for
    the same day overwrites rather than duplicates. Returns the number of users
    processed.
    """
    from apps.tasks.models import TaskAssignment, TaskPerformanceLog
    from .models import UserWorkloadMetrics

    if for_date is None:
        for_date = timezone.localdate()
    now = timezone.now()

    processed = 0
    for user in User.objects.filter(is_active=True):
        active_assignments = TaskAssignment.objects.filter(
            assigned_to=user,
            is_active=True,
            task__status__in=ACTIVE_STATUSES,
        ).select_related('task')

        active_count = active_assignments.count()
        total_hours = Decimal('0')
        overdue_count = 0
        for assignment in active_assignments:
            task = assignment.task
            if task.estimated_hours:
                total_hours += task.estimated_hours
            if task.deadline and task.deadline < now:
                overdue_count += 1

        logs_today = TaskPerformanceLog.objects.filter(
            user=user, completed_at__date=for_date
        )
        completed_count = logs_today.count()
        hours_logged = logs_today.aggregate(total=Sum('hours_taken'))['total'] or Decimal('0')
        avg_quality = logs_today.aggregate(avg=Avg('quality_rating'))['avg']
        on_time_rate = None
        if completed_count:
            on_time_done = logs_today.filter(on_time=True).count()
            on_time_rate = on_time_done / completed_count

        UserWorkloadMetrics.objects.update_or_create(
            user=user,
            date=for_date,
            defaults={
                'active_tasks_count': active_count,
                'completed_tasks_count': completed_count,
                'overdue_tasks_count': overdue_count,
                'total_estimated_hours': total_hours,
                'hours_logged': hours_logged,
                'average_quality_rating': avg_quality,
                'on_time_completion_rate': on_time_rate,
                'workload_intensity': UserWorkloadMetrics.determine_workload_intensity(total_hours),
            },
        )
        processed += 1
    return processed


@shared_task
def update_workload_metrics():
    count = rebuild_workload_metrics()
    return f'Updated workload metrics for {count} users.'
