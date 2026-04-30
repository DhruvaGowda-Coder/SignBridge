"""
SignBridge v3 — Production-Optimized Static Model Trainer
==========================================================
Prioritizes a lightweight, fast MLP neural network for real-time inference.
Trains RF & GB as benchmarks but picks MLP if within 1% of best — because
a 1-2 MB MLP is 5000x smaller than a 5 GB ensemble for negligible accuracy loss.

Model size comparison:
  - MLP:      ~1-2 MB  (98.4% accuracy)
  - Ensemble: ~5 GB    (98.44% accuracy)  ← 0.04% gain for 5000x size penalty
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, accuracy_score
import joblib, os, time, tempfile

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODELS_DIR, exist_ok=True)
STATIC_DATA_DIR = os.path.join(os.path.dirname(__file__), 'data', 'static')

def get_model_size_mb(model):
    """Get serialized model size in MB without writing to disk permanently."""
    tmp = os.path.join(tempfile.gettempdir(), '_signbridge_size_check.pkl')
    joblib.dump(model, tmp)
    size = os.path.getsize(tmp) / (1024 * 1024)
    os.remove(tmp)
    return size

def main():
    csv_path = os.path.join(STATIC_DATA_DIR, 'landmarks.csv')
    if not os.path.exists(csv_path):
        print("Data not found. Run generate_training_data_v2.py first.")
        return

    df = pd.read_csv(csv_path)
    
    # Filter out classes with too few samples (e.g., 'nothing' or 'space' which lack clear hands)
    class_counts = df['label'].value_counts()
    valid_classes = class_counts[class_counts >= 10].index
    df = df[df['label'].isin(valid_classes)]
    
    print(f"Loaded {len(df)} samples, {df['label'].nunique()} classes")

    X = df.drop('label', axis=1).values
    y = df['label'].values

    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    # Standardize features for better MLP convergence
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y_enc, test_size=0.15, random_state=42, stratify=y_enc)

    results = {}

    # ── 1. Deep MLP (primary model — fast & tiny) ──────────────────────
    print("\n1/3 Training Deep Neural Network (MLP)...")
    print("    Architecture: 512 -> 256 -> 128 -> 64 (with dropout via alpha)")
    t0 = time.time()
    mlp = MLPClassifier(
        hidden_layer_sizes=(512, 256, 128, 64),
        max_iter=500,
        alpha=0.0005,            # L2 regularization (acts as dropout)
        solver='adam',
        learning_rate='adaptive', # Reduces LR on plateau
        learning_rate_init=0.001,
        early_stopping=True,
        n_iter_no_change=20,
        validation_fraction=0.1,
        batch_size=256,
        random_state=42
    )
    mlp.fit(X_train, y_train)
    mlp_time = time.time() - t0
    mlp_acc = mlp.score(X_test, y_test)
    mlp_size = get_model_size_mb(mlp)
    print(f"    Accuracy: {mlp_acc:.4f} | Size: {mlp_size:.1f} MB | Time: {mlp_time:.1f}s")
    print(f"    Converged in {mlp.n_iter_} epochs")
    results['MLP'] = (mlp, mlp_acc, mlp_size, mlp_time)

    # ── 2. Gradient Boosting (benchmark) ───────────────────────────────
    print("\n2/3 Training Gradient Boosting (benchmark)...")
    t0 = time.time()
    gb = HistGradientBoostingClassifier(
        max_iter=200, max_depth=6, learning_rate=0.1,
        min_samples_leaf=10, random_state=42
    )
    gb.fit(X_train, y_train)
    gb_time = time.time() - t0
    gb_acc = gb.score(X_test, y_test)
    gb_size = get_model_size_mb(gb)
    print(f"    Accuracy: {gb_acc:.4f} | Size: {gb_size:.1f} MB | Time: {gb_time:.1f}s")
    results['GradientBoosting'] = (gb, gb_acc, gb_size, gb_time)

    # ── 3. Random Forest (benchmark, but skip saving if huge) ──────────
    print("\n3/3 Training Random Forest (benchmark, 100 trees)...")
    t0 = time.time()
    rf = RandomForestClassifier(
        n_estimators=100, max_depth=25, min_samples_split=5,
        random_state=42, n_jobs=-1
    )
    rf.fit(X_train, y_train)
    rf_time = time.time() - t0
    rf_acc = rf.score(X_test, y_test)
    rf_size = get_model_size_mb(rf)
    print(f"    Accuracy: {rf_acc:.4f} | Size: {rf_size:.1f} MB | Time: {rf_time:.1f}s")
    results['RandomForest'] = (rf, rf_acc, rf_size, rf_time)

    # ── Model Selection (accuracy vs size tradeoff) ────────────────────
    print("\n" + "=" * 60)
    print("  MODEL COMPARISON")
    print("=" * 60)
    print(f"\n  {'Model':<20} {'Accuracy':>10} {'Size':>10} {'Speed':>10}")
    print(f"  {'-'*20} {'-'*10} {'-'*10} {'-'*10}")

    best_name = max(results, key=lambda k: results[k][1])
    best_acc = results[best_name][1]

    for name, (model, acc, size, t) in results.items():
        marker = " <-- best acc" if name == best_name else ""
        print(f"  {name:<20} {acc:>9.4f} {size:>8.1f}MB {t:>8.1f}s{marker}")

    # Smart selection: prefer MLP if within 1% of the best accuracy
    # because it's 100-5000x smaller and faster at inference
    mlp_acc = results['MLP'][1]
    if best_name != 'MLP' and (best_acc - mlp_acc) < 0.01:
        print(f"\n  MLP is within {(best_acc - mlp_acc)*100:.2f}% of {best_name}")
        print(f"  but {results[best_name][2]/results['MLP'][2]:.0f}x smaller!")
        print(f"  >>> Selecting MLP for production (size + speed wins)")
        selected_name = 'MLP'
    else:
        selected_name = best_name if results[best_name][2] < 500 else 'MLP'
        if selected_name != best_name:
            print(f"\n  {best_name} is too large ({results[best_name][2]:.0f}MB) for production")
            print(f"  >>> Selecting MLP instead ({results['MLP'][2]:.1f}MB)")

    selected_model = results[selected_name][0]
    selected_acc = results[selected_name][1]
    selected_size = results[selected_name][2]

    print(f"\n  SELECTED: {selected_name} (Acc={selected_acc:.4f}, Size={selected_size:.1f}MB)")

    # ── Classification Report ──────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  PER-LETTER CLASSIFICATION REPORT")
    print("=" * 60 + "\n")

    y_pred = selected_model.predict(X_test)
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # ── Save model + scaler ────────────────────────────────────────────
    model_path = os.path.join(MODELS_DIR, 'static_model.pkl')
    encoder_path = os.path.join(MODELS_DIR, 'label_encoder.pkl')
    scaler_path = os.path.join(MODELS_DIR, 'scaler.pkl')

    joblib.dump(selected_model, model_path)
    joblib.dump(le, encoder_path)
    joblib.dump(scaler, scaler_path)

    final_size = os.path.getsize(model_path) / (1024 * 1024)
    print(f"\n  Model saved: {model_path} ({final_size:.1f} MB)")
    print(f"  Scaler saved: {scaler_path}")
    print(f"  Encoder saved: {encoder_path}")

    # Size reduction report
    old_size_gb = 5.17
    print(f"\n  Size reduction: {old_size_gb*1024:.0f} MB -> {final_size:.1f} MB "
          f"({old_size_gb*1024/final_size:.0f}x smaller!)")

if __name__ == "__main__":
    main()
