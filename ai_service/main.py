from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from transformers import ViTForImageClassification, ViTImageProcessor
from PIL import Image
import torch
import io

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
print("Cargando modelo de IA...")
device = "cuda" if torch.cuda.is_available() else "cpu"
model_name = "imjeffhi/pokemon_classifier"

model = ViTForImageClassification.from_pretrained(model_name).to(device)
feature_extractor = ViTImageProcessor.from_pretrained(model_name)

print(f"Modelo cargado en: {device}")
# POST: receives an uploaded image file and classifies which pokemon it contains
@app.post("/classify")
async def classify_pokemon(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        
        extracted = feature_extractor(images=img, return_tensors='pt').to(device)
        logits = model(**extracted).logits
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