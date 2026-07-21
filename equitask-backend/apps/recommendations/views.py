from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from .models import TaskRecommendation
from .serializers import TaskRecommendationSerializer
from apps.tasks.models import Task, TaskAssignment
from apps.notifications.utils import notify_task_assigned

User = get_user_model()


class TaskRecommendationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for recommendation CRUD plus accept / override / per-task lookup.
    """
    queryset = TaskRecommendation.objects.all()
    serializer_class = TaskRecommendationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['task', 'recommended_user', 'rank_position']
    search_fields = ['task__title', 'recommended_user__first_name', 'recommended_user__last_name']
    ordering_fields = ['created_at', 'rank_position', 'final_score']
    ordering = ['-created_at']

    def _safe_notify(self, task, assignee, actor):
        try:
            notify_task_assigned(task, assignee, actor)
        except Exception:
            pass

    def _activate_assignment(self, task, user, actor, assignment_type, justification=''):
        TaskAssignment.objects.filter(task=task, is_active=True).update(is_active=False)
        assignment = TaskAssignment.objects.create(
            task=task,
            assigned_to=user,
            assigned_by=actor,
            assignment_type=assignment_type,
            justification=justification,
        )
        task.status = 'assigned'
        task.save(update_fields=['status'])
        self._safe_notify(task, user, actor)
        return assignment

    @action(detail=False, methods=['get'], url_path='task/(?P<task_id>[^/.]+)')
    def for_task(self, request, task_id=None):
        """Return the ranked recommendations recorded for one task."""
        queryset = self.get_queryset().filter(task_id=task_id).order_by('rank_position')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept a recommendation as-is: assign the recommended user (ml_recommended)."""
        recommendation = self.get_object()
        task = recommendation.task
        user = recommendation.recommended_user
        assignment = self._activate_assignment(
            task, user, request.user,
            assignment_type='ml_recommended',
            justification=request.data.get('justification', ''),
        )
        return Response({
            'status': 'accepted',
            'assignment_id': assignment.id,
            'task_id': task.id,
            'recommendation_id': recommendation.id,
            'assigned_to': {
                'id': user.id,
                'name': user.get_full_name() or user.email,
            },
            'assignment_type': assignment.assignment_type,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def override(self, request):
        """Assign someone other than the top recommendation. Justification required."""
        task_id = request.data.get('task_id')
        user_id = request.data.get('user_id')
        justification = (request.data.get('justification') or '').strip()

        if not task_id or not user_id:
            return Response(
                {'error': 'task_id and user_id are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not justification:
            return Response(
                {'error': 'justification is required for a manual override'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        task = get_object_or_404(Task, pk=task_id)
        user = get_object_or_404(User, pk=user_id)
        assignment = self._activate_assignment(
            task, user, request.user,
            assignment_type='manual_override',
            justification=justification,
        )
        return Response({
            'status': 'overridden',
            'assignment_id': assignment.id,
            'task_id': task.id,
            'assigned_to': {
                'id': user.id,
                'name': user.get_full_name() or user.email,
            },
            'assignment_type': assignment.assignment_type,
        }, status=status.HTTP_201_CREATED)
