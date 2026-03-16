from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, TaskAssignmentViewSet

# Create router
router = DefaultRouter()
router.register(r'', TaskViewSet, basename='task')
router.register(r'assignments', TaskAssignmentViewSet, basename='taskassignment')

# Include router URLs
urlpatterns = [
    path('', include(router.urls)),
]