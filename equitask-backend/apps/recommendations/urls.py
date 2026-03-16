from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskRecommendationViewSet

router = DefaultRouter()
router.register(r'', TaskRecommendationViewSet, basename='recommendation')

urlpatterns = [
    path('', include(router.urls)),
]