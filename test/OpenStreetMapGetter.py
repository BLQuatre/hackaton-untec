import citysize
import requests
import worker
import utils

def get_infos_nearby(lat, lon, info_type, info_filters=None, radius=500):
    infos = []
    overpass_url = "https://overpass-api.de/api/interpreter"
    filters = list(info_filters) if info_filters else [None]
    for info_filter in filters:
        if info_filter:
            search = f'["{info_type}"="{info_filter}"]'
        else:
            search = f'["{info_type}"]'
        query = f"""
        [out:json][timeout:25];
        (
        node{search}(around:{radius},{lat},{lon});
        way{search}(around:{radius},{lat},{lon});
        relation{search}(around:{radius},{lat},{lon});
        );
        out center;
        """
        response = requests.post(overpass_url, data={"data": query})
        data = response.json()
        for element in data.get("elements", []):
            name = element["tags"].get("name", "Inconnu")
            type_value = element["tags"].get(info_type, "Autre")
            if "lat" in element and "lon" in element:
                lat_info, lon_info = element["lat"], element["lon"]
            elif "center" in element:
                lat_info, lon_info = element["center"]["lat"], element["center"]["lon"]
            else:
                continue
            distance = utils.haversine(lat, lon, lat_info, lon_info)
            infos.append({
                "name": name,
                "type": type_value,
                "lat": lat_info,
                "lon": lon_info,
                "distance": distance
            })
    return infos

def get_infos_in_city_area(lat, lon, city, info_type, info_filters=None):
    area_id = utils.get_area_id(city)
    if not area_id :
        return
    infos = []
    overpass_url = "https://overpass-api.de/api/interpreter"
    filters = list(info_filters) if info_filters else [None]
    for info_filter in filters:
        if info_filter:
            search = f'["{info_type}"="{info_filter}"]'
        else:
            search = f'["{info_type}"]'
        query = f"""
        [out:json][timeout:25];
        area({area_id})->.searchArea;
        (
        node{search}(area.searchArea);
        way{search}(area.searchArea);
        relation{search}(area.searchArea);
        );
        out center;
        """
        response = requests.post(overpass_url, data={"data": query})
        data = response.json()
        for element in data.get("elements", []):
            name = element["tags"].get("name", "Inconnu")
            type_value = element["tags"].get(info_type, "Autre")
            if "lat" in element and "lon" in element:
                lat_info, lon_info = element["lat"], element["lon"]
            elif "center" in element:
                lat_info, lon_info = element["center"]["lat"], element["center"]["lon"]
            else:
                continue
            distance = utils.haversine(lat, lon, lat_info, lon_info)
            infos.append({
                "name": name,
                "type": type_value,
                "lat": lat_info,
                "lon": lon_info,
                "distance": distance
            })
    return infos


#MAIN
if __name__ == "__main__":
    adresse = "20 Quai Frissard, 76600 Le Havre"
    lat, lon = utils.geocode_adresse(adresse)
    city = utils.get_city_from_coords(lat, lon)
    stats = citysize.get_commune_info(city)
    stats["type_ville"] = citysize.categorie_ville(stats['population'], stats['densite'])

    if stats["type_ville"] == "tres grande ville" :
        queries = [
            ("amenity", ["restaurant", "fast_food"], "Shop", 500),
            ("shop", ["supermarket"], "Food Store", 300),
            ("amenity", ["hospital", "clinic"], "Healthcare", 1000),
            ("amenity", ["police", "fire_station"], "Public Services", 2000),
            ("amenity", ["school"], "School", 500),
        ]
    elif stats["type_ville"] == "grande ville" :
        queries = [
            ("amenity", ["restaurant", "fast_food"], "Shop", 1000),
            ("shop", ["supermarket"], "Food Store", 500),
            ("amenity", ["hospital", "clinic"], "Healthcare", 2000),
            ("amenity", ["police", "fire_station"], "Public Services", 3000),
            ("amenity", ["school"], "School", 1000),
            ("highway", ["bus_stop"], "Transport", 1000),
            ("station", ["subway"], "Transport", 1000),
            ("railway", ["tram_stop"], "Transport", 1000),
            ("railway", ["station"], "Train Station", 1000),
        ]
    elif stats["type_ville"] == "ville moyenne" :
        queries = [
            ("amenity", ["restaurant", "fast_food"], "Shop", 2000),
            ("shop", ["supermarket"], "Food Store", 0),
            ("amenity", ["hospital", "clinic"], "Healthcare", 0),
            ("amenity", ["police", "fire_station"], "Public Services", 5000),
            ("amenity", ["school"], "School", 0),
        ]
    elif stats["type_ville"] == "petite ville" :
        queries = [
            ("amenity", ["restaurant", "fast_food"], "Shop", 3000),
            ("shop", ["supermarket"], "Food Store", 2000),
            ("amenity", ["hospital", "clinic"], "Healthcare", 5000),
            ("amenity", ["police", "fire_station"], "Public Services", 5000),
            ("amenity", ["school"], "School", 3000),
        ]
    elif stats["type_ville"] == "village" :
        queries = [
            ("amenity", ["restaurant", "fast_food"], "Shop", 5000),
            ("shop", ["supermarket"], "Food Store", 5000),
            ("amenity", ["hospital", "clinic"], "Healthcare", 10000),
            ("amenity", ["police", "fire_station"], "Public Services", 10000),
            ("amenity", ["school"], "School", 5000),
        ]
    else :
        exit(0)
    
    # 0 is city other is radius
    transport_total_nbr = 0
    transport_total_dist = 0
    transport_radius = 1000

    for info_type, info_filters, info_explicit, radius in queries:
        total_dist = 0
        nbr = 0
        print("Adresse :", adresse)
        print("Coordinates :", lat, lon)
        if radius == 0 :
            infos = get_infos_in_city_area(lat, lon, city, info_type, info_filters)
            print("Looking in City :", city)
        else :
            infos = get_infos_nearby(lat, lon, info_type, info_filters, radius)
            print("Looking in radius :", radius, "m")
        print("Looking for :", info_explicit)
        for info in infos:
            # print(f"{info['name']} ({info['type']}) - {utils.reverse_geocode(info['lat'], info['lon'])} - {info['distance']:.0f} m")
            nbr += 1
            total_dist += info['distance']
        if info_explicit == "Transport" :
            transport_total_nbr += nbr
            transport_total_dist += total_dist
        if nbr == 0 :
            average = 0
        else :
            average = round(total_dist / nbr, 1)
        print("There is", nbr, info_explicit, "in an area of", radius,"m, the average distance ", average, "m\n")
        print("\n")
        stats[f"{info_explicit}_nbr"] = nbr
        stats[f"{info_explicit}_radius"] = radius
        stats[f"{info_explicit}_average_distance"] = average
    
    if transport_total_nbr == 0:
        transport_average = 0
    else:
        transport_average = round(transport_total_dist / transport_total_nbr, 1)
        stats["Transport_nbr"] = transport_total_nbr
        stats["Transport_radius"] = transport_radius
        stats["Transport_average_distance"] = transport_average
    
    if stats["population"] >= 5000 :
        stats["Unemployed_people"] = worker.get_unemployed(city)["nbr_unemployed"]
        stats["Proportion of unemployed"] = str(round((worker.get_unemployed(city)["nbr_unemployed"] * 100) / stats["population"])) + "%"
        stats["Job_Offer_in_Departement"] = worker.get_job_offer_in_dep(stats["departement"])["job_offer"]

    for key, value in stats.items() :
        print(key, ":", value)
        if key == "type_ville" :
            print("\n")