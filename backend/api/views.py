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
		address = request.data.get('address', None)
		city_name = request.data.get('city', None)

		print("city_name:", city_name)

		# Determine the city name to search for
		search_coordinates = None

		if coordinates:
			lat = coordinates.get('lat', 0)
			lon = coordinates.get('lon', 0)
			search_coordinates = {'lat': lat, 'lon': lon}

			print("Coordinates provided:", search_coordinates)


			# Try to get city name from coordinates
			if not city_name:
				city_name = get_city_from_coordinates(lat, lon)

		if not city_name:
			return Response(
				{'error': 'No valid city name, address, or coordinates provided'},
				status=status.HTTP_400_BAD_REQUEST
			)

		# Get commune information
		commune_info = get_commune_info(city_name, "communes-france-2025.csv")

		if not commune_info:
			return Response(
				{'error': f'City "{city_name}" not found in database'},
				status=status.HTTP_404_NOT_FOUND
			)

		# Add city category based on population and density
		if commune_info.get('population') and commune_info.get('densite'):
			commune_info['type_ville'] = categorize_city(
				commune_info['population'],
				commune_info['densite']
			)

		# Get unemployment data
		unemployment_data = get_unemployed_data(city_name, "Unemployed.csv")

		# Get job offers data for the department
		job_offer_data = None
		if commune_info.get('departement'):
			job_offer_data = get_job_offers_in_department(
				commune_info['departement'],
				"JobOffer.csv"
			)

		# Combine all data
		result_data = {
			**commune_info,
			'nbr_unemployed': unemployment_data.get('nbr_unemployed') if unemployment_data else None,
			'unemployment_commune': unemployment_data.get('commune') if unemployment_data else "",
			'job_offers': job_offer_data.get('job_offer') if job_offer_data else None,
			'job_offer_department': job_offer_data.get('departement') if job_offer_data else None,
		}

		# Use coordinates from search if commune info doesn't have them
		if not result_data.get('latitude') or not result_data.get('longitude'):
			if search_coordinates:
				result_data['latitude'] = search_coordinates['lat']
				result_data['longitude'] = search_coordinates['lon']

		# Serialize the data
		serializer = CitySearchResultSerializer(data=result_data)
		if serializer.is_valid():
			return Response(serializer.data, status=status.HTTP_200_OK)
		else:
			return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
