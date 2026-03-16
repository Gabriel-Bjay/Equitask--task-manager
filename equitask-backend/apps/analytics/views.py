from rest_framework import viewsets
from .models import UserWorkloadMetrics
from .serializers import UserWorkloadMetricsSerializer

class AnalyticsDashboardViewSet(viewsets.ModelViewSet):
    queryset = UserWorkloadMetrics.objects.all().order_by('-date')
    serializer_class = UserWorkloadMetricsSerializer

class UserStatsViewSet(viewsets.ModelViewSet):
    queryset = UserWorkloadMetrics.objects.all().order_by('-date')
    serializer_class = UserWorkloadMetricsSerializer