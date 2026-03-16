from rest_framework.routers import DefaultRouter
from .views import AnalyticsDashboardViewSet, UserStatsViewSet

router = DefaultRouter()
router.register(r'dashboard', AnalyticsDashboardViewSet, basename='analytics-dashboard')
router.register(r'user', UserStatsViewSet, basename='analytics-user-stats')

urlpatterns = router.urls