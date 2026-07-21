"""
Learn allocation-engine component weights from recorded outcomes.

For every recommendation snapshot we have a matching performance log, we build
a training row: the five component scores as features, and success (on time AND
quality rating >= 4) as the label. A logistic regression tells us which
components actually predict success; we turn its positive coefficients into a
normalised, clipped weight set and save it as a new active version.
"""

import numpy as np

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.tasks.models import TaskPerformanceLog
from apps.recommendations.models import TaskRecommendation, RecommendationWeights

COMPONENT_ORDER = ['skill', 'workload', 'performance', 'fairness', 'urgency']
WEIGHT_MIN = 0.05
WEIGHT_MAX = 0.45


class Command(BaseCommand):
    help = 'Learn component weights from recorded recommendation outcomes.'

    def add_arguments(self, parser):
        parser.add_argument('--min-samples', type=int, default=50)
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print the learned weights without saving them.',
        )

    def handle(self, *args, **options):
        try:
            from sklearn.linear_model import LogisticRegression
        except ImportError:
            self.stderr.write(
                'scikit-learn is not installed. Run: pip install scikit-learn'
            )
            return

        min_samples = options['min_samples']

        # Label lookup: (task_id, user_id) -> success (bool)
        labels = {}
        for log in TaskPerformanceLog.objects.all():
            labels[(log.task_id, log.user_id)] = bool(
                log.on_time and log.quality_rating >= 4
            )

        features = []
        targets = []
        for rec in TaskRecommendation.objects.all():
            label = labels.get((rec.task_id, rec.recommended_user_id))
            if label is None:
                continue
            features.append([
                rec.skill_match_score,
                rec.workload_score,
                rec.historical_performance_score,
                rec.fairness_score,
                rec.urgency_score,
            ])
            targets.append(1 if label else 0)

        n = len(targets)
        self.stdout.write(f'Collected {n} labelled training rows.')

        if n < min_samples:
            self.stdout.write(self.style.WARNING(
                f'Not enough data to train ({n} < {min_samples}). '
                'Keeping current weights (cold-start guard).'
            ))
            return

        if len(set(targets)) < 2:
            self.stdout.write(self.style.WARNING(
                'Outcomes contain only one class; cannot learn. '
                'Keeping current weights.'
            ))
            return

        model = LogisticRegression(max_iter=1000)
        model.fit(np.array(features, dtype=float), np.array(targets, dtype=int))
        coefficients = model.coef_[0]

        positive = np.clip(coefficients, 0.0, None)
        if positive.sum() <= 0:
            self.stdout.write(self.style.WARNING(
                'No component positively predicts success; keeping current weights.'
            ))
            return

        weights = positive / positive.sum()
        weights = np.clip(weights, WEIGHT_MIN, WEIGHT_MAX)
        weights = weights / weights.sum()

        learned = {
            name: round(float(value), 4)
            for name, value in zip(COMPONENT_ORDER, weights)
        }

        self.stdout.write('Learned weights (coefficient in parentheses):')
        for index, name in enumerate(COMPONENT_ORDER):
            self.stdout.write(
                f'  {name:<12} {learned[name]:.4f}  (coef {coefficients[index]:+.3f})'
            )

        if options['dry_run']:
            self.stdout.write(self.style.SUCCESS('Dry run: no weights saved.'))
            return

        version = self._save(learned, n)
        self.stdout.write(self.style.SUCCESS(
            f'Saved new active weight set (version {version}, {n} samples).'
        ))

    @transaction.atomic
    def _save(self, learned, n_samples):
        previous = RecommendationWeights.objects.order_by('-version').first()
        next_version = (previous.version + 1) if previous else 1
        RecommendationWeights.objects.filter(is_active=True).update(is_active=False)
        RecommendationWeights.objects.create(
            skill=learned['skill'],
            workload=learned['workload'],
            performance=learned['performance'],
            fairness=learned['fairness'],
            urgency=learned['urgency'],
            version=next_version,
            source='learned',
            n_samples=n_samples,
            is_active=True,
            trained_at=timezone.now(),
        )
        return next_version
