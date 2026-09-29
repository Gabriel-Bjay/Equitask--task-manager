from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, TaskAssignmentViewSet

# Create router
router = DefaultRouter()
# Order matters: registered first, TaskViewSet's detail route (<pk>/) would
# capture "assignments/" and make the assignment list unreachable.
router.register(r'assignments', TaskAssignmentViewSet, basename='taskassignment')
router.register(r'', TaskViewSet, basename='task')

# Include router URLs
urlpatterns = [
    path('', include(router.urls)),
]