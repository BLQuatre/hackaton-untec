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
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'lib'))

from lib.citysize import get_commune_info, categorie_ville
from lib.worker import get_unemployed, get_job_offer_in_dep
from lib.utils import geocode_adresse, get_city_from_coords
from lib.OpenStreetMapGetter import Costia_getData_with_coordinates
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
		print(f"File not found: {e}")
		return Response(
			{'error': 'Data file not found', 'details': str(e)},
			status=status.HTTP_500_INTERNAL_SERVER_ERROR
		)
	except Exception as e:
		print(f"An error occurred: {e}")
		return Response(
			{'error': 'An error occurred while processing your search', 'details': str(e)},
			status=status.HTTP_500_INTERNAL_SERVER_ERROR
		)
	return Response({'error': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)
