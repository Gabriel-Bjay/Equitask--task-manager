from rest_framework import serializers
from .models import TaskRecommendation

class TaskRecommendationSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(source='task.title', read_only=True)
    recommended_user_name = serializers.CharField(source='recommended_user.get_full_name', read_only=True)

    class Meta:
        model = TaskRecommendation
        fields = [
            'id',
            'task',
            'task_title',
            'recommended_user',
            'recommended_user_name',
            'final_score',
            'confidence_score',
            'skill_match_score',
            'workload_score',
            'historical_performance_score',
            'fairness_score',
            'urgency_score',
            'rank_position',
            'explanation',
            'created_at',
        ]