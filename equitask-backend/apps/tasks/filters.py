import django_filters

from .models import Task, TaskAssignment


class TaskFilter(django_filters.FilterSet):
    # `category` is a plain CharField (with choices) on Task, NOT a foreign key.
    # The previous `category__name` lookup raised a FieldError because it tried
    # to traverse a relation that does not exist.
    category = django_filters.CharFilter(field_name='category', lookup_expr='iexact')

    # `deadline` is a DateTimeField; an exact match is almost never useful, so
    # expose range bounds instead (?deadline_after=...&deadline_before=...).
    deadline_after = django_filters.DateTimeFilter(field_name='deadline', lookup_expr='gte')
    deadline_before = django_filters.DateTimeFilter(field_name='deadline', lookup_expr='lte')

    class Meta:
        model = Task
        # status/priority are choice CharFields -> auto exact filters.
        # created_by (FK) -> auto ModelChoiceFilter, which handles the pk type
        # correctly regardless of whether User uses an integer or UUID pk.
        fields = ['status', 'priority', 'created_by']


class TaskAssignmentFilter(django_filters.FilterSet):
    class Meta:
        model = TaskAssignment
        # task / assigned_to (FKs) -> auto ModelChoiceFilters.
        # is_active (BooleanField) -> auto BooleanFilter (?is_active=true/false).
        fields = ['task', 'assigned_to', 'is_active']
