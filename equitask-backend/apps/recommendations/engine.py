"""
Allocation engine for EQUITASK.

Scores each candidate user for a task across five components (skill match,
workload, performance, fairness, urgency), combines them with configurable
weights, and returns a ranked, explained recommendation list.
"""

from django.contrib.auth import get_user_model

from apps.tasks.models import TaskAssignment
from apps.recommendations.models import RecommendationWeights


class AllocationEngine:
    """Compute ranked task assignment recommendations."""

    DEFAULT_WEIGHTS = {
        'skill': 0.30,
        'workload': 0.25,
        'performance': 0.25,
        'fairness': 0.15,
        'urgency': 0.05,
    }

    # Tuning constants
    CAPACITY_HOURS = 40.0
    UNKNOWN_TASK_HOURS = 8.0
    PERF_PRIOR = 0.6
    PERF_SHRINKAGE_K = 5
    FALLBACK_PROFICIENCY = 3
    CONFIDENCE_SATURATION = 5
    ASSIGNABLE_ROLES = ('team_member', 'manager')

    # ---- candidate selection -------------------------------------------

    def _candidates(self):
        User = get_user_model()
        active = User.objects.filter(is_active=True)
        try:
            User._meta.get_field('role')
        except Exception:
            return list(active)
        by_role = active.filter(role__in=self.ASSIGNABLE_ROLES)
        return list(by_role) if by_role.exists() else list(active)

    # ---- data helpers --------------------------------------------------

    def _user_skill_levels(self, user):
        """Map of skill name (lowercased) -> proficiency 1..5."""
        levels = {}
        try:
            entries = list(user.skill_entries.all())
        except Exception:
            entries = []
        for entry in entries:
            levels[str(entry.skill).strip().lower()] = entry.proficiency
        if not levels:
            for skill in (getattr(user, 'skills', None) or []):
                levels[str(skill).strip().lower()] = self.FALLBACK_PROFICIENCY
        return levels

    def _committed_hours(self, user):
        """Estimated hours of the user's active, unfinished assignments."""
        assignments = (
            TaskAssignment.objects
            .filter(assigned_to=user, is_active=True)
            .exclude(task__status__in=['completed', 'cancelled'])
            .select_related('task')
        )
        total = 0.0
        for assignment in assignments:
            hours = assignment.task.estimated_hours
            total += float(hours) if hours is not None else self.UNKNOWN_TASK_HOURS
        return total

    def _performance_stats(self, user):
        try:
            logs = list(user.performance_logs.all())
        except Exception:
            logs = []
        count = len(logs)
        if count == 0:
            return {'n': 0, 'on_time': None, 'quality': None, 'efficiency': None}
        on_time = sum(1 for log in logs if log.on_time) / count
        quality = sum(log.quality_rating for log in logs) / count
        efficiency = sum(min(float(log.efficiency_score), 1.0) for log in logs) / count
        return {'n': count, 'on_time': on_time, 'quality': quality, 'efficiency': efficiency}

    # ---- component scores (each returns 0..1) --------------------------

    def _skill_match(self, required, levels):
        if not required:
            return 0.5, [], []
        matched, missing, total = [], [], 0.0
        for skill in required:
            key = str(skill).strip().lower()
            if key in levels:
                total += min(levels[key], 5) / 5.0
                matched.append(skill)
            else:
                missing.append(skill)
        return total / len(required), matched, missing

    def _workload(self, committed_hours):
        return 1.0 - min(1.0, committed_hours / self.CAPACITY_HOURS)

    def _performance(self, stats):
        if stats['n'] == 0:
            return self.PERF_PRIOR
        raw = (
            0.4 * stats['on_time']
            + 0.4 * (stats['quality'] / 5.0)
            + 0.2 * stats['efficiency']
        )
        n = stats['n']
        return (n * raw + self.PERF_SHRINKAGE_K * self.PERF_PRIOR) / (n + self.PERF_SHRINKAGE_K)

    def _fairness(self, load, min_load, max_load):
        if max_load - min_load <= 0:
            return 1.0
        return 1.0 - (load - min_load) / (max_load - min_load)

    def _urgency(self, task, workload_score, stats):
        urgent = task.priority in ('high', 'critical')
        days = task.days_until_deadline
        if days is not None and days <= 2:
            urgent = True
        if not urgent:
            return 0.5
        reliability = stats['on_time'] if stats['n'] else self.PERF_PRIOR
        return 0.5 * workload_score + 0.5 * reliability

    # ---- weights -------------------------------------------------------

    def _active_weights(self):
        try:
            active = RecommendationWeights.get_active()
            if active:
                return active.as_dict()
        except Exception:
            pass
        return dict(self.DEFAULT_WEIGHTS)

    # ---- public API ----------------------------------------------------

    def recommend(self, task, weights=None):
        candidates = self._candidates()
        if not candidates:
            return []
        weights = weights or self._active_weights()

        loads = {user.pk: self._committed_hours(user) for user in candidates}
        min_load, max_load = min(loads.values()), max(loads.values())
        required = task.required_skills or []

        results = []
        for user in candidates:
            levels = self._user_skill_levels(user)
            skill_score, matched, missing = self._skill_match(required, levels)
            load = loads[user.pk]
            workload_score = self._workload(load)
            stats = self._performance_stats(user)
            performance_score = self._performance(stats)
            fairness_score = self._fairness(load, min_load, max_load)
            urgency_score = self._urgency(task, workload_score, stats)

            components = {
                'skill_match': skill_score,
                'workload': workload_score,
                'performance': performance_score,
                'fairness': fairness_score,
                'urgency': urgency_score,
            }
            final = (
                weights['skill'] * skill_score
                + weights['workload'] * workload_score
                + weights['performance'] * performance_score
                + weights['fairness'] * fairness_score
                + weights['urgency'] * urgency_score
            )
            confidence = min(1.0, stats['n'] / self.CONFIDENCE_SATURATION) if stats['n'] else 0.0

            results.append({
                'user': user,
                'user_id': user.pk,
                'components': components,
                'final': final,
                'confidence': confidence,
                'matched_skills': matched,
                'missing_skills': missing,
                'committed_hours': load,
                'stats': stats,
            })

        results.sort(key=lambda row: row['final'], reverse=True)
        for position, row in enumerate(results, start=1):
            row['rank'] = position
            row['explanation'] = self._explain(row, task)
        return results

    # ---- explanation ---------------------------------------------------

    def _explain(self, row, task):
        components = row['components']
        name = row['user'].get_full_name() or row['user'].email
        parts = []
        if task.required_skills:
            if row['matched_skills'] and not row['missing_skills']:
                parts.append(f"covers all required skills ({', '.join(row['matched_skills'])})")
            elif row['matched_skills']:
                parts.append(
                    f"covers {', '.join(row['matched_skills'])} "
                    f"but is missing {', '.join(row['missing_skills'])}"
                )
            else:
                parts.append("does not currently list the required skills")
        else:
            parts.append("no specific skills are required for this task")
        parts.append(
            f"has about {row['committed_hours']:.0f}h of active work "
            f"(workload score {components['workload']:.2f})"
        )
        if row['stats']['n']:
            parts.append(
                f"a track record over {row['stats']['n']} completed tasks "
                f"(performance {components['performance']:.2f})"
            )
        else:
            parts.append("limited history, so a neutral prior is used")
        return f"{name} " + "; ".join(parts) + "."
