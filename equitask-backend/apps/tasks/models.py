from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

class Task(models.Model):
    """
    Task model for managing work items
    """
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]
    
    CATEGORY_CHOICES = [
        ('development', 'Development'),
        ('testing', 'Testing'),
        ('design', 'Design'),
        ('documentation', 'Documentation'),
        ('research', 'Research'),
        ('review', 'Review'),
        ('meeting', 'Meeting'),
        ('other', 'Other'),
    ]
    
    # Basic information
    title = models.CharField(max_length=255, help_text="Task title")
    description = models.TextField(blank=True, help_text="Detailed task description")
    
    # Creator
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_tasks',
        help_text="User who created this task"
    )
    
    # Classification
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        default='other',
        help_text="Task category"
    )
    
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium',
        help_text="Task priority level"
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text="Current task status"
    )
    
    # Requirements and estimates
    required_skills = models.JSONField(
        default=list,
        blank=True,
        help_text="List of required skills (e.g., ['Python', 'Django'])"
    )
    
    estimated_hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Estimated hours to complete"
    )
    
    actual_hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Actual hours spent (filled after completion)"
    )
    
    complexity_score = models.IntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Complexity rating from 1 (easy) to 10 (very complex)"
    )
    
    # Dates
    deadline = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Task deadline"
    )
    
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When work on the task started"
    )
    
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the task was completed"
    )
    
    # Attachments
    attachments = models.JSONField(
        default=list,
        blank=True,
        help_text="List of attachment file paths"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tasks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'deadline']),
            models.Index(fields=['created_by', 'status']),
            models.Index(fields=['category']),
            models.Index(fields=['priority']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"
    
    @property
    def is_overdue(self):
        """Check if task is overdue"""
        if self.deadline and self.status not in ['completed', 'cancelled']:
            return timezone.now() > self.deadline
        return False
    
    @property
    def days_until_deadline(self):
        """Calculate days until deadline"""
        if self.deadline:
            delta = self.deadline - timezone.now()
            return delta.days
        return None
    
    def update_status_if_overdue(self):
        """Update status to overdue if deadline has passed"""
        if self.is_overdue and self.status not in ['completed', 'cancelled']:
            self.status = 'overdue'
            self.save(update_fields=['status'])


class TaskAssignment(models.Model):
    """
    Task assignment tracking with decision context
    """
    
    ASSIGNMENT_TYPE_CHOICES = [
        ('ml_recommended', 'ML Recommended'),
        ('manual_override', 'Manual Override'),
        ('direct_assignment', 'Direct Assignment'),
    ]
    
    # Relationships
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='assignments',
        help_text="The task being assigned"
    )
    
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='task_assignments',
        help_text="User to whom the task is assigned"
    )
    
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assignments_made',
        help_text="User who made the assignment"
    )
    
    # Assignment metadata
    assignment_type = models.CharField(
        max_length=30,
        choices=ASSIGNMENT_TYPE_CHOICES,
        default='direct_assignment',
        help_text="How the assignment was made"
    )
    
    justification = models.TextField(
        blank=True,
        help_text="Explanation for assignment (required for overrides)"
    )
    
    # Timestamps
    assigned_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    deadline_acknowledged = models.BooleanField(default=False)
    
    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Is this the current active assignment?"
    )
    
    reassignment_reason = models.TextField(
        blank=True,
        help_text="Reason for reassignment if is_active=False"
    )
    
    class Meta:
        db_table = 'task_assignments'
        ordering = ['-assigned_at']
        indexes = [
            models.Index(fields=['task', 'is_active']),
            models.Index(fields=['assigned_to', 'is_active']),
        ]
        # Ensure only one active assignment per task
        constraints = [
            models.UniqueConstraint(
                fields=['task'],
                condition=models.Q(is_active=True),
                name='unique_active_assignment_per_task'
            )
        ]
    
    def __str__(self):
        return f"{self.task.title} → {self.assigned_to.get_full_name()}"


class TaskPerformanceLog(models.Model):
    """
    Performance tracking for completed tasks
    """
    
    # Relationships
    task = models.OneToOneField(
        Task,
        on_delete=models.CASCADE,
        related_name='performance_log',
        help_text="The completed task"
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='performance_logs',
        help_text="User who completed the task"
    )
    
    # Performance metrics
    started_at = models.DateTimeField(help_text="When work started")
    completed_at = models.DateTimeField(help_text="When work was completed")
    
    hours_taken = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Actual hours spent"
    )
    
    quality_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Quality rating 1-5 (assigned by manager)"
    )
    
    on_time = models.BooleanField(
        default=True,
        help_text="Was task completed before deadline?"
    )
    
    early_late_hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Hours early (positive) or late (negative)"
    )
    
    notes = models.TextField(
        blank=True,
        help_text="Additional notes about task completion"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'task_performance_logs'
        ordering = ['-completed_at']
        indexes = [
            models.Index(fields=['user', 'completed_at']),
        ]
    
    def __str__(self):
        return f"{self.task.title} - {self.user.get_full_name()} ({self.quality_rating}/5)"
    
    @property
    def efficiency_score(self):
        """Calculate efficiency (estimated hours / actual hours)"""
        if self.task.estimated_hours and self.hours_taken:
            return min(float(self.task.estimated_hours) / float(self.hours_taken), 1.5)
        return 1.0


class TaskAuditLog(models.Model):
    """
    Comprehensive audit trail for all task modifications
    """
    
    ACTION_TYPE_CHOICES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('assigned', 'Assigned'),
        ('reassigned', 'Reassigned'),
        ('status_changed', 'Status Changed'),
        ('deleted', 'Deleted'),
        ('commented', 'Commented'),
    ]
    
    # Relationships
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='audit_logs',
        help_text="Task that was modified"
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='task_audit_logs',
        help_text="User who made the change"
    )
    
    # Action details
    action_type = models.CharField(
        max_length=20,
        choices=ACTION_TYPE_CHOICES,
        help_text="Type of action performed"
    )
    
    field_changed = models.CharField(
        max_length=100,
        blank=True,
        help_text="Field that was changed (for updates)"
    )
    
    old_value = models.JSONField(
        null=True,
        blank=True,
        help_text="Previous value"
    )
    
    new_value = models.JSONField(
        null=True,
        blank=True,
        help_text="New value"
    )
    
    # Metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'task_audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['task', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.task.title} - {self.action_type} by {self.user}"