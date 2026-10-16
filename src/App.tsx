import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Phone,
  Volume2,
  VolumeX,
  Settings as SettingsIcon,
  MessageSquare,
  Clock,
  Sparkles,
  Send,
  RotateCcw,
  BookOpen,
  Calendar,
  Calculator,
  Play,
  Square,
  Copy,
  Check,
  Music,
  Share2,
  Radio,
} from 'lucide-react';
import { VoiceOrb } from './components/VoiceOrb';
import { RealtimeAudioVisualizer } from './components/RealtimeAudioVisualizer';
import { ContactsModal } from './components/ContactsModal';
import { SettingsModal } from './components/SettingsModal';
import { PermissionsModal } from './components/PermissionsModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { Contact, ChatMessage, VoiceState, AssistantSettings } from './types';
import {
  getBengaliTimeNow,
  getBengaliDateToday,
  tryCalculateBengaliMath,
  convertBengaliToEnglishNumbers,
} from './utils/bengaliUtils';

// Web Speech types
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export default function App() {
  // Assistant Configuration State
  const [settings, setSettings] = useState<AssistantSettings>(() => {
    const saved = localStorage.getItem('bengali_ai_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use default
      }
    }
    return {
      assistantName: 'রবুল',
      autoSpeak: true,
      handsFree: true,
      speechRate: 1.0,
      voiceGender: 'male',
      soundEffects: true,
    };
  });

  // Contacts State
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('bengali_ai_contacts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use default
      }
    }
    return [
      { id: '1', name: 'মা', number: '01800000000' },
      { id: '2', name: 'রহিম', number: '01700000000' },
      { id: '3', name: 'অফিস', number: '01900000000' },
    ];
  });

  // Messages History State
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('bengali_ai_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // empty
      }
    }
    return [];
  });

  // UI State
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>(
    'আমি প্রস্তুত! আমাকে "রবুল" বলে ডাকুন বা যেকোনো কিছু জিজ্ঞেস করুন।'
  );
  const [manualText, setManualText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  // Modals State
  const [showPermissions, setShowPermissions] = useState<boolean>(() => {
    return !localStorage.getItem('bengali_ai_permissions_granted');
  });
  const [showContacts, setShowContacts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Refs for Speech & Audio
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedTextRef = useRef<string>('');
  const ttsServerAvailableRef = useRef<boolean>(true);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('bengali_ai_settings', JSON.stringify(settings));
  }, [settings]);

  // Persist contacts
  useEffect(() => {
    localStorage.setItem('bengali_ai_contacts', JSON.stringify(contacts));
  }, [contacts]);

  // Persist messages
  useEffect(() => {
    localStorage.setItem('bengali_ai_history', JSON.stringify(messages));
  }, [messages]);

  // Play subtle audio tone using Web Audio API
  const playChime = useCallback(
    (type: 'start' | 'success' | 'alert') => {
      if (!settings.soundEffects || isMuted) return;
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (type === 'start') {
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
        } else if (type === 'success') {
          osc.frequency.setValueAtTime(587.33, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
        }
      } catch (e) {
        // AudioContext not allowed or not ready
      }
    },
    [settings.soundEffects, isMuted]
  );

  // Stop currently playing speech
  const stopAudio = useCallback(() => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
    setVoiceState('idle');
  }, []);

  // Find best available Bengali voice or neutral natural voice
  const getBengaliVoice = useCallback(() => {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => v.lang === 'bn-BD') ||
      voices.find((v) => v.lang === 'bn-IN') ||
      voices.find((v) => v.lang.startsWith('bn')) ||
      voices.find((v) => v.name.toLowerCase().includes('bangla') || v.name.toLowerCase().includes('bengali')) ||
      null
    );
  }, []);

  // Fallback to browser SpeechSynthesis with Bengali voice selection
  const fallbackWebSpeech = useCallback(
    (text: string, onComplete?: () => void) => {
      if (!('speechSynthesis' in window)) {
        isSpeakingRef.current = false;
        setVoiceState('idle');
        if (onComplete) onComplete();
        return;
      }

      window.speechSynthesis.cancel();

      // Clean markdown characters if any
      const cleanText = text.replace(/[*#_`]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'bn-BD';
      utterance.rate = settings.speechRate || 1.0;
      utterance.pitch = settings.voiceGender === 'female' ? 1.15 : 0.95;

      const bnVoice = getBengaliVoice();
      if (bnVoice) {
        utterance.voice = bnVoice;
      }

      utterance.onend = () => {
        isSpeakingRef.current = false;
        setVoiceState('idle');
        if (onComplete) onComplete();
        if (settings.handsFree) {
          setTimeout(startRecognition, 300);
        }
      };

      utterance.onerror = () => {
        isSpeakingRef.current = false;
        setVoiceState('idle');
        if (onComplete) onComplete();
        if (settings.handsFree) {
          setTimeout(startRecognition, 300);
        }
      };

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      window.speechSynthesis.speak(utterance);
    },
    [getBengaliVoice, settings.speechRate, settings.voiceGender, settings.handsFree]
  );

  // Speak Bengali Text with seamless instant Web Speech fallback
  const speakBengali = useCallback(
    async (text: string, onComplete?: () => void) => {
      if (isMuted || !settings.autoSpeak) {
        if (onComplete) onComplete();
        return;
      }

      stopAudio();
      isSpeakingRef.current = true;
      setVoiceState('speaking');

      // If server TTS was flagged unavailable (e.g. 429 quota reached), speak immediately with Web Speech
      if (!ttsServerAvailableRef.current) {
        fallbackWebSpeech(text, onComplete);
        return;
      }

      // Attempt server Gemini TTS if available
      try {
        const voice = settings.voiceGender === 'male' ? 'Puck' : 'Kore';
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceName: voice }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.audioBase64) {
            const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
            activeAudioRef.current = audio;
            audio.playbackRate = settings.speechRate || 1.0;

            audio.onended = () => {
              isSpeakingRef.current = false;
              setVoiceState('idle');
              if (onComplete) onComplete();
              if (settings.handsFree) {
                setTimeout(startRecognition, 300);
              }
            };

            audio.onerror = () => {
              fallbackWebSpeech(text, onComplete);
            };

            await audio.play();
            return;
          } else if (data.useWebSpeech) {
            ttsServerAvailableRef.current = false;
          }
        } else {
          ttsServerAvailableRef.current = false;
        }
      } catch (err) {
        ttsServerAvailableRef.current = false;
      }

      // Instant Fallback: Browser Web Speech API
      fallbackWebSpeech(text, onComplete);
    },
    [isMuted, settings.autoSpeak, settings.voiceGender, settings.speechRate, settings.handsFree, stopAudio, fallbackWebSpeech]
  );

  // Direct Call Action
  const initiateCall = useCallback(
    (contactName: string, number: string) => {
      const confirmationMsg = `${contactName}-কে কল করা হচ্ছে...`;
      setAiResponse(confirmationMsg);
      playChime('success');
      speakBengali(confirmationMsg, () => {
        window.location.href = `tel:${number}`;
      });
    },
    [playChime, speakBengali]
  );

  // Process user command or question
  const processCommand = useCallback(
    async (rawInput: string) => {
      const cleanInput = rawInput.trim();
      if (!cleanInput) return;

      const lower = cleanInput.toLowerCase();
      const customName = (settings.assistantName || 'রবুল').toLowerCase();

      // Check if text addresses the assistant or has wake words
      const wakeWords = [
        customName,
        'রবুল',
        'রবল',
        'রবোল',
        'রাবুল',
        'hey robul',
        'robul',
        'বন্ধু',
        'সহকারী',
      ];
      const hasWakeWord = wakeWords.some((w) => lower.includes(w));

      // 1. Direct Phone Call Detection
      if (
        lower.includes('কল') ||
        lower.includes('ফোন') ||
        lower.includes('ডায়াল') ||
        lower.includes('ডায়াল') ||
        lower.includes('call')
      ) {
        // Check for contacts matching
        const matchedContact = contacts.find((c) =>
          lower.includes(c.name.toLowerCase())
        );

        if (matchedContact) {
          initiateCall(matchedContact.name, matchedContact.number);
          return;
        }

        // Check for telephone number digits
        const convertedDigits = convertBengaliToEnglishNumbers(cleanInput);
        const digits = convertedDigits.replace(/\D/g, '');
        if (digits.length >= 6) {
          initiateCall('এই নম্বর', digits);
          return;
        }
      }

      // 2. Date & Time Queries
      if (
        lower.includes('কয়টা বাজে') ||
        lower.includes('কয়টা বাজে') ||
        lower.includes('সময় কত') ||
        lower.includes('সময় কত') ||
        lower.includes('time')
      ) {
        const timeNow = getBengaliTimeNow();
        setAiResponse(timeNow);
        speakBengali(timeNow);
        return;
      }

      if (
        lower.includes('আজকের তারিখ') ||
        lower.includes('আজকে কি বার') ||
        lower.includes('কোন তারিখ') ||
        lower.includes('তারিখ কত')
      ) {
        const dateToday = getBengaliDateToday();
        setAiResponse(dateToday);
        speakBengali(dateToday);
        return;
      }

      // 3. Quick Math Calculations (e.g. 50 + 20)
      const mathResult = tryCalculateBengaliMath(cleanInput);
      if (mathResult) {
        setAiResponse(mathResult);
        speakBengali(mathResult);
        return;
      }

      // 4. Standalone Wake-word greetings
      if (
        hasWakeWord &&
        (cleanInput.length < 18 ||
          lower.includes('কেমন আছো') ||
          lower.includes('শুনছো') ||
          lower.includes('শুনছ'))
      ) {
        const greetings = [
          `হ্যাঁ বলুন! আমি ${settings.assistantName} শুনছি।`,
          `জি বলুন, আপনাকে কীভাবে সাহায্য করতে পারি?`,
          `হ্যাঁ, আমি আছি! আপনার কী প্রয়োজন বলুন।`,
        ];
        const chosen = greetings[Math.floor(Math.random() * greetings.length)];
        setAiResponse(chosen);
        speakBengali(chosen);
        return;
      }

      // 5. Query Gemini AI backend (/api/assistant)
      setVoiceState('thinking');
      setAiResponse(`${settings.assistantName} চিন্তা করছে...`);

      try {
        const historyPayload = messages.slice(-4).map((m) => ({
          sender: m.sender,
          text: m.text,
        }));

        const res = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: cleanInput,
            assistantName: settings.assistantName,
            history: historyPayload,
          }),
        });

        if (!res.ok) throw new Error('API request failed');
        const data = await res.json();
        const reply = data.reply || data.fallback || 'জি, আমি বুঝতে পেরেছি!';

        setAiResponse(reply);

        // Append to history
        const newMsgUser: ChatMessage = {
          id: Date.now().toString(),
          sender: 'user',
          text: cleanInput,
          timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        };
        const newMsgBot: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: reply,
          timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, newMsgUser, newMsgBot]);

        speakBengali(reply);
      } catch (err) {
        console.error('AI assistant error:', err);
        const fallbackMsg = 'আমি আপনার কথা বুঝতে পেরেছি। আর কোনো প্রশ্ন আছে?';
        setAiResponse(fallbackMsg);
        speakBengali(fallbackMsg);
      }
    },
    [contacts, initiateCall, messages, settings.assistantName, speakBengali]
  );

  // Initialize Speech Recognition
  const initRecognition = useCallback(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition is not supported in this browser');
      return null;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'bn-BD';

      rec.onstart = () => {
        if (!isSpeakingRef.current) {
          setVoiceState('listening');
        }
      };

      rec.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const spoken = (final || interim).trim();
        if (spoken) {
          setLiveTranscript(spoken);

          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }

          // Automatically process 1.3 seconds after speech pauses
          debounceTimerRef.current = setTimeout(() => {
            if (spoken && spoken !== lastProcessedTextRef.current && !isSpeakingRef.current) {
              lastProcessedTextRef.current = spoken;
              processCommand(spoken);
            }
          }, 1300);
        }
      };

      rec.onerror = (e: any) => {
        console.warn('SpeechRecognition error:', e.error);
        if (settings.handsFree && !isSpeakingRef.current) {
          setTimeout(startRecognition, 1000);
        }
      };

      rec.onend = () => {
        if (!isSpeakingRef.current) {
          setVoiceState('idle');
        }
        if (settings.handsFree && !isSpeakingRef.current) {
          setTimeout(startRecognition, 400);
        }
      };

      return rec;
    } catch (e) {
      console.error('Error creating SpeechRecognition:', e);
      return null;
    }
  }, [processCommand, settings.handsFree]);

  const ensureAudioStream = useCallback(async () => {
    if (audioStream && audioStream.active) return audioStream;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      return stream;
    } catch (err) {
      console.warn('Could not acquire audio stream for visualizer:', err);
      return null;
    }
  }, [audioStream]);

  const startRecognition = useCallback(() => {
    if (isSpeakingRef.current) return;
    ensureAudioStream();
    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        // Already started
      }
    }
  }, [ensureAudioStream, initRecognition]);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // already stopped
      }
    }
    setVoiceState('idle');
  }, []);

  // Toggle listening via orb
  const handleToggleListening = useCallback(() => {
    if (isSpeakingRef.current) {
      stopAudio();
      return;
    }

    if (voiceState === 'listening') {
      stopRecognition();
    } else {
      playChime('start');
      startRecognition();
    }
  }, [playChime, startRecognition, stopAudio, stopRecognition, voiceState]);

  // Handle granting permissions from welcome modal
  const handleGrantPermissions = useCallback(async () => {
    localStorage.setItem('bengali_ai_permissions_granted', 'true');
    setShowPermissions(false);

    await ensureAudioStream();

    playChime('start');
    startRecognition();
    speakBengali(`আমি প্রস্তুত! আমাকে ${settings.assistantName} বলে ডাকলে আমি উত্তর দেব।`);
  }, [ensureAudioStream, playChime, settings.assistantName, speakBengali, startRecognition]);

  // Handle manual typed submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    const text = manualText.trim();
    setLiveTranscript(text);
    setManualText('');
    processCommand(text);
  };

  // Replay speech
  const handleReplay = (textToPlay: string) => {
    speakBengali(textToPlay);
  };

  // Copy text helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  // Add contact
  const handleAddContact = (c: { name: string; number: string }) => {
    const newContact: Contact = {
      id: Date.now().toString(),
      name: c.name,
      number: c.number,
    };
    setContacts((prev) => [...prev, newContact]);
    speakBengali(`${c.name} এর কন্টাক্ট সেভ করা হয়েছে।`);
  };

  // Delete contact
  const handleDeleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  // Call contact from modal or chip
  const handleCallContact = (contact: Contact) => {
    initiateCall(contact.name, contact.number);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-4 py-3">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          {/* Logo & Assistant Identity */}
          <div className="flex items-center gap-3">
            <div
              onClick={() => speakBengali(`আমি আপনার বাংলা সহকারী ${settings.assistantName}`)}
              className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 cursor-pointer hover:scale-105 transition"
              title="রবুল AI"
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  স্মার্ট বাংলা ভয়েস অ্যাসিস্ট্যান্ট
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  অনলাইন
                </span>
              </div>
              <p className="text-[11px] text-blue-400 flex items-center gap-1.5">
                <span>ডাকনাম:</span>
                <span className="font-bold text-amber-300">"{settings.assistantName}"</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">
                  {settings.handsFree ? 'ভয়েস মোড চালু' : 'পুশ-টু-টক মোড'}
                </span>
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Hands-Free Toggle */}
            <button
              onClick={() => {
                const next = !settings.handsFree;
                setSettings({ ...settings, handsFree: next });
                if (next) {
                  startRecognition();
                  speakBengali('ভয়েস মোড চালু করা হলো।');
                } else {
                  stopRecognition();
                  speakBengali('ভয়েস মোড বন্ধ করা হলো।');
                }
              }}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition cursor-pointer ${
                settings.handsFree
                  ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 shadow-md shadow-purple-600/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="হ্যান্ডস-ফ্রি মোড টগল"
            >
              <Radio
                className={`w-3.5 h-3.5 ${
                  settings.handsFree ? 'text-white animate-pulse' : 'text-slate-400'
                }`}
              />
              <span className="hidden sm:inline">
                {settings.handsFree ? 'ডাকলেই সাড়া দেবে' : 'হ্যান্ডস-ফ্রি বন্ধ'}
              </span>
            </button>

            {/* Mute/Audio Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 sm:px-3 sm:py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              title={isMuted ? 'সাউন্ড আনমিউট করুন' : 'সাউন্ড মিউট করুন'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
            </button>

            {/* Contacts Modal Button */}
            <button
              onClick={() => setShowContacts(true)}
              className="p-2 sm:px-3 sm:py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              title="কন্টাক্টস বুক"
            >
              <Phone className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">কন্টাক্টস</span>
            </button>

            {/* History Button */}
            <button
              onClick={() => setShowHistory(true)}
              className="p-2 sm:px-3 sm:py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer relative"
              title="কথোপকথনের হিস্ট্রি"
            >
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              {messages.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-purple-500 absolute top-1 right-1" />
              )}
            </button>

            {/* Settings Modal Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 sm:px-3 sm:py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              title="সেটিংস"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Assistant Body */}
      <main className="max-w-4xl mx-auto w-full p-4 flex-1 flex flex-col items-center justify-start gap-4">
        {/* Glow Voice Hub Container */}
        <div className="w-full bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur relative overflow-hidden flex flex-col items-center">
          {/* Top highlight line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />

          {/* Glowing Interactive Voice Orb */}
          <VoiceOrb
            state={voiceState}
            isHandsFree={settings.handsFree}
            assistantName={settings.assistantName}
            onToggleListening={handleToggleListening}
          />

          {/* Real-Time Active Audio Equalizer Visualizer */}
          <RealtimeAudioVisualizer
            state={voiceState}
            audioStream={audioStream}
            activeAudioElement={activeAudioRef.current}
            assistantName={settings.assistantName}
          />

          {/* Spoken Command Suggestion Tip */}
          <div className="mt-2 mb-4 text-center">
            <p className="text-xs text-amber-300 font-medium">
              💡 মুখে বলুন:{' '}
              <span className="text-emerald-400 font-semibold cursor-pointer hover:underline" onClick={() => processCommand(`হে ${settings.assistantName}`)}>
                "হে {settings.assistantName}"
              </span>
              ,{' '}
              <span className="text-blue-400 font-semibold cursor-pointer hover:underline" onClick={() => processCommand(`${settings.assistantName} কেমন আছো`)}>
                "কেমন আছো?"
              </span>{' '}
              বা{' '}
              <span className="text-purple-400 font-semibold cursor-pointer hover:underline" onClick={() => processCommand('রহিমকে কল করো')}>
                "রহিমকে কল করো"
              </span>
            </p>
          </div>

          {/* Speech Transcripts Box */}
          <div className="w-full max-w-2xl space-y-3 text-left">
            {/* Live User Transcript */}
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Mic className="w-4 h-4" />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    আপনার মুখ থেকে যা শোনা যাচ্ছে:
                  </span>
                  {voiceState === 'listening' && (
                    <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> লাইভ মাইক্রোফোন চালু
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-white italic min-h-[32px] flex items-center bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/60">
                  {liveTranscript ? `"${liveTranscript}"` : `"${settings.assistantName}, কেমন আছো?"`}
                </p>
              </div>
            </div>

            {/* AI Assistant Spoken Response Box */}
            <div className="bg-blue-950/30 p-3.5 rounded-2xl border border-blue-900/50 flex items-start gap-3 relative">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                    {settings.assistantName} এর উত্তর:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {/* Replay Button */}
                    <button
                      onClick={() => handleReplay(aiResponse)}
                      className="text-slate-400 hover:text-emerald-400 text-xs p-1 rounded-lg hover:bg-slate-800/60 transition flex items-center gap-1"
                      title="পুনরায় শুনুন"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] hidden sm:inline">শুনুন</span>
                    </button>
                    {/* Copy Button */}
                    <button
                      onClick={() => handleCopy(aiResponse)}
                      className="text-slate-400 hover:text-white text-xs p-1 rounded-lg hover:bg-slate-800/60 transition flex items-center gap-1"
                      title="কপি করুন"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[10px] text-emerald-400">কপি হয়েছে</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[10px] hidden sm:inline">কপি</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-sm font-medium text-emerald-200 mt-1 leading-relaxed">
                  {aiResponse}
                </p>
              </div>
            </div>
          </div>

          {/* Manual Input Form */}
          <form
            onSubmit={handleManualSubmit}
            className="w-full max-w-2xl mt-4 flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder={`লিখতেও পারেন: যেমন '${settings.assistantName} কেমন আছো?'`}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition shadow-inner"
              />
              <button
                type="button"
                onClick={handleToggleListening}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-blue-400 transition"
                title="ভয়েসে বলুন"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>পাঠান</span>
            </button>
          </form>
        </div>

        {/* Quick Speed Dial & Action Shortcut Cards */}
        <div className="w-full space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>দ্রুত কমান্ড শর্টকাট</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-normal">
              ক্লিক করলেই সহকারী উত্তর দেবে
            </span>
          </div>

          {/* Action Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Identity inquiry */}
            <div
              onClick={() => processCommand(`${settings.assistantName} তুমি কে?`)}
              className="bg-slate-900/70 hover:bg-slate-800/90 border border-slate-800 p-3 rounded-2xl cursor-pointer transition flex items-center gap-3 group shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-sm group-hover:scale-110 transition">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-xs font-bold text-slate-200">"তুমি কে?"</h3>
                <p className="text-[10px] text-slate-400 truncate">সহকারী পরিচয়</p>
              </div>
            </div>

            {/* Quick Call Mom */}
            <div
              onClick={() => processCommand('মাকে কল করো')}
              className="bg-slate-900/70 hover:bg-slate-800/90 border border-slate-800 p-3 rounded-2xl cursor-pointer transition flex items-center gap-3 group shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center text-sm group-hover:scale-110 transition">
                <Phone className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-xs font-bold text-slate-200">"মাকে কল করো"</h3>
                <p className="text-[10px] text-slate-400 truncate">স্পিড ডায়াল</p>
              </div>
            </div>

            {/* Time inquiry */}
            <div
              onClick={() => processCommand('এখন কয়টা বাজে?')}
              className="bg-slate-900/70 hover:bg-slate-800/90 border border-slate-800 p-3 rounded-2xl cursor-pointer transition flex items-center gap-3 group shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-sm group-hover:scale-110 transition">
                <Clock className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-xs font-bold text-slate-200">"কয়টা বাজে?"</h3>
                <p className="text-[10px] text-slate-400 truncate">বর্তমান সময়</p>
              </div>
            </div>

            {/* Date inquiry */}
            <div
              onClick={() => processCommand('আজকের তারিখ কত?')}
              className="bg-slate-900/70 hover:bg-slate-800/90 border border-slate-800 p-3 rounded-2xl cursor-pointer transition flex items-center gap-3 group shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-sm group-hover:scale-110 transition">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-xs font-bold text-slate-200">"আজকের তারিখ?"</h3>
                <p className="text-[10px] text-slate-400 truncate">বার ও ক্যালেন্ডার</p>
              </div>
            </div>

            {/* Math calculation */}
            <div
              onClick={() => processCommand('৫০ গুণ ৪ কত?')}
              className="bg-slate-900/70 hover:bg-slate-800/90 border border-slate-800 p-3 rounded-2xl cursor-pointer transition flex items-center gap-3 group shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-sm group-hover:scale-110 transition">
                <Calculator className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-xs font-bold text-slate-200">"৫০ গুণ ৪ কত?"</h3>
                <p className="text-[10px] text-slate-400 truncate">দ্রুত অংক সমাধান</p>
              </div>
            </div>

            {/* Call Rahim */}
            <div
              onClick={() => processCommand('রহিমকে কল করো')}
              className="bg-slate-900/70 hover:bg-slate-800/90 border border-slate-800 p-3 rounded-2xl cursor-pointer transition flex items-center gap-3 group shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-sm group-hover:scale-110 transition">
                <Phone className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-xs font-bold text-slate-200">"রহিমকে কল"</h3>
                <p className="text-[10px] text-slate-400 truncate">ফোনবুকে সরাসরি</p>
              </div>
            </div>

            {/* Joke */}
            <div
              onClick={() => processCommand('আমাকে একটি মজার কৌতুক শোনাও')}
              className="bg-slate-900/70 hover:bg-slate-800/90 border border-slate-800 p-3 rounded-2xl cursor-pointer transition flex items-center gap-3 group shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center text-sm group-hover:scale-110 transition">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-xs font-bold text-slate-200">"একটি কৌতুক বলো"</h3>
                <p className="text-[10px] text-slate-400 truncate">মজার জোকস</p>
              </div>
            </div>

            {/* Bengali Music / YouTube */}
            <div
              onClick={() => {
                window.open('https://www.youtube.com/results?search_query=Bengali+Music', '_blank');
                speakBengali('ইউটিউবে বাংলা গান খোঁজা হচ্ছে।');
              }}
              className="bg-slate-900/70 hover:bg-slate-800/90 border border-slate-800 p-3 rounded-2xl cursor-pointer transition flex items-center gap-3 group shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center text-sm group-hover:scale-110 transition">
                <Music className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-xs font-bold text-slate-200">"বাংলা গান"</h3>
                <p className="text-[10px] text-slate-400 truncate">ইউটিউবে বাজানো</p>
              </div>
            </div>
          </div>
        </div>

        {/* Speed Dial Contacts Quick Bar */}
        {contacts.length > 0 && (
          <div className="w-full bg-slate-900/50 border border-slate-800/60 rounded-2xl p-3 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-400" /> ডায়াল:
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto py-0.5">
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleCallContact(contact)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-xl border border-slate-700/80 flex items-center gap-1.5 shrink-0 transition"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold">{contact.name}</span>
                  <span className="text-[10px] text-slate-400">({contact.number})</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowContacts(true)}
              className="text-xs text-blue-400 hover:text-blue-300 shrink-0 font-medium ml-2"
            >
              + আরও
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 text-slate-500 text-[11px] py-2.5 px-4 text-center">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1">
          <p>© বাংলা AI স্মার্ট ভয়েস অ্যাসিস্ট্যান্ট — রিয়েলটাইম কণ্ঠ শনাক্তকরণ ও কৃত্রিম বুদ্ধিমত্তা</p>
          <p className="text-slate-400">
            ডাকনাম: <span className="text-amber-400 font-semibold">{settings.assistantName}</span>
          </p>
        </div>
      </footer>

      {/* Modals */}
      <PermissionsModal
        isOpen={showPermissions}
        onGrant={handleGrantPermissions}
        assistantName={settings.assistantName}
      />

      <ContactsModal
        isOpen={showContacts}
        onClose={() => setShowContacts(false)}
        contacts={contacts}
        onAddContact={handleAddContact}
        onDeleteContact={handleDeleteContact}
        onCallContact={handleCallContact}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          speakBengali(`সেটিংস সংরক্ষণ করা হলো। আমার নাম এখন ${newSettings.assistantName}।`);
        }}
      />

      <HistoryDrawer
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        messages={messages}
        onClearHistory={() => setMessages([])}
        onReplayAudio={handleReplay}
      />
    </div>
  );
}
