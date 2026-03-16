from .models import Notification


def create_notification(user, notification_type, title, message, task=None, priority='normal'):
    """
    Helper to create a notification for a user.
    Call this from anywhere in the backend whenever something happens.
    """
    Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        related_task=task,
        priority=priority,
    )


def notify_task_assigned(task, assigned_to, assigned_by):
    """Notify user when a task is assigned to them"""
    create_notification(
        user=assigned_to,
        notification_type='task_assigned',
        title='New Task Assigned',
        message=f'{assigned_by.get_full_name()} assigned you "{task.title}".',
        task=task,
        priority='normal',
    )


def notify_task_completed(task, completed_by):
    """Notify task creator when a task is marked complete"""
    if task.created_by and task.created_by != completed_by:
        create_notification(
            user=task.created_by,
            notification_type='task_completed',
            title='Task Completed',
            message=f'{completed_by.get_full_name()} completed "{task.title}".',
            task=task,
            priority='normal',
        )


def notify_status_changed(task, changed_by, old_status, new_status):
    """Notify assigned user when task status changes"""
    from apps.tasks.models import TaskAssignment
    assignments = TaskAssignment.objects.filter(
        task=task, is_active=True
    ).select_related('assigned_to')

    for assignment in assignments:
        if assignment.assigned_to != changed_by:
            create_notification(
                user=assignment.assigned_to,
                notification_type='task_completed' if new_status == 'completed' else 'task_assigned',
                title='Task Updated',
                message=f'"{task.title}" status changed from {old_status.replace("_", " ")} to {new_status.replace("_", " ")}.',
                task=task,
                priority='high' if new_status == 'overdue' else 'normal',
            )