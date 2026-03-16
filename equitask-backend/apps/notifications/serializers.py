from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    task_title = serializers.CharField(source='related_task.title', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'user_name', 'notification_type', 'title', 'message',
            'related_task', 'task_title', 'priority', 'is_read', 'read_at', 'created_at'
        ]
        read_only_fields = ['created_at', 'read_at', 'user_name', 'task_title']