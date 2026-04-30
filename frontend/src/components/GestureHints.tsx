"use client";

import React, { useState } from "react";

const ASL_LETTERS: Record<string, { emoji: string; description: string; tips: string }> = {
  A: { emoji: "\u270A", description: "Closed fist, thumb on the side", tips: "Keep thumb beside index finger, not on top" },
  B: { emoji: "\uD83D\uDD90\uFE0F", description: "Flat hand, fingers up, thumb tucked", tips: "All 4 fingers straight and together" },
  C: { emoji: "\uD83E\uDD32", description: "Curved hand like holding a cup", tips: "Make a C-shape with your whole hand" },
  D: { emoji: "\uD83D\uDC46", description: "Index up, others touch thumb in a circle", tips: "Other 3 fingers form an O below" },
  E: { emoji: "\uD83E\uDD0F", description: "Fingertips curled down to thumb", tips: "Like a claw - all tips touch thumb" },
  F: { emoji: "\uD83D\uDC4C", description: "OK sign - index+thumb circle, 3 fingers up", tips: "Three fingers should be straight up" },
  G: { emoji: "\uD83D\uDC49", description: "Index+thumb point sideways", tips: "Hand is horizontal, pointing to the side" },
  H: { emoji: "\uD83D\uDC49", description: "Index+middle finger point sideways", tips: "Like G but with two fingers" },
  I: { emoji: "\uD83E\uDD19", description: "Fist with pinky raised", tips: "Only the pinky finger sticks up" },
  J: { emoji: "\uD83E\uDD19", description: "Pinky up, trace a J curve", tips: "Like I but with a downward J motion" },
  K: { emoji: "\u270C\uFE0F", description: "Index up, middle angled, thumb between", tips: "Thumb touches middle finger" },
  L: { emoji: "\uD83E\uDD1F", description: "L-shape: index up + thumb out", tips: "Make a clear right angle" },
  M: { emoji: "\u270A", description: "Fist, thumb under 3 fingers", tips: "Index, middle, ring over the thumb" },
  N: { emoji: "\u270A", description: "Fist, thumb under 2 fingers", tips: "Index and middle over the thumb" },
  O: { emoji: "\u2B55", description: "All fingertips meet thumb in a circle", tips: "Form a round O shape" },
  P: { emoji: "\uD83D\uDC47", description: "Like K but pointing downward", tips: "Drop your wrist, hand points down" },
  Q: { emoji: "\uD83D\uDC47", description: "Like G but pointing downward", tips: "Index+thumb point down" },
  R: { emoji: "\uD83E\uDD1E", description: "Cross index and middle finger", tips: "Like fingers crossed" },
  S: { emoji: "\u270A", description: "Tight fist, thumb across front", tips: "Thumb wraps over the fingers" },
  T: { emoji: "\u270A", description: "Fist, thumb between index+middle", tips: "Thumb peeks out between fingers" },
  U: { emoji: "\u270C\uFE0F", description: "Index+middle up together, touching", tips: "Two fingers up and pressed together" },
  V: { emoji: "\u270C\uFE0F", description: "Peace sign - two fingers spread", tips: "Index+middle up and apart" },
  W: { emoji: "\uD83D\uDD96", description: "Three fingers up and spread", tips: "Index, middle, ring spread apart" },
  X: { emoji: "\u261D\uFE0F", description: "Index finger hooked/bent", tips: "Curl the index finger at the knuckle" },
  Y: { emoji: "\uD83E\uDD19", description: "Thumb+pinky out, others down", tips: "Hang loose / shaka sign" },
  Z: { emoji: "\u261D\uFE0F", description: "Index traces Z in the air", tips: "Draw the letter Z with your finger" },
};

interface GestureHintsProps {
  currentPrediction: { label: string; confidence: number } | null;
  isHandDetected: boolean;
}

