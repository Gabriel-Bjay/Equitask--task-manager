from django.core.management.base import BaseCommand

from apps.notifications.tasks import run_overdue_check


class Command(BaseCommand):
    help = 'Mark past-deadline tasks overdue and notify assignees (no broker needed).'

    def handle(self, *args, **options):
        marked, notified = run_overdue_check()
        self.stdout.write(self.style.SUCCESS(
            f'Marked {marked} tasks overdue, sent {notified} notifications.'
        ))
