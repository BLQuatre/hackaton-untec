from rest_framework import serializers
from .models import CommuneData, UnemploymentData, JobOfferData

# Create your serializers here.

class CommuneDataSerializer(serializers.ModelSerializer):
	class Meta:
		model = CommuneData
		fields = '__all__'


class UnemploymentDataSerializer(serializers.ModelSerializer):
	class Meta:
		model = UnemploymentData
		fields = '__all__'


class JobOfferDataSerializer(serializers.ModelSerializer):
	class Meta:
		model = JobOfferData
		fields = '__all__'


class CitySearchResultSerializer(serializers.Serializer):
	"""Serializer for combined city search results"""
	# Commune information
	nom_ville = serializers.CharField()
	type_commune = serializers.CharField(allow_blank=True)
	code_postal = serializers.CharField(allow_blank=True)
	code_insee = serializers.CharField(allow_blank=True)
	population = serializers.IntegerField(allow_null=True)
	superficie_km2 = serializers.FloatField(allow_null=True)
	densite = serializers.FloatField(allow_null=True)
	departement = serializers.CharField(allow_blank=True)
	region = serializers.CharField(allow_blank=True)
	latitude = serializers.FloatField(allow_null=True)
	longitude = serializers.FloatField(allow_null=True)
	type_ville = serializers.CharField(allow_blank=True)

	# Unemployment data
	nbr_unemployed = serializers.IntegerField(allow_null=True)
	unemployment_commune = serializers.CharField(allow_blank=True)

	# Job offer data
	job_offers = serializers.IntegerField(allow_null=True)
	job_offer_department = serializers.CharField(allow_blank=True)
