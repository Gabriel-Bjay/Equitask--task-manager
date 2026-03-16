from rest_framework import serializers
from .models import UserWorkloadMetrics


class UserWorkloadMetricsSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = UserWorkloadMetrics
        fields = [
            'id', 'user', 'user_name', 'date',
            'active_tasks_count', 'completed_tasks_count', 'overdue_tasks_count',
            'total_estimated_hours', 'hours_logged', 'average_quality_rating',
            'on_time_completion_rate', 'workload_intensity',
            'created_at', 'updated_at'
        ]
