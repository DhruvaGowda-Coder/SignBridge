import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import os

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODELS_DIR, exist_ok=True)
STATIC_DATA_DIR = os.path.join(os.path.dirname(__file__), 'data', 'static')

def main():
    csv_path = os.path.join(STATIC_DATA_DIR, 'landmarks.csv')
    if not os.path.exists(csv_path):
        print("Data not found. Run collect_static.py first.")
        return
        
    df = pd.read_csv(csv_path)
    X = df.drop('label', axis=1).values
    y = df['label'].values
    
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)
    
    print("Training Random Forest...")
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(X_train, y_train)
    rf_acc = rf.score(X_test, y_test)
    print(f"Random Forest Accuracy: {rf_acc:.4f}")
    
    print("Training SVM...")
    svm = SVC(kernel='rbf', probability=True, random_state=42)
    svm.fit(X_train, y_train)
    svm_acc = svm.score(X_test, y_test)
    print(f"SVM Accuracy: {svm_acc:.4f}")
    
    best_model = rf if rf_acc >= svm_acc else svm
    print(f"Saving {type(best_model).__name__} as the best model.")
    
    y_pred = best_model.predict(X_test)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    joblib.dump(best_model, os.path.join(MODELS_DIR, 'static_model.pkl'))
    joblib.dump(le, os.path.join(MODELS_DIR, 'label_encoder.pkl'))
    print("Models saved.")

if __name__ == "__main__":
    main()
