import { UserProfile, AppState } from './types';
import { Heart, MessageCircle, User, Sparkles, Music, Mic, Send, Play, Pause, ChevronRight, Settings, Calendar, RefreshCcw, Volume2, Gamepad2, Citrus } from 'lucide-react';

export const APP_NAME = "Orange Kutty";
export const THEME_COLOR = "#FF8C42"; // Soft Orange

// Strictly using voices supported by gemini-2.5-flash-preview-tts
export const VOICE_OPTIONS = [
  // Recommended / Popular
  { id: 'laomedeia', label: 'Laomedeia', description: 'Sweet & Melodic' },
  { id: 'puck', label: 'Puck', description: 'Playful & Energetic' },
  { id: 'kore', label: 'Kore', description: 'Soothing & Gentle' },
  { id: 'fenrir', label: 'Fenrir', description: 'Soft & Deep' },
  { id: 'zephyr', label: 'Zephyr', description: 'Bright & Clear' },
  { id: 'charon', label: 'Charon', description: 'Calm & Steady' },
  
  // Additional Supported Voices
  { id: 'aoede', label: 'Aoede', description: 'Confident' },
  { id: 'leda', label: 'Leda', description: 'Warm & Friendly' },
  { id: 'orus', label: 'Orus', description: 'Soft Male' },
  { id: 'iapetus', label: 'Iapetus', description: 'Deep & Resonant' },
  { id: 'erinome', label: 'Erinome', description: 'Gentle Flow' },
  { id: 'despina', label: 'Despina', description: 'Calm & Soft' },
  { id: 'enceladus', label: 'Enceladus', description: 'Energetic' },
  { id: 'callirrhoe', label: 'Callirrhoe', description: 'Bright' },
  { id: 'autonoe', label: 'Autonoe', description: 'Soft Whisper' },
  { id: 'algenib', label: 'Algenib', description: 'Clear & Crisp' },
  { id: 'algieba', label: 'Algieba', description: 'Melodic' },
  { id: 'alnilam', label: 'Alnilam', description: 'Deep & Calm' },
  { id: 'achernar', label: 'Achernar', description: 'Steady' },
  { id: 'achird', label: 'Achird', description: 'Light' },
  { id: 'gacrux', label: 'Gacrux', description: 'Strong' },
  { id: 'umbriel', label: 'Umbriel', description: 'Resonant' },
  { id: 'sulafat', label: 'Sulafat', description: 'Gentle' },
  { id: 'schedar', label: 'Schedar', description: 'Clear' },
  { id: 'sadachbia', label: 'Sadachbia', description: 'Calm' },
  { id: 'rasalgethi', label: 'Rasalgethi', description: 'Neutral' },
  { id: 'zubenelgenubi', label: 'Zuben', description: 'Deep' }
];

export const DEFAULT_USER: UserProfile = {
  name: 'Samritha Pearl',
  lmp: null,
  weeksPregnant: 4,
  hasCompletedOnboarding: false,
  voiceName: 'laomedeia',
  theme: 'system',
  // Game Defaults
  gameLevel: 1,
  gameXP: 0,
  coins: 50,
  inventory: [],
  equippedAccessory: null,
  gameStats: {
    hunger: 80,
    hygiene: 80,
    fun: 80,
    energy: 80,
    love: 80,
    lastPlayed: Date.now()
  }
};

export const INITIAL_STATE: AppState = {
  user: DEFAULT_USER,
  dailyLogs: {},
  cachedDailyContent: {},
};

export const NAV_ITEMS = [
  { view: 'CONNECTION', label: 'Today', icon: Heart },
  { view: 'CHAT', label: 'Memories', icon: MessageCircle },
  { view: 'GAME', label: 'Care', icon: Citrus },
  { view: 'SETTINGS', label: 'Profile', icon: User },
] as const;

export { Heart, MessageCircle, User, Sparkles, Music, Mic, Send, Play, Pause, ChevronRight, Settings, Calendar, RefreshCcw, Volume2, Gamepad2, Citrus };