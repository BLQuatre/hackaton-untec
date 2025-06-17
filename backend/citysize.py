"""
Module for classifying French cities and retrieving commune information.
"""
import pandas as pd
from typing import Optional, Dict, Any


class CityCategory:
    """Constants for city categories."""
    VILLAGE = "village"
    SMALL_TOWN = "petite ville"
    MEDIUM_TOWN = "ville moyenne"
    LARGE_CITY = "grande ville"
    VERY_LARGE_CITY = "tres grande ville"


def categorize_city(population: int, density: float) -> str:
    """
    Categorize a city based on its population and density.

    Args:
        population: Number of inhabitants
        density: Population density per km²

    Returns:
        str: Category of the city
    """
    if population < 2000 and density < 150:
        return CityCategory.VILLAGE
    elif population < 20000 and density < 500:
        return CityCategory.SMALL_TOWN
    elif population < 100000 and density < 2000:
        return CityCategory.MEDIUM_TOWN
    elif population < 500000:
        return CityCategory.LARGE_CITY
    else:
        return CityCategory.VERY_LARGE_CITY

def _normalize_text(text: str) -> str:
    """
    Normalize text for comparison by removing accents and converting to lowercase.

    Args:
        text: Text to normalize

    Returns:
        str: Normalized text
    """
    if pd.isna(text):
        return ""

    return (
        str(text)
        .strip()
        .lower()
        .replace('-', ' ')
        .replace('é', 'e')
        .replace('è', 'e')
        .replace('ê', 'e')
        .replace('à', 'a')
    )


def _safe_convert_to_type(value: Any, target_type: type, default: Any = None) -> Any:
    """
    Safely convert a value to the target type.

    Args:
        value: Value to convert
        target_type: Target type for conversion
        default: Default value if conversion fails

    Returns:
        Converted value or default
    """
    if pd.isna(value):
        return default

    try:
        if target_type == str and target_type != type(value):
            return str(target_type(value)) if target_type != str else str(value)
        return target_type(value)
    except (ValueError, TypeError):
        return default


def get_commune_info(city_name: str, csv_path: str = "communes-france-2025.csv") -> Optional[Dict[str, Any]]:
    """
    Retrieve information about a French commune from CSV data.

    Args:
        city_name: Name of the city to search for
        csv_path: Path to the CSV file containing commune data

    Returns:
        Dict containing commune information or None if not found
    """
    try:
        df = pd.read_csv(csv_path, sep=None, engine='python')
    except FileNotFoundError:
        print(f"Error: CSV file '{csv_path}' not found")
        return None
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        return None

    # Normalize city name for search
    normalized_city_name = _normalize_text(city_name)
    df['NOM_COMMUNE_NORM'] = df['nom_sans_accent'].apply(_normalize_text)

    # Try exact match first
    matching_rows = df[df['NOM_COMMUNE_NORM'] == normalized_city_name]

    # If no exact match, try partial match
    if matching_rows.empty:
        matching_rows = df[df['NOM_COMMUNE_NORM'].str.contains(normalized_city_name, na=False)]

    if matching_rows.empty:
        return None

    # Take the first match
    row = matching_rows.iloc[0]

    # Build the result dictionary with safe type conversions
    commune_info = {
        "nom_ville": str(city_name),
        "type_commune": _safe_convert_to_type(row["typecom_texte"], str, ""),
        "code_postal": _safe_convert_to_type(row["code_postal"], int, ""),
        "code_insee": _safe_convert_to_type(row["code_insee"], str, ""),
        "population": _safe_convert_to_type(row["population"], int),
        "superficie_km2": _safe_convert_to_type(row["superficie_km2"], float),
        "densite": _safe_convert_to_type(row["densite"], float),
        "departement": _safe_convert_to_type(row["dep_nom"], str, ""),
        "region": _safe_convert_to_type(row["reg_nom"], str, ""),
        "latitude": _safe_convert_to_type(row["latitude_centre"], float),
        "longitude": _safe_convert_to_type(row["longitude_centre"], float),
    }

    # Convert postal code to string if it's an integer
    if isinstance(commune_info["code_postal"], int):
        commune_info["code_postal"] = str(commune_info["code_postal"])

    return commune_info

if __name__ == "__main__":
    # Example usage
    stats = get_commune_info("Bois Guillaume")
    if stats:
        stats["type_ville"] = categorize_city(stats['population'], stats['densite'])
        for key, value in stats.items():
            print(f"{key}: {value}")
    else:
        print("City not found")
