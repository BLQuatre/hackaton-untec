def calculate_cost_score(stats):
	scores = {}

	# Calcul des scores individuels
	scores["Travail"] = calculate_work_score(stats)
	scores["Transport"] = calculate_transport_score(stats)
	scores["Service public"] = calculate_public_services_score(stats)
	scores["Éducation"] = calculate_education_score(stats)
	scores["Commerce"] = calculate_commerce_score(stats)
	scores["Santé"] = calculate_health_score(stats)

	# Bonus d'excellence urbaine basé sur la densité réelle des services
	city_excellence_bonus = calculate_city_excellence_bonus(stats)

	weights = {
		"Travail": 0.25,      # 25%
		"Transport": 0.22,    # 22%
		"Service public": 0.13, # 13%
		"Éducation": 0.12,    # 12%
		"Commerce": 0.20,     # 20%
		"Santé": 0.08,        # 8%
	}

	global_score = sum(scores[category] * weights[category] for category in scores)

	# Application du bonus d'excellence (max +10 points)
	global_score += city_excellence_bonus

	scores["Global"] = round(min(100, global_score), 0)

	return scores

def calculate_city_excellence_bonus(stats):
	"""
	Calcule un bonus basé sur l'excellence exceptionnelle d'une ville
	dans plusieurs domaines simultanément
	"""
	city_type = stats.get("city_type", "")
	bonus = 0

	# Bonus pour densité exceptionnelle de services
	transport_nbr = stats.get("Transport_nbr", 0)
	shop_nbr = stats.get("Shop_nbr", 0)
	healthcare_nbr = stats.get("Healthcare_nbr", 0)
	hospital_nbr = stats.get("Hospital_nbr", 0)
	services_nbr = stats.get("Public_Services_nbr", 0)

	if city_type == "Metropolis":
		# Bonus pour métropoles avec densité exceptionnelle
		excellence_factors = 0

		# Transport exceptionnel (>40)
		if transport_nbr > 40:
			excellence_factors += 1

		# Commerce exceptionnel (>500 shops)
		if shop_nbr > 500:
			excellence_factors += 1

		# Santé exceptionnelle (>25 healthcare + >8 hospitals)
		if healthcare_nbr > 25 and hospital_nbr > 8:
			excellence_factors += 1

		# Services publics exceptionnels (>15)
		if services_nbr > 15:
			excellence_factors += 1

		# Bonus progressif pour excellence multiple
		if excellence_factors >= 4:
			bonus = 10  # Excellence dans tous les domaines
		elif excellence_factors >= 3:
			bonus = 7   # Excellence dans 3 domaines
		elif excellence_factors >= 2:
			bonus = 4   # Excellence dans 2 domaines
		elif excellence_factors >= 1:
			bonus = 2   # Excellence dans 1 domaine

	elif city_type == "Large_City":
		# Bonus plus modeste pour grandes villes
		excellence_factors = 0

		if transport_nbr > 25:
			excellence_factors += 1
		if shop_nbr > 200:
			excellence_factors += 1
		if healthcare_nbr > 15 and hospital_nbr > 3:
			excellence_factors += 1
		if services_nbr > 8:
			excellence_factors += 1

		if excellence_factors >= 3:
			bonus = 5
		elif excellence_factors >= 2:
			bonus = 3
		elif excellence_factors >= 1:
			bonus = 1

	return bonus

def calculate_work_score(stats):
	unemployment_str = stats.get("Proportion of unemployed", "0%")
	unemployment_rate = float(unemployment_str.strip("%") if "%" in unemployment_str else unemployment_str)
	job_offers = stats.get("Job_Offer_in_Departement", 0)
	population = stats.get("population", 1)
	city_type = stats.get("city_type", "")

	# Score chômage: adapté selon le type de ville et la moyenne nationale (~7.5%)
	# Plus tolérant pour les grandes villes qui ont souvent plus de chômage mais plus d'opportunités
	if city_type == "Metropolis":
		# Grandes villes: tolérance jusqu'à 15% (moyenne haute des métropoles)
		unemployment_score = max(0, 100 - (max(0, unemployment_rate - 15) * 8))
		if unemployment_rate <= 10:
			unemployment_score = 100 - (unemployment_rate * 3)  # Moins pénalisant
		elif unemployment_rate <= 15:
			unemployment_score = 70 - ((unemployment_rate - 10) * 6)
	else:
		# Villes plus petites: attentes plus strictes sur le chômage
		unemployment_score = max(0, 100 - (unemployment_rate * 5))

	# Score opportunités d'emploi basé sur le ratio offres/population (amélioré)
	job_ratio_per_1000 = (job_offers / population) * 1000 if population > 0 else 0

	# Ajustement selon le type de ville
	if city_type == "Metropolis":
		# Grandes villes: plus d'opportunités attendues
		job_opportunity_score = min(100, job_ratio_per_1000 * 6)  # Plus généreux
	elif city_type == "Large_City":
		job_opportunity_score = min(100, job_ratio_per_1000 * 8)
	else:
		job_opportunity_score = min(100, job_ratio_per_1000 * 12)

	# Pondération ajustée: 60% chômage, 40% opportunités (plus équilibré)
	final_score = round(unemployment_score * 0.6 + job_opportunity_score * 0.4)
	return min(100, max(0, final_score))

