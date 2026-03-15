import joblib
import numpy as np
import cv2
from skimage.feature import hog
import pandas as pd
import os

# ── Resolve paths relative to THIS file so it works from any directory ──
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "saved_models")
DATA_DIR   = os.path.join(BASE_DIR, "datasets")

# Load models
spiral_model = joblib.load(os.path.join(MODELS_DIR, "spiral_model.pkl"))
voice_model  = joblib.load(os.path.join(MODELS_DIR, "voice_model.pkl"))
gait_model   = joblib.load(os.path.join(MODELS_DIR, "gait_model.pkl"))

print("✅ Models loaded successfully")


# ──────────────────────────────────────────────
# Spiral Prediction  (real test image)
# ──────────────────────────────────────────────
spiral_image_path = os.path.join(DATA_DIR, "spiral", "testing", "parkinson", "V01PE01.png")

image = cv2.imread(spiral_image_path, 0)
if image is None:
    raise FileNotFoundError(f"Spiral image not found: {spiral_image_path}")

image         = cv2.resize(image, (128, 128))
spiral_features = hog(image)
spiral_pred   = spiral_model.predict([spiral_features])[0]

print(f"🌀 Spiral prediction: {'Parkinson' if spiral_pred == 1 else 'Healthy'}")


# ──────────────────────────────────────────────
# Voice Prediction  (real CSV row)
# ──────────────────────────────────────────────
voice_csv_path = os.path.join(DATA_DIR, "voice", "parkinsons.data")

data   = pd.read_csv(voice_csv_path)
sample = data.drop(columns=["name", "status"]).iloc[0]

voice_pred = voice_model.predict([sample])[0]

print(f"🎙️  Voice prediction: {'Parkinson' if voice_pred == 1 else 'Healthy'}")


# ──────────────────────────────────────────────
# Gait Prediction  (real gait file instead of fake [[0.5,0.2,0.1,0.9]])
# ──────────────────────────────────────────────
gait_dir = os.path.join(DATA_DIR, "gait", "gait-in-parkinsons-disease-1.0.0")

# Pick the first .txt file available for testing
gait_file_path = None
for f in os.listdir(gait_dir):
    if f.endswith(".txt"):
        gait_file_path = os.path.join(gait_dir, f)
        break

if gait_file_path is None:
    raise FileNotFoundError(f"No gait .txt files found in {gait_dir}")

numbers = []
with open(gait_file_path, "r") as f:
    for line in f:
        for part in line.strip().split():
            try:
                numbers.append(float(part))
            except ValueError:
                pass

if len(numbers) == 0:
    raise ValueError("Gait file contained no numeric data")

data_arr      = np.array(numbers)
gait_features = [[np.mean(data_arr), np.std(data_arr), np.min(data_arr), np.max(data_arr)]]
gait_pred     = gait_model.predict(gait_features)[0]

print(f"🚶 Gait prediction: {'Parkinson' if gait_pred == 1 else 'Healthy'}")


# ──────────────────────────────────────────────
# Ensemble Final Result
# ──────────────────────────────────────────────
final_score = (spiral_pred + voice_pred + gait_pred) / 3

print("\n─────────────────────────────")
print(f"📊 Ensemble score: {final_score:.2f}")
if final_score >= 0.5:
    print("🔴 Final Result: Parkinson Detected")
else:
    print("🟢 Final Result: Healthy")
print("─────────────────────────────")