"""The public demo: shared sample accounts that visitors can sign in as."""
from django.conf import settings

DEMO_EMAIL_DOMAIN = 'demo.equitask'

# One-click sign-in roles. Administrator is never offered.
DEMO_LOGINS = {
    'manager': f'manager@{DEMO_EMAIL_DOMAIN}',
    'team_member': f'member@{DEMO_EMAIL_DOMAIN}',
}

DEMO_LOCKED_MESSAGE = (
    "Demo accounts can't be changed, so every visitor finds them the same way."
)


def demo_enabled():
    return bool(settings.DEMO_PASSWORD)


def is_demo_account(user):
    email = (getattr(user, 'email', '') or '').lower()
    return email.endswith('@' + DEMO_EMAIL_DOMAIN)
