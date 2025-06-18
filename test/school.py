import pandas as pd
import re
import unicodedata
from collections import Counter
import utils

CAPACITE_MAX_PAR_CLASSE = 30

def normalize(text):
    if not isinstance(text, str):
        text = str(text)
    text = text.lower()
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    return text

def get_schools_density_by_radius(lat, lon, radius, csv_path="School.csv"):
    try:
        df = pd.read_csv(csv_path, sep=";", encoding="utf-8")
        
        required_columns = ['Commune', 'total_stud', 'nbr_stud_actual', 'nbr_classe', 'lat_school', 'lon_school']
        if not all(col in df.columns for col in required_columns):
            print(f"Erreur: Les colonnes attendues ne sont pas présentes dans le fichier CSV")
            print(f"Colonnes requises: {required_columns}")
            print(f"Colonnes trouvées: {df.columns.tolist()}")
            return None
        
        df['Commune'] = df['Commune'].str.strip()
        df['total_stud'] = df['total_stud'].astype(str).str.replace(" ", "").astype(int)
        df['nbr_stud_actual'] = df['nbr_stud_actual'].astype(str).str.replace(" ", "").astype(int)
        df['nbr_classe'] = df['nbr_classe'].astype(str).str.replace(" ", "").astype(int)
        df['lat_school'] = df['lat_school'].astype(float)
        df['lon_school'] = df['lon_school'].astype(float)

        df['distance'] = df.apply(
            lambda row: utils.haversine(lat, lon, row['lat_school'], row['lon_school']), 
            axis=1
        )

        match = df[df['distance'] <= radius]
        
        match = match.sort_values(by='distance')
        
        if not match.empty:
            results = []
            for i, row in match.iterrows():
                school = {
                    'commune': str(row['Commune']),
                    'total_stud': int(row['total_stud']),
                    'nbr_classe': int(row['nbr_classe']),
                    'nbr_stud_actual': int(row['nbr_stud_actual']),
                    'lat': float(row['lat_school']),
                    'lon': float(row['lon_school']),
                    'distance': float(row['distance'])
                }
                results.append(school)
            return results
        else:
            print(f"Aucune école trouvée dans un rayon de {radius} mètres")
            return None
    except Exception as e:
        print(f"Erreur lors de la recherche des écoles par rayon: {e}")
        import traceback
        traceback.print_exc()
        return None

def get_school_density(nom_ville, csv_path="School.csv"):
    try:
        nom_ville_norm = normalize(nom_ville)
        df = pd.read_csv(csv_path, sep=";", encoding="utf-8")
        
        required_columns = ['Commune', 'total_stud', 'nbr_stud_actual', 'nbr_classe']
        if not all(col in df.columns for col in required_columns):
            print(f"Erreur: Les colonnes attendues ne sont pas présentes dans le fichier CSV")
            return None
        
        df['Commune'] = df['Commune'].str.strip()
        df['total_stud'] = df['total_stud'].astype(str).str.replace(" ", "").astype(int)
        df['nbr_stud_actual'] = df['nbr_stud_actual'].astype(str).str.replace(" ", "").astype(int)
        df['nbr_classe'] = df['nbr_classe'].astype(str).str.replace(" ", "").astype(int)
        df['Commune_norm'] = df['Commune'].apply(normalize)
        
        def extract_ville_name(commune):
            match = re.match(r"(.+?)\s+\d{5}$", commune)
            return match.group(1).strip() if match else commune
        
        df['Commune_short'] = df['Commune'].apply(extract_ville_name)
        df['Commune_short_norm'] = df['Commune_short'].apply(normalize)
        
        match = df[df['Commune_norm'] == nom_ville_norm]
        
        if match.empty:
            match = df[df['Commune_short_norm'] == nom_ville_norm]
            
        if match.empty:
            match = df[df['Commune_norm'].str.contains(nom_ville_norm)]
            
        if not match.empty:
            results = []
            i = 0
            for i, row in match.iterrows() :
                school = {
                    'commune': str(row['Commune']),
                    'total_stud': int(row['total_stud']),
                    'nbr_classe': int(row['nbr_classe']),
                    'nbr_stud_actual': int(row['nbr_stud_actual'])
                }
                results.append(school)
                i += 1
        if results :
            return results
        else:
            return None
    except Exception as e:
        print(f"Erreur lors de la recherche des données capacite ecole': {e}")
        return None

