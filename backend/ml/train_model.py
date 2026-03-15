import pandas as pd
import joblib

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# Load dataset
data = pd.read_csv("dataset/dataset.csv")

texts = data["text"]
labels = data["label"]

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    texts,
    labels,
    test_size=0.2,
    stratify=labels,
    random_state=42
)

# TF-IDF vectorization
vectorizer = TfidfVectorizer(
    ngram_range=(1,2),
    stop_words="english",
    max_features=10000
)

X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)

# ML model
model = LogisticRegression(max_iter=2000)

model.fit(X_train_vec, y_train)

# predictions
y_pred = model.predict(X_test_vec)

print("Accuracy:", accuracy_score(y_test, y_pred))
print(classification_report(y_test, y_pred))

# save model
joblib.dump(model, "model/project_classifier.pkl")
joblib.dump(vectorizer, "model/vectorizer.pkl")

print("Model saved.")