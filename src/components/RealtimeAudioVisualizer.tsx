import React, { useEffect, useRef, useState } from 'react';
import { Mic, Volume2, Activity, Zap, Radio } from 'lucide-react';
import { VoiceState } from '../types';

interface RealtimeAudioVisualizerProps {
  state: VoiceState;
  audioStream: MediaStream | null;
  activeAudioElement: HTMLAudioElement | null;
  assistantName: string;
}

export const RealtimeAudioVisualizer: React.FC<RealtimeAudioVisualizerProps> = ({
  state,
  audioStream,
  activeAudioElement,
  assistantName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [averageVolume, setAverageVolume] = useState<number>(0);
  const [peakDecibels, setPeakDecibels] = useState<number>(-60);

  // Initialize Web Audio API Analyser
  useEffect(() => {
    let ctx = audioContextRef.current;
    if (!ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
        audioContextRef.current = ctx;
      }
    }

    if (ctx && !analyserRef.current) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64; // Gives 32 frequency bins
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
    }
  }, []);

  // Connect microphone stream to AnalyserNode during speech input (listening)
  useEffect(() => {
    const ctx = audioContextRef.current;
    const analyser = analyserRef.current;

    if (!ctx || !analyser) return;

    if (state === 'listening' && audioStream) {
      try {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        if (sourceNodeRef.current) {
          sourceNodeRef.current.disconnect();
        }
        const source = ctx.createMediaStreamSource(audioStream);
        source.connect(analyser);
        sourceNodeRef.current = source;
      } catch (err) {
        console.warn('Could not connect audio stream to visualizer analyser:', err);
      }
    } else {
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch (e) {
          // ignore
        }
        sourceNodeRef.current = null;
      }
    }
  }, [state, audioStream]);

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser ? analyser.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);

    // Peak holding array for drop-physics
    const peaks = new Array(bufferLength).fill(0);
    const peakDecay = 0.95;

    let tick = 0;

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      tick += 0.05;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      let isRealAudio = false;

      if (state === 'listening' && analyser && sourceNodeRef.current) {
        analyser.getByteFrequencyData(dataArray);
        // Check if there is actual input energy
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        if (sum > 50) {
          isRealAudio = true;
        }
      }

      // If not real microphone audio or if speaking/thinking/idle, generate organic reactive spectrum
      if (!isRealAudio) {
        if (state === 'speaking') {
          // Dynamic active vocal formant simulation (vowels and cadence)
          for (let i = 0; i < bufferLength; i++) {
            const freqFactor = Math.sin(i * 0.35 + tick * 3);
            const voiceMod = Math.abs(Math.sin(tick * 2.5 + i * 0.2)) * 0.7 + 0.3;
            const cadence = Math.abs(Math.sin(tick * 1.2)) * 0.8 + 0.2;
            const base = (Math.sin(i * 0.5 + tick * 4) + 1.2) * 60;
            dataArray[i] = Math.min(255, Math.max(20, (base + freqFactor * 50) * voiceMod * cadence));
          }
        } else if (state === 'listening') {
          // Sensitive listening simulation if mic stream is mute or Web Speech active
          for (let i = 0; i < bufferLength; i++) {
            const noise = (Math.sin(tick * 4 + i * 0.8) + Math.cos(tick * 3 - i * 0.4) + 2) / 4;
            const pulse = (Math.sin(tick * 6) + 1) * 0.5;
            dataArray[i] = Math.min(255, 30 + noise * 140 * (0.6 + pulse * 0.4));
          }
        } else if (state === 'thinking') {
          // Amber rhythmic calculation pulses
          for (let i = 0; i < bufferLength; i++) {
            const sweep = Math.sin(tick * 5 - i * 0.4);
            dataArray[i] = Math.max(15, (sweep + 1) * 45);
          }
        } else {
          // Idle standby state: vibrant gentle ambient waves (not flat or static!)
          for (let i = 0; i < bufferLength; i++) {
            const ambient = (Math.sin(tick * 1.5 + i * 0.3) + 1) * 0.5;
            dataArray[i] = 12 + ambient * 22;
          }
        }
      }

      // Calculate total volume and decibels for meter
      let totalEnergy = 0;
      for (let i = 0; i < bufferLength; i++) {
        totalEnergy += dataArray[i];
      }
      const avg = Math.round((totalEnergy / (bufferLength * 255)) * 100);
      setAverageVolume(avg);

      // Decibel approximation
      const db = avg > 0 ? Math.round(20 * Math.log10(avg / 100)) : -60;
      setPeakDecibels(Math.max(-60, Math.min(0, db)));

      // Draw active visualizer bars
      const numBars = 24; // Show 24 prominent visualizer bars
      const barSpacing = 4;
      const totalBarWidth = width / numBars;
      const barWidth = Math.max(3, totalBarWidth - barSpacing);

      for (let i = 0; i < numBars; i++) {
        const dataIndex = Math.floor((i / numBars) * bufferLength);
        const value = dataArray[dataIndex] || 0;

        // Acoustic weighting curve: boost bass/mids slightly
        const weighting = 1.0 + Math.sin((i / numBars) * Math.PI) * 0.35;
        const normalized = Math.min(1, (value / 255) * weighting);

        const minHeight = state === 'idle' ? 4 : 8;
        const barHeight = Math.max(minHeight, normalized * (height - 18));
        const x = i * totalBarWidth + barSpacing / 2;
        const y = height - barHeight - 4;

        // Update peak hold dot
        if (barHeight > peaks[i]) {
          peaks[i] = barHeight;
        } else {
          peaks[i] = Math.max(0, peaks[i] * peakDecay);
        }

        // Color themes according to VoiceState
        let gradient: CanvasGradient;
        let peakColor = '#ffffff';

        if (state === 'listening') {
          gradient = ctx.createLinearGradient(0, height, 0, y);
          gradient.addColorStop(0, '#f43f5e'); // rose-500
          gradient.addColorStop(0.5, '#ef4444'); // red-500
          gradient.addColorStop(1, '#fbbf24'); // amber-400
          peakColor = '#fecdd3';
        } else if (state === 'speaking') {
          gradient = ctx.createLinearGradient(0, height, 0, y);
          gradient.addColorStop(0, '#059669'); // emerald-600
          gradient.addColorStop(0.5, '#10b981'); // emerald-500
          gradient.addColorStop(1, '#06b6d4'); // cyan-500
          peakColor = '#a7f3d0';
        } else if (state === 'thinking') {
          gradient = ctx.createLinearGradient(0, height, 0, y);
          gradient.addColorStop(0, '#d97706'); // amber-600
          gradient.addColorStop(0.5, '#f59e0b'); // amber-500
          gradient.addColorStop(1, '#fde047'); // yellow-300
          peakColor = '#fef08a';
        } else {
          // Idle state styling: glowing indigo/violet/blue
          gradient = ctx.createLinearGradient(0, height, 0, y);
          gradient.addColorStop(0, '#3b82f6'); // blue-500
          gradient.addColorStop(1, '#8b5cf6'); // purple-500
          peakColor = '#c4b5fd';
        }

        // Draw the rounded equalizer bar
        ctx.fillStyle = gradient;
        ctx.beginPath();
        const radius = Math.min(barWidth / 2, 4);
        ctx.roundRect(x, y, barWidth, barHeight, [radius, radius, 1, 1]);
        ctx.fill();

        // Draw Peak Hold Cap
        if (state !== 'idle' && peaks[i] > 10) {
          const peakY = height - peaks[i] - 7;
          ctx.fillStyle = peakColor;
          ctx.beginPath();
          ctx.roundRect(x, peakY, barWidth, 2.5, [1, 1, 1, 1]);
          ctx.fill();
        }
      }

      // Base line under all bars
      ctx.fillStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.fillRect(0, height - 2, width, 1.5);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state]);

  // Status Info Tag
  const getBadgeDetails = () => {
    switch (state) {
      case 'listening':
        return {
          icon: <Mic className="w-3.5 h-3.5 text-rose-400 animate-pulse" />,
          title: 'ভয়েস ইনপুট সক্রিয়',
          sub: 'মাইক্রোফোন থেকে শব্দ ধারণ করা হচ্ছে',
          bg: 'bg-rose-950/60 border-rose-800/80 text-rose-300',
          dot: 'bg-rose-500 animate-ping',
        };
      case 'speaking':
        return {
          icon: <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />,
          title: 'ভয়েস আউটপুট সক্রিয়',
          sub: `${assistantName} কথা বলছে`,
          bg: 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300',
          dot: 'bg-emerald-400 animate-pulse',
        };
      case 'thinking':
        return {
          icon: <Zap className="w-3.5 h-3.5 text-amber-400 animate-spin" />,
          title: 'প্রসেসিং ও বিশ্লেষণ',
          sub: 'উত্তর তৈরি করা হচ্ছে',
          bg: 'bg-amber-950/60 border-amber-800/80 text-amber-300',
          dot: 'bg-amber-400 animate-pulse',
        };
      case 'idle':
      default:
        return {
          icon: <Activity className="w-3.5 h-3.5 text-blue-400" />,
          title: 'অডিও ভিজ্যুয়ালাইজার (রেডি)',
          sub: 'কথা বললেই ইকুয়ালাইজার লাফিয়ে উঠবে',
          bg: 'bg-slate-900/80 border-slate-800 text-slate-300',
          dot: 'bg-blue-400',
        };
    }
  };

  const badge = getBadgeDetails();

  return (
    <div className="w-full max-w-xl mx-auto my-3 bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl backdrop-blur relative overflow-hidden transition-all duration-300">
      {/* Background radial glow matching state */}
      <div
        className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-500 ${
          state === 'listening'
            ? 'bg-rose-500'
            : state === 'speaking'
            ? 'bg-emerald-500'
            : state === 'thinking'
            ? 'bg-amber-500'
            : 'bg-blue-500'
        }`}
      />

      {/* Header bar: Status badge & Audio Level Indicators */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-xl border text-xs font-semibold ${badge.bg} transition-all`}
        >
          <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
          {badge.icon}
          <span>{badge.title}</span>
        </div>

        {/* Live Audio Metrics */}
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
            <Radio className="w-3 h-3 text-blue-400" />
            <span className="text-slate-400">সিগন্যাল:</span>
            <span
              className={`font-bold ${
                averageVolume > 40
                  ? 'text-emerald-400'
                  : averageVolume > 15
                  ? 'text-blue-400'
                  : 'text-slate-400'
              }`}
            >
              {averageVolume}%
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
            <span className="text-slate-400">লেভেল:</span>
            <span className="font-bold text-amber-400">{peakDecibels} dB</span>
          </div>
        </div>
      </div>

      {/* Main Realtime Canvas Visualizer */}
      <div className="relative w-full h-16 sm:h-20 bg-slate-950/80 rounded-xl border border-slate-800/70 p-2 flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={480}
          height={80}
          className="w-full h-full block"
        />

        {/* Frequency Spectrum Labels at bottom */}
        <div className="absolute bottom-1 left-3 right-3 flex justify-between text-[9px] font-mono text-slate-500 pointer-events-none select-none">
          <span>60 Hz</span>
          <span>500 Hz</span>
          <span>2 kHz</span>
          <span>8 kHz</span>
          <span>16 kHz</span>
        </div>
      </div>

      {/* Subtitle description */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span>{badge.sub}</span>
        <span className="text-[10px] text-slate-500 font-mono">24-Band FFT Spectrum</span>
      </div>
    </div>
  );
};
