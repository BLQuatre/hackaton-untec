import requests
import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def geocode_adresse(adresse):
    url = "https://api-adresse.data.gouv.fr/search/"
    params = {"q": adresse, "limit": 1}
    resp = requests.get(url, params=params)
    data = resp.json()
    if data["features"]:
        coords = data["features"][0]["geometry"]["coordinates"]  # [lon, lat]
        return coords[1], coords[0]
    return None, None

def get_city_from_coords(lat, lon):
    url = "https://api-adresse.data.gouv.fr/reverse/"
    params = {"lat": lat, "lon": lon}
    resp = requests.get(url, params=params)
    data = resp.json()
    if data["features"]:
        props = data["features"][0]["properties"]
        for key in ["city", "town", "village", "municipality"]:
            if key in props:
                return props[key]
    return "Ville inconnue"

def get_area_id(ville):
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": ville, "format": "json", "polygon_geojson": 0}
    r = requests.get(url, params=params, headers={"User-Agent": "OSM script"})
    data = r.json()
    for place in data:
        if place.get("osm_type") == "relation":
            return 3600000000 + int(place["osm_id"])
    return None

def reverse_geocode(lat, lon):
    url = "https://api-adresse.data.gouv.fr/reverse"
    params = {"lat": lat, "lon": lon}
    resp = requests.get(url, params=params)
    data = resp.json()
    if data["features"]:
        return data["features"][0]["properties"]["label"]
    return "Adresse inconnue"
