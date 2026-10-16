export interface Contact {
  id: string;
  name: string;
  number: string;
  avatarColor?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  audioUrl?: string;
}

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface AssistantSettings {
  assistantName: string;
  autoSpeak: boolean;
  handsFree: boolean;
  speechRate: number;
  voiceGender: 'male' | 'female';
  soundEffects: boolean;
}
