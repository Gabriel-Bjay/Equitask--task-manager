from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class UserWorkloadMetrics(models.Model):
    """
    Daily aggregated workload metrics for users
    Computed by scheduled task for dashboard performance
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workload_metrics',
        help_text="User these metrics belong to"
    )

    date = models.DateField(help_text="Date for these metrics")

    active_tasks_count = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Number of active assigned tasks"
    )
    
    completed_tasks_count = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Number of tasks completed on this date"
    )
    
    overdue_tasks_count = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Number of overdue tasks"
    )
    
    total_estimated_hours = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Sum of estimated hours for active tasks"
    )
    
    hours_logged = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Actual hours logged on this date"
    )
    
    average_quality_rating = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Average quality rating for tasks completed"
    )
    
    on_time_completion_rate = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text="Percentage of tasks completed on time (0-1)"
    )
    
    workload_intensity = models.CharField(
        max_length=20,
        choices=[
            ('underutilized', 'Underutilized'),
            ('optimal', 'Optimal'),
            ('heavy', 'Heavy'),
            ('overloaded', 'Overloaded'),
        ],
        default='optimal',
        help_text="Workload intensity classification"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_workload_metrics'
        ordering = ['-date']
        indexes = [
            models.Index(fields=['user', 'date']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'date'],
                name='unique_user_date_metrics'
            )
        ]
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.date} ({self.workload_intensity})"
    
    @staticmethod
    def determine_workload_intensity(total_hours):
        """
        Determine workload intensity based on total estimated hours
        Thresholds: <20=underutilized, 20-40=optimal, 40-60=heavy,
        >60=overloaded
        """
        if total_hours < 20:
            return 'underutilized'
        elif total_hours <= 40:
            return 'optimal'
        elif total_hours <= 60:
            return 'heavy'
        else:
            return 'overloaded'