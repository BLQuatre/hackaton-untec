"""
Utility functions for geographic operations and API interactions.
"""
import requests
import math
from typing import Optional, Tuple


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
	"""
	Calculate the great circle distance between two points on Earth.

	Args:
		lat1, lon1: Latitude and longitude of first point in degrees
		lat2, lon2: Latitude and longitude of second point in degrees

	Returns:
		float: Distance in meters
	"""
	EARTH_RADIUS_METERS = 6371000

	# Convert to radians
	phi1 = math.radians(lat1)
	phi2 = math.radians(lat2)
	delta_phi = math.radians(lat2 - lat1)
	delta_lambda = math.radians(lon2 - lon1)

	# Haversine formula
	a = (math.sin(delta_phi / 2) ** 2 +
		 math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2)
	c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

	return EARTH_RADIUS_METERS * c

def geocode_address(address: str) -> Optional[Tuple[float, float]]:
	"""
	Get coordinates (latitude, longitude) for an address using French government API.

	Args:
		address: Address to geocode

	Returns:
		Tuple of (latitude, longitude) or None if not found
	"""
	url = "https://api-adresse.data.gouv.fr/search/"
	params = {"q": address, "limit": 1}

	try:
		response = requests.get(url, params=params, timeout=10)
		response.raise_for_status()
		data = response.json()

		if data.get("features"):
			coordinates = data["features"][0]["geometry"]["coordinates"]  # [lon, lat]
			return coordinates[1], coordinates[0]  # Return as (lat, lon)
		return None

	except requests.RequestException as e:
		print(f"Error geocoding address: {e}")
		return None

def get_city_from_coordinates(lat: float, lon: float) -> str:
	"""
	Get city name from coordinates using reverse geocoding.

	Args:
		lat: Latitude
		lon: Longitude

	Returns:
		str: City name or "Unknown city" if not found
	"""
	url = "https://api-adresse.data.gouv.fr/reverse/"
	params = {"lat": lat, "lon": lon}

	try:
		response = requests.get(url, params=params, timeout=10)
		response.raise_for_status()
		data = response.json()

		if data.get("features"):
			properties = data["features"][0]["properties"]
			# Try different property keys for city name
			for key in ["city", "town", "village", "municipality"]:
				if key in properties:
					return properties[key]
		return "Unknown city"

	except requests.RequestException as e:
		print(f"Error reverse geocoding: {e}")
		return "Unknown city"

def get_openstreetmap_area_id(city: str) -> Optional[int]:
	"""
	Get OpenStreetMap area ID for a city using Nominatim API.

	Args:
		city: City name to search for

	Returns:
		int: OpenStreetMap area ID or None if not found
	"""
	url = "https://nominatim.openstreetmap.org/search"
	params = {
		"q": city,
		"format": "json",
		"polygon_geojson": 0
	}
	headers = {"User-Agent": "City Analysis Script"}

	try:
		response = requests.get(url, params=params, headers=headers, timeout=10)
		response.raise_for_status()
		data = response.json()

		for place in data:
			if place.get("osm_type") == "relation":
				return 3600000000 + int(place["osm_id"])
		return None

	except requests.RequestException as e:
		print(f"Error getting area ID: {e}")
		return None

def reverse_geocode(lat: float, lon: float) -> Optional[dict]:
	"""
	Perform reverse geocoding to get address information from coordinates.

	Args:
		lat: Latitude
		lon: Longitude

	Returns:
		dict: Address information or None if error
	"""
	url = "https://api-adresse.data.gouv.fr/reverse/"
	params = {"lat": lat, "lon": lon}

	try:
		response = requests.get(url, params=params, timeout=10)
		response.raise_for_status()
		return response.json()

	except requests.RequestException as e:
		print(f"Error in reverse geocoding: {e}")
		return None


# Backward compatibility aliases
def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
	"""Alias for haversine_distance for backward compatibility."""
	return haversine_distance(lat1, lon1, lat2, lon2)


def geocode_adresse(adresse: str) -> Optional[Tuple[float, float]]:
	"""Alias for geocode_address for backward compatibility."""
	return geocode_address(adresse)


def get_city_from_coords(lat: float, lon: float) -> str:
	"""Alias for get_city_from_coordinates for backward compatibility."""
	return get_city_from_coordinates(lat, lon)


def get_area_id(ville: str) -> Optional[int]:
	"""Alias for get_openstreetmap_area_id for backward compatibility."""
	return get_openstreetmap_area_id(ville)
	if data["features"]:
		return data["features"][0]["properties"]["label"]
	return "Adresse inconnue"
