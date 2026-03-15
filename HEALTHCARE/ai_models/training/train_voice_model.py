import pandas as pd
from xgboost import XGBClassifier
import joblib

data = pd.read_csv("../datasets/voice/parkinsons.data")

X = data.drop(["name","status"], axis=1)
y = data["status"]

model = XGBClassifier()

model.fit(X,y)

joblib.dump(model,"../saved_models/voice_model.pkl")

print("Voice model trained successfully")
