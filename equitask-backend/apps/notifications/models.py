from django.db import models
from django.conf import settings
from apps.tasks.models import Task
from django.utils import timezone


class Notification(models.Model):
    """
    User notifications for task events
    """
    NOTIFICATION_TYPE_CHOICES = [
        ('task_assigned', 'Task Assigned'),
        ('deadline_reminder_48h', 'Deadline Reminder (48h)'),
        ('deadline_reminder_24h', 'Deadline Reminder (24h)'),
        ('task_overdue', 'Task Overdue'),
        ('task_completed', 'Task Completed'),
        ('task_reassigned', 'Task Reassigned'),
        ('approval_request', 'Approval Request'),
        ('system_announcement', 'System Announcement'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        help_text="User receiving this notification"
    )
    
    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPE_CHOICES,
        help_text="Type of notification"
    )
    
    title = models.CharField(max_length=255, help_text="Notification title")
    
    message = models.TextField(help_text="Notification message content")
    
    related_task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        help_text="Task this notification is about (if applicable)"
    )
    
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='normal',
        help_text="Notification priority level"
    )
    
    is_read = models.BooleanField(default=False, help_text="Has user read this notification?")
    
    read_at = models.DateTimeField(null=True, blank=True, help_text="When notification was marked as read")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', 'created_at']),
            models.Index(fields=['notification_type']),
        ]
    
    def __str__(self):
        return f"{self.title} → {self.user.get_full_name()}"
    
    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])