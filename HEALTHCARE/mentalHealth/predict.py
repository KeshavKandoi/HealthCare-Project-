import os
import sys
import json
import joblib
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

model = joblib.load(os.path.join(BASE_DIR,"mental_model.pkl"))

data = json.loads(sys.argv[1])

columns = [
"Gender",
"Age",
"AcademicPressure",
"WorkPressure",
"StudySatisfaction",
"SleepDuration",
"DietaryHabits",
"SuicidalThoughts",
"WorkStudyHours",
"FinancialStress",
"FamilyHistory"
]

row = {}

for col in columns:

    value = data.get(col,0)

    if value == "" or value is None:
        value = 0

    row[col] = int(value)

df = pd.DataFrame([row])

prediction = model.predict(df)

print(int(prediction[0]))