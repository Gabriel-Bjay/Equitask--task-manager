from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

from .demo import is_demo_account
from .models import UserSkill

User = get_user_model()


def sync_skill_entries(user):
    """Mirror the profile's skill list into the UserSkill rows the engine scores.

    Kept skills keep their proficiency, new ones start at the model default,
    and removed ones are deleted so the engine stops matching on them.
    """
    wanted = {}
    for skill in user.get_skill_list():
        name = str(skill).strip()
        if name:
            wanted.setdefault(name.lower(), name)

    for entry in user.skill_entries.all():
        key = entry.skill.strip().lower()
        if key in wanted:
            wanted.pop(key)
        else:
            entry.delete()

    UserSkill.objects.bulk_create(
        [UserSkill(user=user, skill=name) for name in wanted.values()]
    )


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'role', 'department', 'skills', 'phone', 'profile_image',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'role', 'is_active', 'created_at', 'updated_at']

    def update(self, instance, validated_data):
        user = super().update(instance, validated_data)
        if 'skills' in validated_data:
            sync_skill_entries(user)
        return user


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        # No 'role': self-registration always creates a team member. Roles are
        # granted by an administrator (Django admin), never by the requester.
        fields = [
            'email', 'username', 'password', 'password2',
            'first_name', 'last_name', 'department', 'skills'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError(
                {"password": "Passwords don't match"}
            )
        return attrs

    def validate_email(self, value):
        # The demo's addresses are reserved for its shared sample accounts.
        if is_demo_account(User(email=value)):
            raise serializers.ValidationError('Use your own email address.')
        return value

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )