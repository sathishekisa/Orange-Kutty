export enum ViewState {
  ONBOARDING = 'ONBOARDING',
  CONNECTION = 'CONNECTION',
  CHAT = 'CHAT',
  GAME = 'GAME',
  SETTINGS = 'SETTINGS'
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserProfile {
  name: string;
  lmp: string | null; // Last Menstrual Period ISO date
  weeksPregnant: number; // calculated
  hasCompletedOnboarding: boolean;
  voiceName: string; // 'Puck', 'Kore', etc.
  theme: ThemeMode;
  
  // Game State
  gameLevel: number;
  gameXP: number;
  coins: number;
  inventory: string[]; // e.g. ['party_hat', 'glasses']
  equippedAccessory: string | null;
  gameStats: {
    hunger: number;
    hygiene: number;
    fun: number;
    energy: number;
    love: number;
    lastPlayed: number; // timestamp for decay calculation
  };
}

export interface ChatMessage {
  id: string;
  role: 'baby' | 'mom';
  text: string;
  audioBase64?: string; // For baby messages
  timestamp: number;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  messages: ChatMessage[];
}

export interface DailyContent {
  date: string;
  week: number;
  day: number;
  audioText: string;
  transcriptShort: string;
  babyFact: string; // Kept for small context
  audioBase64?: string; // Cache the audio locally
}

export interface AppState {
  user: UserProfile;
  dailyLogs: Record<string, DailyLog>; // Keyed by date
  cachedDailyContent: Record<string, DailyContent>; // Keyed by date
}