def calculate_transport_score(stats):
	transport_nbr = stats.get("Transport_nbr", 0)
	transport_avg_distance = stats.get("Transport_average_distance", 2000)
	train_station = stats.get("Train_Station_nbr", 0)
	city_type = stats.get("city_type", "")
	# Attentes réajustées selon le type de ville - plus réalistes pour Paris
	if city_type == "Metropolis":
		expected_transport = 12  # Réduit de 15 à 12 pour mieux valoriser les 25 arrêts
		max_reasonable_distance = 700  # Augmenté de 600 à 700
		density_bonus_threshold = 25  # Réduit de 30 à 25
	elif city_type == "Large_City":
		expected_transport = 12  # Réduit de 20 à 12
		max_reasonable_distance = 800
		density_bonus_threshold = 25
	elif city_type == "Mid-sized_City":
		expected_transport = 8  # Réduit de 12 à 8
		max_reasonable_distance = 1200
		density_bonus_threshold = 15
	else:
		expected_transport = 4  # Réduit de 6 à 4
		max_reasonable_distance = 2000
		density_bonus_threshold = 8

	# Score de densité (50% du total) - avec bonus pour les grandes villes
	base_density_score = min(100, (transport_nbr / expected_transport) * 100)

	# Bonus pour les très grandes densités de transport
	density_bonus = 0
	if transport_nbr > density_bonus_threshold:
		excess_ratio = (transport_nbr - density_bonus_threshold) / density_bonus_threshold
		density_bonus = min(25, excess_ratio * 12)  # Augmenté max bonus à 25 points

	transport_density_score = min(100, base_density_score + density_bonus)

	# Score de distance (30% du total) - réduit l'importance
	if transport_avg_distance > 0:
		distance_score = max(0, 100 - ((transport_avg_distance / max_reasonable_distance) * 100))
	else:
		distance_score = 70  # Valeur par défaut améliorée

	# Bonus gare (20% du total) - plus important pour les grandes villes
	if city_type == "Metropolis":
		train_bonus = min(20, train_station * 6)  # Max 20 points, 6 points par gare
	elif city_type == "Large_City":
		train_bonus = min(15, train_station * 7)  # Max 15 points, 7 points par gare
	else:
		train_bonus = min(12, train_station * 10)  # Max 12 points, 10 points par gare

	final_score = round((transport_density_score * 0.5) + (distance_score * 0.3) + train_bonus)
	return min(100, max(0, final_score))

def calculate_public_services_score(stats):
	services_nbr = stats.get("Public_Services_nbr", 0)
	services_distance = stats.get("Public_Services_average_distance", 3000)
	city_type = stats.get("city_type", "")
	# Attentes réajustées selon le type de ville - plus valorisant pour Paris
	if city_type == "Metropolis":
		expected_services = 10  # Augmenté de 8 à 10 pour maintenir l'exigence mais valoriser 12
		max_reasonable_distance = 2400  # Augmenté de 2200 à 2400
		excellence_threshold = 15  # Seuil pour bonus d'excellence
	elif city_type == "Large_City":
		expected_services = 5  # Augmenté de 4 à 5
		max_reasonable_distance = 2800  # Augmenté de 2500 à 2800
		excellence_threshold = 10
	elif city_type == "Mid-sized_City":
		expected_services = 3.5  # Augmenté de 3 à 3.5
		max_reasonable_distance = 4500  # Augmenté de 4000 à 4500
		excellence_threshold = 6
	else:  # Little_City, Village
		expected_services = 2.5  # Maintenu à 2.5
		max_reasonable_distance = 6500  # Augmenté de 6000 à 6500
		excellence_threshold = 4

	# Score de densité (55% du total)
	services_density_score = min(100, (services_nbr / expected_services) * 100)

	# Bonus pour les grandes densités de services publics
	if services_nbr > excellence_threshold:
		bonus = min(15, (services_nbr - excellence_threshold) * 2)
		services_density_score = min(100, services_density_score + bonus)

	# Score de distance (45% du total)
	if services_distance > 0:
		# Distance normalisée sur la distance raisonnable pour le type de ville
		distance_score = max(0, 100 - ((services_distance / max_reasonable_distance) * 100))
	else:
		distance_score = 85  # Valeur par défaut améliorée de 80 à 85

	final_score = round((services_density_score * 0.55) + (distance_score * 0.45))
	return min(100, max(0, final_score))

