from django.urls import path
from . import views

urlpatterns = [
	path('health/', views.health_check, name='health_check'),
	path('search/', views.search_location, name='search_location')
]
