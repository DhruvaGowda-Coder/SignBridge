# 🤟 SignBridge — Real-Time ASL Translator

Full-stack real-time Sign Language to Text web application that enables communication for deaf and hard-of-hearing users using computer vision and machine learning.

---

## 🌐 Live Demo

👉 https://sign-bridge-jade.vercel.app/

---

## 🎯 Problem Solved

Communication between sign language users and non-signers is often difficult in real-time situations such as conversations, classrooms, or public interactions.

---

## 💡 Solution

SignBridge uses a webcam-based hand tracking system powered by MediaPipe and machine learning models to detect hand gestures and translate them into text and speech in real time.

---

## ✨ Key Features

* Real-time hand gesture detection using webcam
* Supports **A–Z static ASL alphabet recognition**
* Instant text output with speech synthesis (Web Speech API)
* Stable predictions for continuous input
* Low-latency full-stack pipeline

---

## 🧠 How It Works

Webcam Input → MediaPipe Hand Tracking → 63-Feature Vector → ML Model → Text Output → Speech Output

---

## 📊 Model Performance

| Model         | Type             | Accuracy |
| ------------- | ---------------- | -------- |
| Random Forest | A–Z static signs | ~99.1%   |

* Input features: **63 values (21 landmarks × xyz coordinates)**
* Normalized relative to wrist for stable predictions

---

## 🏗️ Tech Stack

* **Machine Learning**: MediaPipe Hands, scikit-learn (Random Forest)
* **Backend**: FastAPI + Uvicorn (async + thread-pooled inference)
* **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS
* **Speech**: Web Speech API

---

## 🧩 Architecture

Frontend (Next.js) → Webcam Stream → Landmark Extraction → FastAPI Backend → ML Model → Prediction → UI + Speech Output

---

## 📁 Project Structure

* `/ml` → Data processing and model training
* `/backend` → FastAPI server for inference
* `/frontend` → Next.js web application

---

## 🚀 Run Locally

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🔧 Environment Variables

### Backend (`backend/.env`)

```
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

---

### Frontend

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📌 Notes

* Pre-trained model is included and ready to use
* Designed for real-time performance and low latency
* Can be extended to dynamic gestures and full sign language sentences

---

## 🎯 Impact

* Enables accessible communication for deaf and hard-of-hearing users
* Demonstrates real-time AI + computer vision in web applications
* Combines ML, backend APIs, and frontend into a complete system

---
