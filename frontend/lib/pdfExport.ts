import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface LocationData {
  nom_ville: string | null;
  type_commune: string | null;
  code_postal: string | null;
  code_insee: string | null;
  population: number | null;
  superficie_km2: number | null;
  densite: number | null;
  departement: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  type_ville: string | null;
  nbr_unemployed: number | null;
  unemployment_commune: string | null;
  job_offers: number | null;
  job_offer_department: string | null;
}

interface EnhancedLocationData {
  nom_ville: string;
  type_commune: string;
  code_postal: string;
  code_insee: string;
  population: number;
  superficie_km2: number;
  densite: number;
  departement: string;
  region: string;
  latitude: number;
  longitude: number;
  type_ville: string;
  Unemployed_people?: number;
  "Proportion of unemployed"?: string;
  Job_Offer_in_Departement?: number;
  [key: string]: any; // for dynamic amenities data
}

export const exportToPDF = async (data: LocationData | EnhancedLocationData, elementId: string) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Element not found');
    }

    // Create canvas from the element
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add title
    pdf.setFontSize(20);
    pdf.text(`Location Report: ${data.nom_ville}`, 20, 20);

    // Add subtitle
    pdf.setFontSize(12);
    pdf.text(`${data.departement}, ${data.region}`, 20, 30);
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 40);

    // Add basic information
    pdf.setFontSize(14);
    pdf.text('Basic Information', 20, 55);
    pdf.setFontSize(10);

    let yPos = 65;
    const addLine = (label: string, value: string | number | null) => {
      if (value !== null && value !== undefined) {
        pdf.text(`${label}: ${value}`, 20, yPos);
        yPos += 7;
      }
    };

    addLine('City', data.nom_ville);
    addLine('Type', data.type_commune);
    addLine('Postal Code', data.code_postal);
    addLine('INSEE Code', data.code_insee);
    addLine('Population', data.population?.toLocaleString() || 'N/A');
    addLine('Area', data.superficie_km2 ? `${data.superficie_km2} km²` : 'N/A');
    addLine('Density', data.densite ? `${data.densite} per km²` : 'N/A');
    addLine('City Type', data.type_ville);

    // Employment data
    yPos += 10;
    pdf.setFontSize(14);
    pdf.text('Employment Data', 20, yPos);
    yPos += 10;
    pdf.setFontSize(10);

    addLine('Unemployed', data.nbr_unemployed?.toLocaleString() || 'N/A');
    addLine('Job Offers', data.job_offers?.toLocaleString() || 'N/A');

    // Geographic data
    yPos += 10;
    pdf.setFontSize(14);
    pdf.text('Geographic Data', 20, yPos);
    yPos += 10;
    pdf.setFontSize(10);

    addLine('Latitude', data.latitude);
    addLine('Longitude', data.longitude);

    // Add the screenshot on a new page
    pdf.addPage();
    pdf.setFontSize(14);
    pdf.text('Visual Data', 20, 20);

    // Calculate dimensions to fit the page
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const ratio = Math.min((pdfWidth - 40) / canvasWidth, (pdfHeight - 60) / canvasHeight);
    const imgWidth = canvasWidth * ratio;
    const imgHeight = canvasHeight * ratio;

    pdf.addImage(imgData, 'PNG', 20, 30, imgWidth, imgHeight);

    // Save the PDF
    pdf.save(`${data.nom_ville}_report.pdf`);

    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
