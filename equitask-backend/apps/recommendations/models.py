from django.db import models
from django.conf import settings
from apps.tasks.models import Task

class TaskRecommendation(models.Model):
    """
    ML-generated task assignment recommendations
    """
    
    # Relationships
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='recommendations',
        help_text="Task for which recommendation was made"
    )
    
    recommended_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_recommendations',
        help_text="User recommended for this task"
    )
    
    # Scores (all normalized 0-1)
    final_score = models.FloatField(
        help_text="Final weighted recommendation score (0-1)"
    )
    
    confidence_score = models.FloatField(
        help_text="Confidence in this recommendation (0-1)"
    )
    
    skill_match_score = models.FloatField(
        help_text="Skill matching component score (0-1)"
    )
    
    workload_score = models.FloatField(
        help_text="Workload analysis component score (0-1)"
    )
    
    historical_performance_score = models.FloatField(
        help_text="Historical performance component score (0-1)"
    )
    
    fairness_score = models.FloatField(
        help_text="Fairness & diversity component score (0-1)"
    )
    
    urgency_score = models.FloatField(
        help_text="Urgency alignment component score (0-1)"
    )
    
    # Ranking
    rank_position = models.IntegerField(
        help_text="Position in ranked recommendations (1 = top recommendation)"
    )
    
    # Explanation
    explanation = models.TextField(
        help_text="Human-readable explanation of recommendation"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'task_recommendations'
        ordering = ['task', 'rank_position']
        indexes = [
            models.Index(fields=['task', 'rank_position']),
            models.Index(fields=['recommended_user', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.task.title} → {self.recommended_user.get_full_name()} (#{self.rank_position}, score: {self.final_score:.2f})"
    
    @property
    def score_breakdown(self):
        """Return dictionary of all component scores"""
        return {
            'skill_match': self.skill_match_score,
            'workload': self.workload_score,
            'historical': self.historical_performance_score,
            'fairness': self.fairness_score,
            'urgency': self.urgency_score,
        }



class RecommendationWeights(models.Model):
    """Versioned component weights used by the engine."""
    SOURCE_CHOICES = [
        ('default', 'Expert default'),
        ('learned', 'Learned from outcomes'),
    ]

    skill = models.FloatField(default=0.30)
    workload = models.FloatField(default=0.25)
    performance = models.FloatField(default=0.25)
    fairness = models.FloatField(default=0.15)
    urgency = models.FloatField(default=0.05)

    version = models.IntegerField(default=1)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='default')
    n_samples = models.IntegerField(default=0, help_text="Number of outcomes used to train")
    is_active = models.BooleanField(default=True)
    trained_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'recommendation_weights'
        ordering = ['-created_at']

    def __str__(self):
        state = 'active' if self.is_active else 'inactive'
        return f"Weights v{self.version} ({self.source}, {state})"

    @classmethod
    def get_active(cls):
        return cls.objects.filter(is_active=True).order_by('-created_at').first()

    def as_dict(self):
        return {
            'skill': self.skill,
            'workload': self.workload,
            'performance': self.performance,
            'fairness': self.fairness,
            'urgency': self.urgency,
        }
