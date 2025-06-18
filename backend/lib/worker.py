"""
Module for retrieving unemployment and job offer data from CSV files.
"""
import pandas as pd
import re
import unicodedata
from typing import Optional, Dict


def normalize_text(text: str) -> str:
    """
    Normalize text by converting to lowercase and removing accents.

    Args:
        text: Text to normalize

    Returns:
        str: Normalized text
    """
    if not isinstance(text, str):
        text = str(text)

    text = text.lower()
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    return text


def extract_city_name_from_commune(commune: str) -> str:
    """
    Extract city name from commune string that may contain postal code.

    Args:
        commune: Commune string (e.g., "Paris 75001")

    Returns:
        str: City name without postal code
    """
    match = re.match(r"(.+?)\s+\d{5}$", commune)
    return match.group(1).strip() if match else commune

def get_unemployed_data(city_name: str, csv_path: str = "Unemployed.csv") -> Optional[Dict[str, any]]:
    """
    Get unemployment data for a specific city.

    Args:
        city_name: Name of the city to search for
        csv_path: Path to the unemployment CSV file

    Returns:
        Dict containing commune name and number of unemployed people, or None if not found
    """
    try:
        normalized_city_name = normalize_text(city_name)
        df = pd.read_csv(csv_path, sep=";", encoding="utf-8")

        # Validate required columns
        required_columns = ['Commune', 'nbr']
        if not all(col in df.columns for col in required_columns):
            print(f"Error: Required columns {required_columns} not found in CSV file")
            return None

        # Clean and normalize data
        df['Commune'] = df['Commune'].str.strip()
        df['nbr'] = df['nbr'].astype(str).str.replace(" ", "")
        df['Commune_norm'] = df['Commune'].apply(normalize_text)

        # Extract short city names (without postal codes)
        df['Commune_short'] = df['Commune'].apply(extract_city_name_from_commune)
        df['Commune_short_norm'] = df['Commune_short'].apply(normalize_text)

        # Try exact match first
        match = df[df['Commune_norm'] == normalized_city_name]

        # Try short name match if no exact match
        if match.empty:
            match = df[df['Commune_short_norm'] == normalized_city_name]

        # Try partial match if still no results
        if match.empty:
            match = df[df['Commune_norm'].str.contains(normalized_city_name, na=False)]

        if not match.empty:
            row = match.iloc[0]
            return {
                "commune": str(row["Commune"]),
                "nbr_unemployed": int(row["nbr"])
            }
        else:
            return None

    except Exception as e:
        print(f"Error while searching unemployment data: {e}")
        return None

def get_job_offers_in_department(department_name: str, csv_path: str = "JobOffer.csv") -> Optional[Dict[str, any]]:
    """
    Get job offer data for a specific department.

    Args:
        department_name: Name of the department to search for
        csv_path: Path to the job offers CSV file

    Returns:
        Dict containing department name and number of job offers, or None if not found
    """
    try:
        normalized_department_name = normalize_text(department_name)
        df = pd.read_csv(csv_path, sep=";", encoding="utf-8")

        # Validate required columns
        required_columns = ['Departement', 'nbr']
        if not all(col in df.columns for col in required_columns):
            print(f"Error: Required columns {required_columns} not found in CSV file")
            return None

        # Clean and normalize data
        df['Departement'] = df['Departement'].str.strip()
        df['nbr'] = df['nbr'].astype(str).str.replace(" ", "")
        df['Departement_norm'] = df['Departement'].apply(normalize_text)

        # Extract short department names (without postal codes)
        df['Departement_short'] = df['Departement'].apply(extract_city_name_from_commune)
        df['Departement_short_norm'] = df['Departement_short'].apply(normalize_text)

        # Try exact match first
        match = df[df['Departement_norm'] == normalized_department_name]

        # Try short name match if no exact match
        if match.empty:
            match = df[df['Departement_short_norm'] == normalized_department_name]

        # Try partial match if still no results
        if match.empty:
            match = df[df['Departement_norm'].str.contains(normalized_department_name, na=False)]

        if not match.empty:
            row = match.iloc[0]
            return {
                "departement": str(row["Departement"]),
                "job_offer": int(row["nbr"])
            }
        else:
            return None

    except Exception as e:
        print(f"Error while searching job offer data: {e}")
        return None


if __name__ == "__main__":
    # Example usage
    stats = get_job_offers_in_department("Seine-Maritime")
    if stats:
        for key, value in stats.items():
            print(f"{key}: {value}")
    else:
        print("Department not found")