def calculate_education_score(stats):
	schools_nbr = stats.get("School_nbr", 0)
	schools_distance = stats.get("School_average_distance", 1000)
	city_type = stats.get("city_type", "")

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

	# Attentes réajustées selon le type de ville - plus valorisant pour Paris
	if city_type == "Metropolis":
		expected_schools = 6  # Réduit de 8 à 6 pour valoriser Paris
		max_reasonable_distance = 700  # Augmenté de 600 à 700
	elif city_type == "Large_City":
		expected_schools = 5  # Réduit de 6 à 5
		max_reasonable_distance = 1100  # Augmenté de 1000 à 1100
	elif city_type == "Mid-sized_City":
		expected_schools = 3.5  # Réduit de 4 à 3.5
		max_reasonable_distance = 1600  # Augmenté de 1500 à 1600
	else:
		expected_schools = 3  # Réduit de 3.5 à 3
		max_reasonable_distance = 2200  # Augmenté de 2000 à 2200

	# 25% densité, 35% distance, 40% capacité (ajusté)
	school_density_score = min(100, (schools_nbr / expected_schools) * 100)

	# Bonus pour densité exceptionnelle d'écoles
	if city_type == "Metropolis" and schools_nbr > 10:
		bonus = min(15, (schools_nbr - 10) * 1.5)
		school_density_score = min(100, school_density_score + bonus)

	distance_score = max(0, 100 - ((schools_distance / max_reasonable_distance) * 100))

	capacity_score = 0
	if total_schools > 0:
		capacity_score = (
			(under_capacity * 35) +  # Augmenté de 30 à 35
			(normal_capacity * 88) +  # Augmenté de 85 à 88
			(optimal_capacity * 100)  # Inchangé
		) / total_schools
	else:
		# Si pas de données sur la capacité, on suppose une capacité normale
		capacity_score = 80  # Augmenté de 75 à 80

	if total_schools > 0:
		final_score = round(school_density_score * 0.25 + distance_score * 0.35 + capacity_score * 0.4)
	else:
		final_score = round(school_density_score * 0.4 + distance_score * 0.6)

	return min(100, max(0, final_score))

def calculate_commerce_score(stats):
	shops_nbr = stats.get("Shop_nbr", 0)
	shops_distance = stats.get("Shop_average_distance", stats.get("Shop_distance", 0))
	food_stores_nbr = stats.get("Food Store_nbr", 0)
	food_stores_distance = stats.get("Food Store_average_distance", 0)
	city_type = stats.get("city_type", "")

	# Attentes réajustées selon le type de ville - mieux adaptées à Paris
	if city_type == "Metropolis":
		expected_shops = 30  # Réduit de 50 à 30 pour valoriser Paris
		max_shop_distance = 800  # Augmenté de 600 à 800
		expected_food_stores = 2  # Réduit de 3 à 2
		max_food_distance = 1200  # Augmenté de 1000 à 1200
		excellence_threshold = 200  # Seuil pour bonus d'excellence
	elif city_type == "Large_City":
		expected_shops = 25  # Réduit de 35 à 25
		max_shop_distance = 1200  # Augmenté de 1000 à 1200
		expected_food_stores = 1.5  # Réduit de 2 à 1.5
		max_food_distance = 1800  # Augmenté de 1500 à 1800
		excellence_threshold = 80
	elif city_type == "Mid-sized_City":
		expected_shops = 15  # Réduit de 18 à 15
		max_shop_distance = 2200  # Augmenté de 2000 à 2200
		expected_food_stores = 1.2  # Réduit de 1.5 à 1.2
		max_food_distance = 2800  # Augmenté de 2500 à 2800
		excellence_threshold = 40
	else:
		expected_shops = 10  # Réduit de 12 à 10
		max_shop_distance = 3800  # Augmenté de 3500 à 3800
		expected_food_stores = 1.2  # Réduit de 1.5 à 1.2
		max_food_distance = 5500  # Augmenté de 5000 à 5500
		excellence_threshold = 20

	# Score commerces généraux (45% du total)
	shops_density_score = min(100, (shops_nbr / expected_shops) * 100)

	# Bonus pour les très grandes densités commerciales (pour Paris)
	if shops_nbr > excellence_threshold:
		bonus = min(20, (shops_nbr - excellence_threshold) / excellence_threshold * 15)
		shops_density_score = min(100, shops_density_score + bonus)

	if shops_distance > 0:
		shops_distance_score = max(0, 100 - ((shops_distance / max_shop_distance) * 100))
	else:
		shops_distance_score = 75  # Amélioré de 70 à 75

	# Score supermarchés (45% du total)
	food_density_score = min(100, (food_stores_nbr / expected_food_stores) * 100)

	if food_stores_distance > 0:
		food_distance_score = max(0, 100 - ((food_stores_distance / max_food_distance) * 100))
	else:
		food_distance_score = 80  # Amélioré de 75 à 80

	# 35% commerces, 15% distance commerces, 35% supermarchés, 15% distance supermarchés
	final_score = round(
		(shops_density_score * 0.35) +
		(shops_distance_score * 0.15) +
		(food_density_score * 0.35) +
		(food_distance_score * 0.15)
	)
	return min(100, max(0, final_score))

