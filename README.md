# SignBridge 🧏

A full-stack real-time Sign Language to Text web application. It uses a webcam to detect hand signs and translates them to text in real-time using ML models served via FastAPI, with a responsive Next.js frontend.

## Tech Stack
- **ML**: MediaPipe Hands, scikit-learn (Random Forest for static signs), TensorFlow/Keras (LSTM for dynamic signs)
- **Backend**: FastAPI + uvicorn (async, thread-pool inference)
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **TTS**: Web Speech API

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

If you want to train your own models:

1. **Static Signs (A-Z)**
   ```bash
   python ml/collect_static.py
   python ml/train_static.py
   ```

2. **Dynamic Signs (Words)**
   ```bash
   python ml/collect_dynamic.py
   python ml/train_dynamic.py
   ```

Ensure the models are saved in `ml/models/` before starting the backend.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated CORS origins |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL |
