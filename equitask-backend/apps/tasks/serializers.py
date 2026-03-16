from rest_framework import serializers
from .models import Task, TaskAssignment
from django.contrib.auth import get_user_model

User = get_user_model()

class TaskSerializer(serializers.ModelSerializer):
    """Serializer for Task model"""
    
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'created_by', 'created_by_name',
            'category', 'priority', 'status', 'required_skills',
            'estimated_hours', 'actual_hours', 'complexity_score',
            'deadline', 'started_at', 'completed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class TaskAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for TaskAssignment model"""
    
    assigned_to_name = serializers.SerializerMethodField()
    assigned_by_name = serializers.SerializerMethodField()
    task_title = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskAssignment
        fields = [
            'id', 'task', 'task_title', 'assigned_to', 'assigned_to_name',
            'assigned_by', 'assigned_by_name', 'assignment_type',
            'justification', 'assigned_at', 'is_active'
        ]
        read_only_fields = ['id', 'assigned_by', 'assigned_at']
    
    def get_assigned_to_name(self, obj):
        return obj.assigned_to.get_full_name() if obj.assigned_to else None
    
    def get_assigned_by_name(self, obj):
        return obj.assigned_by.get_full_name() if obj.assigned_by else None
    
    def get_task_title(self, obj):
        return obj.task.title if obj.task else None
    
    def create(self, validated_data):
        validated_data['assigned_by'] = self.context['request'].user
        return super().create(validated_data)