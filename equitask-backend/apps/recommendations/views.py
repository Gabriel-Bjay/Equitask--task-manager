from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import TaskRecommendation
from .serializers import TaskRecommendationSerializer

class TaskRecommendationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Recommendation CRUD
    """
    queryset = TaskRecommendation.objects.all()
    serializer_class = TaskRecommendationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'created_by']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at']
    ordering = ['-created_at']