def school_charge_radius(lat, lon, radius) :
    stats = get_schools_density_by_radius(lat, lon, radius)
    global_statut = []
    if stats:
        for school in stats:
            capacite_theorique_max = school['nbr_classe'] * CAPACITE_MAX_PAR_CLASSE
            taux = (school['total_stud'] / capacite_theorique_max) * 100
            
            if taux > 100:
                statut = "Exceeding Capacity"
            elif taux >= 95:
                statut = "High Occupancy"
            elif taux >= 80:
                statut = "Optimal"
            elif taux >= 60:
                statut = "Normal" 
            elif taux >= 40:
                statut = "Under Capacity"
            else:
                statut = "Severely Underutilized"
            global_statut.append(statut)
        status_count = Counter(global_statut)
        most_common_status = status_count.most_common(1)[0][0]
        most_common_count = status_count.most_common(1)[0][1]
        percentage = (most_common_count / len(global_statut)) * 100
        
        status_summary = {
            "Total_of_Elementary_School": len(stats),
            "Status_Recap": dict(status_count),
            "Most_common_status": most_common_status,
            "Most_common_count": most_common_count,
            "Most_common_occurence": str(round(percentage)) + "%"
        }
        return status_summary
    else:
        return None

def school_charge_city(city) :
    stats = get_school_density(city)
    global_statut = []
    if stats:
        for school in stats:
            capacite_theorique_max = school['nbr_classe'] * CAPACITE_MAX_PAR_CLASSE
            taux = (school['total_stud'] / capacite_theorique_max) * 100
            
            if taux > 100:
                statut = "Surcharge"
            elif taux >= 95:
                statut = "Proche surcharge"
            elif taux >= 80:
                statut = "Optimal"
            elif taux >= 60:
                statut = "Normal" 
            elif taux >= 40:
                statut = "Sous-utilisation"
            else:
                statut = "Très faible"
            global_statut.append(statut)
        status_count = Counter(global_statut)
        most_common_status = status_count.most_common(1)[0][0]
        most_common_count = status_count.most_common(1)[0][1]
        percentage = (most_common_count / len(global_statut)) * 100
        
        status_summary = {
            "Total_of_Elementary_School": len(stats),
            "Status_Recap": dict(status_count),
            "Most_common_status": most_common_status,
            "Most_common_count": most_common_count,
            "Most_common_occurence": str(round(percentage)) + "%"
        }
        return status_summary
    else:
        return None

# if __name__ == "__main__":
    # stats = get_school_density("Le Havre")
    # if stats:
    #     print(f"Écoles trouvées à {stats[0]['commune']} ({len(stats)} établissements):")
    #     print("{:<30} {:<10} {:<10} {:<10}".format('Commune', 'Élèves', 'Classes', 'Capacité', 'Taux Remplissage'))
    #     print("-" * 70)
        
    #     for school in stats:
    #         capacite_totale = school['nbr_classe'] * school['nbr_stud_actual']
    #         taux = (school['total_stud'] / capacite_totale) * 100
            
    #         if taux > 100:
    #             statut = "Surcharge"
    #         elif taux >= 95:
    #             statut = "Proche surcharge"
    #         elif taux >= 80:
    #             statut = "Optimal"
    #         elif taux >= 60:
    #             statut = "Normal" 
    #         elif taux >= 40:
    #             statut = "Sous-utilisation"
    #         else:
    #             statut = "Très faible"
    #         print("{:<30} {:<10} {:<10} {:<10} {:<10}".format(
    #             school['commune'],
    #             school['total_stud'],
    #             school['nbr_classe'],
    #             school['nbr_stud_actual'],
    #             statut
    #         ))
    # else:
#         print("Aucune école trouvée pour Le Havre")

# if __name__ == "__main__":
#     stats = get_schools_density_by_radius(49.489649, 0.12492, 1000)
#     if stats:
#         print(f"Écoles trouvées à {stats[0]['commune']} ({len(stats)} établissements):")
#         print("{:<30} {:<10} {:<10} {:<10}".format('Commune', 'Élèves', 'Classes', 'Capacité', 'Taux Remplissage'))
#         print("-" * 70)
        
#         for school in stats:
#             capacite_totale = school['nbr_classe'] * school['nbr_stud_actual']
#             taux = (school['total_stud'] / capacite_totale) * 100
            
#             if taux > 100:
#                 statut = "Surcharge"
#             elif taux >= 95:
#                 statut = "Proche surcharge"
#             elif taux >= 80:
#                 statut = "Optimal"
#             elif taux >= 60:
#                 statut = "Normal" 
#             elif taux >= 40:
#                 statut = "Sous-utilisation"
#             else:
#                 statut = "Très faible"
#             print("{:<30} {:<10} {:<10} {:<10} {:<10}".format(
#                 school['commune'],
#                 school['total_stud'],
#                 school['nbr_classe'],
#                 school['nbr_stud_actual'],
#                 statut
#             ))
#     else:
#         print("Aucune école trouvée pour Le Havre")