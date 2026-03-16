import django_filters
from .models import Task, TaskAssignment

class TaskFilter(django_filters.FilterSet):
    # Assuming category is a FK with 'name' field
    category = django_filters.CharFilter(field_name='category__name', lookup_expr='icontains')
    # created_by is a FK to User
    created_by = django_filters.NumberFilter(field_name='created_by__id')

    class Meta:
        model = Task
        # Only include real fields on Task
        fields = ['status', 'priority', 'deadline', 'category', 'created_by']


class TaskAssignmentFilter(django_filters.FilterSet):
    # Filter by task ID
    task = django_filters.NumberFilter(field_name='task__id')
    # Filter by user ID
    assigned_to = django_filters.NumberFilter(field_name='assigned_to__id')
    # is_active is a real field
    is_active = django_filters.BooleanFilter()

    class Meta:
        model = TaskAssignment
        fields = ['task', 'assigned_to', 'is_active']