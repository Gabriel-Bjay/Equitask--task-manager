from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import EmailValidator

class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser
    Adds role, department, skills, and other fields for EquiTask
    """

    ROLE_CHOICES = [
        ('administrator', 'Administrator'),
        ('manager', 'Manager'),
        ('team_member', 'Team Member'),
    ]
   
    # Override email to make it unique and required
    email = models.EmailField(
        unique=True,
        validators=[EmailValidator()],
        help_text="User's email address (used for login)"
    )
    
    # EquiTask specific fields
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='team_member',
        help_text="User's role in the system"
    )
    
    department = models.CharField(
        max_length=100,
        blank=True,
        help_text="Department or team name"
    )
    
    skills = models.JSONField(
        default=list,
        blank=True,
        help_text="Array of skill tags (e.g., ['Python', 'Django', 'React'])"
    )
    
    phone = models.CharField(
        max_length=20,
        blank=True,
        help_text="Contact phone number"
    )
    
    profile_image = models.ImageField(
        upload_to='profiles/',
        blank=True,
        null=True,
        help_text="User profile picture"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Designates whether this user should be treated as active"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use email as the username field for authentication
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
            models.Index(fields=['department']),
        ]
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    @property
    def is_administrator(self):
        """Check if user is an administrator"""
        return self.role == 'administrator'
    
    @property
    def is_manager(self):
        """Check if user is a manager or administrator"""
        return self.role in ['administrator', 'manager']
    
    @property
    def is_team_member(self):
        """Check if user is a team member"""
        return self.role == 'team_member'
    
    def get_skill_list(self):
        """Return skills as a list"""
        if isinstance(self.skills, list):
            return self.skills
        return []
    
    def add_skill(self, skill):
        """Add a skill to the user's skill set"""
        skills = self.get_skill_list()
        if skill not in skills:
            skills.append(skill)
            self.skills = skills
            self.save(update_fields=['skills'])
    
    def remove_skill(self, skill):
        """Remove a skill from the user's skill set"""
        skills = self.get_skill_list()
        if skill in skills:
            skills.remove(skill)
            self.skills = skills
            self.save(update_fields=['skills'])