export default function GestureHints({ currentPrediction, isHandDetected }: GestureHintsProps) {
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

  const getHintMessage = () => {
    if (!isHandDetected) {
      return { type: "warning" as const, icon: "!", title: "Show your hand", message: "Position your hand clearly in front of the camera with good lighting." };
    }
    if (!currentPrediction || currentPrediction.label === "Unknown" || currentPrediction.label === "Error") {
      return { type: "info" as const, icon: "?", title: "Sign not recognized", message: "Hold your hand sign steady. Make sure your fingers are clearly visible." };
    }
    if (currentPrediction.confidence < 0.6) {
      const hint = ASL_LETTERS[currentPrediction.label];
      return { type: "low" as const, icon: "i", title: "Low confidence: " + currentPrediction.label + " (" + Math.round(currentPrediction.confidence * 100) + "%)", message: hint ? "Tip: " + hint.tips : "Try adjusting your hand position or angle." };
    }
    if (currentPrediction.confidence >= 0.6) {
      return { type: "success" as const, icon: "OK", title: "Detected: " + currentPrediction.label, message: "Hold steady - it will be added to the sentence when confirmed." };
    }
    return null;
  };

  const hint = getHintMessage();

  const hintBgMap: Record<string, string> = {
    warning: "rgba(245, 158, 11, 0.05)",
    info: "rgba(59, 130, 246, 0.05)",
    low: "rgba(234, 179, 8, 0.05)",
    success: "rgba(0, 255, 136, 0.05)",
  };
  const hintColorMap: Record<string, string> = {
    warning: "#fbbf24",
    info: "#60a5fa",
    low: "#facc15",
    success: "#00ff88",
  };

  const signKeys = Object.keys(ASL_LETTERS);

  return (
    <div style={{ background: "#171717", border: "1px solid #262626", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}>

      {hint !== null && (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "flex-start", gap: "12px", background: hintBgMap[hint.type], color: hintColorMap[hint.type] }}>
          <span style={{ fontSize: "18px", flexShrink: 0, marginTop: "2px", fontWeight: 700 }}>{hint.icon}</span>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: "14px", margin: 0 }}>{hint.title}</p>
            <p style={{ fontSize: "12px", opacity: 0.8, marginTop: "2px", margin: 0 }}>{hint.message}</p>
          </div>
        </div>
      )}

      <div style={{ padding: "16px", borderTop: "1px solid rgba(38,38,38,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "#a3a3a3", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          <span>ASL Alphabet Reference</span>
        </div>

        <div style={{ maxHeight: "220px", overflowY: "auto", paddingRight: "4px", paddingBottom: "8px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
            {signKeys.map((letter) => {
              const isSelected = selectedLetter === letter;
              const isActive = currentPrediction !== null && currentPrediction.label === letter;
              let bg = "#262626";
              let clr = "#a3a3a3";
              let bdr = "1px solid transparent";
              if (isActive) { bg = "rgba(0,255,136,0.15)"; clr = "#00ff88"; bdr = "1px solid rgba(0,255,136,0.4)"; }
              else if (isSelected) { bg = "rgba(255,255,255,0.1)"; clr = "#fff"; bdr = "1px solid rgba(255,255,255,0.2)"; }
              return (
                <button key={letter} type="button" onClick={() => setSelectedLetter(isSelected ? null : letter)} style={{ position: "relative", padding: "8px", borderRadius: "8px", textAlign: "center", fontSize: "14px", fontWeight: 700, background: bg, color: clr, border: bdr, cursor: "pointer" }}>
                  {letter}
                </button>
              );
            })}
          </div>

          {selectedLetter !== null && ASL_LETTERS[selectedLetter] !== undefined && (
            <div style={{ marginTop: "12px", padding: "12px", background: "rgba(38,38,38,0.8)", borderRadius: "8px", border: "1px solid rgba(64,64,64,0.5)" }}>
              <div style={{ display: "flex", gap: "12px" }}>
                <img 
                  src={`/reference_images/${selectedLetter}_test.jpg`} 
                  alt={`Dataset Reference for ${selectedLetter}`} 
                  style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.2)" }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "20px" }}>{ASL_LETTERS[selectedLetter].emoji}</span>
                    <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "18px" }}>
                      {selectedLetter}
                    </span>
                  </div>
                  <p style={{ color: "#d4d4d4", fontSize: "14px", margin: 0, lineHeight: 1.4 }}>{ASL_LETTERS[selectedLetter].description}</p>
                  <p style={{ color: "#00ff88", fontSize: "12px", marginTop: "6px", margin: 0, display: "flex", alignItems: "flex-start", gap: "4px" }}>
                    <span>{ASL_LETTERS[selectedLetter].tips}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
