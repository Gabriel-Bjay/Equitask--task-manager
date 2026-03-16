from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Task, TaskAssignment
from .serializers import TaskSerializer, TaskAssignmentSerializer
from .permissions import IsManagerOrReadOnly, IsTaskOwnerOrManager
from .filters import TaskFilter, TaskAssignmentFilter


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Task CRUD operations
    """
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

    @action(detail=False, methods=['get'])
    def my_tasks(self, request):
        """Get tasks assigned to current user"""
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
        """Assign task to a user"""
        task = self.get_object()
        user_id = request.data.get('user_id')
        justification = request.data.get('justification', '')

        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Deactivate existing assignments
        TaskAssignment.objects.filter(task=task, is_active=True).update(is_active=False)

        # Create new assignment
        assignment = TaskAssignment.objects.create(
            task=task,
            assigned_to_id=user_id,
            assigned_by=request.user,
            assignment_type='direct_assignment',
            justification=justification
        )

        # Update task status
        task.status = 'assigned'
        task.save()

        serializer = TaskAssignmentSerializer(assignment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TaskAssignmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for TaskAssignment operations
    """
    queryset = TaskAssignment.objects.all()
    serializer_class = TaskAssignmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = TaskAssignmentFilter