# app.py
from flask import Flask, request, jsonify
from transformers import AutoImageProcessor, AutoModelForImageClassification
from PIL import Image
import io
import torch

MODEL_ID = "Ateeqq/ai-vs-human-image-detector"

app = Flask(__name__)

# Load once at startup
processor = AutoImageProcessor.from_pretrained(MODEL_ID)
model = AutoModelForImageClassification.from_pretrained(MODEL_ID)
model.eval()


def run_inference(image_bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)[0].tolist()
    # Map labels (model.config.id2label might be like {0: "real", 1: "ai"})
    labels = [model.config.id2label[i]
              for i in sorted(model.config.id2label.keys())]
    return dict(zip(labels, probs))


@app.route("/detect", methods=["POST"])
def detect():
    if "file" not in request.files:
        return jsonify({"error": "Missing file parameter"}), 400
    file = request.files["file"]
    try:
        result = run_inference(file.read())
        return jsonify({"ok": True, "result": result})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True})


if __name__ == "__main__":
    # For local dev only
    app.run(host="0.0.0.0", port=8080)
