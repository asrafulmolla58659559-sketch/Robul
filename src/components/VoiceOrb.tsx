import React from 'react';
import { Mic, MicOff, Volume2, Sparkles, Loader2, Radio } from 'lucide-react';
import { VoiceState } from '../types';

interface VoiceOrbProps {
  state: VoiceState;
  isHandsFree: boolean;
  assistantName: string;
  onToggleListening: () => void;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  state,
  isHandsFree,
  assistantName,
  onToggleListening,
}) => {
  const getOrbClasses = () => {
    switch (state) {
      case 'listening':
        return 'bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 border-red-400/80 orb-listening scale-105';
      case 'thinking':
        return 'bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 border-amber-400/80 orb-thinking';
      case 'speaking':
        return 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 border-emerald-400/80 orb-speaking scale-105';
      case 'idle':
      default:
        return 'bg-gradient-to-tr from-blue-700 via-indigo-600 to-purple-600 border-blue-400/50 orb-glow hover:scale-105';
    }
  };

  const getStatusText = () => {
    switch (state) {
      case 'listening':
        return { label: 'শুনছি...', sub: 'আপনার কথা শুনছি, কথা বলুন' };
      case 'thinking':
        return { label: 'চিন্তা করছি...', sub: 'বুদ্ধিমান উত্তর তৈরি হচ্ছে' };
      case 'speaking':
        return { label: 'বলছি...', sub: `${assistantName} কথা বলছে` };
      case 'idle':
      default:
        return {
          label: isHandsFree ? 'শুনতে প্রস্তুত' : 'কথা বলুন',
          sub: isHandsFree ? `"${assistantName}" বলে ডাকুন` : 'মাইক্রোফোনে ক্লিক করুন',
        };
    }
  };

  const status = getStatusText();

  return (
    <div className="flex flex-col items-center justify-center my-1 select-none">
      {/* Active Waveform Indicator above Orb */}
      <div className="flex items-center gap-1.5 h-8 mb-2">
        {[40, 75, 55, 90, 65, 80, 50, 70, 35].map((h, i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-200 ${
              state === 'listening'
                ? 'bg-gradient-to-t from-rose-500 to-amber-400 animate-pulse'
                : state === 'speaking'
                ? 'bg-gradient-to-t from-emerald-500 to-cyan-400 animate-pulse'
                : state === 'thinking'
                ? 'bg-gradient-to-t from-amber-500 to-yellow-300'
                : 'bg-gradient-to-t from-blue-500 to-indigo-400 opacity-50'
            }`}
            style={{
              height:
                state === 'listening'
                  ? `${Math.max(12, (h * ((i % 3) + 1)) / 3)}px`
                  : state === 'speaking'
                  ? `${Math.max(14, (h * ((i % 4) + 1)) / 3.5)}px`
                  : state === 'thinking'
                  ? `${12 + (i % 3) * 6}px`
                  : `${8 + (i % 2) * 5}px`,
              transitionDelay: `${i * 30}ms`,
            }}
          />
        ))}
      </div>

      {/* Main Orb Button */}
      <div className="relative flex items-center justify-center">
        {/* Outer Aura Ring */}
        <div
          className={`absolute w-44 h-44 rounded-full filter blur-xl opacity-40 transition-all duration-700 ${
            state === 'listening'
              ? 'bg-red-500 scale-110'
              : state === 'speaking'
              ? 'bg-emerald-400 scale-115'
              : state === 'thinking'
              ? 'bg-amber-400 scale-105'
              : 'bg-indigo-500'
          }`}
        />

        {/* Interactive Orb Core */}
        <button
          onClick={onToggleListening}
          aria-label={status.label}
          className={`relative z-10 w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 shadow-2xl flex flex-col items-center justify-center text-white transition-all duration-500 cursor-pointer focus:outline-none active:scale-95 ${getOrbClasses()}`}
        >
          {state === 'listening' && (
            <Mic className="w-9 h-9 sm:w-10 sm:h-10 text-white animate-pulse mb-1 stroke-[2.5]" />
          )}
          {state === 'thinking' && (
            <Loader2 className="w-9 h-9 sm:w-10 sm:h-10 text-white animate-spin mb-1 stroke-[2.5]" />
          )}
          {state === 'speaking' && (
            <Volume2 className="w-9 h-9 sm:w-10 sm:h-10 text-white animate-bounce mb-1 stroke-[2.5]" />
          )}
          {state === 'idle' && (
            <Mic className="w-9 h-9 sm:w-10 sm:h-10 text-white mb-1 drop-shadow" />
          )}

          <span className="text-xs font-bold tracking-wider uppercase text-white drop-shadow">
            {status.label}
          </span>
        </button>
      </div>

      {/* Status Description & Wake Word Tip */}
      <div className="mt-3 text-center">
        <p className="text-xs font-medium text-slate-300 flex items-center justify-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              state === 'listening'
                ? 'bg-red-500 animate-ping'
                : state === 'speaking'
                ? 'bg-emerald-400 animate-pulse'
                : state === 'thinking'
                ? 'bg-amber-400 animate-pulse'
                : isHandsFree
                ? 'bg-blue-400'
                : 'bg-slate-500'
            }`}
          />
          <span>{status.sub}</span>
        </p>
      </div>
    </div>
  );
};
