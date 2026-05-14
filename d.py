import google.generativeai as genai

genai.configure(api_key="AIzaSyCylSFYzQWv-3u2uXAdoZc_9c3Hmu45cVU")

models = genai.list_models()

for m in models:
    print(m.name, m.supported_generation_methods)