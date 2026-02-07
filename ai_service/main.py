from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from transformers import ViTForImageClassification, ViTImageProcessor
from PIL import Image
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from pathlib import Path
import torch
import io
import os
import requests
import httpx

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

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
    
# Configuration for openrouter api, this allows switching between models
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash-lite")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Defines the structure expected from the frontend
class PokemonInfo(BaseModel):
    id: int
    name: str
    types: List[str]

class AnalyzeTeamRequest(BaseModel):
    team: List[PokemonInfo]
    collection: List[PokemonInfo]

# Function to construct the formatted prompt string for the LLM
def build_strategy_prompt(team: List[PokemonInfo], collection: List[PokemonInfo]) -> str:
    team_str = ", ".join(
        [f"{p.name.capitalize()} ({'/'.join(p.types)})" for p in team]
    )
    collection_str = ", ".join(
        [f"{p.name.capitalize()} ({'/'.join(p.types)})" for p in collection]
    )
    return (
        "Actúa como un Campeón de la Liga Pokémon experto en estrategia competitiva.\n\n"
        f"Mi Equipo Actual: {team_str}\n"
        f"Mi Colección (Disponibles para intercambio): {collection_str}\n\n"
        "Análisis Requerido:\n"
        "1. Identifica la mayor debilidad de mi equipo actual (ej: débil a Eléctrico y Roca).\n"
        "2. Recomienda UN cambio específico usando SOLO Pokémon de mi colección.\n"
        "3. Explica por qué ese cambio mejora el equilibrio del equipo.\n\n"
        "Sé breve, directo y táctico. Responde en español. Máximo 150 palabras."
    )

# POST: receives the user's team and collection, builds a strategy prompt,
# sends it to OpenRouter and returns the AI analysis
@app.post("/analyze-team")
async def analyze_team(request: AnalyzeTeamRequest):
    if not OPENROUTER_API_KEY:
        return {"error": "OPENROUTER_API_KEY no configurada"}

    if len(request.team) == 0:
        return {"error": "Tu equipo está vacio"}
    prompt = build_strategy_prompt(request.team, request.collection)

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "Eres un experto estratega Pokémon de la región Kanto. Respondes siempre en español, de forma breve y táctica."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "max_tokens": 400,
        "temperature": 0.7,
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(OPENROUTER_URL, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        analysis = data["choices"][0]["message"]["content"]

        # Remove <think> tags if present
        if "<think>" in analysis:
            think_end = analysis.find("</think>")
            if think_end != -1:
                analysis = analysis[think_end + len("</think>"):].strip()
        return {"analysis": analysis}

    except httpx.HTTPStatusError as e:
        print(f"OpenRouter HTTP error: {e.response.status_code} - {e.response.text}")
        return {"error": f"Error de OpenRouter: {e.response.status_code}"}
    except httpx.TimeoutException:
        return {"error": "Timeout: El modelo tardó demasiado en responder."}
    except Exception as e:
        print(f"Error en analyze-team: {e}")
        return {"error": f"Error interno: {str(e)}"}