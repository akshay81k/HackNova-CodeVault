import joblib

model = joblib.load("model/project_classifier.pkl")
vectorizer = joblib.load("model/vectorizer.pkl")

def classify_project(text):

    vec = vectorizer.transform([text])

    prediction = model.predict(vec)[0]

    probability = model.predict_proba(vec).max()

    return prediction, probability