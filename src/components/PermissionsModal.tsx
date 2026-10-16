import React from 'react';
import { Mic, Volume2, ShieldCheck, Sparkles } from 'lucide-react';

interface PermissionsModalProps {
  isOpen: boolean;
  onGrant: () => void;
  assistantName: string;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onGrant,
  assistantName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative overflow-hidden text-center">
        {/* Glow behind icon */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-blue-500/10 blur-3xl pointer-events-none" />

        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-3xl shadow-lg shadow-blue-500/30">
          <Mic className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">
          বাংলা AI স্মার্ট ভয়েস অ্যাসিস্ট্যান্ট ("{assistantName}")
        </h2>
        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
          মুখে বললেই কথা শনাক্ত করা এবং <b className="text-amber-300">"{assistantName}"</b> বা নাম ধরে ডাকলে সরাসরি সাড়া দেওয়ার জন্য মাইক্রোফোন পারমিশন সক্রিয় করুন।
        </p>

        {/* Permission items list */}
        <div className="space-y-3 mb-6 text-left">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">মাইক্রোফোন পারমিশন</p>
                <p className="text-[11px] text-slate-400">লাইভ কথা শোনা ও "{assistantName}" নাম শনাক্তকরণের জন্য</p>
              </div>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-medium">
              প্রয়োজন
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">ভয়েস স্পিকার সার্ভিস</p>
                <p className="text-[11px] text-slate-400">সুন্দর ও স্পষ্ট বাংলায় উত্তর উচ্চারণ করার জন্য</p>
              </div>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-medium">
              সক্রিয়
            </span>
          </div>
        </div>

        <button
          onClick={onGrant}
          className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" /> মাইক ও সাউন্ড চালু করুন
        </button>

        <p className="text-[10px] text-slate-500 mt-3 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-400" /> আপনার অডিও সুরক্ষিত থাকে ও কোনো তৃতীয় পক্ষের কাছে পাঠানো হয় না
        </p>
      </div>
    </div>
  );
};
