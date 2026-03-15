import sys
import os

# Add current directory to path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from feature_extractor import extract_features
from classifier import classify_project

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: Missing zip file path", file=sys.stderr)
        sys.exit(1)
        
    zip_path = sys.argv[1]
    
    try:
        text = extract_features(zip_path)
        category, confidence = classify_project(text)
        print(f"{category}|{confidence}")
    except Exception as e:
        print(f"Error processing {zip_path}: {str(e)}", file=sys.stderr)
        sys.exit(1)
