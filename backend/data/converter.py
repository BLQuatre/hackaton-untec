import sqlite3
import csv

conn = sqlite3.connect("data.sqlite3")
cursor = conn.cursor()

unemployed_cache = {}
job_offers_cache = {}

with open("raw/Unemployed.csv", "r", encoding="utf-8") as unemployed_file:
	unemployed_file_reader = csv.DictReader(unemployed_file, delimiter=';')
	for row in unemployed_file_reader:
		try:
			cp_commune = row["Commune"].split(' ')[-1]
			unemployed_cache[cp_commune] = int(row["nbr"].replace(' ', '')) if row["nbr"] else 0

			print(f"Processing unemployed data for commune: {cp_commune}")
		except Exception as e:
			print(f"Error processing unemployed data for commune {cp_commune}: {e}")

with open("raw/JobOffer.csv", "r", encoding="utf-8") as job_offers_file:
	job_offers_file_reader = csv.DictReader(job_offers_file, delimiter=';')
	for row in job_offers_file_reader:
		try:
			cp_dept = row["Departement"].split(' ')[-1]
			job_offers_cache[cp_dept] = int(row["nbr"].replace(' ', '')) if row["nbr"] else 0

			print(f"Processing job offers data for department: {cp_dept}")
		except Exception as e:
			print(f"Error processing job offers data for department {cp_dept}: {e}")

print("Caches created successfully.")
print("job_offers_cache:", job_offers_cache)

count = 0

try:
	cursor.execute('CREATE TABLE IF NOT EXISTS "communes" ("displayname" TEXT, "name" TEXT, "area_km2" INTEGER, "density" INTEGER, "population" INTEGER, "unemployed" INTEGER DEFAULT NULL, "job_offers" INTEGER DEFAULT NULL)')

	with open("raw/communes-france-2025.csv", "r", encoding="utf-8") as communes_file:
		communes_file_reader = csv.DictReader(communes_file, delimiter=',')

		for commune in communes_file_reader:
			# Extract necessary fields
			displayname = commune.get("nom_standard", "")
			name = commune.get("nom_sans_accent", "")
			area_km2 = commune.get("superficie_km2", 0)
			density = commune.get("densite", 0)
			population = commune.get("population", 0)
			departement = commune.get("dep_nom", "")
			code_postal = commune.get("code_postal", "")
			dept_code = commune.get("dep_code", "")

			print(f"--------------------\nProcessing commune: {displayname}")
			print(f"Details - Name: {name}, Area: {area_km2}, Density: {density}, Population: {population}, Department: {departement}, Postal Code: {code_postal}, Department Code: {dept_code}")

			# Initialize unemployed and job offers to 0
			unemployed = unemployed_cache.get(code_postal)
			job_offers = job_offers_cache.get(dept_code)

			print(f"Unemployed: {unemployed}, Job Offers: {job_offers}")

			# Prepare values for insertion
			values = (displayname, name, area_km2, density, population, unemployed, job_offers)

			# Insert into the database
			cursor.execute('INSERT INTO "communes" ("displayname", "name", "area_km2", "density", "population", "unemployed", "job_offers") VALUES (?, ?, ?, ?, ?, ?, ?)', values)

			count += 1
			print(f"Processed: {displayname} ({count})")
		conn.commit()

except Exception as e:
	print(f"An error occurred: {e}")
finally:
	conn.close()

print("Data conversion completed!")
