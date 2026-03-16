import django_filters
from .models import Notification

class NotificationFilter(django_filters.FilterSet):
    # Filter by user ID
    user = django_filters.NumberFilter(field_name='user__id')
    # Filter by read status
    is_read = django_filters.BooleanFilter()
    # Filter by type
    notification_type = django_filters.CharFilter(lookup_expr='icontains')
    # Filter by priority
    priority = django_filters.CharFilter(lookup_expr='iexact')

    class Meta:
        model = Notification
        fields = ['user', 'is_read', 'notification_type', 'priority']
