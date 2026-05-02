"use client";

import React from "react";

interface ControlPanelProps {
  sensitivity: number;
  setSensitivity: (val: number) => void;
  confidenceThreshold: number;
  setConfidenceThreshold: (val: number) => void;
  showSkeleton: boolean;
  setShowSkeleton: (val: boolean) => void;
}

export default function ControlPanel({
  sensitivity,
  setSensitivity,
  confidenceThreshold,
  setConfidenceThreshold,
  showSkeleton,
  setShowSkeleton
}: ControlPanelProps) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl flex flex-wrap gap-8 items-center ring-1 ring-white/10">
      
      <div className="flex flex-col gap-2 flex-grow max-w-[200px]">
        <label className="text-neutral-400 text-xs font-semibold uppercase tracking-widest flex justify-between">
          <span>Sensitivity (Frames)</span>
          <span className="text-[#00ff88]">{sensitivity}</span>
        </label>
        <input 
          type="range" 
          min="1" 
          max="15" 
          value={sensitivity}
          onChange={(e) => setSensitivity(Number(e.target.value))}
          className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#00ff88]"
          title="How many consecutive frames needed to confirm a sign"
        />
      </div>

      <div className="flex flex-col gap-2 flex-grow max-w-[200px]">
        <label className="text-neutral-400 text-xs font-semibold uppercase tracking-widest flex justify-between">
          <span>ML Strictness</span>
          <span className="text-[#00ff88]">{Math.round(confidenceThreshold * 100)}%</span>
        </label>
        <input 
          type="range" 
          min="0.30" 
          max="0.95" 
          step="0.05"
          value={confidenceThreshold}
          onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
          className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#00ff88]"
          title="Minimum confidence required for the AI to accept a gesture"
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <label className="text-neutral-300 text-sm font-medium cursor-pointer flex items-center gap-3">
          <span>Show Skeleton</span>
          <div className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={showSkeleton}
              onChange={(e) => setShowSkeleton(e.target.checked)}
            />
            <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00ff88]"></div>
          </div>
        </label>
      </div>

    </div>
  );
}
