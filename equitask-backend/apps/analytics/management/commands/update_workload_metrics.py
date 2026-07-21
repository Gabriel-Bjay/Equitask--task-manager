from django.core.management.base import BaseCommand

from apps.analytics.tasks import rebuild_workload_metrics


class Command(BaseCommand):
    help = 'Recompute daily workload metrics for all active users (no broker needed).'

    def handle(self, *args, **options):
        count = rebuild_workload_metrics()
        self.stdout.write(self.style.SUCCESS(
            f'Updated workload metrics for {count} users.'
        ))
