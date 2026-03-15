import os
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib

dataset_path = "../datasets/gait/gait-in-parkinsons-disease-1.0.0"

X = []
y = []

for file in os.listdir(dataset_path):

    if file.endswith(".txt"):

        path = os.path.join(dataset_path, file)

        numbers = []

        with open(path, "r") as f:
            for line in f:
                parts = line.strip().split()

                for p in parts:
                    try:
                        numbers.append(float(p))
                    except:
                        pass

        # Convert to numpy array
        data = np.array(numbers)

        # Skip empty files
        if len(data) == 0:
            continue

        features = [
            np.mean(data),
            np.std(data),
            np.min(data),
            np.max(data)
        ]

        X.append(features)

        if "Co" in file:
            y.append(0)
        else:
            y.append(1)

model = RandomForestClassifier()

model.fit(X, y)

joblib.dump(model, "../saved_models/gait_model.pkl")

print("Gait model trained successfully")
