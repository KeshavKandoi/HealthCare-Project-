import pandas as pd
import joblib

model = joblib.load("../saved_models/voice_model.pkl")

data = pd.read_csv("../datasets/voice/parkinsons.data")

sample = data.drop(["name","status"], axis=1).iloc[0]

prediction = model.predict([sample])

print("Prediction:", prediction[0])
