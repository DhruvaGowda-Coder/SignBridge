"use client";

import React, { useState, useEffect } from "react";
import { Copy, Volume2, Delete, Trash2, Check } from "lucide-react";

interface SentenceBuilderProps {
  sentence: string;
  onChange: (val: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  onSpace: () => void;
}

export default function SentenceBuilder({ sentence, onChange, onClear, onBackspace, onSpace }: SentenceBuilderProps) {
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        const englishVoices = availableVoices.filter(v => v.lang.startsWith('en'));
        setVoices(englishVoices);

        // Smart scoring algorithm to find the most natural/neural voice available
        const scoreVoice = (v: SpeechSynthesisVoice) => {
          let score = 0;
          const name = v.name.toLowerCase();
          
          if (name.includes('online (natural)')) score += 100; // Edge/Windows 11 premium voices
          if (name.includes('neural')) score += 80;
          if (name.includes('google')) score += 50; // Google Chrome online voices
          if (name.includes('premium')) score += 30;
          if (name.includes('samantha') || name.includes('alex')) score += 20; // Good macOS voices
          
          // Penalize notoriously robotic legacy voices
          if (name.includes('zira') || name.includes('david') || name.includes('mark')) score -= 50; 
          
          return score;
        };

        const sortedVoices = [...englishVoices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
        
        // Keep currently selected voice if it exists, otherwise set to the best found
        setSelectedVoiceURI(current => {
          if (current && englishVoices.find(v => v.voiceURI === current)) return current;
          return sortedVoices.length > 0 ? sortedVoices[0].voiceURI : "";
        });
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const handleSpeak = () => {
    if (!sentence) return;
    if (!("speechSynthesis" in window)) {
      console.warn("Speech synthesis not supported in this browser.");
      return;
    }
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    
    const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
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
      <div className="flex justify-between items-start mb-4 gap-4">
        <div className="flex flex-col gap-2 flex-grow min-w-0">
          <h3 className="text-neutral-400 text-sm font-semibold uppercase tracking-widest shrink-0">
            Constructed Sentence
          </h3>
          {voices.length > 0 && (
            <select 
              className="bg-neutral-800 text-xs text-neutral-300 rounded-md border border-neutral-700 outline-none p-1.5 w-full cursor-pointer hover:bg-neutral-700 transition-colors truncate"
              value={selectedVoiceURI}
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
              title="Select Voice"
            >
              {voices.map(v => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
        </div>
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
      
      <textarea
        value={sentence}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start signing to build a sentence..."
        className="w-full flex-grow bg-black/50 rounded-lg p-4 min-h-[120px] max-h-[240px] text-2xl font-medium text-white resize-none outline-none border border-neutral-800/50 focus:border-[#00ff88]/50 focus:ring-1 focus:ring-[#00ff88]/50 text-center placeholder:text-neutral-600"
      />
      
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
