"""
Module pour calculer les scores de coûts et de qualité de vie
basé sur les données géographiques et démographiques.
"""

def calculate_cost_score(stats):
    """
    Calcule un score global et des scores par thématique basés sur les données fournies
    
    Args:
        stats (dict): Dictionnaire contenant toutes les données statistiques du lieu
        
    Returns:
        dict: Dictionnaire contenant les scores par thématique et le score global
    """
    scores = {}
    
    # 1. Score Travail (20% du total)
    scores["Travail"] = calculate_work_score(stats)
    
    # 2. Score Transport (20% du total)
    scores["Transport"] = calculate_transport_score(stats)
    
    # 3. Score Services publics (15% du total)
    scores["Service public"] = calculate_public_services_score(stats)
    
    # 4. Score Éducation (15% du total)
    scores["Éducation"] = calculate_education_score(stats)
    
    # 5. Score Commerce (15% du total)
    scores["Commerce"] = calculate_commerce_score(stats)
    
    # 6. Score Santé (15% du total)
    scores["Santé"] = calculate_health_score(stats)
    
    # Score global (moyenne pondérée)
    weights = {
        "Travail": 0.20,
        "Transport": 0.20, 
        "Service public": 0.15,
        "Éducation": 0.15,
        "Commerce": 0.15,
        "Santé": 0.15
    }
    
    global_score = sum(scores[category] * weights[category] for category in scores)
    scores["Global"] = round(global_score, 1)
    
    return scores

def calculate_work_score(stats):
    """
    Calcule le score pour la thématique Travail
    
    Args:
        stats (dict): Dictionnaire contenant les données statistiques
        
    Returns:
        int: Score sur 100 points
    """
    # Valeurs de référence pour normalisation
    unemployment_str = stats.get("Proportion of unemployed", "0%")
    unemployment_rate = float(unemployment_str.strip("%") if "%" in unemployment_str else unemployment_str)
    job_offers = stats.get("Job_Offer_in_Departement", 0)
    population = stats.get("population", 1)
    
    # Indicateurs
    unemployment_score = max(0, 100 - (unemployment_rate * 4))  # 0% = 100pts, 25% = 0pts
    job_opportunity_score = min(100, (job_offers / (population/100)) * 2)  # Ratio offres/pop
    
    # Score final (pondéré)
    final_score = round(unemployment_score * 0.6 + job_opportunity_score * 0.4)
    return min(100, max(0, final_score))  # Garantir entre 0 et 100

def calculate_transport_score(stats):
    """
    Calcule le score pour la thématique Transport
    
    Args:
        stats (dict): Dictionnaire contenant les données statistiques
        
    Returns:
        int: Score sur 100 points
    """
    transport_nbr = stats.get("Transport_nbr", 0)
    transport_avg_distance = stats.get("Transport_average_distance", 2000)
    train_station = stats.get("Train Station_nbr", 0)
    city_type = stats.get("city_type", "")
    
    # Ajustement selon type de ville
    if city_type == "Metropolis":
        expected_transport = 100
        max_distance = 300
    elif city_type == "Large_City":
        expected_transport = 50
        max_distance = 500
    elif city_type == "Mid-sized_City":
        expected_transport = 30
        max_distance = 700
    else:
        expected_transport = 10
        max_distance = 1000
    
    # Calcul des scores
    transport_density_score = min(100, (transport_nbr / expected_transport) * 100)
    distance_score = max(0, 100 - ((transport_avg_distance / max_distance) * 100))
    train_bonus = 25 if train_station > 0 else 0
    
    # Score final
    final_score = round((transport_density_score * 0.4) + (distance_score * 0.4) + train_bonus)
    return min(100, max(0, final_score))

def calculate_public_services_score(stats):
    """
    Calcule le score pour la thématique Services publics
    
    Args:
        stats (dict): Dictionnaire contenant les données statistiques
        
    Returns:
        int: Score sur 100 points
    """
    services_nbr = stats.get("Public_Services_nbr", 0)
    services_distance = stats.get("Public_Services_average_distance", 3000)
    city_type = stats.get("city_type", "")
    
    # Ajustement selon type de ville
    if city_type in ["Metropolis", "Large_City"]:
        expected_services = 10
        max_distance = 1000
    elif city_type == "Mid-sized_City":
        expected_services = 5
        max_distance = 2000
    else:
        expected_services = 2
        max_distance = 5000
    
    # Calcul des scores
    services_density_score = min(100, (services_nbr / expected_services) * 100)
    distance_score = max(0, 100 - ((services_distance / max_distance) * 100))
    
    # Score final
    final_score = round((services_density_score * 0.5) + (distance_score * 0.5))
    return min(100, max(0, final_score))

