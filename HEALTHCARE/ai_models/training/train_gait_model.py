import os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, classification_report
import joblib

# ── training/ is inside ai_models/ so go one level up ──
BASE_DIR     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_PATH = os.path.join(BASE_DIR, "datasets", "gait", "gait-in-parkinsons-disease-1.0.0")
MODEL_PATH   = os.path.join(BASE_DIR, "saved_models", "gait_model.pkl")

print(f"📂 Dataset path: {DATASET_PATH}")
print(f"💾 Model will save to: {MODEL_PATH}")

if not os.path.exists(DATASET_PATH):
    print(f"❌ Gait dataset not found at: {DATASET_PATH}")
    exit(1)

# Col 0:  Time
# Col 1-8:  Left foot sensors  (L1–L8)
# Col 9-16: Right foot sensors (R1–R8)
# Col 17: Total left force
# Col 18: Total right force
# Files have 19 columns total (0–18)
SENSOR_COLS = list(range(1, 19))

X = []
y = []
skipped = 0

for fname in sorted(os.listdir(DATASET_PATH)):
    if not fname.endswith(".txt"):
        continue
    if fname in ("SHA256SUMS.txt", "format.txt"):
        continue

    path = os.path.join(DATASET_PATH, fname)

    try:
        df = pd.read_csv(path, sep="\t", header=None, on_bad_lines="skip")
    except Exception:
        try:
            df = pd.read_csv(path, sep=r"\s+", header=None, on_bad_lines="skip")
        except Exception:
            skipped += 1
            continue

    if df.shape[1] < 19 or len(df) < 10:
        skipped += 1
        continue

    features = []
    for col in SENSOR_COLS:
        col_data = pd.to_numeric(df.iloc[:, col], errors="coerce").dropna().values
        if len(col_data) == 0:
            features.extend([0.0, 0.0, 0.0, 0.0])
        else:
            features.extend([
                float(np.mean(col_data)),
                float(np.std(col_data)),
                float(np.min(col_data)),
                float(np.max(col_data)),
            ])

    X.append(features)

    # GaCo, JuCo, SiCo → Control = Healthy (0)
    # GaPt, JuPt, SiPt → Patient = Parkinson (1)
    if "Co" in fname[:6]:
        y.append(0)
    else:
        y.append(1)

print(f"📁 Loaded {len(X)} files  (skipped {skipped})")
print(f"   Healthy: {y.count(0)}  |  Parkinson: {y.count(1)}")
print(f"   Features per sample: {len(X[0])}")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

model = RandomForestClassifier(n_estimators=200, max_depth=15, random_state=42, n_jobs=-1)
model.fit(X_train, y_train)

preds    = model.predict(X_test)
accuracy = accuracy_score(y_test, preds)

print(f"\n✅ Gait model accuracy: {accuracy * 100:.2f}%")
print("\n📊 Classification Report:")
print(classification_report(y_test, preds, target_names=["Healthy", "Parkinson"]))

cv_scores = cross_val_score(model, X, y, cv=5, scoring="accuracy")
print(f"📈 5-Fold CV Accuracy: {cv_scores.mean() * 100:.2f}% ± {cv_scores.std() * 100:.2f}%")

os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
joblib.dump(model, MODEL_PATH)
print(f"💾 Gait model saved to: {MODEL_PATH}")