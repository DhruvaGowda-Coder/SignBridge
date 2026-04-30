"""
SignBridge — Comprehensive Dataset & Model Audit
=================================================
Analyzes:
  1. Dataset quality (distribution, feature stats, inter-class separation)
  2. Model accuracy (per-letter precision, recall, F1, confusion matrix)
  3. Most confused letter pairs
  4. Real-world readiness score
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score,
    precision_recall_fscore_support
)
from scipy.spatial.distance import cdist
import joblib
import os
import sys
import warnings
warnings.filterwarnings('ignore')

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
STATIC_DATA_DIR = os.path.join(os.path.dirname(__file__), 'data', 'static')

def separator(title):
    print(f"\n{'='*65}")
    print(f"  {title}")
    print(f"{'='*65}\n")

def main():
    csv_path = os.path.join(STATIC_DATA_DIR, 'landmarks.csv')
    if not os.path.exists(csv_path):
        print("ERROR: landmarks.csv not found. Generate data first.")
        return

    # ─────────────────────────────────────────────
    # 1. LOAD & INSPECT DATASET
    # ─────────────────────────────────────────────
    separator("1. DATASET OVERVIEW")
    
    df = pd.read_csv(csv_path)
    n_samples, n_features = df.shape[0], df.shape[1] - 1  # minus label column
    n_classes = df['label'].nunique()
    
    print(f"  Total samples .......... {n_samples:,}")
    print(f"  Features per sample .... {n_features} (21 landmarks x 3 coords)")
    print(f"  Classes ................ {n_classes}")
    print(f"  File size .............. {os.path.getsize(csv_path) / (1024*1024):.1f} MB")
    
    # ─────────────────────────────────────────────
    # 2. CLASS DISTRIBUTION
    # ─────────────────────────────────────────────
    separator("2. CLASS DISTRIBUTION (Samples per Letter)")
    
    class_counts = df['label'].value_counts().sort_index()
    min_count = class_counts.min()
    max_count = class_counts.max()
    mean_count = class_counts.mean()
    
    for letter, count in class_counts.items():
        bar_len = int(20 * count / max_count)
        bar = '#' * bar_len + '.' * (20 - bar_len)
        flag = " << LOW" if count < mean_count * 0.7 else ""
        print(f"  {letter}: [{bar}] {count:>6}{flag}")
    
    imbalance_ratio = max_count / min_count
    print(f"\n  Min: {min_count} | Max: {max_count} | Mean: {mean_count:.0f}")
    print(f"  Imbalance ratio: {imbalance_ratio:.2f}x", end="")
    if imbalance_ratio < 1.2:
        print(" [OK] Perfectly balanced")
    elif imbalance_ratio < 2.0:
        print(" [WARN] Slightly imbalanced")
    else:
        print(" [FAIL] Significantly imbalanced")

    # ─────────────────────────────────────────────
    # 3. FEATURE STATISTICS
    # ─────────────────────────────────────────────
    separator("3. FEATURE QUALITY CHECK")
    
    X = df.drop('label', axis=1).values
    y = df['label'].values
    
    # Check for NaN/Inf
    nan_count = np.sum(np.isnan(X))
    inf_count = np.sum(np.isinf(X))
    print(f"  NaN values ............. {nan_count}", "OK" if nan_count == 0 else "FAIL")
    print(f"  Inf values ............. {inf_count}", "OK" if inf_count == 0 else "FAIL")
    
    # Feature range
    print(f"  Feature range .......... [{X.min():.4f}, {X.max():.4f}]")
    print(f"  Feature mean ........... {X.mean():.6f}")
    print(f"  Feature std ............ {X.std():.4f}")
    
    # Check for constant/near-constant features
    feature_stds = X.std(axis=0)
    low_var_features = np.sum(feature_stds < 0.001)
    print(f"  Low-variance features .. {low_var_features}/{n_features}", 
          "OK" if low_var_features == 0 else f"WARNING ({low_var_features} features have near-zero variance)")
    
    # Check normalization quality
    wrist_features = X[:, :3]  # x0, y0, z0 (wrist)
    wrist_near_zero = np.mean(np.abs(wrist_features) < 0.01)
    print(f"  Wrist normalization .... {wrist_near_zero*100:.1f}% near zero", 
          "OK" if wrist_near_zero > 0.8 else "WARNING Wrist not well-centered")

    # ─────────────────────────────────────────────
    # 4. INTER-CLASS SEPARATION ANALYSIS
    # ─────────────────────────────────────────────
    separator("4. INTER-CLASS SEPARATION (Centroid Distances)")
    
    le = LabelEncoder()
    y_enc = le.fit_transform(y)
    
    # Compute class centroids
    classes = le.classes_
    centroids = np.array([X[y == c].mean(axis=0) for c in classes])
    
    # Pairwise centroid distances
    dist_matrix = cdist(centroids, centroids, 'euclidean')
    np.fill_diagonal(dist_matrix, np.inf)
    
    # Find most confusable pairs (smallest distances)
    n_pairs = 10
    pair_dists = []
    for i in range(len(classes)):
        for j in range(i+1, len(classes)):
            pair_dists.append((classes[i], classes[j], dist_matrix[i, j]))
    pair_dists.sort(key=lambda x: x[2])
    
    print("  Top 10 MOST CONFUSABLE letter pairs (smallest centroid distance):\n")
    print(f"  {'Pair':<8} {'Distance':>10}  {'Risk Level'}")
    print(f"  {'-'*8} {'-'*10}  {'-'*15}")
    for a, b, d in pair_dists[:n_pairs]:
        risk = "[HIGH]" if d < 0.3 else ("[MEDIUM]" if d < 0.6 else "[LOW]")
        print(f"  {a}-{b:<6} {d:>10.4f}  {risk}")
    
    # Overall separation score
    avg_min_dist = np.mean([min(dist_matrix[i, j] for j in range(len(classes)) if j != i) for i in range(len(classes))])
    print(f"\n  Average minimum inter-class distance: {avg_min_dist:.4f}")

    # ─────────────────────────────────────────────
    # 5. INTRA-CLASS VARIANCE
    # ─────────────────────────────────────────────
    separator("5. INTRA-CLASS VARIANCE (Diversity Within Each Letter)")
    
    intra_vars = {}
    for c in classes:
        class_data = X[y == c]
        var = np.mean(np.var(class_data, axis=0))
        intra_vars[c] = var
    
    sorted_vars = sorted(intra_vars.items(), key=lambda x: x[1])
    
    print(f"  {'Letter':<8} {'Variance':>10}  {'Assessment'}")
    print(f"  {'-'*8} {'-'*10}  {'-'*20}")
    for letter, var in sorted_vars:
        if var < 0.005:
            assessment = "[WARN] Too uniform (overfit risk)"
        elif var > 0.15:
            assessment = "[WARN] Very high (noisy?)"
        else:
            assessment = "[OK] Good diversity"
        print(f"  {letter:<8} {var:>10.6f}  {assessment}")

    # ─────────────────────────────────────────────
    # 6. MODEL ACCURACY (LOAD & EVALUATE)
    # ─────────────────────────────────────────────
    separator("6. MODEL PERFORMANCE EVALUATION")
    
    model_path = os.path.join(MODELS_DIR, 'static_model.pkl')
    encoder_path = os.path.join(MODELS_DIR, 'label_encoder.pkl')
    
    if not os.path.exists(model_path):
        print("  [FAIL] No trained model found! Run train_static.py first.")
        return
    
    model = joblib.load(model_path)
    model_le = joblib.load(encoder_path)
    model_type = type(model).__name__
    model_size_mb = os.path.getsize(model_path) / (1024*1024)
    
    print(f"  Model type ........... {model_type}")
    print(f"  Model size ........... {model_size_mb:.1f} MB")
    
    # Encode with the model's label encoder
    y_model_enc = model_le.transform(y)
    
    # Train/test split (same random state as training)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_model_enc, test_size=0.15, random_state=42, stratify=y_model_enc)
    
    # Overall accuracy
    y_pred = model.predict(X_test)
    overall_acc = accuracy_score(y_test, y_pred)
    
    print(f"\n  Overall Test Accuracy ... {overall_acc*100:.2f}%", end="")
    if overall_acc >= 0.95:
        print(" [EXCELLENT]")
    elif overall_acc >= 0.85:
        print(" [GOOD]")
    elif overall_acc >= 0.70:
        print(" [FAIR]")
    else:
        print(" [POOR]")
    
    # Cross-validation
    print("\n  Running 5-Fold Cross-Validation...")
    try:
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_scores = cross_val_score(model, X, y_model_enc, cv=cv, scoring='accuracy', n_jobs=-1)
        print(f"  CV Accuracy ............ {cv_scores.mean()*100:.2f}% (±{cv_scores.std()*100:.2f}%)")
        print(f"  CV Fold Scores ......... {', '.join(f'{s*100:.1f}%' for s in cv_scores)}")
    except Exception as e:
        print(f"  CV Skipped (model too large): {e}")

    # ─────────────────────────────────────────────
    # 7. PER-LETTER CLASSIFICATION REPORT
    # ─────────────────────────────────────────────
    separator("7. PER-LETTER CLASSIFICATION REPORT")
    
    precision, recall, f1, support = precision_recall_fscore_support(
        y_test, y_pred, labels=range(len(model_le.classes_)))
    
    print(f"  {'Letter':<8} {'Precision':>10} {'Recall':>10} {'F1-Score':>10} {'Support':>8}  {'Status'}")
    print(f"  {'-'*8} {'-'*10} {'-'*10} {'-'*10} {'-'*8}  {'-'*12}")
    
    weak_letters = []
    for i, letter in enumerate(model_le.classes_):
        status = "[OK]" if f1[i] >= 0.90 else ("[WARN]" if f1[i] >= 0.75 else "[WEAK]")
        if f1[i] < 0.90:
            weak_letters.append((letter, f1[i]))
        print(f"  {letter:<8} {precision[i]:>10.4f} {recall[i]:>10.4f} {f1[i]:>10.4f} {support[i]:>8}  {status}")
    
    # ─────────────────────────────────────────────
    # 8. MOST CONFUSED PAIRS (FROM CONFUSION MATRIX)
    # ─────────────────────────────────────────────
    separator("8. ACTUAL CONFUSION PAIRS (From Predictions)")
    
    cm = confusion_matrix(y_test, y_pred)
    
    # Find top misclassifications
    confusions = []
    for i in range(len(model_le.classes_)):
        for j in range(len(model_le.classes_)):
            if i != j and cm[i][j] > 0:
                confusions.append((model_le.classes_[i], model_le.classes_[j], cm[i][j]))
    confusions.sort(key=lambda x: -x[2])
    
    if confusions:
        print(f"  {'True -> Predicted':<20} {'Count':>8}  {'Severity'}")
        print(f"  {'-'*20} {'-'*8}  {'-'*12}")
        for true_l, pred_l, count in confusions[:15]:
            severity = "[CRITICAL]" if count > 20 else ("[WARNING]" if count > 5 else "[MINOR]")
            print(f"  {true_l} -> {pred_l:<16} {count:>8}  {severity}")
    else:
        print("  No misclassifications found! Perfect accuracy.")

    # ─────────────────────────────────────────────
    # 9. OVERALL RATING
    # ─────────────────────────────────────────────
    separator("9. OVERALL ASSESSMENT")
    
    # Calculate composite score
    scores = {
        'Class Balance': min(1.0, 1.0 / imbalance_ratio * 1.2),
        'Data Cleanliness': 1.0 if (nan_count == 0 and inf_count == 0) else 0.5,
        'Inter-class Separation': min(1.0, avg_min_dist / 0.5),
        'Model Accuracy': overall_acc,
        'Weakest Letter F1': min(f1) if len(f1) > 0 else 0,
    }
    
    print(f"  {'Metric':<25} {'Score':>8}  {'Grade'}")
    print(f"  {'-'*25} {'-'*8}  {'-'*8}")
    for metric, score in scores.items():
        grade = "A+" if score >= 0.95 else ("A" if score >= 0.90 else ("B" if score >= 0.80 else ("C" if score >= 0.70 else "D")))
        print(f"  {metric:<25} {score*100:>7.1f}%  {grade}")
    
    composite = np.mean(list(scores.values()))
    
    print(f"\n  {'-'*45}")
    print(f"  COMPOSITE SCORE: {composite*100:.1f}% / 100%")
    
    if composite >= 0.95:
        print("  ***** PRODUCTION READY - Excellent dataset & model")
    elif composite >= 0.85:
        print("  ****  VERY GOOD - Minor improvements possible")
    elif composite >= 0.75:
        print("  ***   GOOD - Some letter pairs need attention")
    elif composite >= 0.60:
        print("  **    FAIR - Significant improvements needed")
    else:
        print("  *     POOR - Major rework required")
    
    if weak_letters:
        print(f"\n  WEAK LETTERS TO IMPROVE:")
        for letter, score in sorted(weak_letters, key=lambda x: x[1]):
            print(f"     {letter}: F1={score:.3f}")
    
    print()

if __name__ == "__main__":
    main()
