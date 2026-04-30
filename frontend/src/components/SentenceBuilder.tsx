"use client";

import React, { useState } from "react";
import { Copy, Volume2, Delete, Trash2, Check } from "lucide-react";

interface SentenceBuilderProps {
  sentence: string;
  onClear: () => void;
  onBackspace: () => void;
  onSpace: () => void;
}

export default function SentenceBuilder({ sentence, onClear, onBackspace, onSpace }: SentenceBuilderProps) {
  const [copyFeedback, setCopyFeedback] = useState(false);

  const handleSpeak = () => {
    if (!sentence) return;
    if (!("speechSynthesis" in window)) {
      console.warn("Speech synthesis not supported in this browser.");
      return;
    }
    // Cancel any ongoing speech before starting new
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sentence);
    
    // Enhance professionalism of pronunciation
    utterance.rate = 0.9;  // Slightly slower for clearer, more deliberate articulation
    utterance.pitch = 1.0; // Keep pitch natural
    
    // Find the best available English voice
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      // Look for high-quality English voices
      const englishVoices = voices.filter(v => v.lang.startsWith('en'));
      
      // Heuristic for premium/natural voices available across different OS (Windows, macOS, Chrome)
      const premiumVoice = englishVoices.find(v => 
        v.name.includes('Premium') || 
        v.name.includes('Google') || 
        v.name.includes('Natural') ||
        v.name.includes('Samantha') ||
        v.name.includes('Zira') ||
        v.name.includes('Serena') ||
        v.name.includes('Ava')
      );
      
      if (premiumVoice) {
        utterance.voice = premiumVoice;
      } else if (englishVoices.length > 0) {
        utterance.voice = englishVoices[0];
      }
    }

    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = async () => {
    if (!sentence) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(sentence);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 1500);
      } else {
        console.warn("Clipboard API requires a secure context (HTTPS or localhost).");
      }
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl ring-1 ring-white/10 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-neutral-400 text-sm font-semibold uppercase tracking-widest">
          Constructed Sentence
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={handleCopy}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-300 transition-colors relative"
            title="Copy to clipboard"
            id="copy-button"
          >
            {copyFeedback ? <Check size={18} className="text-[#00ff88]" /> : <Copy size={18} />}
          </button>
          <button 
            onClick={handleSpeak}
            className="p-2 bg-[#00ff88]/20 hover:bg-[#00ff88]/30 rounded-lg text-[#00ff88] transition-colors"
            title="Speak out loud"
            id="speak-button"
          >
            <Volume2 size={18} />
          </button>
        </div>
      </div>
      
      <div className="flex-grow bg-black/50 rounded-lg p-4 min-h-[120px] max-h-[240px] overflow-y-auto text-2xl font-medium text-white break-all border border-neutral-800/50 flex items-center justify-center text-center">
        {sentence || <span className="text-neutral-600">Start signing to build a sentence...</span>}
      </div>
      
      <div className="grid grid-cols-3 gap-3 mt-4">
        <button 
          onClick={onSpace}
          className="py-3 px-4 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
          id="space-button"
        >
          <span className="text-xl">␣</span> Space
        </button>
        <button 
          onClick={onBackspace}
          className="py-3 px-4 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
          id="backspace-button"
        >
          <Delete size={18} /> Backspace
        </button>
        <button 
          onClick={onClear}
          className="py-3 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          id="clear-button"
        >
          <Trash2 size={18} /> Clear
        </button>
      </div>
    </div>
  );
}
