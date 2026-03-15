import joblib
import numpy as np
import cv2
from skimage.feature import hog
import pandas as pd

# Load models
spiral_model = joblib.load("../saved_models/spiral_model.pkl")
voice_model = joblib.load("../saved_models/voice_model.pkl")
gait_model = joblib.load("../saved_models/gait_model.pkl")

print("Models loaded successfully")

# -------- Spiral Prediction --------
image_path = "../datasets/spiral/testing/parkinson/V01PE01.png"

image = cv2.imread(image_path, 0)
image = cv2.resize(image, (128,128))

spiral_features = hog(image)
spiral_pred = spiral_model.predict([spiral_features])[0]

print("Spiral prediction:", spiral_pred)


# -------- Voice Prediction --------
data = pd.read_csv("../datasets/voice/parkinsons.data")

sample = data.drop(["name","status"], axis=1).iloc[0]

voice_pred = voice_model.predict([sample])[0]

print("Voice prediction:", voice_pred)


# -------- Gait Prediction --------
gait_features = [[0.5,0.2,0.1,0.9]]   # example features
gait_pred = gait_model.predict(gait_features)[0]

print("Gait prediction:", gait_pred)


# -------- Final Result --------
final_score = (spiral_pred + voice_pred + gait_pred) / 3

if final_score >= 0.5:
    print("Final Result: Parkinson Detected")
else:
    print("Final Result: Healthy")
