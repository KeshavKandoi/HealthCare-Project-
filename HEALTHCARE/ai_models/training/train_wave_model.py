import os
import cv2
import numpy as np
from skimage.feature import hog
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib

# ── training/ is inside ai_models/ so go one level up ──
BASE_DIR     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_PATH = os.path.join(BASE_DIR, "datasets", "wave", "training")
MODEL_PATH   = os.path.join(BASE_DIR, "saved_models", "wave_model.pkl")

print(f"📂 Dataset path: {DATASET_PATH}")
print(f"💾 Model will save to: {MODEL_PATH}")

X = []
y = []

for label in ["healthy", "parkinson"]:
    folder = os.path.join(DATASET_PATH, label)

    if not os.path.exists(folder):
        print(f"⚠️  Folder not found: {folder}")
        continue

    for img_name in os.listdir(folder):
        if not img_name.lower().endswith((".png", ".jpg", ".jpeg")):
            continue

        path  = os.path.join(folder, img_name)
        image = cv2.imread(path, 0)

        if image is None:
            print(f"⚠️  Skipping unreadable file: {path}")
            continue

        image    = cv2.resize(image, (128, 128))
        features = hog(image)

        flipped          = cv2.flip(image, 1)
        flipped_features = hog(flipped)

        X.append(features)
        y.append(0 if label == "healthy" else 1)

        X.append(flipped_features)
        y.append(0 if label == "healthy" else 1)

print(f"📁 Loaded {len(X)} images (with augmentation) — {y.count(0)} healthy, {y.count(1)} parkinson")

if len(X) == 0:
    print("❌ No images found. Check that datasets/wave/training/healthy and datasets/wave/training/parkinson exist.")
    exit(1)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

model = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42)
model.fit(X_train, y_train)

preds    = model.predict(X_test)
accuracy = accuracy_score(y_test, preds)

print(f"\n✅ Wave model accuracy: {accuracy * 100:.2f}%")
print("\n📊 Classification Report:")
print(classification_report(y_test, preds, target_names=["Healthy", "Parkinson"]))

os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
joblib.dump(model, MODEL_PATH)
print(f"💾 Wave model saved to: {MODEL_PATH}")