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

		// Add scoring data if available
		if ((data as any).Score_Global || (data as any).Score_Travail) {
			yPos += 10;
			pdf.setFontSize(14);
			pdf.text('Quality of Life Scores', 20, yPos);
			yPos += 10;
			pdf.setFontSize(10);

			addLine('Global Score', (data as any).Score_Global);
			addLine('Work Score', (data as any).Score_Travail);
			addLine('Transport Score', (data as any).Score_Transport);
			addLine('Public Services Score', (data as any)["Score_Service public"]);
			addLine('Education Score', (data as any)["Score_Éducation"]);
			addLine('Commerce Score', (data as any).Score_Commerce);
			addLine('Health Score', (data as any)["Score_Santé"]);
		}

		// Add amenities data if available
		if ((data as any).Shop_nbr || (data as any).Transport_nbr) {
			yPos += 10;
			pdf.setFontSize(14);
			pdf.text('Amenities & Services', 20, yPos);
			yPos += 10;
			pdf.setFontSize(10);

			addLine('Shops', (data as any).Shop_nbr?.toString());
			addLine('Transport Options', (data as any).Transport_nbr?.toString());
			addLine('Healthcare Facilities', (data as any).Healthcare_nbr?.toString());
			addLine('Schools', (data as any).School_nbr?.toString());
			addLine('Food Stores', (data as any)["Food Store_nbr"]?.toString());
			addLine('Public Services', (data as any).Public_Services_nbr?.toString());

			if ((data as any).Train_Station_nbr !== undefined) {
				addLine('Train Stations', (data as any).Train_Station_nbr?.toString());
			}
			if ((data as any).Hospital_nbr !== undefined) {
				addLine('Hospitals', (data as any).Hospital_nbr?.toString());
			}
		}

		// Add school charge information if available
		if ((data as any).School_Charge?.Total_of_Elementary_School) {
			yPos += 10;
			pdf.setFontSize(14);
			pdf.text('School Capacity Analysis', 20, yPos);
			yPos += 10;
			pdf.setFontSize(10);

			const schoolCharge = (data as any).School_Charge;
			addLine('Total Elementary Schools', schoolCharge.Total_of_Elementary_School?.toString());
			addLine('Most Common Status', schoolCharge.Most_common_status);
			addLine('Status Occurrence', schoolCharge.Most_common_occurence);

			if (schoolCharge.Status_Recap) {
				yPos += 5;
				pdf.setFontSize(9);
				pdf.text('Status Breakdown:', 20, yPos);
				yPos += 5;

				Object.entries(schoolCharge.Status_Recap).forEach(([status, count]) => {
					pdf.text(`	${status}: ${count}`, 25, yPos);
					yPos += 5;
				});
			}
		}

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
