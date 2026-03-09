
import os
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

dataset_path = os.path.join(BASE_DIR,"dataset","student_depression_dataset.csv")

df = pd.read_csv(dataset_path)

# drop id column
df = df.drop("id",axis=1)

# encode text columns
encoder = LabelEncoder()

for col in df.columns:
    if df[col].dtype == "object":
        df[col] = encoder.fit_transform(df[col])

# features
X = df[[
"Gender",
"Age",
"Academic Pressure",
"Work Pressure",
"Study Satisfaction",
"Sleep Duration",
"Dietary Habits",
"Have you ever had suicidal thoughts ?",
"Work/Study Hours",
"Financial Stress",
"Family History of Mental Illness"
]]

# target
y = df["Depression"]

model = RandomForestClassifier()

model.fit(X,y)

joblib.dump(model,os.path.join(BASE_DIR,"mental_model.pkl"))

print("Model trained successfully")