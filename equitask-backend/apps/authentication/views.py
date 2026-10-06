from rest_framework import status, generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from django.contrib.auth import authenticate, get_user_model
from .demo import DEMO_LOCKED_MESSAGE, DEMO_LOGINS, demo_enabled, is_demo_account
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer

User = get_user_model()


def demo_users():
    """Active demo logins keyed by role; empty unless the demo is on."""
    if not demo_enabled():
        return {}
    users = {
        user.email: user
        for user in User.objects.filter(email__in=DEMO_LOGINS.values(), is_active=True)
    }
    return {
        role: users[email]
        for role, email in DEMO_LOGINS.items()
        if email in users and users[email].role == role
    }


class RegisterView(generics.CreateAPIView):
    """User registration endpoint"""

    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """User login endpoint"""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        # Authenticate user
        user = authenticate(request, username=email, password=password)

        if user is None:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'Account is disabled'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Generate tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })


class DemoAccountsView(APIView):
    """Demo logins a visitor can use; empty unless DEMO_PASSWORD turns the demo on."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # A stale token in the browser must not turn this into a 401.

    def get(self, request):
        return Response({
            'accounts': [
                {'role': role, 'name': user.get_full_name()}
                for role, user in demo_users().items()
            ],
        })


class DemoLoginView(APIView):
    """Sign in as the demo manager or team member, without the password."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'demo_login'

    def post(self, request):
        role = request.data.get('role')
        if role not in DEMO_LOGINS:
            return Response(
                {'error': 'Choose the manager or team member demo account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = demo_users().get(role)
        if user is None:
            return Response(
                {'error': 'The demo accounts are not available.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })


class LogoutView(APIView):
    """User logout endpoint.

    Blacklists the presented refresh token so it can no longer be used to mint
    new access tokens. Requires the token_blacklist app to be installed and
    migrated. Note: the already-issued access token remains valid until it
    expires; that is inherent to stateless JWT.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'error': 'Refresh token is required to log out.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response(
                {'error': 'Token is invalid or already blacklisted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {'message': 'Logout successful'},
            status=status.HTTP_200_OK,
        )


class CurrentUserView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or deactivate the current user"""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    # Demo accounts are shared by every visitor, so they stay as loaded.
    def update(self, request, *args, **kwargs):
        if is_demo_account(request.user):
            raise PermissionDenied(DEMO_LOCKED_MESSAGE)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if is_demo_account(request.user):
            raise PermissionDenied(DEMO_LOCKED_MESSAGE)
        return super().destroy(request, *args, **kwargs)

    def perform_destroy(self, instance):
        # Deactivate instead of deleting: assignments, performance logs and the
        # fairness history all reference the user. Every session is revoked.
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        for token in OutstandingToken.objects.filter(user=instance):
            BlacklistedToken.objects.get_or_create(token=token)


class ChangePasswordView(APIView):
    """Change password for authenticated user"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if is_demo_account(request.user):
            raise PermissionDenied(DEMO_LOCKED_MESSAGE)

        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not current_password or not new_password:
            return Response(
                {'message': 'Both current and new password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check current password is correct
        if not request.user.check_password(current_password):
            return Response(
                {'current_password': ['Current password is incorrect']},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 8:
            return Response(
                {'message': 'New password must be at least 8 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )

        request.user.set_password(new_password)
        request.user.save()

        return Response(
            {'message': 'Password updated successfully'},
            status=status.HTTP_200_OK
        )
