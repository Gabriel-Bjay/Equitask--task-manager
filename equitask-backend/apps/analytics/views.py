from rest_framework import viewsets  # type: ignore
from rest_framework.decorators import action  # type: ignore
from rest_framework.response import Response  # type: ignore
from rest_framework.permissions import IsAuthenticated  # type: ignore
from django.contrib.auth import get_user_model  # type: ignore
from django.db.models import Count, Q  # type: ignore
from apps.tasks.models import Task, TaskAssignment

User = get_user_model()


class AnalyticsDashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def rapid_scores(self, request):

        total_tasks = Task.objects.exclude(status='pending').count()
        assigned_tasks = TaskAssignment.objects.filter(
            is_active=True
        ).values('task').distinct().count()
        responsibility = round(
            (assigned_tasks / total_tasks * 100) if total_tasks > 0 else 100
        )

        total_assignments = TaskAssignment.objects.count()
        justified = TaskAssignment.objects.exclude(justification='').count()
        accountability = round(
            (justified / total_assignments * 100)
            if total_assignments > 0 else 100
        )

        total_active = Task.objects.exclude(
            status__in=['pending', 'cancelled']
        ).count()
        overdue_count = Task.objects.filter(status='overdue').count()
        professionalism = round(
            ((total_active - overdue_count) / total_active * 100)
            if total_active > 0 else 100
        )

        total_members = User.objects.filter(
            is_active=True,
            role__in=['team_member', 'manager']
        ).count()
        members_with_tasks = TaskAssignment.objects.filter(
            is_active=True
        ).values('assigned_to').distinct().count()
        inclusivity = round(
            (members_with_tasks / total_members * 100)
            if total_members > 0 else 100
        )

        if total_members > 1 and total_assignments > 0:
            task_counts = list(
                TaskAssignment.objects.filter(is_active=True)
                .values('assigned_to')
                .annotate(count=Count('id'))
                .values_list('count', flat=True)
            )
            if task_counts:
                avg = total_assignments / total_members
                max_count = max(task_counts)
                diversity = round(
                    min(100, (avg / max_count) * 100)
                ) if max_count > 0 else 100
            else:
                diversity = 100
        else:
            diversity = 100

        scores = {
            'responsibility': min(100, responsibility),
            'accountability': min(100, accountability),
            'professionalism': min(100, professionalism),
            'inclusivity': min(100, inclusivity),
            'diversity': min(100, diversity),
        }

        return Response({
            'scores': scores,
            'overall': round(sum(scores.values()) / len(scores)),
            'meta': {
                'total_tasks': total_tasks,
                'total_assignments': total_assignments,
                'total_members': total_members,
                'members_with_tasks': members_with_tasks,
            }
        })

    @action(detail=False, methods=['get'])
    def team_overview(self, request):

        task_stats = Task.objects.aggregate(
            total=Count('id'),
            completed=Count('id', filter=Q(status='completed')),
            in_progress=Count('id', filter=Q(status='in_progress')),
            pending=Count('id', filter=Q(status='pending')),
            assigned=Count('id', filter=Q(status='assigned')),
            overdue=Count('id', filter=Q(status='overdue')),
            cancelled=Count('id', filter=Q(status='cancelled')),
        )

        by_category = list(
            Task.objects.values('category')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        by_priority = list(
            Task.objects.values('priority')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        team_members = User.objects.filter(
            is_active=True,
            role__in=['team_member', 'manager']
        )

        team_data = []
        for member in team_members:
            assignments = TaskAssignment.objects.filter(
                assigned_to=member, is_active=True
            )
            task_ids = assignments.values_list('task_id', flat=True)
            member_tasks = Task.objects.filter(id__in=task_ids)

            total = member_tasks.count()
            completed = member_tasks.filter(status='completed').count()
            overdue = member_tasks.filter(status='overdue').count()
            in_progress = member_tasks.filter(status='in_progress').count()

            team_data.append({
                'id': member.id,
                'name': member.get_full_name() or member.username,
                'role': member.role,
                'department': member.department,
                'total_tasks': total,
                'completed': completed,
                'in_progress': in_progress,
                'overdue': overdue,
                'completion_rate': round(
                    (completed / total * 100) if total > 0 else 0
                ),
            })

        team_data.sort(key=lambda x: x['total_tasks'], reverse=True)

        return Response({
            'task_stats': task_stats,
            'by_category': by_category,
            'by_priority': by_priority,
            'team_workload': team_data,
        })


class UserStatsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        user = request.user
        assignments = TaskAssignment.objects.filter(
            assigned_to=user, is_active=True
        )
        task_ids = assignments.values_list('task_id', flat=True)
        tasks = Task.objects.filter(id__in=task_ids)
        return Response({
            'total': tasks.count(),
            'completed': tasks.filter(status='completed').count(),
            'in_progress': tasks.filter(status='in_progress').count(),
            'overdue': tasks.filter(status='overdue').count(),
            'pending': tasks.filter(
                status__in=['pending', 'assigned']
            ).count(),
        })
