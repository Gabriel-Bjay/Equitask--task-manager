from django.core.management.base import BaseCommand

from apps.notifications.tasks import run_deadline_reminders


class Command(BaseCommand):
    help = 'Send deadline reminders for tasks due within N hours (no broker needed).'

    def add_arguments(self, parser):
        parser.add_argument('--hours-before', type=int, default=48)

    def handle(self, *args, **options):
        sent = run_deadline_reminders(options['hours_before'])
        self.stdout.write(self.style.SUCCESS(f'Sent {sent} deadline reminders.'))
