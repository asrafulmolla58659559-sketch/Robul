import React from 'react';
import { X, Trash2, Volume2, Copy, Check, MessageSquare } from 'lucide-react';
import { ChatMessage } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onClearHistory: () => void;
  onReplayAudio: (text: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onClearHistory,
  onReplayAudio,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border-l sm:border border-slate-800 sm:rounded-3xl w-full max-w-md h-full sm:h-[90vh] p-5 relative shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">কথোপকথনের ইতিহাস</h2>
              <p className="text-[10px] text-slate-400">{messages.length}টি বার্তা সংরক্ষিত</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <button
                onClick={onClearHistory}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition text-xs flex items-center gap-1"
                title="ইতিহাস মুছুন"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-1">
          {messages.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              এখনো কোনো কথাবার্তা হয়নি। কিছু মুখে বলুন!
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-2xl border text-xs ${
                  msg.sender === 'user'
                    ? 'bg-slate-950/80 border-slate-800/80 text-slate-200 ml-4'
                    : 'bg-blue-950/30 border-blue-900/40 text-emerald-300 mr-4'
                }`}
              >
                <div className="flex justify-between items-center mb-1 text-[10px] text-slate-400 font-semibold">
                  <span>{msg.sender === 'user' ? '👤 আপনি' : '🤖 সহকারী'}</span>
                  <span>{msg.timestamp}</span>
                </div>
                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                <div className="flex justify-end gap-2 mt-2 pt-1 border-t border-slate-800/50">
                  <button
                    onClick={() => onReplayAudio(msg.text)}
                    className="text-slate-400 hover:text-blue-400 text-[10px] flex items-center gap-1 transition"
                  >
                    <Volume2 className="w-3 h-3" /> শুনুন
                  </button>
                  <button
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="text-slate-400 hover:text-white text-[10px] flex items-center gap-1 transition"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" /> কপি হয়েছে
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> কপি
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
