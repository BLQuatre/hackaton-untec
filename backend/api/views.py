from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import time
import random
import os
from django.conf import settings

# Import our data processing modules
from citysize import get_commune_info, categorize_city
from worker import get_unemployed_data, get_job_offers_in_department
from utils import geocode_address, get_city_from_coordinates
from OpenStreetMapGetter import Costia_getData_with_coordinates
from .serializers import CitySearchResultSerializer

# Create your views here.

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
	"""
	A simple health check endpoint to verify the API is working
	"""
	return JsonResponse({
		'status': 'ok',
		'message': 'API is running'
	})

@api_view(['POST'])
@permission_classes([AllowAny])
def search_location(request):
	"""
	Search for location data using real data from CSV files
	"""
	try:
		# Get search parameters from request
		coordinates = request.data.get('coordinates', None)

		if coordinates:
			lat = coordinates.get('lat', 0)
			lon = coordinates.get('lon', 0)

			res = Costia_getData_with_coordinates(lat, lon)

			return Response(res, status=status.HTTP_200_OK)

	except FileNotFoundError as e:
		return Response(
			{'error': 'Data file not found', 'details': str(e)},
			status=status.HTTP_500_INTERNAL_SERVER_ERROR
		)
	except Exception as e:
		return Response(
			{'error': 'An error occurred while processing your search', 'details': str(e)},
			status=status.HTTP_500_INTERNAL_SERVER_ERROR
		)
	return Response({'error': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)
