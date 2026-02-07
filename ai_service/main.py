from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from transformers import ViTForImageClassification, ViTImageProcessor
from PIL import Image
import torch
import io
import requests

app = FastAPI()

# Configures CORS middleware to allow cross origin requests from any domain,
# enabling the Next.js frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Loads the pre trained ViT model for pokemon classification
print("Cargando modelo ViT")
device = "cuda" if torch.cuda.is_available() else "cpu"
model_name = "imjeffhi/pokemon_classifier"
model = ViTForImageClassification.from_pretrained(model_name).to(device)
feature_extractor = ViTImageProcessor.from_pretrained(model_name)
print(f"Modelo cargado en: {device}")

# Fetches, filters and formats the list of gen 1 pokemon to limit the model's output,
# handles edge cases like Nidoran gender variations by simplifying the name
print("Descargando lista de la gen 1")
try:
    response = requests.get("https://pokeapi.co/api/v2/pokemon?limit=151")
    response.raise_for_status()
    GEN1_NAMES = {p['name'].replace("-", " ").replace(".", "") for p in response.json()['results']}
    print(f"Lista descargada: {len(GEN1_NAMES)} pokemon registrados.")
except Exception as e:
    print(f"Error conectando a pokeapi: {e}. Se usara modo sin filtro.")
    GEN1_NAMES = set()
print("Mapeando indices del modelo")
gen1_indices = []

for idx, label in model.config.id2label.items():
    clean_label = label.lower().replace("-", " ").replace(".", "")
    if "nidoran" in clean_label:
        clean_label = "nidoran"
    
    # Check if the model label exists in our API Gen 1 list
    is_gen1 = any(api_name in clean_label for api_name in GEN1_NAMES)
    
    if is_gen1:
        gen1_indices.append(idx)

allowed_indices_tensor = torch.tensor(gen1_indices).to(device)
print(f"Filtro activo: {len(gen1_indices)} etiquetas gen 1 disponibles")

# POST: receives an uploaded image file and classifies which pokemon it contains,
# if we have a filter active, set all non gen 1 logits to -infinity
@app.post("/classify")
async def classify_pokemon(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")

        extracted = feature_extractor(images=img, return_tensors='pt').to(device)
        logits = model(**extracted).logits
        
        if len(gen1_indices) > 0:
            mask = torch.full_like(logits, float('-inf'))
            mask[:, allowed_indices_tensor] = logits[:, allowed_indices_tensor]
            logits = mask

        predicted_id = logits.argmax(-1).item()
        predicted_pokemon = model.config.id2label[predicted_id]
        
        probs = torch.nn.functional.softmax(logits, dim=-1)
        confidence = probs[0][predicted_id].item()

        return {
            "pokemon": predicted_pokemon,
            "confidence": f"{confidence:.2%}"
        }
    except Exception as e:
        return {"error": str(e)}