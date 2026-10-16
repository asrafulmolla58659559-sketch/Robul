import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI SDK on server
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API Route: Bengali AI Voice Assistant Generation
app.post('/api/assistant', async (req: Request, res: Response) => {
  try {
    const { message, assistantName = 'রবুল', history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const systemInstruction = `You are a smart, friendly, real-time voice assistant named "${assistantName}" (রবুল).
Your primary language is Bengali (বাংলা).
Key guidelines:
1. Always respond in natural, polite, and concise Bengali (1 to 3 short sentences max), designed to be spoken aloud.
2. If the user asks for date/time, provide the current local time context gracefully.
3. If the user asks for calculation (e.g. 50 + 20), calculate and give the clear Bengali answer.
4. If the user asks about themselves, their device, contacts, or greetings, reply warmly.
5. Avoid markdown symbols like '**', '#', asterisks, or bullet points because this text is read by text-to-speech. Use clean plain spoken Bengali words.`;

    if (!apiKey) {
      // Graceful offline intelligent local fallback
      const cleanMsg = message.trim().toLowerCase();
      let fallback = `আমি আপনার কথা শুনেছি। আরও কিছু জানতে চান?`;
      if (cleanMsg.includes('কেমন আছ') || cleanMsg.includes('kemon')) {
        fallback = `আলহামদুলিল্লাহ, আমি ভালো আছি। আপনি কেমন আছেন?`;
      } else if (cleanMsg.includes('নাম কি') || cleanMsg.includes('কে তুমি')) {
        fallback = `আমার নাম ${assistantName}। আমি আপনার বাংলা স্মার্ট ভয়েস অ্যাসিস্ট্যান্ট।`;
      } else if (cleanMsg.includes('সময়') || cleanMsg.includes('কয়টা বাজে')) {
        const now = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
        fallback = `এখন সময় প্রায় ${now}।`;
      }
      res.json({ reply: fallback });
      return;
    }

    // Format chat history
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    if (Array.isArray(history)) {
      history.slice(-4).forEach((h: { sender: string; text: string }) => {
        contents.push({
          role: h.sender === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }],
        });
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 250,
        tools: [{ googleSearch: {} }],
      },
    });

    const candidate = response.candidates?.[0]?.content?.parts?.[0]?.text;
    const replyText = candidate?.trim() || 'জি, আমি বুঝতে পেরেছি। আপনাকে কিভাবে সাহায্য করতে পারি?';

    res.json({ reply: replyText });
  } catch (err: unknown) {
    console.error('Error in /api/assistant:', err);
    res.status(500).json({
      error: 'Failed to process voice request',
      fallback: 'দুঃখিত, সংযোগে কিছু সমস্যা হয়েছে। অনুগ্রহ করে আবার বলুন।',
    });
  }
});

let ttsQuotaExhaustedUntil = 0;

// API Route: Bengali Text-To-Speech (Gemini Flash Lite TTS with fallback)
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Puck' } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text is required for TTS' });
      return;
    }

    // If quota was previously exhausted or API key is not present, respond immediately with Web Speech fallback
    if (!apiKey || Date.now() < ttsQuotaExhaustedUntil) {
      res.json({ audioBase64: null, useWebSpeech: true });
      return;
    }

    try {
      const ttsResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [{ text: `Say naturally in Bengali: ${text}` }],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        res.json({ audioBase64: base64Audio, mimeType: 'audio/wav' });
        return;
      }
    } catch (apiErr: any) {
      const errMsg = String(apiErr?.message || '');
      const errStatus = apiErr?.status || apiErr?.code;
      if (errStatus === 429 || errStatus === 'RESOURCE_EXHAUSTED' || errMsg.includes('quota') || errMsg.includes('429')) {
        ttsQuotaExhaustedUntil = Date.now() + 60 * 60 * 1000; // 1-hour cooldown
      }
    }

    res.json({ audioBase64: null, useWebSpeech: true });
  } catch (err: unknown) {
    res.json({ audioBase64: null, useWebSpeech: true });
  }
});

// Initialize Vite middlewares or serve static build
async function setupServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

setupServer();
