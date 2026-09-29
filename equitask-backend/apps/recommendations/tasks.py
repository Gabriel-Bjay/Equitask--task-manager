import io

from celery import shared_task
from django.core.management import call_command


@shared_task
def retrain_recommendation_weights():
    output = io.StringIO()
    call_command('retrain_weights', stdout=output, stderr=output)
    return output.getvalue().strip()
