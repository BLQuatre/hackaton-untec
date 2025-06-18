import pandas as pd
import re
import unicodedata

def normalize(text):
    if not isinstance(text, str):
        text = str(text)
    text = text.lower()
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    return text

def get_unemployed(nom_ville, csv_path="./data/raw/Unemployed.csv"):
    try :
        nom_ville_norm = normalize(nom_ville)
        df = pd.read_csv(csv_path, sep=";", encoding="utf-8")

        if 'Commune' not in df.columns or 'nbr' not in df.columns:
            print(f"Erreur: Les colonnes attendues ne sont pas présentes dans le fichier CSV")
            return None

        df['Commune'] = df['Commune'].str.strip()
        df['nbr'] = df['nbr'].astype(str).str.replace(" ", "")
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
            row = match.iloc[0]
            return {
                "commune": str(row["Commune"]),
                "nbr_unemployed": int(row["nbr"])
            }
        else:
            return None
    except Exception as e:
        print(f"Erreur lors de la recherche des données de chômage: {e}")
        return None

def get_job_offer_in_dep(nom_departement, csv_path="./data/raw/JobOffer.csv"):
    try :
        nom_departement_norm = normalize(nom_departement)
        df = pd.read_csv(csv_path, sep=";", encoding="utf-8")

        if 'Departement' not in df.columns or 'nbr' not in df.columns:
            print(f"Erreur: Les colonnes attendues ne sont pas présentes dans le fichier CSV")
            return None

        df['Departement'] = df['Departement'].str.strip()
        df['nbr'] = df['nbr'].astype(str).str.replace(" ", "")
        df['Departement_norm'] = df['Departement'].apply(normalize)

        def extract_ville_name(departement):
            match = re.match(r"(.+?)\s+\d{5}$", departement)
            return match.group(1).strip() if match else departement

        df['Departement_short'] = df['Departement'].apply(extract_ville_name)
        df['Departement_short_norm'] = df['Departement_short'].apply(normalize)

        match = df[df['Departement_norm'] == nom_departement_norm]

        if match.empty:
            match = df[df['Departement_short_norm'] == nom_departement_norm]

        if match.empty:
            match = df[df['Departement_norm'].str.contains(nom_departement_norm)]
        if not match.empty:
            row = match.iloc[0]
            return {
                "departement": str(row["Departement"]),
                "job_offer": int(row["nbr"])
            }
        else:
            return None
    except Exception as e:
        print(f"Erreur lors de la recherche des données d'offre d'emploi': {e}")
        return None


# if __name__ == "__main__":
#     stats = get_job_offer_in_dep("Seine-Maritime")
#     for key, value in stats.items() :
#         print(key, ":", value)
