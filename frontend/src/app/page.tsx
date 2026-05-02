"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import WebcamFeed from "@/components/WebcamFeed";
import SignOutput from "@/components/SignOutput";
import SentenceBuilder from "@/components/SentenceBuilder";
import ControlPanel from "@/components/ControlPanel";
import GestureHints from "@/components/GestureHints";
import { predictStatic, PredictionResult } from "@/lib/api";
import Image from "next/image";
import logo from "./icon.png";

export default function Home() {
  const [sensitivity, setSensitivity] = useState<number>(5);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.65);
  const confidenceThresholdRef = useRef(confidenceThreshold);
  
  useEffect(() => {
    confidenceThresholdRef.current = confidenceThreshold;
  }, [confidenceThreshold]);

  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);
  
  const [currentPrediction, setCurrentPrediction] = useState<PredictionResult | null>(null);
  // Separate state for ALL predictions (including low-confidence) to show in hints
  const [rawPrediction, setRawPrediction] = useState<PredictionResult | null>(null);
  const [sentence, setSentence] = useState<string>("");
  const [isHandDetected, setIsHandDetected] = useState(false);

  // ABC mode debouncing
  const recentPredictionsRef = useRef<string[]>([]);
  const isPredictingRef = useRef(false);

  // Cooldown: after confirming a letter, ignore predictions for 1 second
  const lastConfirmedLetterRef = useRef<string | null>(null);
  const differentGestureCountRef = useRef<number>(0);
  const cooldownUntilRef = useRef<number>(0);
  const handWasGoneRef = useRef<boolean>(false);

  // AbortController for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const predictionRunRef = useRef(0);
  const autoSpaceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const abortActivePrediction = useCallback(() => {
    predictionRunRef.current++;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    isPredictingRef.current = false;
  }, []);
  
  const handleLandmarks = useCallback(async (landmarks: number[]) => {
    if (landmarks.every(v => v === 0)) {
      abortActivePrediction();
      setCurrentPrediction(null);
      setRawPrediction(null);
      recentPredictionsRef.current = [];
      lastConfirmedLetterRef.current = null;
      differentGestureCountRef.current = 0;
      handWasGoneRef.current = true;

      // Start auto-space timer when hand disappears
      if (!autoSpaceTimeoutRef.current) {
        autoSpaceTimeoutRef.current = setTimeout(() => {
          setSentence(prev => (prev === "" || prev.endsWith(" ")) ? prev : prev + " ");
        }, 4500); // 4.5 seconds
      }

      return;
    }

    // Hand detected: clear any pending auto-space timer
    if (autoSpaceTimeoutRef.current) {
      clearTimeout(autoSpaceTimeoutRef.current);
      autoSpaceTimeoutRef.current = null;
    }

    if (isPredictingRef.current) return;

    // When hand reappears after being gone, add a small cooldown
    // to ignore transitional shapes
    if (handWasGoneRef.current) {
      handWasGoneRef.current = false;
      cooldownUntilRef.current = Date.now() + 500; // 500ms grace period
      recentPredictionsRef.current = [];
      return;
    }

    // If in cooldown period, skip all predictions
    if (Date.now() < cooldownUntilRef.current) {
      return;
    }

    isPredictingRef.current = true;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const runId = ++predictionRunRef.current;
    let res: PredictionResult | null = null;

    try {
      res = await predictStatic(landmarks, controller.signal);
    } finally {
      if (predictionRunRef.current === runId) {
        isPredictingRef.current = false;
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    }

    if (controller.signal.aborted || predictionRunRef.current !== runId) {
      return;
    }
    
    // Always set raw prediction for hints display
    if (res) {
      setRawPrediction(res);
    } else {
      setRawPrediction(null);
    }
    
    if (res && res.confidence > (confidenceThresholdRef.current - 0.05) && res.label.length === 1) {
      setCurrentPrediction(res);

      // If we have a locked letter, check if user changed gesture
      if (lastConfirmedLetterRef.current !== null) {
        if (res.label !== lastConfirmedLetterRef.current) {
          differentGestureCountRef.current++;
          // After 3 consecutive different-gesture frames, unlock
          if (differentGestureCountRef.current >= 3) {
            lastConfirmedLetterRef.current = null;
            differentGestureCountRef.current = 0;
          }
        } else {
          differentGestureCountRef.current = 0;
        }
      }

      // If this letter is currently locked, skip adding to sentence
      if (lastConfirmedLetterRef.current === res.label) {
        return;
      }
      
      recentPredictionsRef.current.push(res.label);
      if (recentPredictionsRef.current.length > sensitivity) {
        recentPredictionsRef.current.shift();
      }
      
      const isHighConfidence = res.confidence >= confidenceThresholdRef.current; // Dynamic UI threshold
      const reachedSensitivity = recentPredictionsRef.current.length === sensitivity;
      const matchCount = recentPredictionsRef.current.filter(val => val === res.label).length;
      const mostlySame = reachedSensitivity && (matchCount >= Math.max(1, sensitivity - 1));

      if (isHighConfidence || mostlySame) {
        setSentence(prev => prev + res.label);
        recentPredictionsRef.current = [];
        // Lock this letter + 3.5s cooldown for transition safety
        lastConfirmedLetterRef.current = res.label;
        differentGestureCountRef.current = 0;
        cooldownUntilRef.current = Date.now() + 3500; // 3.5s cooldown
      }
    } else {
      setCurrentPrediction(null);
      recentPredictionsRef.current = [];
    }
  }, [abortActivePrediction, sensitivity]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-sans selection:bg-[#00ff88] selection:text-black">
      <header className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image 
            src={logo} 
            alt="SignBridge Logo" 
            width={56} 
            height={56} 
            className="rounded-xl shadow-[0_0_20px_rgba(0,255,136,0.2)] border border-[#00ff88]/20"
          />
          <div>
            <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00ff88]">
              SignBridge
            </h1>
            <p className="text-neutral-400 mt-1 font-medium">Real-time Sign Language Translator</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column — Camera + Controls */}
          <div className="w-full lg:w-[55%] flex flex-col gap-6">
            <WebcamFeed 
              showSkeleton={showSkeleton} 
              onLandmarks={handleLandmarks}
              onHandDetected={setIsHandDetected}
            />
            <ControlPanel 
              sensitivity={sensitivity}
              setSensitivity={setSensitivity}
              confidenceThreshold={confidenceThreshold}
              setConfidenceThreshold={setConfidenceThreshold}
              showSkeleton={showSkeleton}
              setShowSkeleton={setShowSkeleton}
            />
          </div>
          
          {/* Right column — Output + Hints + Sentence */}
          <div className="w-full lg:w-[45%] flex flex-col gap-5">
            <SignOutput 
              prediction={currentPrediction} 
            />
            <GestureHints
              currentPrediction={rawPrediction}
              isHandDetected={isHandDetected}
            />
            <SentenceBuilder 
              sentence={sentence}
              onChange={setSentence}
              onClear={() => setSentence("")}
              onBackspace={() => setSentence(prev => prev.slice(0, -1))}
              onSpace={() => setSentence(prev => prev + " ")}
            />
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto mt-12 py-6 border-t border-white/10 text-center text-sm text-neutral-500">
        <p>Built with MediaPipe + ML | Helping the deaf community communicate</p>
      </footer>
    </div>
  );
}
