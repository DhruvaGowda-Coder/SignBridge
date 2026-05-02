import os
import logging
import joblib
import numpy as np

logger = logging.getLogger("signbridge.predictor")

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ml', 'models')

class StaticPredictor:
    def __init__(self):
        self.model = None
        self.label_encoder = None
        self.scaler = None
        self._load_models()

    def _load_models(self):
        model_path = os.path.join(MODELS_DIR, 'static_model.pkl')
        encoder_path = os.path.join(MODELS_DIR, 'label_encoder.pkl')
        scaler_path = os.path.join(MODELS_DIR, 'scaler.pkl')
        try:
            self.model = joblib.load(model_path)
            self.label_encoder = joblib.load(encoder_path)
            model_size = os.path.getsize(model_path) / (1024 * 1024)
            logger.info("Static model loaded (%s, %.1f MB) from %s",
                        type(self.model).__name__, model_size, MODELS_DIR)
        except FileNotFoundError:
            logger.warning("Static model files not found at %s. Run training first.", MODELS_DIR)
        except Exception as e:
            logger.error("Error loading static models: %s", e, exc_info=True)

        # Load scaler if available (needed for MLP models trained with StandardScaler)
        try:
            self.scaler = joblib.load(scaler_path)
            logger.info("Feature scaler loaded from %s", scaler_path)
        except FileNotFoundError:
            logger.info("No scaler found — using raw features (backward compatible)")
        except Exception as e:
            logger.error("Error loading scaler: %s", e, exc_info=True)

    def predict(self, landmarks: list[float]) -> dict:
        if self.model is None or self.label_encoder is None:
            return {"label": "Unknown", "confidence": 0.0}
            
        try:
            # Reshape to 2D array for sklearn
            X = np.array([landmarks])
            
            # Apply feature scaling if scaler is available
            if self.scaler is not None:
                X = self.scaler.transform(X)
            
            # Predict
            pred_idx = self.model.predict(X)[0]
            label = self.label_encoder.inverse_transform([pred_idx])[0]
            
            # Get confidence if available
            confidence = 1.0
            if hasattr(self.model, "predict_proba"):
                probs = self.model.predict_proba(X)[0]
                confidence = float(np.max(probs))
                
            label_str = str(label)
            # Hard filter: if label is a word (length > 1), ignore it
            if len(label_str) > 1:
                return {"label": "Unknown", "confidence": 0.0}
                
            return {"label": label_str, "confidence": float(confidence)}
        except Exception as e:
            logger.error("Static prediction error: %s", e, exc_info=True)
            return {"label": "Error", "confidence": 0.0}
