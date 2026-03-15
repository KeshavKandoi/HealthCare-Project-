from fastapi import FastAPI
import joblib
import cv2
import numpy as np
import pandas as pd
from skimage.feature import hog

app = FastAPI()

# Load models
spiral_model = joblib.load("saved_models/spiral_model.pkl")
voice_model = joblib.load("saved_models/voice_model.pkl")
gait_model = joblib.load("saved_models/gait_model.pkl")



@app.get("/")
def home():
    return {"message": "Parkinson AI Server Running"}


# -------- Spiral Prediction --------

@app.get("/predict/spiral")
def predict_spiral():

    image_path = "datasets/spiral/testing/parkinson/V01PE01.png"


    image = cv2.imread(image_path, 0)
    image = cv2.resize(image, (128,128))

    features = hog(image)

    prediction = spiral_model.predict([features])[0]

    return {"spiral_prediction": int(prediction)}


# -------- Voice Prediction --------

@app.get("/predict/voice")
def predict_voice():

    data = pd.read_csv("datasets/voice/parkinsons.data")


    sample = data.drop(["name","status"], axis=1).iloc[0]

    prediction = voice_model.predict([sample])[0]

    return {"voice_prediction": int(prediction)}


# -------- Gait Prediction --------

@app.get("/predict/gait")
def predict_gait():

    gait_features = [[0.5,0.2,0.1,0.9]]

    prediction = gait_model.predict(gait_features)[0]

    return {"gait_prediction": int(prediction)}


# -------- Final Parkinson Risk --------

@app.get("/predict/parkinson")

def predict_parkinson():

    spiral = 1
    voice = 1
    gait = 0

    score = (spiral + voice + gait) / 3

    if score >= 0.5:
        result = "Parkinson Detected"
    else:
        result = "Healthy"

    return {"result": result}
