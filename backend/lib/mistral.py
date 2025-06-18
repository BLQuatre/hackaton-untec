import os
from mistralai import Mistral

mistralKey = os.environ.get('MISTRAL_API_KEY', 'default_api_key')
client = Mistral(api_key=mistralKey)

def getResume(data):
	chat_response = client.chat.complete(
		model= "mistral-large-latest",
		messages = [
			{
				"role": "user",
				"content": f"""
				You are a professional, pragmatic, objective, and courteous real estate analyst.
				Based on the following construction site description, assess the viability of a residential building project at that location.
				Your evaluation should consider all factors mentioned in the location description, assessing their direct or indirect impact on the residential project (quality of life, appeal, accessibility, nuisances, future value, etc.).
				Scoring system:
					Each factor should be rated based on its quality compared to a high standard of service:
					100/100 = excellent
					50/100 = average
					Below 50/100 = poor or unfavorable
				Required response format:
					[Factor name] - [Score out of 100]
					A concise explanation of the situation for that factor, without directly referencing the score, but clearly justifying it by discussing its impact on the project and surrounding environment.
				End your analysis with a brief summary outlining:
					The strengths of the site for a residential project
					The weaknesses or risks that could negatively impact viability

				Location descriptions are based on constuction site location.
				The text must be concise, objective, professional, and in French.

				Here is the location description:
				{data}
				""",
			},
		]
	)
	return chat_response.choices[0].message.content
