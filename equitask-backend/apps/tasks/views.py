from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import Task, TaskAssignment, TaskPerformanceLog
from .serializers import TaskSerializer, TaskAssignmentSerializer
from .permissions import IsManagerOrReadOnly, IsTaskOwnerOrManager
from .filters import TaskFilter, TaskAssignmentFilter
from apps.notifications.utils import notify_task_assigned, notify_status_changed, notify_task_completed
from apps.recommendations.engine import AllocationEngine
from apps.recommendations.models import TaskRecommendation

User = get_user_model()


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated, IsManagerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = TaskFilter
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'deadline', 'priority']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsTaskOwnerOrManager()]
        return super().get_permissions()

    def partial_update(self, request, *args, **kwargs):
        """Override to fire notifications on status change"""
        task = self.get_object()
        old_status = task.status
        response = super().partial_update(request, *args, **kwargs)

        new_status = request.data.get('status')
        if new_status and new_status != old_status:
            task.refresh_from_db()
            if new_status == 'completed':
                notify_task_completed(task, request.user)
                self._log_performance(task, request)
            else:
                notify_status_changed(task, request.user, old_status, new_status)

        return response

    @action(detail=False, methods=['get'])
    def my_tasks(self, request):
        assignments = TaskAssignment.objects.filter(
            assigned_to=request.user,
            is_active=True
        )
        task_ids = assignments.values_list('task_id', flat=True)
        tasks = Task.objects.filter(id__in=task_ids)
        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        task = self.get_object()
        user_id = request.data.get('user_id')
        justification = request.data.get('justification', '')

        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Deactivate existing assignments
        TaskAssignment.objects.filter(
            task=task, is_active=True
        ).update(is_active=False)

        # Create new assignment
        assignment = TaskAssignment.objects.create(
            task=task,
            assigned_to_id=user_id,
            assigned_by=request.user,
            assignment_type='direct_assignment',
            justification=justification,
        )

        # Update task status
        task.status = 'assigned'
        task.save()

        # Fire notification to the assigned user
        try:
            assigned_user = User.objects.get(id=user_id)
            notify_task_assigned(task, assigned_user, request.user)
        except User.DoesNotExist:
            pass

        serializer = TaskAssignmentSerializer(assignment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def recommend(self, request, pk=None):
        """Rank candidate assignees using the five-component AllocationEngine."""
        task = self.get_object()
        engine = AllocationEngine()
        ranked = engine.recommend(task)
        weights = engine._active_weights()

        # Persist a fresh snapshot while the decision is still pending
        # (no active assignment, task not closed). This is the labelled
        # training data that retrain_weights later learns from.
        pending = (
            not TaskAssignment.objects.filter(task=task, is_active=True).exists()
            and task.status not in ['completed', 'cancelled']
        )
        if ranked and pending:
            TaskRecommendation.objects.filter(task=task).delete()
            TaskRecommendation.objects.bulk_create([
                TaskRecommendation(
                    task=task,
                    recommended_user=row['user'],
                    final_score=row['final'],
                    confidence_score=row['confidence'],
                    skill_match_score=row['components']['skill_match'],
                    workload_score=row['components']['workload'],
                    historical_performance_score=row['components']['performance'],
                    fairness_score=row['components']['fairness'],
                    urgency_score=row['components']['urgency'],
                    rank_position=row['rank'],
                    explanation=row['explanation'],
                )
                for row in ranked
            ])

        recommendations = [
            {
                'user': {
                    'id': row['user'].id,
                    'name': row['user'].get_full_name() or row['user'].username,
                    'email': row['user'].email,
                    'role': getattr(row['user'], 'role', None),
                    'skills': row['user'].skills or [],
                },
                'scores': {
                    'skill_match': round(row['components']['skill_match'] * 100),
                    'workload': round(row['components']['workload'] * 100),
                    'performance': round(row['components']['performance'] * 100),
                    'fairness': round(row['components']['fairness'] * 100),
                    'urgency': round(row['components']['urgency'] * 100),
                    'final': round(row['final'] * 100),
                },
                'confidence': round(row['confidence'] * 100),
                'rank': row['rank'],
                'active_hours': round(row['committed_hours'], 1),
                'matching_skills': row['matched_skills'],
                'missing_skills': row['missing_skills'],
                'explanation': row['explanation'],
            }
            for row in ranked
        ]

        return Response({
            'task_id': task.id,
            'task_title': task.title,
            'required_skills': task.required_skills or [],
            'weights': {key: round(value, 3) for key, value in weights.items()},
            'recommendations': recommendations,
        })

    def _log_performance(self, task, request):
        """Write a TaskPerformanceLog when a task is completed (the data loop)."""
        if TaskPerformanceLog.objects.filter(task=task).exists():
            return

        assignment = (
            TaskAssignment.objects
            .filter(task=task)
            .order_by('-is_active', '-assigned_at')
            .first()
        )
        if assignment is None:
            return

        completed_at = task.completed_at or timezone.now()
        started_at = task.started_at or assignment.assigned_at or task.created_at

        if task.actual_hours is not None:
            hours_taken = float(task.actual_hours)
        elif task.estimated_hours is not None:
            hours_taken = float(task.estimated_hours)
        else:
            hours_taken = 0

        on_time = True
        early_late_hours = 0
        if task.deadline:
            delta_hours = (task.deadline - completed_at).total_seconds() / 3600.0
            early_late_hours = round(delta_hours, 2)
            on_time = completed_at <= task.deadline

        TaskPerformanceLog.objects.create(
            task=task,
            user=assignment.assigned_to,
            started_at=started_at,
            completed_at=completed_at,
            hours_taken=hours_taken,
            quality_rating=3,
            on_time=on_time,
            early_late_hours=early_late_hours,
            notes='Auto-logged on completion. Quality rating pending manager review.',
        )


class TaskAssignmentViewSet(viewsets.ModelViewSet):
    queryset = TaskAssignment.objects.all()
    serializer_class = TaskAssignmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = TaskAssignmentFilter
