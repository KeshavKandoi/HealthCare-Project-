import os
import cv2
import numpy as np
from skimage.feature import hog
from sklearn.ensemble import RandomForestClassifier
import joblib

dataset_path = "datasets/spiral/training"

X = []
y = []

for label in ["healthy", "parkinson"]:
    
    folder = os.path.join(dataset_path, label)

    for img in os.listdir(folder):

        path = os.path.join(folder, img)

        image = cv2.imread(path, 0)

        image = cv2.resize(image, (128,128))

        features = hog(image)

        X.append(features)

        if label == "healthy":
            y.append(0)
        else:
            y.append(1)

model = RandomForestClassifier()

model.fit(X, y)

joblib.dump(model, "saved_models/spiral_model.pkl")

print("Spiral model trained successfully")
