from fpdf import FPDF

def text_to_pdf(text, output_filename='output.pdf'):
	pdf = FPDF()
	pdf.add_page()

	pdf.set_font("Arial", size=11)

	for line in text.split('\n'):
		pdf.cell(0, 10, txt=line, ln=True)

	pdf.output(output_filename)
	print(f"PDF créé: {output_filename}")
	return output_filename
