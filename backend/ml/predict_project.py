from feature_extractor import extract_features
from classifier import classify_project

zip_file = "sample_projects/project.zip"

text = extract_features(zip_file)

category, confidence = classify_project(text)

print("Predicted Category:", category)
print("Confidence:", confidence)