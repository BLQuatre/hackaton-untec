"""
Module for retrieving information from OpenStreetMap using Overpass API.
"""
import citysize
import requests
import worker
import utils
from typing import List, Dict, Optional, Any, Tuple


class CityQueryConfig:
    """Configuration for different city types with their search parameters."""

    CONFIGS = {
        citysize.CityCategory.VERY_LARGE_CITY: [
            ("amenity", ["restaurant", "fast_food"], "Shop", 500),
            ("shop", ["supermarket"], "Food Store", 300),
            ("amenity", ["hospital", "clinic"], "Healthcare", 1000),
            ("amenity", ["police", "fire_station"], "Public Services", 2000),
            ("amenity", ["school"], "School", 500),
        ],
        citysize.CityCategory.LARGE_CITY: [
            ("amenity", ["restaurant", "fast_food"], "Shop", 1000),
            ("shop", ["supermarket"], "Food Store", 500),
            ("amenity", ["hospital", "clinic"], "Healthcare", 2000),
            ("amenity", ["police", "fire_station"], "Public Services", 3000),
            ("amenity", ["school"], "School", 1000),
            ("highway", ["bus_stop"], "Transport", 1000),
            ("station", ["subway"], "Transport", 1000),
            ("railway", ["tram_stop"], "Transport", 1000),
            ("railway", ["station"], "Train Station", 1000),
        ],
        citysize.CityCategory.MEDIUM_TOWN: [
            ("amenity", ["restaurant", "fast_food"], "Shop", 2000),
            ("shop", ["supermarket"], "Food Store", 0),
            ("amenity", ["hospital", "clinic"], "Healthcare", 0),
            ("amenity", ["police", "fire_station"], "Public Services", 5000),
            ("amenity", ["school"], "School", 0),
        ],
        citysize.CityCategory.SMALL_TOWN: [
            ("amenity", ["restaurant", "fast_food"], "Shop", 3000),
            ("shop", ["supermarket"], "Food Store", 2000),
            ("amenity", ["hospital", "clinic"], "Healthcare", 5000),
            ("amenity", ["police", "fire_station"], "Public Services", 5000),
            ("amenity", ["school"], "School", 3000),
        ],
        citysize.CityCategory.VILLAGE: [
            ("amenity", ["restaurant", "fast_food"], "Shop", 5000),
            ("shop", ["supermarket"], "Food Store", 5000),
            ("amenity", ["hospital", "clinic"], "Healthcare", 10000),
            ("amenity", ["police", "fire_station"], "Public Services", 10000),
            ("amenity", ["school"], "School", 5000),
        ]
    }


def get_nearby_amenities(lat: float, lon: float, amenity_type: str,
                        amenity_filters: Optional[List[str]] = None,
                        radius: int = 500) -> List[Dict[str, Any]]:
    """
    Get nearby amenities using Overpass API.

    Args:
        lat: Latitude of the center point
        lon: Longitude of the center point
        amenity_type: Type of amenity to search for (e.g., "amenity", "shop")
        amenity_filters: List of specific amenity values to filter by
        radius: Search radius in meters

    Returns:
        List of dictionaries containing amenity information
    """
    amenities = []
    overpass_url = "https://overpass-api.de/api/interpreter"
    filters = amenity_filters if amenity_filters else [None]

    for amenity_filter in filters:
        # Build the search filter
        if amenity_filter:
            search_filter = f'["{amenity_type}"="{amenity_filter}"]'
        else:
            search_filter = f'["{amenity_type}"]'

        # Build the Overpass query
        query = f"""
        [out:json][timeout:25];
        (
        node{search_filter}(around:{radius},{lat},{lon});
        way{search_filter}(around:{radius},{lat},{lon});
        relation{search_filter}(around:{radius},{lat},{lon});
        );
        out center;
        """

        try:
            response = requests.post(overpass_url, data={"data": query}, timeout=30)
            response.raise_for_status()
            data = response.json()

            for element in data.get("elements", []):
                amenity_info = _extract_amenity_info(element, lat, lon, amenity_type)
                if amenity_info:
                    amenities.append(amenity_info)

        except requests.RequestException as e:
            print(f"Error fetching data from Overpass API: {e}")
            continue

    return amenities


