import React, { useState } from 'react';
import { X, Sliders, Volume2, Mic, RotateCcw, Sparkles } from 'lucide-react';
import { AssistantSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AssistantSettings;
  onSaveSettings: (settings: AssistantSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<AssistantSettings>(settings);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    onClose();
  };

  const handleReset = () => {
    const defaults: AssistantSettings = {
      assistantName: 'রবুল',
      autoSpeak: true,
      handsFree: true,
      speechRate: 1.0,
      voiceGender: 'male',
      soundEffects: true,
    };
    setFormData(defaults);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">সহকারী সেটিংস ও কন্ট্রোল</h2>
              <p className="text-xs text-slate-400">ডাকনাম ও ভয়েস কাস্টমাইজেশন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Wake Word / Assistant Name */}
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
            <label className="block text-xs font-bold text-slate-200 mb-1">
              সহকারীর ডাকনাম (Wake Word):
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              এই নাম ধরে ডাকলেই ফোন সাড়া দেবে (যেমন: "রবুল", "বন্ধু", "জারা")
            </p>
            <input
              type="text"
              value={formData.assistantName}
              onChange={(e) => setFormData({ ...formData, assistantName: e.target.value })}
              required
              placeholder="রবুল"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
            />
          </div>

          {/* Voice Personality */}
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
            <label className="block text-xs font-bold text-slate-200 mb-2">
              ভয়েস টাইপ (কণ্ঠস্বর):
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, voiceGender: 'male' })}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                  formData.voiceGender === 'male'
                    ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>👨 পুরুষ কণ্ঠ</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, voiceGender: 'female' })}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                  formData.voiceGender === 'female'
                    ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>👩 নারী কণ্ঠ</span>
              </button>
            </div>
          </div>

          {/* Speech Rate */}
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-200">কথার গতি (Speech Rate):</label>
              <span className="text-xs font-mono text-amber-400">{formData.speechRate}x</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.3"
              step="0.05"
              value={formData.speechRate}
              onChange={(e) => setFormData({ ...formData, speechRate: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>ধীর (0.8x)</span>
              <span>স্বাভাবিক (1.0x)</span>
              <span>দ্রুত (1.3x)</span>
            </div>
          </div>

          {/* Toggles */}
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-3">
            {/* Auto speak */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-200">উত্তরের শব্দ শোনানো (Auto TTS)</p>
                <p className="text-[11px] text-slate-400">উত্তর আসার পর মুখে পড়ে শোনাবে</p>
              </div>
              <input
                type="checkbox"
                checked={formData.autoSpeak}
                onChange={(e) => setFormData({ ...formData, autoSpeak: e.target.checked })}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Hands free continuous listening */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-200">হ্যান্ডস-ফ্রি ভয়েস ডিটেকশন</p>
                <p className="text-[11px] text-slate-400">নাম ধরে ডাকলেই স্বয়ংক্রিয়ভাবে শুনবে</p>
              </div>
              <input
                type="checkbox"
                checked={formData.handsFree}
                onChange={(e) => setFormData({ ...formData, handsFree: e.target.checked })}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Sound effects */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-200">সতর্কবার্তা ও চাইম শব্দ</p>
                <p className="text-[11px] text-slate-400">কমান্ড শুরুর সময় হালকা টোন বাজবে</p>
              </div>
              <input
                type="checkbox"
                checked={formData.soundEffects}
                onChange={(e) => setFormData({ ...formData, soundEffects: e.target.checked })}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> রিসেট
            </button>
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-amber-600/20 cursor-pointer"
            >
              সেটিংস সেভ করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