def calculate_health_score(stats):
	# Séparation entre cliniques/docteurs et hôpitaux
	healthcare_nbr = stats.get("Healthcare_nbr", 0)  # Cliniques et docteurs
	healthcare_distance = stats.get("Healthcare_average_distance", 0)

	hospital_nbr = stats.get("Hospital_nbr", 0)  # Hôpitaux
	hospital_distance = stats.get("Hospital_average_distance", 0)

	city_type = stats.get("city_type", "")

	# Attentes réajustées par type de ville pour cliniques/docteurs
	if city_type == "Metropolis":
		expected_healthcare = 8  # Réduit de 10 à 8
		max_healthcare_distance = 1000  # Augmenté de 800 à 1000
		expected_hospital = 1.5  # Réduit de 2 à 1.5
		max_hospital_distance = 2500  # Augmenté de 2000 à 2500
	elif city_type == "Large_City":
		expected_healthcare = 4  # Réduit de 6 à 4
		max_healthcare_distance = 1500  # Augmenté de 1200 à 1500
		expected_hospital = 0.8  # Réduit de 1 à 0.8
		max_hospital_distance = 4000  # Augmenté de 3000 à 4000
	elif city_type == "Mid-sized_City":
		expected_healthcare = 2  # Réduit de 3 à 2
		max_healthcare_distance = 2500  # Augmenté de 2000 à 2500
		expected_hospital = 0.4  # Réduit de 0.5 à 0.4
		max_hospital_distance = 6000  # Augmenté de 5000 à 6000
	else:  # Petite ville ou village
		expected_healthcare = 0.8  # Réduit de 1 à 0.8
		max_healthcare_distance = 6000  # Augmenté de 5000 à 6000
		expected_hospital = 0.2  # Réduit de 0.25 à 0.2
		max_hospital_distance = 20000  # Augmenté de 15000 à 20000

	# Score pour cliniques et docteurs (40% du total)
	healthcare_density_score = min(100, (healthcare_nbr / expected_healthcare) * 100)
	healthcare_distance_score = 60  # Valeur par défaut améliorée
	if healthcare_distance > 0:
		healthcare_distance_score = max(0, 100 - ((healthcare_distance / max_healthcare_distance) * 100))

	healthcare_score = (healthcare_density_score * 0.6) + (healthcare_distance_score * 0.4)

	# Score pour hôpitaux (60% du total - plus important)
	hospital_density_score = min(100, (hospital_nbr / expected_hospital) * 100)
	hospital_distance_score = 50  # Valeur par défaut améliorée
	if hospital_distance > 0:
		hospital_distance_score = max(0, 100 - ((hospital_distance / max_hospital_distance) * 100))

	# Bonus pour grandes villes avec beaucoup d'hôpitaux
	if city_type == "Metropolis" and hospital_nbr > 5:
		bonus = min(15, (hospital_nbr - 5) * 3)
		hospital_density_score = min(100, hospital_density_score + bonus)

	# Si très peu d'hôpitaux attendus dans cette zone (ex: village)
	if expected_hospital <= 0.3:
		hospital_score = (hospital_density_score * 0.2) + (hospital_distance_score * 0.8)
	else:
		hospital_score = (hospital_density_score * 0.5) + (hospital_distance_score * 0.5)

	# Combinaison des scores avec pondération
	final_score = round((healthcare_score * 0.4) + (hospital_score * 0.6))

	return min(100, max(0, final_score))
