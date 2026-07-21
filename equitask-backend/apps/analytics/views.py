from rest_framework import viewsets  # type: ignore
from rest_framework.decorators import action  # type: ignore
from rest_framework.response import Response  # type: ignore
from rest_framework.permissions import IsAuthenticated  # type: ignore
from django.contrib.auth import get_user_model  # type: ignore
from django.db.models import Count, Q  # type: ignore
from apps.tasks.models import Task, TaskAssignment
from apps.analytics.models import UserWorkloadMetrics

User = get_user_model()

# Default hours assumed for an active task that has no estimate recorded. Kept
# in step with the allocation engine's UNKNOWN_TASK_HOURS so the fairness view
# and the engine reason about workload on the same scale.
DEFAULT_TASK_HOURS = 8

# Assignments whose task is in one of these statuses count as current, open
# workload for fairness purposes.
ACTIVE_TASK_STATUSES = ['assigned', 'in_progress']


def _gini(values):
    """Return the Gini coefficient of a list of non-negative numbers.

    0.0 means perfect equality (every member carries the same load); values
    closer to 1.0 mean the load is concentrated on a few members. Returns 0.0
    for an empty list or when the total is zero.
    """
    ordered = sorted(float(v) for v in values)
    n = len(ordered)
    total = sum(ordered)
    if n == 0 or total == 0:
        return 0.0
    cumulative = sum((index + 1) * value for index, value in enumerate(ordered))
    gini = (2 * cumulative) / (n * total) - (n + 1) / n
    # Guard against tiny negative floating-point noise near perfect equality.
    return round(max(0.0, gini), 4)


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

    @action(detail=False, methods=['get'])
    def fairness(self, request):
        """Workload fairness across active team members.

        Workload is measured as the sum of estimated hours across each member's
        active assignments (task status assigned or in progress). Tasks with no
        estimate fall back to DEFAULT_TASK_HOURS. Members with no active work
        are included as zero, because idle capacity is part of the fairness
        picture. The response reports each member's workload and intensity plus
        distribution statistics: mean, population variance, standard deviation,
        coefficient of variation, and the Gini coefficient.
        """
        members = User.objects.filter(
            is_active=True,
            role__in=['team_member', 'manager'],
        ).order_by('id')

        member_rows = []
        hours_vector = []
        for member in members:
            task_ids = TaskAssignment.objects.filter(
                assigned_to=member,
                is_active=True,
                task__status__in=ACTIVE_TASK_STATUSES,
            ).values_list('task_id', flat=True)

            estimates = list(
                Task.objects.filter(id__in=task_ids)
                .values_list('estimated_hours', flat=True)
            )

            workload_hours = 0.0
            for estimate in estimates:
                workload_hours += (
                    float(estimate) if estimate is not None
                    else float(DEFAULT_TASK_HOURS)
                )

            hours_vector.append(workload_hours)
            member_rows.append({
                'id': member.id,
                'name': member.get_full_name() or member.username,
                'role': member.role,
                'active_tasks': len(estimates),
                'workload_hours': round(workload_hours, 2),
                'intensity': UserWorkloadMetrics.determine_workload_intensity(
                    workload_hours
                ),
            })

        member_rows.sort(key=lambda row: row['workload_hours'], reverse=True)

        n = len(hours_vector)
        mean = sum(hours_vector) / n if n else 0.0
        variance = (
            sum((hours - mean) ** 2 for hours in hours_vector) / n
            if n else 0.0
        )
        std_dev = variance ** 0.5
        coefficient_of_variation = (std_dev / mean) if mean > 0 else 0.0

        return Response({
            'metric': 'active_estimated_hours',
            'default_task_hours': DEFAULT_TASK_HOURS,
            'members': member_rows,
            'distribution': {
                'members_counted': n,
                'mean_hours': round(mean, 2),
                'variance': round(variance, 2),
                'std_dev': round(std_dev, 2),
                'coefficient_of_variation': round(coefficient_of_variation, 4),
                'gini_coefficient': _gini(hours_vector),
                'min_hours': round(min(hours_vector), 2) if hours_vector else 0.0,
                'max_hours': round(max(hours_vector), 2) if hours_vector else 0.0,
            },
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
