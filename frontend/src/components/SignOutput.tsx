"use client";

import React from "react";

interface SignOutputProps {
  prediction: { label: string; confidence: number } | null;
}

export default function SignOutput({ prediction }: SignOutputProps) {
  const hasPrediction = Boolean(prediction?.label && prediction.label !== "Error");
  const predictionKey = hasPrediction
    ? `${prediction?.label}-${Math.round((prediction?.confidence ?? 0) * 100)}`
    : "waiting";

  return (
    <div className="flex flex-col items-center justify-center bg-neutral-900 border border-neutral-800 rounded-xl p-8 h-full shadow-xl relative overflow-hidden ring-1 ring-white/10">
      <div className="absolute inset-0 bg-gradient-to-b from-[#00ff88]/5 to-transparent pointer-events-none" />
      
      <div className="text-center z-10 w-full flex flex-col items-center">
        <h2 className="text-neutral-400 text-sm font-semibold uppercase tracking-widest mb-6">
          Detected Sign
        </h2>
        
        <div
          key={predictionKey}
          className={`h-40 flex items-center justify-center ${hasPrediction ? "prediction-pop" : ""}`}
        >
          {hasPrediction ? (
            <span className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-[#00ff88] drop-shadow-lg">
              {prediction?.label}
            </span>
          ) : (
            <span className="text-4xl font-medium text-neutral-600">
              Waiting...
            </span>
          )}
        </div>

        <div className="w-full max-w-xs mt-8">
          <div className="flex justify-between text-xs font-medium mb-2">
            <span className="text-neutral-400">Confidence</span>
            <span className="text-[#00ff88]">
              {prediction ? Math.round(prediction.confidence * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden border border-neutral-700">
            <div 
              className={`bg-gradient-to-r from-emerald-500 to-[#00ff88] h-full rounded-full transition-all duration-300 ease-out`}
              style={{ width: `${prediction ? prediction.confidence * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
