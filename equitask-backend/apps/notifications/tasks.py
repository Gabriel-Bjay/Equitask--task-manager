"""
Background jobs for the notifications app.

Core logic lives in plain functions (run_deadline_reminders, run_overdue_check)
so it can run as a Celery task, a management command, or in tests. Each function
is idempotent: it will not send the same reminder twice for the same task.
"""

from datetime import timedelta

from celery import shared_task
from django.utils import timezone

ACTIVE_STATUSES = ['assigned', 'in_progress']


def _recipients(task):
    """Active assignees of a task."""
    from apps.tasks.models import TaskAssignment
    return [
        assignment.assigned_to
        for assignment in TaskAssignment.objects.filter(
            task=task, is_active=True
        ).select_related('assigned_to')
    ]


def run_deadline_reminders(hours_before=48):
    """Notify assignees of tasks due within the next `hours_before` hours."""
    from apps.tasks.models import Task
    from .models import Notification
    from .utils import create_notification

    now = timezone.now()
    window_end = now + timedelta(hours=hours_before)
    ntype = 'deadline_reminder_24h' if hours_before <= 24 else 'deadline_reminder_48h'

    sent = 0
    tasks = Task.objects.filter(
        status__in=ACTIVE_STATUSES,
        deadline__gt=now,
        deadline__lte=window_end,
    )
    for task in tasks:
        for user in _recipients(task):
            if Notification.objects.filter(
                user=user, related_task=task, notification_type=ntype
            ).exists():
                continue
            hours_left = int((task.deadline - now).total_seconds() // 3600)
            create_notification(
                user=user,
                notification_type=ntype,
                title=f'Deadline in about {hours_left} hours',
                message=f'"{task.title}" is due {task.deadline:%d %b %Y %H:%M}.',
                task=task,
                priority='high',
            )
            sent += 1
    return sent


def run_overdue_check():
    """Mark past-deadline tasks as overdue and notify their assignees."""
    from apps.tasks.models import Task
    from .models import Notification
    from .utils import create_notification

    now = timezone.now()
    marked = 0
    notified = 0
    tasks = Task.objects.filter(
        status__in=ACTIVE_STATUSES,
        deadline__lt=now,
    )
    for task in tasks:
        task.status = 'overdue'
        task.save(update_fields=['status'])
        marked += 1
        for user in _recipients(task):
            if Notification.objects.filter(
                user=user, related_task=task, notification_type='task_overdue'
            ).exists():
                continue
            create_notification(
                user=user,
                notification_type='task_overdue',
                title='Task Overdue',
                message=f'"{task.title}" passed its deadline on {task.deadline:%d %b %Y %H:%M}.',
                task=task,
                priority='high',
            )
            notified += 1
    return marked, notified


@shared_task
def send_deadline_reminders(hours_before=48):
    sent = run_deadline_reminders(hours_before)
    return f'Sent {sent} deadline reminders ({hours_before}h window).'


@shared_task
def check_overdue_tasks():
    marked, notified = run_overdue_check()
    return f'Marked {marked} tasks overdue, sent {notified} notifications.'
