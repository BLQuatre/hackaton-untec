def calculate_cost_score(stats):
	scores = {}

	# 20% du total
	scores["Travail"] = calculate_work_score(stats)

	# 20% du total
	scores["Transport"] = calculate_transport_score(stats)

	# 15% du total
	scores["Service public"] = calculate_public_services_score(stats)

	# 15% du total
	scores["Éducation"] = calculate_education_score(stats)

	# 15% du total
	scores["Commerce"] = calculate_commerce_score(stats)

	# 15% du total
	scores["Santé"] = calculate_health_score(stats)

	weights = {
		"Travail": 0.20,
		"Transport": 0.20,
		"Service public": 0.15,
		"Éducation": 0.15,
		"Commerce": 0.15,
		"Santé": 0.20,
	}

	global_score = sum(scores[category] * weights[category] for category in scores)
	scores["Global"] = round(global_score, 0)

	return scores

def calculate_work_score(stats):
	unemployment_str = stats.get("Proportion of unemployed", "0%")
	unemployment_rate = float(unemployment_str.strip("%") if "%" in unemployment_str else unemployment_str)
	job_offers = stats.get("Job_Offer_in_Departement", 0)
	population = stats.get("population", 1)

	# 60% chômage, 40% offres
	unemployment_score = max(0, 100 - (unemployment_rate * 3))
	job_opportunity_score = min(100, (job_offers / (population/100)) * 2)

	final_score = round(unemployment_score * 0.6 + job_opportunity_score * 0.6)
	return min(100, max(0, final_score))

def calculate_transport_score(stats):
	transport_nbr = stats.get("Transport_nbr", 0)
	transport_avg_distance = stats.get("Transport_average_distance", 2000)
	train_station = stats.get("Train Station_nbr", 0)
	city_type = stats.get("city_type", "")

	if city_type == "Metropolis":
		expected_transport = 80
	elif city_type == "Large_City":
		expected_transport = 40
	else:
		expected_transport = 20

	transport_density_score = min(100, (transport_nbr / expected_transport) * 100)

	# Calculer le score de distance seulement si la distance moyenne est disponible
	if transport_avg_distance > 0:
		distance_score = max(0, 100 - (transport_avg_distance / 10))
	else:
		distance_score = 50  # Valeur par défaut si pas de données

	# Bonus train plus élevé
	train_bonus = 36 if train_station > 0 else 0

	final_score = round((transport_density_score * 0.6) + (distance_score * 0.3) + train_bonus)
	return min(100, max(0, final_score))

def calculate_public_services_score(stats):
	services_nbr = stats.get("Public_Services_nbr", 0)
	services_distance = stats.get("Public_Services_average_distance", 3000)
	city_type = stats.get("city_type", "")

	if city_type == "Metropolis" :
		expected_services = 10
	elif city_type ==  "Large_City" :
		expected_services = 8
	elif city_type == "Mid-sized_City":
		expected_services = 5
	else:
		expected_services = 2

	services_density_score = min(100, (services_nbr / expected_services) * 100)

	# Calcul de distance seulement si données disponibles
	if services_distance > 0:
		distance_score = max(0, 100 - (services_distance / 30))
	else:
		distance_score = 40  # Valeur par défaut

	final_score = round((services_density_score * 0.7) + (distance_score * 0.3))
	return min(100, max(0, final_score))

def calculate_education_score(stats):
	schools_nbr = stats.get("School_nbr", 0)
	schools_distance = stats.get("School_average_distance", 1000)

	school_charge = stats.get("School_Charge", {})
	if not isinstance(school_charge, dict):
		school_charge = {}

	status_recap = school_charge.get("Status_Recap", {})
	if not isinstance(status_recap, dict):
		status_recap = {}

	under_capacity = status_recap.get("Under Capacity", 0)
	normal_capacity = status_recap.get("Normal", 0)
	optimal_capacity = status_recap.get("Optimal", 0)
	total_schools = school_charge.get("Total_of_Elementary_School", 0)

	# 30% densité, 30% distance, 40% capacité
	school_density_score = min(100, schools_nbr * 4)
	distance_score = max(0, 100 - ((schools_distance / 1000) * 100))

	capacity_score = 0
	if total_schools > 0:
		capacity_score = (
			(under_capacity * 40) +
			(normal_capacity * 80) +
			(optimal_capacity * 100)
		) / total_schools

	if total_schools > 0:
		final_score = round(school_density_score * 0.3 + distance_score * 0.3 + capacity_score * 0.4)
	else:
		final_score = round(school_density_score * 0.5 + distance_score * 0.5)

	return min(100, max(0, final_score))

