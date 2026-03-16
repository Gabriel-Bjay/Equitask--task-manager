from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model

from .models import Task, TaskAssignment
from .serializers import TaskSerializer, TaskAssignmentSerializer
from .permissions import IsManagerOrReadOnly, IsTaskOwnerOrManager
from .filters import TaskFilter, TaskAssignmentFilter
from apps.notifications.utils import notify_task_assigned, notify_status_changed, notify_task_completed

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
        task = self.get_object()

        candidates = User.objects.filter(
            is_active=True,
            role__in=['team_member', 'manager']
        )

        required_skills = set(
            s.lower() for s in (task.required_skills or [])
        )

        results = []

        for user in candidates:
            user_skills = set(
                s.lower() for s in (user.skills or [])
            )

            if required_skills:
                intersection = len(required_skills & user_skills)
                union = len(required_skills | user_skills)
                skill_score = intersection / union if union > 0 else 0
            else:
                skill_score = 1.0

            active_count = TaskAssignment.objects.filter(
                assigned_to=user,
                is_active=True,
                task__status__in=['assigned', 'in_progress']
            ).count()
            workload_score = max(0, 1 - (active_count / 5))

            final_score = (skill_score * 0.55) + (workload_score * 0.45)

            results.append({
                'user': {
                    'id': user.id,
                    'name': user.get_full_name() or user.username,
                    'email': user.email,
                    'role': user.role,
                    'skills': user.skills or [],
                },
                'scores': {
                    'skill_match': round(skill_score * 100),
                    'workload': round(workload_score * 100),
                    'final': round(final_score * 100),
                },
                'active_tasks': active_count,
                'matching_skills': list(required_skills & user_skills),
                'missing_skills': list(required_skills - user_skills),
            })

        results.sort(key=lambda x: x['scores']['final'], reverse=True)

        return Response({
            'task_id': task.id,
            'task_title': task.title,
            'required_skills': task.required_skills or [],
            'recommendations': results,
        })


class TaskAssignmentViewSet(viewsets.ModelViewSet):
    queryset = TaskAssignment.objects.all()
    serializer_class = TaskAssignmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = TaskAssignmentFilter