def get_amenities_in_city_area(lat: float, lon: float, city: str, amenity_type: str,
                              amenity_filters: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Get amenities within a city's administrative area.

    Args:
        lat: Latitude of reference point
        lon: Longitude of reference point
        city: City name to get area for
        amenity_type: Type of amenity to search for
        amenity_filters: List of specific amenity values to filter by

    Returns:
        List of dictionaries containing amenity information
    """
    area_id = utils.get_openstreetmap_area_id(city)
    if not area_id:
        print(f"Could not find area ID for city: {city}")
        return []

    amenities = []
    overpass_url = "https://overpass-api.de/api/interpreter"
    filters = amenity_filters if amenity_filters else [None]

    for amenity_filter in filters:
        # Build the search filter
        if amenity_filter:
            search_filter = f'["{amenity_type}"="{amenity_filter}"]'
        else:
            search_filter = f'["{amenity_type}"]'

        # Build the Overpass query for city area
        query = f"""
        [out:json][timeout:25];
        area({area_id})->.searchArea;
        (
        node{search_filter}(area.searchArea);
        way{search_filter}(area.searchArea);
        relation{search_filter}(area.searchArea);
        );
        out center;
        """

        try:
            response = requests.post(overpass_url, data={"data": query}, timeout=30)
            response.raise_for_status()
            data = response.json()

            for element in data.get("elements", []):
                amenity_info = _extract_amenity_info(element, lat, lon, amenity_type)
                if amenity_info:
                    amenities.append(amenity_info)

        except requests.RequestException as e:
            print(f"Error fetching data from Overpass API: {e}")
            continue

    return amenities


def _extract_amenity_info(element: Dict[str, Any], ref_lat: float, ref_lon: float,
                         amenity_type: str) -> Optional[Dict[str, Any]]:
    """
    Extract amenity information from an Overpass API element.

    Args:
        element: Element from Overpass API response
        ref_lat: Reference latitude for distance calculation
        ref_lon: Reference longitude for distance calculation
        amenity_type: Type of amenity

    Returns:
        Dictionary with amenity information or None if invalid
    """
    name = element.get("tags", {}).get("name", "Unknown")
    type_value = element.get("tags", {}).get(amenity_type, "Other")

    # Get coordinates
    if "lat" in element and "lon" in element:
        lat, lon = element["lat"], element["lon"]
    elif "center" in element:
        lat, lon = element["center"]["lat"], element["center"]["lon"]
    else:
        return None

    # Calculate distance
    distance = utils.haversine_distance(ref_lat, ref_lon, lat, lon)

    return {
        "name": name,
        "type": type_value,
        "lat": lat,
        "lon": lon,
        "distance": distance
    }


def analyze_city_amenities(address: str) -> Dict[str, Any]:
    """
    Analyze amenities for a given address based on city type.

    Args:
        address: Address to analyze

    Returns:
        Dictionary containing city statistics and amenity analysis
    """
    # Get coordinates and city information
    coordinates = utils.geocode_address(address)
    if not coordinates:
        print(f"Could not geocode address: {address}")
        return {}

    lat, lon = coordinates
    city = utils.get_city_from_coordinates(lat, lon)

    # Get city statistics
    city_stats = citysize.get_commune_info(city)
    if not city_stats:
        print(f"Could not find city information for: {city}")
        return {}

    city_stats["type_ville"] = citysize.categorize_city(
        city_stats['population'],
        city_stats['densite']
    )

    # Get query configuration based on city type
    city_type = city_stats["type_ville"]
    if city_type not in CityQueryConfig.CONFIGS:
        print(f"No configuration found for city type: {city_type}")
        return city_stats

    queries = CityQueryConfig.CONFIGS[city_type]

    # Analyze transport amenities separately
    transport_stats = _analyze_transport_amenities(lat, lon, city, queries)
    city_stats.update(transport_stats)

    # Analyze other amenities
    for amenity_type, amenity_filters, category_name, radius in queries:
        if category_name == "Transport":
            continue  # Already handled above

        _analyze_amenity_category(
            lat, lon, city, amenity_type, amenity_filters,
            category_name, radius, city_stats
        )

    # Add unemployment and job data for larger cities
    if city_stats.get("population", 0) >= 5000:
        _add_employment_data(city, city_stats)

    return city_stats


def _analyze_transport_amenities(lat: float, lon: float, city: str,
                               queries: List[Tuple]) -> Dict[str, Any]:
    """Analyze transport amenities and return aggregated statistics."""
    transport_total_count = 0
    transport_total_distance = 0
    transport_radius = 1000

    for amenity_type, amenity_filters, category_name, radius in queries:
        if category_name != "Transport":
            continue

        amenities = get_nearby_amenities(lat, lon, amenity_type, amenity_filters, radius)

        for amenity in amenities:
            transport_total_count += 1
            transport_total_distance += amenity['distance']

    transport_stats = {}
    if transport_total_count > 0:
        transport_average = round(transport_total_distance / transport_total_count, 1)
        transport_stats.update({
            "Transport_nbr": transport_total_count,
            "Transport_radius": transport_radius,
            "Transport_average_distance": transport_average
        })

    return transport_stats


def _analyze_amenity_category(lat: float, lon: float, city: str, amenity_type: str,
                            amenity_filters: List[str], category_name: str,
                            radius: int, city_stats: Dict[str, Any]) -> None:
    """Analyze a specific category of amenities and update city stats."""
    print(f"Looking for {category_name}...")

    if radius == 0:
        amenities = get_amenities_in_city_area(lat, lon, city, amenity_type, amenity_filters)
        print(f"Searching in city area: {city}")
    else:
        amenities = get_nearby_amenities(lat, lon, amenity_type, amenity_filters, radius)
        print(f"Searching within radius: {radius}m")

    # Calculate statistics
    count = len(amenities)
    total_distance = sum(amenity['distance'] for amenity in amenities)
    average_distance = round(total_distance / count, 1) if count > 0 else 0

    print(f"Found {count} {category_name} facilities, average distance: {average_distance}m\n")

    # Update city stats
    city_stats[f"{category_name}_nbr"] = count
    city_stats[f"{category_name}_radius"] = radius
    city_stats[f"{category_name}_average_distance"] = average_distance


def _add_employment_data(city: str, city_stats: Dict[str, Any]) -> None:
    """Add unemployment and job offer data to city statistics."""
    try:
        unemployment_data = worker.get_unemployed_data(city)
        if unemployment_data:
            unemployed_count = unemployment_data["nbr_unemployed"]
            city_stats["Unemployed_people"] = unemployed_count

            population = city_stats.get("population", 0)
            if population > 0:
                unemployment_rate = round((unemployed_count * 100) / population, 1)
                city_stats["Proportion of unemployed"] = f"{unemployment_rate}%"

        job_data = worker.get_job_offers_in_department(city_stats.get("departement", ""))
        if job_data:
            city_stats["Job_Offer_in_Departement"] = job_data["job_offer"]

    except Exception as e:
        print(f"Error getting employment data: {e}")


def print_city_analysis(city_stats: Dict[str, Any]) -> None:
    """Print city analysis results in a formatted way."""
    for key, value in city_stats.items():
        print(f"{key}: {value}")
        if key == "type_ville":
            print()


# Backward compatibility aliases
def get_infos_nearby(lat: float, lon: float, info_type: str,
                    info_filters: Optional[List[str]] = None,
                    radius: int = 500) -> List[Dict[str, Any]]:
    """Alias for get_nearby_amenities for backward compatibility."""
    return get_nearby_amenities(lat, lon, info_type, info_filters, radius)


def get_infos_in_city_area(lat: float, lon: float, city: str, info_type: str,
                          info_filters: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """Alias for get_amenities_in_city_area for backward compatibility."""
    return get_amenities_in_city_area(lat, lon, city, info_type, info_filters)


# Also update imports to use the new function names
def categorie_ville(population: int, densite: float) -> str:
    """Alias for citysize.categorize_city for backward compatibility."""
    return citysize.categorize_city(population, densite)


def get_unemployed(nom_ville: str, csv_path: str = "Unemployed.csv") -> Optional[Dict[str, any]]:
    """Alias for worker.get_unemployed_data for backward compatibility."""
    return worker.get_unemployed_data(nom_ville, csv_path)


def get_job_offer_in_dep(nom_departement: str, csv_path: str = "JobOffer.csv") -> Optional[Dict[str, any]]:
    """Alias for worker.get_job_offers_in_department for backward compatibility."""
    return worker.get_job_offers_in_department(nom_departement, csv_path)


if __name__ == "__main__":
    address = "20 Quai Frissard, 76600 Le Havre"

    print(f"Analyzing address: {address}")
    city_stats = analyze_city_amenities(address)

    if city_stats:
        print("\n" + "="*50)
        print("CITY ANALYSIS RESULTS")
        print("="*50)
        print_city_analysis(city_stats)
    else:
        print("Could not analyze the address.")
