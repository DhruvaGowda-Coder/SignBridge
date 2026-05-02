# SignBridge 🧏

A full-stack real-time Sign Language to Text web application. It uses a webcam to detect hand signs and translates them to text in real-time using ML models served via FastAPI, with a responsive Next.js frontend.

## Tech Stack
- **ML**: MediaPipe Hands, scikit-learn (Random Forest for static signs A-Z)
- **Backend**: FastAPI + uvicorn (async, thread-pool inference)
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **TTS**: Web Speech API

## Model Performance

| Model | Type | Test Accuracy |
|-------|------|---------------|
| Random Forest (static signs) | A–Z alphabet | 99.1% on held-out test set |

The static model was trained on MediaPipe hand landmark features (63 floats — 
21 keypoints × xyz, normalized relative to the wrist).

## Project Structure
- `/ml`: Python scripts for data collection and model training
- `/backend`: FastAPI server for making predictions
- `/frontend`: Next.js web application

## Setup Instructions

### 1. Machine Learning & Backend
Requirements: Python 3.9+

```bash
cd backend
pip install -r requirements.txt
```

### 2. Frontend
Requirements: Node.js 18+

```bash
cd frontend
npm install
```

## Running the Application

1. **Start the Backend Server:**
   ```bash
   cd backend
   uvicorn main:app --reload --port 8000
   ```

2. **Start the Frontend Development Server:**
   ```bash
   cd frontend
   npm run dev
   ```

The application will be available at `http://localhost:3000`.

## Data Collection & Training

> Note: Training scripts are not included in this release. The pre-trained model files
> are provided in `ml/models/` and are ready to use.

If you want to retrain the model from scratch, you would need:
1. A hand landmark dataset (collected via MediaPipe)
2. scikit-learn training pipeline targeting the static_model.pkl format

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated CORS origins |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL |
