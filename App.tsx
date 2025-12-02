import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, MessageCircle, User, Sparkles, Music, Mic, Send,
  ChevronRight, Play, Pause, Calendar, RefreshCcw, Settings, Volume2, Smile, Phone, LogOut, X, Info,
  Zap, Moon, Sun, Clock, Monitor, Edit3, Citrus, Droplets, Utensils, PartyPopper, ShoppingBag, Coins, Star, Trophy, Gamepad2, Lightbulb, Check
} from 'lucide-react';
import { AppState, ViewState, DailyLog, UserProfile, DailyContent, ChatMessage, ThemeMode } from './types';
import { INITIAL_STATE, NAV_ITEMS, DEFAULT_USER, VOICE_OPTIONS, APP_NAME } from './constants';
import { loadState, saveState, clearState } from './services/storageService';
import { generateDailyContent, generateSpeech, generateBabyChatResponse } from './services/geminiService';

// --- Utility Functions ---

const calculateWeeks = (lmp: string | null = null): number => {
  if (!lmp) return 4;
  const start = new Date(lmp);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7));
};

const getTodayString = () => new Date().toISOString().split('T')[0];

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const pcmToAudioBuffer = (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): AudioBuffer => {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

// --- Styles for Custom Animations ---
const AnimationStyles = () => (
  <style>{`
    @keyframes wiggle {
      0%, 100% { transform: rotate(0deg) scale(1); }
      25% { transform: rotate(-8deg) scale(1.15) translateY(-8px); }
      50% { transform: rotate(8deg) scale(1.2) translateY(-4px); }
      75% { transform: rotate(-4deg) scale(1.15) translateY(-6px); }
    }
    @keyframes rub-vibrate {
      0% { transform: scale(1.02) translate(0, 0); }
      20% { transform: scale(1.03) translate(-1px, 1px); }
      40% { transform: scale(1.02) translate(1px, -1px); }
      60% { transform: scale(1.03) translate(-1px, -1px); }
      80% { transform: scale(1.02) translate(1px, 1px); }
      100% { transform: scale(1.02) translate(0, 0); }
    }
    @keyframes float-out {
      0% { transform: translate(0, 0) scale(0.5); opacity: 1; }
      100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
    }
    @keyframes blob {
      0% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
      50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
      100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
    }
    @keyframes liquid-shift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes float-baby {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-6px) rotate(1deg); }
    }
    @keyframes shine-move {
      0% { transform: translateX(-100%) skewX(-15deg); }
      100% { transform: translateX(200%) skewX(-15deg); }
    }
    @keyframes pop-in {
      0% { opacity: 0; transform: scale(0.8) translateY(10px); }
      60% { transform: scale(1.05) translateY(-2px); opacity: 1; }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes float-slow {
      0% { transform: translateY(0px) translateX(0px); }
      33% { transform: translateY(-10px) translateX(5px); }
      66% { transform: translateY(5px) translateX(-5px); }
      100% { transform: translateY(0px) translateX(0px); }
    }
    @keyframes burst {
      0% { transform: scale(0); opacity: 1; }
      100% { transform: scale(2); opacity: 0; }
    }
    
    /* Missing Animations Added */
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fade-in-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fade-in-down {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slide-in-up {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .animate-wiggle { animation: wiggle 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
    .animate-rub { animation: rub-vibrate 0.3s linear infinite; }
    .animate-particle { animation: float-out 0.8s ease-out forwards; }
    .animate-blob { animation: blob 12s ease-in-out infinite; }
    .animate-float-baby { animation: float-baby 6s ease-in-out infinite; }
    .animate-pop-in { animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
    .animate-burst { animation: burst 0.4s ease-out forwards; }
    
    .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
    .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
    .animate-fade-in-down { animation: fade-in-down 0.6s ease-out forwards; }
    .animate-slide-in-up { animation: slide-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
);

// --- Visual Components ---

const OrangeLogo = ({ className = "w-10 h-10", onClick }: { className?: string; onClick?: () => void }) => (
  <svg viewBox="0 0 100 100" className={`${className} transition-transform active:scale-95`} xmlns="http://www.w3.org/2000/svg" onClick={onClick}>
    <defs>
      <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF8C42" />
        <stop offset="100%" stopColor="#F97316" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="55" r="40" fill="url(#orangeGradient)" />
    <path d="M50 15 Q65 5 80 20" stroke="#84CC16" strokeWidth="5" fill="none" strokeLinecap="round"/>
    <path d="M50 15 Q30 5 20 25 Q40 40 50 15" fill="#84CC16" />
    <circle cx="38" cy="52" r="3.5" fill="#7C2D12" />
    <circle cx="62" cy="52" r="3.5" fill="#7C2D12" />
    <path d="M42 62 Q50 68 58 62" stroke="#7C2D12" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </svg>
);

const RealisticFetus = ({ 
  weeks, 
  isKicking, 
  isRubbing, 
  className = "w-64 h-64",
  accessory,
  isSleeping
}: { 
  weeks: number, 
  isKicking?: boolean, 
  isRubbing?: boolean, 
  className?: string,
  accessory?: string | null,
  isSleeping?: boolean
}) => {
  const baseClass = `transition-transform duration-700 animate-float-baby ${isKicking ? 'animate-wiggle' : ''} ${isRubbing ? 'scale-105' : ''}`;
  
  // Stages logic (Embryo -> Early -> Late)
  let scale = 0.5;
  let opacity = 0.7;
  let stage: 'embryo' | 'early' | 'mid' | 'late' = 'embryo';
  let rotation = 0;
  let headSize = 40;
  let headX = 95;
  let headY = 70;

  if (weeks <= 8) {
    stage = 'embryo';
    scale = 0.4 + (weeks / 8) * 0.2;
    rotation = -15;
    headSize = 35;
    headX = 95; headY = 70;
    opacity = 0.6 + (weeks/20);
  } else if (weeks <= 16) {
    stage = 'early';
    scale = 0.6 + ((weeks - 8) / 8) * 0.2;
    rotation = 5;
    headSize = 42;
    headX = 95; headY = 85;
    opacity = 0.8;
  } else if (weeks <= 24) { 
     stage = 'mid';
     scale = 0.8 + ((weeks - 16) / 8) * 0.2;
     rotation = 20;
     headSize = 45;
     headX = 95; headY = 80;
     opacity = 0.9;
  } else {
    stage = 'late';
    scale = 1.0 + ((weeks - 24) / 16) * 0.2;
    rotation = 160; // Head down
    headSize = 50;
    headX = 130; headY = 135;
    opacity = 1;
  }
  
  scale = Math.min(scale, 1.15);

  return (
    <svg 
      viewBox="0 0 200 200" 
      className={`${className} ${baseClass}`}
      style={{ 
        filter: 'drop-shadow(0px 10px 20px rgba(255,100,50,0.3))', 
        transform: `scale(${scale}) rotate(${rotation}deg)` 
      }}
    >
      <defs>
        <radialGradient id="skinGradient" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFD1C1" /> 
          <stop offset="60%" stopColor="#FFAB91" /> 
          <stop offset="100%" stopColor="#E64A19" /> 
        </radialGradient>
        <radialGradient id="headGradient" cx="35%" cy="30%" r="70%">
           <stop offset="0%" stopColor="#FFE0D1" />
           <stop offset="100%" stopColor="#FF8A65" />
        </radialGradient>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <circle cx="100" cy="100" r={stage === 'embryo' ? 40 : 75} fill="url(#skinGradient)" opacity="0.2" filter="url(#softGlow)" className="animate-pulse" />

      {stage === 'embryo' ? (
        <g opacity={opacity}>
           <path d="M100,60 Q145,60 145,100 Q145,145 100,155 Q75,160 65,130" stroke="url(#skinGradient)" strokeWidth="28" strokeLinecap="round" fill="none" />
           <circle cx="95" cy="70" r={headSize} fill="url(#headGradient)" />
           <circle cx="85" cy="70" r="5" fill="#bf360c" opacity="0.4" />
           <circle cx="115" cy="110" r="6" fill="#FFCCBC" />
           <circle cx="110" cy="135" r="6" fill="#FFCCBC" />
        </g>
      ) : (
        <g opacity={opacity}>
          <path 
            d={
              stage === 'early' 
                ? "M95,75 Q135,65 145,100 Q155,135 120,160 Q80,180 60,145 Q50,125 65,105" 
                : stage === 'mid'
                  ? "M90,70 Q140,55 155,100 Q165,145 125,170 Q75,190 55,150 Q45,120 65,100" 
                  : "M85,65 Q150,45 165,100 Q175,160 120,180 Q60,195 40,150 Q30,110 60,90" 
            }
            fill="url(#skinGradient)" 
          />
          <circle cx={headX} cy={headY} r={headSize} fill="url(#headGradient)" />
          
          <path 
            d={stage === 'late' ? "M120,100 Q150,110 130,135" : "M125,105 Q145,115 135,130"} 
            stroke="#E64A19" strokeWidth={stage === 'early' ? 8 : (stage === 'mid' ? 12 : 16)} 
            strokeLinecap="round" fill="none" opacity="0.4" 
          />
          <circle 
            cx={stage === 'late' ? 130 : 135} cy={stage === 'late' ? 135 : 130} 
            r={stage === 'early' ? 6 : (stage === 'mid' ? 8 : 10)} fill="#FFCCBC" 
          />
          <path 
             d={stage === 'late' ? "M110,145 Q125,175 140,155" : "M115,150 Q130,170 145,160"}
             stroke="#E64A19" strokeWidth={stage === 'early' ? 10 : (stage === 'mid' ? 14 : 18)} 
             strokeLinecap="round" fill="none" opacity="0.4" 
          />
          
          {/* Eyes Logic */}
          <g opacity={stage === 'early' ? 0.6 : 0.8} transform={stage === 'late' ? "translate(-5, 0)" : ""}>
             {/* Left Eye */}
            {isKicking || isRubbing ? (
               <path d="M78,85 Q82,82 86,85" stroke="#bf360c" strokeWidth="2" fill="none" />
            ) : isSleeping ? (
               <path d="M78,88 Q82,88 86,88" stroke="#bf360c" strokeWidth="2" fill="none" opacity="0.7" />
            ) : (
               <path d="M78,85 Q82,88 86,85" stroke="#bf360c" strokeWidth="2" fill="none" opacity="0.7" />
            )}
            
            {/* Right Eye */}
            {isKicking || isRubbing ? (
               <path d="M98,85 Q102,82 106,85" stroke="#bf360c" strokeWidth="2" fill="none" />
            ) : isSleeping ? (
               <path d="M98,88 Q102,88 106,88" stroke="#bf360c" strokeWidth="2" fill="none" opacity="0.7" />
            ) : (
               <path d="M98,85 Q102,88 106,85" stroke="#bf360c" strokeWidth="2" fill="none" opacity="0.7" />
            )}
            
            {/* Mouth */}
            {isRubbing ? (
              <path d="M86,96 Q92,104 98,96" stroke="#bf360c" strokeWidth="2" fill="none" opacity="0.9" />
            ) : isSleeping ? (
               <path d="M90,98 Q92,99 94,98" stroke="#bf360c" strokeWidth="1.5" fill="none" opacity="0.5" />
            ) : (
              <path d="M88,98 Q92,100 96,98" stroke="#bf360c" strokeWidth="1.5" fill="none" opacity="0.5" />
            )}
            
            {isSleeping && (
              <text x="115" y="70" fontSize="16" fill="#64748b" className="animate-pulse">Zzz</text>
            )}
          </g>

          {stage !== 'early' && (
            <path d="M115,135 Q95,145 85,185" stroke="#FFAB91" strokeWidth="4" strokeDasharray="4 4" fill="none" opacity="0.5" />
          )}

          {/* Accessories */}
          {accessory === 'bow' && (
             <path 
               d={`M${headX-10},${headY+headSize-5} L${headX+10},${headY+headSize-5} L${headX},${headY+headSize+5} Z M${headX},${headY+headSize-5} L${headX},${headY+headSize+5}`} 
               fill="#F472B6" stroke="#DB2777" strokeWidth="2" 
               transform={`rotate(${rotation * -1}, ${headX}, ${headY})`}
             />
          )}
          {accessory === 'glasses' && (
            <g transform={`rotate(${rotation * -1}, ${headX}, ${headY})`}>
              <circle cx={headX-8} cy={headY+2} r="8" fill="rgba(0,0,0,0.7)" />
              <circle cx={headX+8} cy={headY+2} r="8" fill="rgba(0,0,0,0.7)" />
              <line x1={headX-4} y1={headY+2} x2={headX+4} y2={headY+2} stroke="black" strokeWidth="1" />
            </g>
          )}
          {accessory === 'hat' && (
            <g transform={`rotate(${rotation * -1}, ${headX}, ${headY})`}>
              <path d={`M${headX-15},${headY-10} L${headX+15},${headY-10} L${headX},${headY-40} Z`} fill="#FACC15" stroke="#EAB308" strokeWidth="2" />
              <circle cx={headX} cy={headY-40} r="4" fill="#EF4444" />
            </g>
          )}

        </g>
      )}
    </svg>
  );
};

const KickParticles = ({ active }: { active: boolean }) => {
  if (!active) return null;
  return (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((degree, i) => {
        const tx = Math.cos(degree * Math.PI / 180) * 80 + 'px';
        const ty = Math.sin(degree * Math.PI / 180) * 80 + 'px';
        return (
          <div 
            key={i}
            className="absolute top-1/2 left-1/2 text-white animate-particle"
            style={{ 
              '--tx': tx, 
              '--ty': ty,
              marginTop: '-10px',
              marginLeft: '-10px',
              filter: 'drop-shadow(0 0 5px gold)'
            } as React.CSSProperties}
          >
            <Sparkles size={16} fill="gold" />
          </div>
        );
      })}
    </>
  );
};

const SootheParticles = ({ active }: { active: boolean }) => {
  if (!active) return null;
  return (
    <>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div 
            key={i}
            className="absolute text-pink-400 animate-particle opacity-0"
            style={{ 
                top: `${50 + (Math.random() * 40 - 20)}%`, 
                left: `${50 + (Math.random() * 40 - 20)}%`,
                animationDuration: `${1.5 + Math.random()}s`,
                animationDelay: `${Math.random() * 0.5}s`,
                '--tx': `${Math.random() * 80 - 40}px`,
                '--ty': `-${60 + Math.random() * 60}px`
            } as React.CSSProperties}
        >
            <Heart size={10 + Math.random() * 12} fill="currentColor" />
        </div>
      ))}
    </>
  );
};

const BackgroundParticles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(10)].map((_, i) => (
            <div 
                key={i}
                className="absolute bg-orange-300/20 dark:bg-white/5 rounded-full animate-float-slow"
                style={{
                    width: Math.random() * 20 + 10 + 'px',
                    height: Math.random() * 20 + 10 + 'px',
                    top: Math.random() * 100 + '%',
                    left: Math.random() * 100 + '%',
                    animationDuration: Math.random() * 5 + 5 + 's',
                    animationDelay: Math.random() * 5 + 's'
                }}
            />
        ))}
    </div>
  );

const SpeechCloud = ({ text }: { text: string | null }) => {
  if (!text) return null;
  return (
    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 px-4 py-2 rounded-2xl rounded-bl-none shadow-lg border border-orange-100 dark:border-gray-700 animate-pop-in z-30 whitespace-nowrap max-w-[200px]">
      <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{text}</p>
    </div>
  );
};

const MoodIndicator = ({ state }: { state: 'sleepy' | 'active' | 'happy' }) => {
  let icon = <Moon size={12} className="text-indigo-500" fill="currentColor" />;
  let label = "Dreaming";
  let bg = "bg-indigo-50 border-indigo-100 dark:bg-gray-800 dark:border-gray-700";

  if (state === 'active') {
    icon = <Zap size={12} className="text-yellow-500" fill="currentColor" />;
    label = "Wiggling";
    bg = "bg-yellow-50 border-yellow-100 dark:bg-gray-800 dark:border-gray-700";
  } else if (state === 'happy') {
    icon = <Heart size={12} className="text-pink-500" fill="currentColor" />;
    label = "Happy";
    bg = "bg-pink-50 border-pink-100 dark:bg-gray-800 dark:border-gray-700";
  }

  return (
    <div className={`absolute top-12 right-12 flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm ${bg} animate-fade-in transition-all duration-500 z-20`}>
      {icon}
      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{label}</span>
    </div>
  );
};

const WombBubble = ({ 
  onClick, 
  onRub,
  isKicking,
  isRubbing,
  weeks,
  parallax,
  speechText
}: { 
  onClick: () => void, 
  onRub: () => void,
  isKicking: boolean,
  isRubbing: boolean,
  weeks: number,
  parallax: { x: number, y: number },
  speechText: string | null
}) => {
  const isDragging = useRef(false);

  // Determine Mood
  let mood: 'sleepy' | 'active' | 'happy' = 'sleepy';
  if (isKicking) mood = 'active';
  else if (isRubbing) mood = 'happy';

  // Reduce parallax intensity for center stability
  const px = parallax.x * 2; 
  const py = parallax.y * 2;

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging.current) {
      onRub();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div 
      className="relative flex items-center justify-center cursor-pointer select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={onClick}
      style={{ 
        width: '320px', 
        height: '320px',
        touchAction: 'none'
      }}
    >
      <SpeechCloud text={speechText} />

      <div 
        className={`w-full h-full relative transition-transform duration-1000 ease-out animate-blob ${isRubbing ? 'scale-[1.02] animate-rub' : ''}`}
        style={{
          transform: `translate(${px}px, ${py}px)`
        }}
      >
        {/* Outer Glow - Enhanced on Rub */}
        <div className={`absolute inset-[-20px] rounded-[45%] bg-orange-300/40 dark:bg-orange-900/40 blur-3xl transition-all duration-1000 animate-blob ${isRubbing ? 'opacity-80 scale-110 bg-pink-400 dark:bg-pink-800 shadow-[0_0_60px_rgba(255,182,193,0.7)]' : 'opacity-40 animate-pulse-slow'}`}></div>
        
        {/* Bubble Shell */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-white/10 dark:from-white/10 dark:via-white/5 dark:to-transparent border-2 border-white/30 dark:border-white/10 backdrop-blur-[1px] shadow-[0_20px_60px_-10px_rgba(255,120,50,0.5)] dark:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden animate-blob" style={{ animationDuration: '9s' }}>
          
          {/* Shine Overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 animate-[shine-move_4s_infinite]" style={{ opacity: 0.3 }}></div>

          {/* Inner Fluid */}
          <div 
             className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,_#fdba74_0%,_transparent_60%)] dark:bg-[radial-gradient(circle_at_50%_120%,_#9a3412_0%,_transparent_60%)] transition-opacity duration-1000 ${isRubbing ? 'opacity-100 from-pink-200' : 'opacity-70'}`}
             style={{ transform: `translate(${px * -1}px, ${py * -1}px)` }}
          ></div>
          
          {/* Baby Character */}
          <div className="z-10 relative" style={{ transform: `translate(${px * 0.3}px, ${py * 0.3}px)` }}>
            <RealisticFetus weeks={weeks} isKicking={isKicking} isRubbing={isRubbing} />
          </div>

          {/* Particles */}
          <KickParticles active={isKicking} />
          <SootheParticles active={isRubbing} />

          {/* Mood Indicator */}
          <MoodIndicator state={mood} />

          {/* Gloss Reflections */}
          <div className="absolute top-[10%] left-[15%] w-[35%] h-[15%] bg-gradient-to-b from-white to-transparent opacity-80 rounded-[100%] blur-[2px] transform -rotate-12"></div>
          <div className="absolute bottom-[15%] right-[15%] w-[15%] h-[8%] bg-white opacity-40 rounded-[100%] blur-[4px] transform -rotate-12"></div>
        </div>
      </div>
    </div>
  );
};

const BabyAvatar = () => (
  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-gray-700 border border-orange-100 dark:border-gray-600 flex items-center justify-center shadow-sm shrink-0">
    <OrangeLogo className="w-5 h-5" />
  </div>
);

const MomAvatar = () => (
  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-rose-600 border border-white dark:border-gray-700 flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0">
    M
  </div>
);

// --- View Components ---

const OnboardingView = ({ 
  user, 
  onUpdate 
}: { 
  user: UserProfile, 
  onUpdate: (u: Partial<UserProfile>) => void 
}) => {
  const [lmpInput, setLmpInput] = useState('');

  const handleStart = () => {
    if (lmpInput) {
      onUpdate({ 
        lmp: lmpInput,
        weeksPregnant: calculateWeeks(lmpInput),
        hasCompletedOnboarding: true 
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#FFF7ED] dark:bg-gray-900 transition-colors duration-500">
      <div className="flex flex-col items-center animate-fade-in-up space-y-8">
        <OrangeLogo className="w-32 h-32 drop-shadow-2xl" />
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight font-display">Orange Kutty</h1>
          <p className="text-orange-900/60 dark:text-orange-200/60 text-lg font-medium">Your tiny companion.</p>
        </div>
      </div>
      
      <div className="w-full max-w-sm mt-16 space-y-8 animate-fade-in-up delay-100">
        <div className="space-y-4">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider ml-1">When did your last period start?</label>
          <div className="relative group">
            <div className="absolute inset-0 bg-orange-200 dark:bg-orange-900 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <input 
              type="date" 
              className="relative w-full p-4 bg-white dark:bg-gray-800 rounded-2xl border-2 border-transparent focus:border-orange-300 dark:focus:border-orange-700 shadow-sm outline-none transition-all text-gray-800 dark:text-white font-bold text-lg text-center"
              value={lmpInput}
              onChange={(e) => setLmpInput(e.target.value)}
            />
          </div>
        </div>

        <button 
          onClick={handleStart}
          disabled={!lmpInput}
          className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50 shadow-xl disabled:shadow-none flex items-center justify-center gap-2"
        >
          <span>Start Journey</span>
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

// --- Connection (Home) View ---

const ConnectionView = ({ 
  user, 
  dailyContent, 
  isPlaying, 
  onPlay, 
  onBubbleInteract 
}: { 
  user: UserProfile, 
  dailyContent: DailyContent | null, 
  isPlaying: boolean, 
  onPlay: () => void,
  onBubbleInteract: (type: 'kick' | 'rub') => void
}) => {
  const [isKicking, setIsKicking] = useState(false);
  const [isRubbing, setIsRubbing] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const rubTimeoutRef = useRef<any>(null);
  const bubbleTextTimeoutRef = useRef<any>(null);

  const showBubbleText = (text: string) => {
    setBubbleText(text);
    if (bubbleTextTimeoutRef.current) clearTimeout(bubbleTextTimeoutRef.current);
    bubbleTextTimeoutRef.current = setTimeout(() => setBubbleText(null), 3000);
  };

  const handleKick = () => {
    setIsKicking(true);
    onBubbleInteract('kick');
    const kickTexts = ["Teehee!", "I'm awake!", "Hi Maa!", "I'm wiggling!"];
    showBubbleText(kickTexts[Math.floor(Math.random() * kickTexts.length)]);
    setTimeout(() => setIsKicking(false), 600);
  };

  const handleRub = () => {
    if (!isRubbing) {
      setIsRubbing(true);
      onBubbleInteract('rub');
      const rubTexts = ["Mmm, feels nice...", "I love you Maa", "So warm...", "Keep rubbing!"];
      showBubbleText(rubTexts[Math.floor(Math.random() * rubTexts.length)]);
    }
    if (rubTimeoutRef.current) clearTimeout(rubTimeoutRef.current);
    rubTimeoutRef.current = setTimeout(() => setIsRubbing(false), 800);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const x = (window.innerWidth / 2 - e.clientX) / 100;
    const y = (window.innerHeight / 2 - e.clientY) / 100;
    setParallax({ x, y });
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center bg-[#FFF7ED] dark:bg-gray-950 transition-colors duration-500" onMouseMove={handleMouseMove}>
      <AnimationStyles />
      {/* Warm Gradient Background */}
      <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-100 via-[#FFF7ED] to-[#FFF7ED] dark:from-gray-900 dark:via-gray-950 dark:to-black transition-colors duration-1000 ${isRubbing ? 'from-pink-100 dark:from-pink-900/30' : ''}`}></div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center h-full w-full pt-20 pb-40 px-6">
        
        {/* Header - Empty space as header is fixed in main layout */}
        <div className="text-center space-y-2 animate-fade-in-down mb-6 mt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/40 dark:border-gray-700 shadow-sm">
             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
             <span className="text-gray-600 dark:text-gray-300 text-xs font-bold tracking-wider uppercase">Week {user.weeksPregnant}</span>
          </div>
          <h1 className="text-4xl text-gray-900 dark:text-white font-bold tracking-tight drop-shadow-sm">Hi, Maa</h1>
        </div>

        {/* Womb Bubble Interaction */}
        <div className="flex-1 flex items-center justify-center w-full mb-8">
          <div className="relative">
             <WombBubble 
              onClick={handleKick} 
              onRub={handleRub}
              isKicking={isKicking} 
              isRubbing={isRubbing}
              weeks={user.weeksPregnant}
              parallax={parallax}
              speechText={bubbleText}
            />
            {/* Improved Visibility for Hint Text */}
            <div className="absolute -bottom-14 left-0 right-0 flex justify-center pointer-events-none">
               <span className="bg-white/70 dark:bg-gray-800/80 backdrop-blur-xl px-4 py-1.5 rounded-full text-orange-950 dark:text-orange-100 font-bold text-[10px] border border-white/40 dark:border-gray-700 shadow-sm uppercase tracking-wide">
                 Tap for a kick • Rub to soothe
               </span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Update Capsule - Fixed Footer above Nav (bottom-28) */}
      <div className="fixed bottom-28 left-0 right-0 z-30 pointer-events-none px-6 flex justify-center pb-2">
        <div className="w-full max-w-xs animate-slide-in-up pointer-events-auto">
          {dailyContent ? (
            <div 
              onClick={(e) => { e.stopPropagation(); onPlay(); }}
              className="group relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-white/60 dark:border-gray-700 p-2 pr-2 rounded-full shadow-lg shadow-orange-500/10 dark:shadow-black/40 hover:shadow-xl transition-all active:scale-[0.98] cursor-pointer flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center shadow-md shrink-0 transition-transform group-hover:scale-105">
                  {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-1" />}
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                 <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                      Today's Update
                    </span>
                 </div>
                 <p className="text-gray-800 dark:text-gray-200 text-[12px] font-semibold truncate leading-tight">
                    {dailyContent.transcriptShort}
                 </p>
              </div>

              <div className="w-8 h-8 rounded-full border border-gray-100 dark:border-gray-700 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-orange-400 to-pink-500 opacity-20 animate-pulse"></div>
              </div>
            </div>
          ) : (
             <div className="h-14 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm rounded-full flex items-center justify-center border border-dashed border-orange-200 dark:border-gray-700 mx-8">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                 <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">Connecting...</span>
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Mom Tips View ---

const TipsView = ({ weeks }: { weeks: number }) => {
  // Simple mapping for fruits
  const fruits = [
    { week: 4, name: "Poppy Seed", icon: "🌱" },
    { week: 8, name: "Raspberry", icon: "🍇" },
    { week: 12, name: "Plum", icon: "🍑" },
    { week: 16, name: "Avocado", icon: "🥑" },
    { week: 20, name: "Banana", icon: "🍌" },
    { week: 24, name: "Corn", icon: "🌽" },
    { week: 28, name: "Eggplant", icon: "🍆" },
    { week: 32, name: "Squash", icon: "🥬" },
    { week: 36, name: "Papaya", icon: "🥭" },
    { week: 40, name: "Watermelon", icon: "🍉" }
  ];
  
  // Find closest fruit
  const currentFruit = fruits.reduce((prev, curr) => 
    Math.abs(curr.week - weeks) < Math.abs(prev.week - weeks) ? curr : prev
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-gray-950 pb-32 transition-colors duration-500 pt-20 px-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-6">Weekly Tips</h1>
      
      {/* Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-green-400 to-teal-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-teal-500/20 mb-8 animate-slide-in-up">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex flex-col items-center text-center">
            <span className="text-6xl mb-4 animate-bounce delay-700">{currentFruit.icon}</span>
            <p className="text-teal-100 font-bold text-sm uppercase tracking-wide mb-1">Your Baby Size</p>
            <h2 className="text-4xl font-bold tracking-tight mb-2">{currentFruit.name}</h2>
            <p className="text-teal-50 font-medium opacity-90">Approximate size at Week {weeks}</p>
        </div>
      </div>

      {/* Tips List */}
      <div className="space-y-4">
        {[
          { title: "Nutrition", text: "Focus on Iron and Calcium rich foods this week.", icon: <Utensils size={18} className="text-orange-500" /> },
          { title: "Self Care", text: "Try a 10-minute gentle prenatal yoga session.", icon: <Heart size={18} className="text-pink-500" /> },
          { title: "Bonding", text: "Read a short story aloud to your baby tonight.", icon: <Music size={18} className="text-blue-500" /> }
        ].map((tip, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-start gap-4 animate-fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
             <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
               {tip.icon}
             </div>
             <div>
               <h3 className="font-bold text-gray-900 dark:text-white mb-1">{tip.title}</h3>
               <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{tip.text}</p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Game View (Orange Game) ---

const CatchFruitGame = ({ onClose, onScore }: { onClose: () => void, onScore: (pts: number) => void }) => {
  const [fruits, setFruits] = useState<{ id: number, x: number, y: number, burst: boolean }[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const requestRef = useRef<number>();

  useEffect(() => {
    const spawnInterval = setInterval(() => {
      setFruits(prev => [...prev, { id: Date.now(), x: Math.random() * 80 + 10, y: -10, burst: false }]);
    }, 800);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(spawnInterval);
          clearInterval(timer);
          onScore(score);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const animate = () => {
      setFruits(prev => prev.map(f => f.burst ? f : { ...f, y: f.y + 0.8 }).filter(f => f.y < 110 && !f.burst || f.burst)); // keep bursts for animation
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      clearInterval(spawnInterval);
      clearInterval(timer);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [score, onClose, onScore]);

  const catchFruit = (e: React.PointerEvent, id: number) => {
    e.stopPropagation();
    // Mark as burst instead of removing immediately
    setFruits(prev => prev.map(f => f.id === id ? { ...f, burst: true } : f));
    setScore(s => s + 10);
    setTimeout(() => {
        setFruits(prev => prev.filter(f => f.id !== id));
    }, 400); // Remove after burst animation
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center p-4 touch-none">
      <div className="absolute top-4 right-4 text-white font-bold text-xl">Time: {timeLeft}s</div>
      <div className="absolute top-4 left-4 text-orange-400 font-bold text-xl">Score: {score}</div>
      <div className="relative w-full h-full overflow-hidden">
        {fruits.map(f => (
          <div 
            key={f.id}
            onPointerDown={(e) => !f.burst && catchFruit(e, f.id)}
            className={`absolute text-4xl cursor-pointer z-50 touch-manipulation select-none ${f.burst ? 'animate-burst' : ''}`}
            style={{ left: `${f.x}%`, top: `${f.y}%` }}
          >
            {f.burst ? '💥' : '🍊'}
          </div>
        ))}
      </div>
      <button onClick={onClose} className="absolute bottom-10 px-6 py-2 bg-white text-black rounded-full font-bold z-[70]">Quit</button>
    </div>
  );
};

const AccessoryShop = ({ coins, onBuy, onClose }: { coins: number, onBuy: (item: string, cost: number) => void, onClose: () => void }) => {
  const items = [
    { id: 'hat', name: 'Party Hat', cost: 100, icon: '🎩' },
    { id: 'glasses', name: 'Cool Shades', cost: 150, icon: '😎' },
    { id: 'bow', name: 'Cute Bow', cost: 80, icon: '🎀' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-in-up">
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-2xl font-bold dark:text-white">Baby Shop</h2>
           <button onClick={onClose}><X className="dark:text-white" /></button>
        </div>
        <div className="flex items-center gap-2 mb-6 bg-orange-100 dark:bg-orange-900/30 p-3 rounded-xl">
           <Coins className="text-orange-500" />
           <span className="font-bold text-orange-700 dark:text-orange-300">{coins} Coins</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
           {items.map(item => (
             <button 
               key={item.id}
               onClick={() => onBuy(item.id, item.cost)}
               className="p-4 border dark:border-gray-700 rounded-xl flex flex-col items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
             >
                <span className="text-4xl">{item.icon}</span>
                <span className="font-bold dark:text-white">{item.name}</span>
                <span className="text-xs font-bold text-orange-500">{item.cost} coins</span>
             </button>
           ))}
        </div>
      </div>
    </div>
  );
};

const GameView = ({ 
  user, 
  onPlaySFX,
  onUpdateUser 
}: { 
  user: UserProfile, 
  onPlaySFX: (s?: string) => void,
  onUpdateUser: (u: Partial<UserProfile>) => void
}) => {
  const [action, setAction] = useState<'idle' | 'eating' | 'shower' | 'playing' | 'sleeping' | 'hugging'>('idle');
  const [showMiniGame, setShowMiniGame] = useState(false);
  const [showShop, setShowShop] = useState(false);

  // Initialize stats from user profile, default if missing (backward compatibility)
  const stats = user.gameStats || { hunger: 80, hygiene: 80, fun: 80, energy: 80, love: 80, lastPlayed: Date.now() };

  // Decay stats on mount based on elapsed time
  useEffect(() => {
    if (!stats || !stats.lastPlayed) return;
    const now = Date.now();
    const elapsedHours = (now - stats.lastPlayed) / (1000 * 60 * 60);
    const decay = Math.floor(elapsedHours * 5); // 5 points per hour

    if (decay > 0) {
      const newStats = {
        hunger: Math.max(0, stats.hunger - decay),
        hygiene: Math.max(0, stats.hygiene - decay),
        fun: Math.max(0, stats.fun - decay),
        energy: Math.max(0, stats.energy - decay),
        love: Math.max(0, stats.love - decay),
        lastPlayed: now
      };
      onUpdateUser({ gameStats: newStats });
    }
  }, []);

  // Real-time loop
  useEffect(() => {
    const timer = setInterval(() => {
      const current = user.gameStats;
      if (!current) return;
      
      const newStats = {
        ...current,
        hunger: Math.max(0, current.hunger - 0.5),
        hygiene: Math.max(0, current.hygiene - 0.5),
        fun: Math.max(0, current.fun - 0.5),
        energy: Math.max(0, current.energy - 0.5),
        love: Math.max(0, current.love - 0.5),
        lastPlayed: Date.now()
      };
      onUpdateUser({ gameStats: newStats });
    }, 5000); // Check every 5s for smoother UI update, though persistence matters most on exit
    return () => clearInterval(timer);
  }, [user.gameStats, onUpdateUser]);

  const addXP = (amount: number) => {
    const newXP = (user.gameXP || 0) + amount;
    const currentLevel = user.gameLevel || 1;
    const nextLevelXP = currentLevel * 100;
    
    if (newXP >= nextLevelXP) {
      onUpdateUser({ 
        gameXP: newXP - nextLevelXP, 
        gameLevel: currentLevel + 1,
        coins: (user.coins || 0) + 50 // Level up bonus
      });
      // onPlaySFX("Yay! Level up!"); // Removed voice sfx
    } else {
      onUpdateUser({ gameXP: newXP });
    }
  };

  const handleAction = (type: 'feed' | 'shower' | 'play' | 'sleep' | 'hug') => {
    if (action !== 'idle') return;
    
    const current = user.gameStats || { hunger:50, hygiene:50, fun:50, energy:50, love:50, lastPlayed:0 };
    let newStats = { ...current, lastPlayed: Date.now() };

    if (type === 'feed') {
      setAction('eating');
      newStats.hunger = Math.min(100, current.hunger + 30);
      addXP(10);
    } else if (type === 'shower') {
      setAction('shower');
      newStats.hygiene = Math.min(100, current.hygiene + 30);
      addXP(10);
    } else if (type === 'play') {
      setAction('playing');
      newStats.fun = Math.min(100, current.fun + 30);
      newStats.energy = Math.max(0, current.energy - 10); // Play tires baby
      addXP(15);
    } else if (type === 'sleep') {
      setAction('sleeping');
      newStats.energy = Math.min(100, current.energy + 40);
      addXP(5);
    } else if (type === 'hug') {
      setAction('hugging');
      newStats.love = Math.min(100, current.love + 30);
      addXP(20);
    }

    onUpdateUser({ gameStats: newStats });
    setTimeout(() => setAction('idle'), 2500);
  };

  const handleMiniGameScore = (score: number) => {
    onUpdateUser({ coins: (user.coins || 0) + score });
  };

  const handleBuy = (item: string, cost: number) => {
    if ((user.coins || 0) >= cost) {
      const newInventory = [...(user.inventory || []), item];
      onUpdateUser({ 
        coins: user.coins - cost,
        inventory: newInventory,
        equippedAccessory: item
      });
      setShowShop(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center bg-orange-50 dark:bg-gray-950 pt-20 pb-32 px-6 overflow-hidden">
      <BackgroundParticles />
      
      {showMiniGame && <CatchFruitGame onClose={() => setShowMiniGame(false)} onScore={handleMiniGameScore} />}
      {showShop && <AccessoryShop coins={user.coins || 0} onBuy={handleBuy} onClose={() => setShowShop(false)} />}

      {/* Header with Level & Coins */}
      <div className="z-10 w-full flex justify-between items-center mb-6">
        <div className="flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm">
           <Trophy size={16} className="text-yellow-500" />
           <span className="font-bold text-gray-800 dark:text-gray-200">Lvl {user.gameLevel || 1}</span>
           <div className="w-16 h-2 bg-gray-200 rounded-full ml-1 overflow-hidden">
             <div className="h-full bg-yellow-400" style={{ width: `${((user.gameXP || 0) / ((user.gameLevel || 1) * 100)) * 100}%` }} />
           </div>
        </div>
        <div className="flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm">
           <Coins size={16} className="text-orange-500" />
           <span className="font-bold text-gray-800 dark:text-gray-200">{user.coins || 0}</span>
        </div>
      </div>

      {/* Baby Container */}
      <div className="relative z-10 w-full max-w-xs aspect-square bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-[3rem] shadow-xl border border-white/50 dark:border-gray-700 flex items-center justify-center mb-6">
        <div className="absolute top-4 right-4 z-20">
           <button onClick={() => setShowShop(true)} className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-md hover:scale-110 transition-transform">
             <ShoppingBag size={20} className="text-orange-500" />
           </button>
        </div>

        <RealisticFetus 
          weeks={user.weeksPregnant} 
          isKicking={action === 'playing'} 
          isRubbing={action === 'hugging'}
          isSleeping={action === 'sleeping'}
          className="w-48 h-48"
          accessory={user.equippedAccessory}
        />
        
        {/* Action Effects */}
        {action === 'eating' && (
          <div className="absolute inset-0 flex items-center justify-center animate-pop-in">
            <span className="text-4xl">🍎</span>
          </div>
        )}
        {action === 'shower' && (
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="absolute top-0 text-3xl animate-bounce">Bubbles!</div>
             <Droplets className="text-blue-400 w-16 h-16 animate-pulse" />
          </div>
        )}
        {action === 'playing' && (
           <div className="absolute inset-0 flex items-center justify-center">
             <PartyPopper className="text-yellow-500 w-16 h-16 animate-spin" />
           </div>
        )}
        {action === 'sleeping' && (
           <div className="absolute inset-0 flex items-center justify-center">
             <Moon className="text-indigo-400 w-16 h-16 animate-pulse" />
             <span className="absolute -top-4 right-10 text-2xl animate-bounce delay-100">Zzz</span>
           </div>
        )}
        {action === 'hugging' && (
           <div className="absolute inset-0 flex items-center justify-center">
             <Heart className="text-pink-500 w-20 h-20 animate-ping opacity-50 absolute" />
             <Heart className="text-pink-500 w-16 h-16 relative" fill="currentColor" />
           </div>
        )}
      </div>

      {/* Stats Bars - Compact Grid */}
      <div className="w-full max-w-xs grid grid-cols-2 gap-3 mb-6 bg-white/60 dark:bg-gray-900/60 p-4 rounded-2xl backdrop-blur-sm">
        {[
          { label: 'Hunger', val: stats.hunger, color: 'bg-green-500' },
          { label: 'Hygiene', val: stats.hygiene, color: 'bg-blue-500' },
          { label: 'Fun', val: stats.fun, color: 'bg-yellow-500' },
          { label: 'Energy', val: stats.energy, color: 'bg-indigo-500' },
          { label: 'Love', val: stats.love, color: 'bg-pink-500', full: true }
        ].map(s => (
          <div key={s.label} className={`space-y-1 ${s.full ? 'col-span-2' : ''}`}>
            <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">
              <span>{s.label}</span>
              <span>{Math.round(s.val)}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full ${s.color} transition-all duration-500`} style={{ width: `${s.val}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-5 gap-2 z-20 w-full max-w-sm">
        <button onClick={() => handleAction('feed')} className="control-btn bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
          <div className="btn-icon bg-green-500"><Utensils size={18} /></div>
          <span>Feed</span>
        </button>
        <button onClick={() => handleAction('shower')} className="control-btn bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
          <div className="btn-icon bg-blue-500"><Droplets size={18} /></div>
          <span>Bath</span>
        </button>
        <button onClick={() => handleAction('sleep')} className="control-btn bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
          <div className="btn-icon bg-indigo-500"><Moon size={18} /></div>
          <span>Sleep</span>
        </button>
        <button onClick={() => handleAction('hug')} className="control-btn bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300">
          <div className="btn-icon bg-pink-500"><Heart size={18} /></div>
          <span>Hug</span>
        </button>
        <button onClick={() => setShowMiniGame(true)} className="control-btn bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
          <div className="btn-icon bg-purple-500"><Gamepad2 size={18} /></div>
          <span>Game</span>
        </button>
      </div>
      
      <style>{`
        .control-btn {
          @apply flex flex-col items-center gap-1 p-1.5 rounded-xl hover:scale-105 active:scale-95 transition-transform shadow-sm;
        }
        .control-btn span {
          @apply text-[9px] font-bold;
        }
        .btn-icon {
          @apply w-9 h-9 text-white rounded-full flex items-center justify-center shadow-md;
        }
      `}</style>
    </div>
  );
};

// --- Chat View ---

const ChatView = ({ 
  history, 
  onSend, 
  isTyping,
  voiceName
}: { 
  history: ChatMessage[], 
  onSend: (text: string) => void, 
  isTyping: boolean,
  voiceName: string 
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] dark:bg-gray-900 relative overflow-hidden transition-colors duration-500">
      <AnimationStyles />
      {/* Dynamic Background with Particles */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-50/50 to-white dark:from-gray-900 dark:to-gray-950 pointer-events-none"></div>
      <BackgroundParticles />
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.02] bg-[radial-gradient(#fb923c_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100/50 dark:border-gray-800/50 pt-16 pb-3 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <BabyAvatar />
          <div>
            <h2 className="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-1">Orange Kutty</h2>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium tracking-wide">Online</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto px-4 pt-28 pb-32 space-y-6 scrollbar-hide">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
            <MessageCircle size={48} className="text-orange-200 dark:text-gray-700" />
            <p className="text-gray-400 text-sm">Say hello to your little one...</p>
          </div>
        ) : (
          history.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex w-full ${msg.role === 'mom' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
            >
              <div className={`flex max-w-[85%] items-end gap-2 ${msg.role === 'mom' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'mom' ? <MomAvatar /> : <BabyAvatar />}
                
                <div 
                  className={`relative p-4 rounded-2xl shadow-sm text-[15px] leading-relaxed 
                    ${msg.role === 'mom' 
                      ? 'bg-gradient-to-br from-orange-500 to-rose-600 text-white rounded-br-none' 
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-100 dark:border-gray-700'
                    }`}
                >
                  {msg.text}
                  {/* Timestamp */}
                  <div className={`text-[9px] mt-2 font-medium opacity-60 text-right ${msg.role === 'mom' ? 'text-orange-100' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        
        {isTyping && (
          <div className="flex w-full justify-start animate-fade-in">
             <div className="flex max-w-[85%] items-end gap-2">
                <BabyAvatar />
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl rounded-bl-none border border-gray-100 dark:border-gray-700 shadow-sm">
                   <div className="flex gap-1.5 h-4 items-center">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                   </div>
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-20 left-0 right-0 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-100 dark:border-gray-800">
        <div className="flex gap-3 max-w-lg mx-auto">
          <input
            type="text"
            className="flex-1 bg-gray-100 dark:bg-gray-800 border-0 rounded-full px-6 py-3.5 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900 outline-none text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-inner text-[15px]"
            placeholder="Talk to baby..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isTyping}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-50 disabled:scale-100 text-white flex items-center justify-center shadow-lg shadow-orange-200 dark:shadow-none transition-all duration-300"
          >
            <Send size={20} className={input.trim() ? "translate-x-0.5" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Settings View ---

const SettingsView = ({ user, onUpdateUser, onReset }: { user: UserProfile, onUpdateUser: (u: Partial<UserProfile>) => void, onReset: () => void }) => {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  
  const playSample = async (voiceId: string) => {
    // Prevent spam
    if (playingVoice) return;
    setPlayingVoice(voiceId);
    
    // In a real app we'd fetch a sample, but here we can just simulate or use a hardcoded base64 if available.
    // Since we don't have hardcoded samples, we will just timeout the "playing" state for UI feedback.
    setTimeout(() => setPlayingVoice(null), 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32 pt-20 px-6 transition-colors duration-500">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-6">Profile & Settings</h1>
      
      <div className="space-y-6 max-w-2xl mx-auto">
        
        {/* User Info Section */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
           <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">My Information</h3>
           <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Your Name</label>
                <input 
                  type="text" 
                  value={user.name}
                  onChange={(e) => onUpdateUser({ name: e.target.value })}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-none text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-orange-200"
                />
              </div>
              <div>
                 <label className="block text-xs font-semibold text-gray-500 mb-1">Start of Pregnancy</label>
                 <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <span className="text-gray-900 dark:text-white font-medium">{user.lmp || 'Not Set'}</span>
                    <span className="text-xs font-bold text-orange-500 px-2 py-1 bg-orange-100 rounded-md">Week {user.weeksPregnant}</span>
                 </div>
              </div>
           </div>
        </section>

        {/* Voice Selection */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Baby's Voice</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
             {VOICE_OPTIONS.slice(0, 6).map(voice => (
               <div 
                 key={voice.id}
                 onClick={() => { onUpdateUser({ voiceName: voice.id }); playSample(voice.id); }}
                 className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center justify-between group
                   ${user.voiceName === voice.id 
                     ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                     : 'border-transparent bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
               >
                 <div>
                    <div className="font-bold text-gray-900 dark:text-white">{voice.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{voice.description}</div>
                 </div>
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${user.voiceName === voice.id ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                    {playingVoice === voice.id ? <Volume2 size={14} className="animate-pulse" /> : (user.voiceName === voice.id ? <Check size={14} /> : <Play size={14} fill="currentColor" />)}
                 </div>
               </div>
             ))}
          </div>
        </section>

        {/* Appearance */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
           <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Appearance</h3>
           <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              {(['light', 'dark', 'system'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onUpdateUser({ theme: mode })}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all ${user.theme === mode ? 'bg-white dark:bg-gray-700 shadow-sm text-orange-600 dark:text-orange-400' : 'text-gray-500'}`}
                >
                  {mode}
                </button>
              ))}
           </div>
        </section>

        {/* Data Zone */}
        <section>
          <button 
            onClick={() => { if(window.confirm("Are you sure you want to reset your journey? This cannot be undone.")) onReset(); }}
            className="w-full p-4 rounded-2xl border border-red-200 dark:border-red-900/50 text-red-500 bg-red-50 dark:bg-red-900/10 font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            <span>Reset Journey</span>
          </button>
        </section>

        <div className="text-center pt-8 pb-4">
           <p className="text-xs text-gray-400 font-medium">Made with ❤️ for {APP_NAME}</p>
        </div>

      </div>
    </div>
  );
};

// --- Main App Component ---

const App = () => {
  const [appState, setAppState] = useState<AppState>(INITIAL_STATE);
  const [view, setView] = useState<ViewState>(ViewState.ONBOARDING);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Load state on mount
  useEffect(() => {
    const loaded = loadState();
    setAppState(loaded);
    if (loaded.user.hasCompletedOnboarding) {
      setView(ViewState.CONNECTION);
    }
  }, []);

  // Save state on change
  useEffect(() => {
    saveState(appState);
    
    // Apply theme
    const root = window.document.documentElement;
    const isDark = appState.user.theme === 'dark' || (appState.user.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');

  }, [appState]);

  // Check for daily content
  useEffect(() => {
    if (!appState.user.hasCompletedOnboarding) return;

    const today = getTodayString();
    
    // Logic: If we don't have today's content, generate it.
    if (!appState.cachedDailyContent[today]) {
       const fetchDaily = async () => {
         // Get the last user message for context if available
         const lastLogKey = Object.keys(appState.dailyLogs).sort().pop();
         const lastMsg = lastLogKey ? appState.dailyLogs[lastLogKey]?.messages?.slice(-1)[0]?.text : undefined;
         const lastMomReply = (lastMsg && appState.dailyLogs[lastLogKey]?.messages?.slice(-1)[0]?.role === 'mom') ? lastMsg : undefined;

         const content = await generateDailyContent(appState.user, lastMomReply);
         
         // Generate audio immediately for the "morning update"
         const audioBase64 = await generateSpeech(content.audioText, appState.user.voiceName);
         
         const newContent: DailyContent = {
           date: today,
           week: appState.user.weeksPregnant,
           day: new Date().getDay(),
           ...content,
           audioBase64: audioBase64 || undefined
         };

         setAppState(prev => ({
           ...prev,
           cachedDailyContent: {
             ...prev.cachedDailyContent,
             [today]: newContent
           }
         }));
       };
       fetchDaily();
    }
  }, [appState.user.hasCompletedOnboarding, appState.user.weeksPregnant]);

  const handleUpdateUser = (updates: Partial<UserProfile>) => {
    setAppState(prev => ({
      ...prev,
      user: { ...prev.user, ...updates }
    }));
  };

  const handlePlayAudio = async () => {
    const today = getTodayString();
    const content = appState.cachedDailyContent[today];
    
    if (!content?.audioBase64) return;
    
    if (isPlayingAudio) {
      // Stop logic
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
      setIsPlayingAudio(false);
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const audioData = base64ToUint8Array(content.audioBase64);
      const buffer = pcmToAudioBuffer(audioData, ctx);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlayingAudio(false);
      
      sourceNodeRef.current = source;
      source.start();
      setIsPlayingAudio(true);
    } catch (e) {
      console.error("Audio playback error", e);
      setIsPlayingAudio(false);
    }
  };

  const handlePlaySFX = async () => {
    // Simple placeholder for UI interaction sounds
    // In a full app, this would use a shorter audio buffer logic
  };

  const handleSendMessage = async (text: string) => {
    const today = getTodayString();
    const currentLog = appState.dailyLogs[today] || { date: today, messages: [] };
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'mom',
      text,
      timestamp: Date.now()
    };

    const updatedMessages = [...currentLog.messages, userMsg];
    
    // Optimistic update
    setAppState(prev => ({
      ...prev,
      dailyLogs: { ...prev.dailyLogs, [today]: { ...currentLog, messages: updatedMessages } }
    }));

    setIsTyping(true);

    // Get AI Response
    // We pass only the messages for context
    const replyText = await generateBabyChatResponse(appState.user, updatedMessages, text);
    
    setIsTyping(false);

    const babyMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'baby',
      text: replyText,
      timestamp: Date.now()
    };

    setAppState(prev => ({
      ...prev,
      dailyLogs: { 
        ...prev.dailyLogs, 
        [today]: { ...currentLog, messages: [...updatedMessages, babyMsg] } 
      }
    }));
  };

  const handleBubbleInteract = (type: 'kick' | 'rub') => {
    // Update game stats slightly on interaction
    const current = appState.user.gameStats;
    if (!current) return;
    
    let updates = {};
    if (type === 'rub') {
       updates = { love: Math.min(100, current.love + 5), lastPlayed: Date.now() };
    } else {
       updates = { fun: Math.min(100, current.fun + 5), lastPlayed: Date.now() };
    }
    
    handleUpdateUser({ gameStats: { ...current, ...updates } });
  };

  // --- Render ---

  if (!appState.user.hasCompletedOnboarding) {
    return <OnboardingView user={appState.user} onUpdate={handleUpdateUser} />;
  }

  const todayContent = appState.cachedDailyContent[getTodayString()];

  return (
    <div className="font-sans antialiased text-gray-900 bg-[#FFF7ED]">
      {/* Main View Render */}
      {view === ViewState.CONNECTION && (
        <ConnectionView 
          user={appState.user} 
          dailyContent={todayContent} 
          isPlaying={isPlayingAudio} 
          onPlay={handlePlayAudio}
          onBubbleInteract={handleBubbleInteract}
        />
      )}
      
      {view === ViewState.TIPS && (
        <TipsView weeks={appState.user.weeksPregnant} />
      )}
      
      {view === ViewState.GAME && (
        <GameView 
          user={appState.user} 
          onPlaySFX={handlePlaySFX}
          onUpdateUser={handleUpdateUser}
        />
      )}

      {view === ViewState.CHAT && (
        <ChatView 
          history={appState.dailyLogs[getTodayString()]?.messages || []} 
          onSend={handleSendMessage}
          isTyping={isTyping} 
          voiceName={appState.user.voiceName}
        />
      )}

      {view === ViewState.SETTINGS && (
        <SettingsView 
          user={appState.user} 
          onUpdateUser={handleUpdateUser} 
          onReset={clearState}
        />
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800 pb-safe-bottom safe-area-bottom shadow-lg shadow-black/5">
        <div className="flex justify-around items-center px-2 py-3 max-w-md mx-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = view === item.view;
            return (
              <button
                key={item.view}
                onClick={() => setView(item.view as ViewState)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-300 w-16 relative group ${isActive ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
              >
                {/* Active Indicator Background */}
                <span className={`absolute inset-0 bg-orange-50 dark:bg-orange-900/20 rounded-2xl transition-all duration-300 ${isActive ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}></span>
                
                <item.icon size={22} className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-sm stroke-[2.5px]' : ''}`} />
                <span className={`relative z-10 text-[9px] font-bold tracking-wide transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 hidden'}`}>
                  {item.label}
                </span>
                {/* Simple dot for inactive state to keep spacing */}
                <span className={`w-1 h-1 rounded-full bg-current opacity-20 transition-all ${!isActive ? 'block' : 'hidden'}`}></span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default App;