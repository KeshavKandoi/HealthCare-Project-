import os
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib

# ── training/ is inside ai_models/ so go one level up ──
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH  = os.path.join(BASE_DIR, "datasets", "voice", "parkinsons.data")
MODEL_PATH = os.path.join(BASE_DIR, "saved_models", "voice_model.pkl")

print(f"📂 Dataset path: {DATA_PATH}")
print(f"💾 Model will save to: {MODEL_PATH}")

if not os.path.exists(DATA_PATH):
    print(f"❌ Voice dataset not found at: {DATA_PATH}")
    exit(1)

data = pd.read_csv(DATA_PATH)

X = data.drop(columns=["name", "status"])
y = data["status"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = XGBClassifier(use_label_encoder=False, eval_metric="logloss")
model.fit(X_train, y_train)

preds    = model.predict(X_test)
accuracy = accuracy_score(y_test, preds)
print(f"✅ Voice model accuracy: {accuracy * 100:.2f}%")

os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
joblib.dump(model, MODEL_PATH)
print(f"💾 Voice model saved to: {MODEL_PATH}")