import pandas as pd

def categorie_ville(population, densite):
	if population < 2000 and densite < 150:
		return "Village"
	elif population < 20000 and densite < 500:
		return "Little_City"
	elif population < 100000 and densite < 2000:
		return "Mid-sized_City"
	elif population < 500000 :
		return "Large_City"
	else:
		return "Metropolis"

def get_commune_info(nom_ville, csv_path="./data/raw/communes-france-2025.csv"):
	df = pd.read_csv(csv_path, sep=None, engine='python')
	def normalize(s):
		if pd.isna(s):
			return ""
		return (
			str(s)
			.strip()
			.lower()
			.replace('-', ' ')
			.replace('é', 'e')
			.replace('è', 'e')
			.replace('ê', 'e')
			.replace('ë', 'e')
			.replace('à', 'a')
			.replace('â', 'a')
			.replace('ä', 'a')
			.replace('ã', 'a')
			.replace('á', 'a')
			.replace('ù', 'u')
			.replace('û', 'u')
			.replace('ü', 'u')
			.replace('ú', 'u')
			.replace('ô', 'o')
			.replace('ö', 'o')
			.replace('õ', 'o')
			.replace('ó', 'o')
			.replace('ò', 'o')
			.replace('î', 'i')
			.replace('ï', 'i')
			.replace('í', 'i')
			.replace('ì', 'i')
			.replace('ç', 'c')
			.replace('ñ', 'n')
			.replace('ÿ', 'y')
			.replace('ý', 'y')
		)

	nom_ville_norm = normalize(nom_ville)
	df['NOM_COMMUNE_NORM'] = df['nom_sans_accent'].apply(normalize)

	row = df[df['NOM_COMMUNE_NORM'] == nom_ville_norm]
	if row.empty:
		row = df[df['NOM_COMMUNE_NORM'].str.contains(nom_ville_norm)]
	if not row.empty:
		row = row.iloc[0]
		infos = {
			"nom_ville": str(nom_ville),
			"type_commune": str(row["typecom_texte"]),
			"code_postal": str(int(row["code_postal"])) if not pd.isna(row["code_postal"]) else "",
			"code_insee": str(row["code_insee"]),
			"population": int(row["population"]) if not pd.isna(row["population"]) else None,
			"superficie_km2": float(row["superficie_km2"]) if not pd.isna(row["superficie_km2"]) else None,
			"densite": float(row["densite"]) if not pd.isna(row["densite"]) else None,
			"departement": str(row["dep_nom"]),
			"region": str(row["reg_nom"]),
			"latitude": float(row["latitude_centre"]) if not pd.isna(row["latitude_centre"]) else None,
			"longitude": float(row["longitude_centre"]) if not pd.isna(row["longitude_centre"]) else None,
		}
		return infos
	else:
		return None

# if __name__ == "__main__":
	# stats = get_commune_info("Bois Guillaume")
	# stats["type_ville"] = categorie_ville(stats['population'], stats['densite'])
	# for key, value in stats.items() :
		# print(key, ":", value)
