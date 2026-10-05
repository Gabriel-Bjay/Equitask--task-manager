from decouple import config
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = (
        'Create or update the administrator from ADMIN_EMAIL and ADMIN_PASSWORD, '
        'for hosts without a shell. Does nothing when either is unset.'
    )

    def handle(self, *args, **options):
        email = config('ADMIN_EMAIL', default='').strip()
        password = config('ADMIN_PASSWORD', default='')

        if not email or not password:
            self.stdout.write('ADMIN_EMAIL or ADMIN_PASSWORD is not set; no administrator created.')
            return

        user = User.objects.filter(email__iexact=email).first()
        created = user is None
        if created:
            user = User(email=email, username=email, first_name='EquiTask', last_name='Administrator')

        # The environment is the source of truth: re-running restores the role
        # and the password, which doubles as account recovery.
        user.role = 'administrator'
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()

        self.stdout.write(self.style.SUCCESS(
            f"{'Created' if created else 'Updated'} administrator {email}."
        ))