def calculate_education_score(stats):
    """
    Calcule le score pour la thématique Éducation
    
    Args:
        stats (dict): Dictionnaire contenant les données statistiques
        
    Returns:
        int: Score sur 100 points
    """
    schools_nbr = stats.get("School_nbr", 0)
    schools_distance = stats.get("School_average_distance", 1000)
    
    # Analyse de School_Charge si disponible
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
    
    # Calcul des scores
    school_density_score = min(100, schools_nbr * 5)  # 20+ écoles = 100%
    distance_score = max(0, 100 - ((schools_distance / 1000) * 100))
    
    # Score de capacité des écoles
    capacity_score = 0
    if total_schools > 0:
        capacity_score = (
            (under_capacity * 40) + 
            (normal_capacity * 80) + 
            (optimal_capacity * 100)
        ) / total_schools
    
    # Score final
    if total_schools > 0:
        final_score = round(school_density_score * 0.3 + distance_score * 0.3 + capacity_score * 0.4)
    else:
        final_score = round(school_density_score * 0.5 + distance_score * 0.5)
        
    return min(100, max(0, final_score))

def calculate_commerce_score(stats):
    """
    Calcule le score pour la thématique Commerce
    
    Args:
        stats (dict): Dictionnaire contenant les données statistiques
        
    Returns:
        int: Score sur 100 points
    """
    # Récupération des données de commerce (combinaison de Shop et Food Store)
    shops_nbr = stats.get("Shop_nbr", 0)
    # Correction: utiliser Shop_average_distance si disponible, sinon Shop_distance
    shops_distance = stats.get("Shop_average_distance", stats.get("Shop_distance", 1000))
    
    food_stores_nbr = stats.get("Food Store_nbr", 0)
    food_stores_distance = stats.get("Food Store_average_distance", 500)
    
    # Ajustement en fonction du type de ville
    city_type = stats.get("city_type", "")
    if city_type == "Metropolis":
        expected_shops = 150
        max_shop_distance = 500
    elif city_type == "Large_City":
        expected_shops = 100
        max_shop_distance = 800
    elif city_type == "Mid-sized_City":
        expected_shops = 50
        max_shop_distance = 1500
    elif city_type == "Little_City":
        expected_shops = 25
        max_shop_distance = 2500
    else:  # Village
        expected_shops = 10
        max_shop_distance = 4000
    
    # Calcul des scores
    shops_density_score = min(100, (shops_nbr / expected_shops) * 100)  # Normalisé par type de ville
    shops_distance_score = max(0, 100 - ((shops_distance / max_shop_distance) * 100))
    
    # Importance des supermarchés (Food Store)
    food_density_score = min(100, food_stores_nbr * 20)  # 5+ supermarchés = 100%
    food_distance_score = max(0, 100 - ((food_stores_distance / 500) * 100))
    
    # Score final (pondéré)
    final_score = round(
        shops_density_score * 0.4 + 
        shops_distance_score * 0.2 + 
        food_density_score * 0.3 + 
        food_distance_score * 0.1
    )
    return min(100, max(0, final_score))

def calculate_health_score(stats):
    """
    Calcule le score pour la thématique Santé
    
    Args:
        stats (dict): Dictionnaire contenant les données statistiques
        
    Returns:
        int: Score sur 100 points
    """
    health_nbr = stats.get("Healthcare_nbr", 0)
    health_distance = stats.get("Healthcare_average_distance", 2000)
    city_type = stats.get("city_type", "")
    
    # Ajustement selon type de ville
    if city_type == "Metropolis":
        expected_health = 20
        max_distance = 1000
    elif city_type == "Large_City":
        expected_health = 10
        max_distance = 1500
    else:
        expected_health = 5
        max_distance = 2500
    
    # Calcul des scores
    health_density_score = min(100, (health_nbr / expected_health) * 100)
    distance_score = max(0, 100 - ((health_distance / max_distance) * 100))
    
    # Score final
    final_score = round(health_density_score * 0.6 + distance_score * 0.4)
    return min(100, max(0, final_score))