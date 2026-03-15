import cv2
import joblib
from skimage.feature import hog

model = joblib.load("../saved_models/spiral_model.pkl")

image_path = "../datasets/spiral/testing/parkinson/V01PE01.png"

image = cv2.imread(image_path, 0)

image = cv2.resize(image, (128,128))

features = hog(image)

prediction = model.predict([features])

if prediction[0] == 1:
    print("Parkinson detected")
else:
    print("Healthy")
