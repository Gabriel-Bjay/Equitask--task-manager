import os

from celery import Celery
from celery.schedules import crontab

# The project package is 'equitask_backend', not 'equitask'. The previous value
# pointed at a settings module that does not exist, which crashed every
# standalone Celery process (worker and beat) on startup.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'equitask_backend.settings')

app = Celery('equitask_backend')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Celery Beat Schedule (periodic tasks)
app.conf.beat_schedule = {
    'send-deadline-reminders-48h': {
        'task': 'apps.notifications.tasks.send_deadline_reminders',
        'schedule': crontab(hour='9', minute='0'),  # Daily at 9 AM
        'kwargs': {'hours_before': 48},
    },
    'send-deadline-reminders-24h': {
        'task': 'apps.notifications.tasks.send_deadline_reminders',
        'schedule': crontab(hour='9', minute='0'),
        'kwargs': {'hours_before': 24},
    },
    'check-overdue-tasks': {
        'task': 'apps.notifications.tasks.check_overdue_tasks',
        'schedule': crontab(hour='*/6', minute='0'),  # Every 6 hours
    },
    'update-workload-metrics': {
        'task': 'apps.analytics.tasks.update_workload_metrics',
        'schedule': crontab(hour='1', minute='0'),  # Daily at 1 AM
    },
}
