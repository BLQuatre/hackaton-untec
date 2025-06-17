from django.db import models

# Create your models here.

class CommuneData(models.Model):
    """Model to store commune data for caching purposes"""
    nom_ville = models.CharField(max_length=200)
    type_commune = models.CharField(max_length=100, blank=True)
    code_postal = models.CharField(max_length=10, blank=True)
    code_insee = models.CharField(max_length=10, blank=True)
    population = models.IntegerField(null=True, blank=True)
    superficie_km2 = models.FloatField(null=True, blank=True)
    densite = models.FloatField(null=True, blank=True)
    departement = models.CharField(max_length=100, blank=True)
    region = models.CharField(max_length=100, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    type_ville = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('nom_ville', 'code_insee')
        indexes = [
            models.Index(fields=['nom_ville']),
            models.Index(fields=['code_postal']),
            models.Index(fields=['departement']),
        ]

    def __str__(self):
        return f"{self.nom_ville} ({self.code_postal})"


class UnemploymentData(models.Model):
    """Model to store unemployment data for caching purposes"""
    commune = models.CharField(max_length=200)
    nbr_unemployed = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['commune']),
        ]

    def __str__(self):
        return f"{self.commune}: {self.nbr_unemployed} unemployed"


class JobOfferData(models.Model):
    """Model to store job offer data for caching purposes"""
    departement = models.CharField(max_length=200)
    job_offer = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['departement']),
        ]

    def __str__(self):
        return f"{self.departement}: {self.job_offer} job offers"
