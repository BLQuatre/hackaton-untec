import citysize
import requests
import worker
import school
import utils
import Score
from io import StringIO
# from . import TxttoPDF

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


def print_stats_data(adresse, lat, lon, stats) :
	buffer = StringIO()

	print("Adresse :", adresse, file=buffer)
	print("Coordinates :", lat, ",", lon, file=buffer)
	for key, value in stats.items() :
		if key == "School_Charge" :
			print(key, ":", file=buffer)
			for info, data in value.items() :
				if info == "Status_Recap" :
					print("|\t - ", info, file=buffer)
					for info1, data1 in data.items() :
						print("|\t |\t - ", info1, ":", data1, file=buffer)
				else :
					print("|\t - ", info, ":", data, file=buffer)
		else :
			print(key, ":", value, file=buffer)
		if key == "city_type" :
			print("\n", file=buffer)
	output = buffer.getvalue()
	buffer.close()
	return output

def DataProvider(adresse, lat, lon) :
	city = utils.get_city_from_coords(lat, lon)
	stats = citysize.get_commune_info(city)
	stats["city_type"] = citysize.categorie_ville(stats['population'], stats['densite'])

	if stats["city_type"] == "Metropolis" :
		shop_radius = 500
		transport_radius = 500
		queries = [
			("amenity", ["restaurant", "fast_food", "cafe", "bar", "pub"], "Shop", shop_radius),
			("shop", ["clothes", "shoes", "jewelry", "electronics", "mobile_phone",
			  "convenience", "bakery", "butcher", "deli", "greengrocer",
			  "books", "gift", "hairdresser", "beauty", "optician",
			  "sports", "toys"], "Shop", shop_radius),
			("shop", ["supermarket"], "Food Store", 300),
			("amenity", ["hospital"], "Hospital", 2000),
			("amenity", ["clinic", "doctors"], "Healthcare", 1000),
			("amenity", ["police", "fire_station"], "Public_Services", 2000),
			("amenity", ["school"], "School", 500),
			("highway", ["bus_stop"], "Transport", transport_radius),
			("station", ["subway"], "Transport", transport_radius),
			("railway", ["tram_stop"], "Transport", transport_radius),
			("railway", ["station"], "Train_Station", transport_radius),
		]
	elif stats["city_type"] == "Large_City" :
		shop_radius = 1000
		transport_radius = 1000
		queries = [
			("amenity", ["restaurant", "fast_food", "cafe", "bar", "pub"], "Shop", shop_radius),
			("shop", ["clothes", "shoes", "jewelry", "electronics", "mobile_phone",
			  "convenience", "bakery", "butcher", "deli", "greengrocer",
			  "books", "gift", "hairdresser", "beauty", "optician",
			  "sports", "toys"], "Shop", shop_radius),
			("shop", ["supermarket"], "Food Store", 500),
			("amenity", ["hospital"], "Hospital", 2000),
			("amenity", ["clinic", "doctors"], "Healthcare", 2000),
			("amenity", ["police", "fire_station"], "Public_Services", 3000),
			("amenity", ["school"], "School", transport_radius),
			("highway", ["bus_stop"], "Transport", transport_radius),
			("station", ["subway"], "Transport", transport_radius),
			("railway", ["tram_stop"], "Transport", transport_radius),
			("railway", ["station"], "Train_Station", transport_radius),
		]
	elif stats["city_type"] == "Mid-sized_City" :
		shop_radius = 2000
		transport_radius = 2000
		queries = [
			("amenity", ["restaurant", "fast_food", "cafe", "bar", "pub"], "Shop", shop_radius),
			("shop", ["clothes", "shoes", "jewelry", "electronics", "mobile_phone",
			  "convenience", "bakery", "butcher", "deli", "greengrocer",
			  "books", "gift", "hairdresser", "beauty", "optician",
			  "sports", "toys"], "Shop", shop_radius),
			("shop", ["supermarket"], "Food Store", 0),
			("amenity", ["hospital"], "Hospital", 0),
			("amenity", ["clinic", "doctors"], "Healthcare", 0),
			("amenity", ["police", "fire_station"], "Public_Services", 5000),
			("amenity", ["school"], "School", 0),
			("highway", ["bus_stop"], "Transport", transport_radius),
			("station", ["subway"], "Transport", transport_radius),
			("railway", ["tram_stop"], "Transport", transport_radius),
			("railway", ["station"], "Train_Station", transport_radius),
		]
	elif stats["city_type"] == "Little_City" :
		shop_radius = 3000
		transport_radius = 3000
		queries = [
			("amenity", ["restaurant", "fast_food", "cafe", "bar", "pub"], "Shop", shop_radius),
			("shop", ["clothes", "shoes", "jewelry", "electronics", "mobile_phone",
			  "convenience", "bakery", "butcher", "deli", "greengrocer",
			  "books", "gift", "hairdresser", "beauty", "optician",
			  "sports", "toys"], "Shop", shop_radius),
			("shop", ["supermarket"], "Food Store", 2000),
			("amenity", ["hospital"], "Hospital", 5000),
			("amenity", ["clinic", "doctors"], "Healthcare", 5000),
			("amenity", ["police", "fire_station"], "Public_Services", 5000),
			("amenity", ["school"], "School", 3000),
			("highway", ["bus_stop"], "Transport", transport_radius),
			("station", ["subway"], "Transport", transport_radius),
			("railway", ["tram_stop"], "Transport", transport_radius),
			("railway", ["station"], "Train_Station", transport_radius),
		]
	elif stats["city_type"] == "Village" :
		shop_radius = 5000
		transport_radius = 5000
		queries = [
			("amenity", ["restaurant", "fast_food", "cafe", "bar", "pub"], "Shop", shop_radius),
			("shop", ["clothes", "shoes", "jewelry", "electronics", "mobile_phone",
			  "convenience", "bakery", "butcher", "deli", "greengrocer",
			  "books", "gift", "hairdresser", "beauty", "optician",
			  "sports", "toys"], "Shop", shop_radius),
			("shop", ["supermarket"], "Food Store", 5000),
			("amenity", ["hospital"], "Hospital", 10000),
			("amenity", ["clinic", "doctors"], "Healthcare", 10000),
			("amenity", ["police", "fire_station"], "Public_Services", 10000),
			("amenity", ["school"], "School", 5000),
			("highway", ["bus_stop"], "Transport", transport_radius),
			("station", ["subway"], "Transport", transport_radius),
			("railway", ["tram_stop"], "Transport", transport_radius),
			("railway", ["station"], "Train_Station", transport_radius),
		]
	else :
		exit(0)

	# 0 is city other is radius
	shop_total_nbr = 0
	shop_total_dist = 0

	transport_total_nbr = 0
	transport_total_dist = 0


	for info_type, info_filters, info_explicit, radius in queries:
		total_dist = 0
		nbr = 0
		if radius == 0 :
			infos = get_infos_in_city_area(lat, lon, city, info_type, info_filters)
			# print("Looking in City :", city)
		else :
			infos = get_infos_nearby(lat, lon, info_type, info_filters, radius)
			# print("Looking in radius :", radius, "m")
		# print("Looking for :", info_explicit)
		for info in infos:
			# print(f"{info['name']} ({info['type']}) - {utils.reverse_geocode(info['lat'], info['lon'])} - {info['distance']:.0f} m")
			nbr += 1
			total_dist += info['distance']
		if info_explicit == "Transport" :
			transport_total_nbr += nbr
			transport_total_dist += total_dist
		if info_explicit == "Shop" :
			shop_total_nbr += nbr
			shop_total_dist += total_dist
		if nbr == 0 :
			average = 0
		else :
			average = round(total_dist / nbr, 1)
		# print("There is", nbr, info_explicit, "in an area of", radius,"m, the average distance ", average, "m\n")
		# print("\n")
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
	if shop_total_nbr == 0:
		shop_average = 0
	else:
		shop_average = round(shop_total_dist / shop_total_nbr, 1)
		stats["Shop_nbr"] = shop_total_nbr
		stats["Shop_radius"] = shop_radius
		stats["Shop_average_distance"] = shop_average
	if stats["population"] >= 5000 :
		stats["Unemployed_people"] = worker.get_unemployed(city)["nbr_unemployed"]
		if stats["population"] > 0:
			stats["Proportion of unemployed"] = str(round((worker.get_unemployed(city)["nbr_unemployed"] * 100) / stats["population"])) + "%"
		else:
			stats["Proportion of unemployed"] = "N/A"
		stats["Job_Offer_in_Departement"] = worker.get_job_offer_in_dep(stats["departement"])["job_offer"]

	if stats["city_type"] == "Metropolis" :
		stats["School_Charge"] = school.school_charge_radius(lat, lon, 500)
	elif stats["city_type"] == "Large_City" :
		stats["School_Charge"] = school.school_charge_radius(lat, lon, 1000)
	elif stats["city_type"] == "Mid-sized_City" :
		stats["School_Charge"] = school.school_charge_city(city)
	elif stats["city_type"] == "Little_City":
		stats["School_Charge"] = school.school_charge_radius(city)
		if stats["School_Charge"] == None :
			stats["School_Charge"] = school.school_charge_radius(lat, lon, 3000)
	elif stats["city_type"] == "Village" :
		stats["School_Charge"] = school.school_charge_radius(lat, lon, 5000)

	scores = Score.calculate_cost_score(stats)
	for index, score in scores.items() :
		stats[f"Score_{index}"] = str(score) + "/100"


	formatted_output = print_stats_data(adresse, lat, lon, stats)

	clean_adresse = adresse.replace("/", "_").replace("\\", "_").replace(":", "_").replace(" ", "_")
	filename = f"CostIAData_{lat},{lon}_{clean_adresse}.txt"
	# with open(filename, "w") as f:
	# 	f.write(formatted_output)
	# pdf_filename = f"PDF_report.pdf"
	# TxttoPDF.text_to_pdf(formatted_output, pdf_filename)

	return {
		'stats': stats,
		'formatted_output': formatted_output,
		'filename': filename
	}

def Create_score_system(adresse, lat, lon) :
	data = DataProvider(adresse, lat, lon)

def Costia_getData_with_adresse(adresse) :
	lat, lon = utils.geocode_adresse(adresse)
	if not lat and not lon :
		return "No data found for this address"
	return DataProvider(adresse, lat, lon)

def Costia_getData_with_coordinates(lat, lon) :
	adresse = utils.reverse_geocode(lat, lon)
	if adresse == "Adresse inconnue" :
		return "No data found for this address"
	return DataProvider(adresse, lat, lon)

if __name__ == "__main__":
	# adresse = "24ir9 fapfjal, 8ru2o"
	adresse = "8 rue Riquet, 750000 Paris"
	# adresse = "20 Quai Frissard, 76600 Le Havre"
	# adresse = "97 rue au Coq, 27210 Beuzeville"
	result = Costia_getData_with_adresse(adresse)
	if isinstance(result, dict):
		print(result['formatted_output'])
	else:
		print(result)