def calculate_commerce_score(stats):
	shops_nbr = stats.get("Shop_nbr", 0)
	shops_distance = stats.get("Shop_average_distance", stats.get("Shop_distance", 0))
	food_stores_nbr = stats.get("Food Store_nbr", 0)
	food_stores_distance = stats.get("Food Store_average_distance", 0)

	# Calibré pour 98 commerces = 90 points
	shops_density_score = min(100, shops_nbr * 1.1)  # ~90 commerces = 100%

	if shops_distance > 0:
		shops_distance_score = max(0, 100 - (shops_distance / 15))
	else:
		shops_distance_score = 60  # Valeur par défaut

	# Score pour les supermarchés
	food_density_score = min(100, food_stores_nbr * 25)  # 4 supermarchés = 100%

	if food_stores_distance > 0:
		food_distance_score = max(0, 100 - (food_stores_distance / 10))
	else:
		food_distance_score = 70  # Valeur par défaut

	final_score = round(
		shops_density_score * 0.5 +
		shops_distance_score * 0.3 +
		food_density_score * 0.3 +
		food_distance_score * 0.3
	)
	return min(100, max(0, final_score))

def calculate_health_score(stats):
	# Séparation entre cliniques/docteurs et hôpitaux
	healthcare_nbr = stats.get("Healthcare_nbr", 0)  # Cliniques et docteurs
	healthcare_distance = stats.get("Healthcare_average_distance", 0)

	hospital_nbr = stats.get("Hospital_nbr", 0)  # Hôpitaux
	hospital_distance = stats.get("Hospital_average_distance", 0)

	city_type = stats.get("city_type", "")

	# Attentes par type de ville pour cliniques/docteurs
	if city_type == "Metropolis":
		expected_healthcare = 12
		max_healthcare_distance = 800
		expected_hospital = 3
		max_hospital_distance = 2000
	elif city_type == "Large_City":
		expected_healthcare = 8
		max_healthcare_distance = 1200
		expected_hospital = 2
		max_hospital_distance = 3000
	elif city_type == "Mid-sized_City":
		expected_healthcare = 4
		max_healthcare_distance = 2000
		expected_hospital = 1
		max_hospital_distance = 5000
	else:  # Petite ville ou village
		expected_healthcare = 2
		max_healthcare_distance = 3000
		expected_hospital = 0.5  # 1 hôpital pour 2 petites villes en moyenne
		max_hospital_distance = 10000

	# Score pour cliniques et docteurs (40% du total)
	healthcare_density_score = min(100, (healthcare_nbr / expected_healthcare) * 100)
	healthcare_distance_score = 50  # Valeur par défaut
	if healthcare_distance > 0:
		healthcare_distance_score = max(0, 100 - (healthcare_distance / (max_healthcare_distance/100)))

	healthcare_score = (healthcare_density_score * 0.6) + (healthcare_distance_score * 0.4)

	# Score pour hôpitaux (60% du total - plus importante)
	hospital_density_score = min(100, (hospital_nbr / expected_hospital) * 100)
	hospital_distance_score = 40  # Valeur par défaut
	if hospital_distance > 0:
		hospital_distance_score = max(0, 100 - (hospital_distance / (max_hospital_distance/100)))

	# Si pas d'hôpitaux attendus dans cette zone (ex: village)
	if expected_hospital <= 0:
		hospital_score = 50  # Score neutre
	else:
		hospital_score = (hospital_density_score * 0.5) + (hospital_distance_score * 0.3)

	# Combinaison des scores avec pondération
	final_score = round((healthcare_score * 0.4) + (hospital_score * 0.6))

	return min(100, max(0, final_score))
