from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .models import Example
from .serializers import ExampleSerializer
import time
import random

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
    Search for location data with a simulated processing delay
    """
    try:
        # Get search parameters from request
        coordinates = request.data.get('coordinates', None)
        address = request.data.get('address', None)

        # Simulate processing time (2-5 seconds)
        processing_time = random.uniform(2, 5)
        time.sleep(processing_time)

        # Mock location data based on search parameters
        if coordinates:
            lat = coordinates.get('lat', 0)
            lon = coordinates.get('lon', 0)
            location_name = f"Location at {lat:.4f}, {lon:.4f}"
        elif address:
            location_name = address
        else:
            location_name = coordinates

        # Generate mock response data
        mock_data = {
            'name': location_name,
            'region': random.choice(['Île-de-France', 'Provence-Alpes-Côte d\'Azur', 'Nouvelle-Aquitaine', 'Occitanie', 'Auvergne-Rhône-Alpes']),
            'coordinates': coordinates or {'lat': random.uniform(43, 51), 'lon': random.uniform(-5, 8)},
            'utility_data': {
                'population': f"{random.randint(1000, 2000000):,}",
                'elevation': f"{random.randint(0, 1000)} m",
                'timezone': "Europe/Paris"
            },
            'address': address or location_name,
            'processing_time': f"{processing_time:.2f}s",
            'additional_info': {
                'postal_code': f"{random.randint(10000, 99999)}",
                'department': random.choice(['75', '13', '69', '31', '44', '59', '33', '34']),
                'climate': random.choice(['Oceanic', 'Continental', 'Mediterranean', 'Mountain']),
                'economic_activity': random.choice(['Tourism', 'Agriculture', 'Industry', 'Services', 'Technology'])
            }
        }

        return Response(mock_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': 'An error occurred while processing your search', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
