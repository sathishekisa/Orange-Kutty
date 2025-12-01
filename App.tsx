
import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, MessageCircle, User, Sparkles, Music, Mic, Send,
  ChevronRight, Play, Pause, Calendar, RefreshCcw, Settings, Volume2, Smile, Phone, LogOut, X, Info,
  Zap, Moon, Sun, Clock, Monitor, Edit3, Citrus, Droplets, Utensils, PartyPopper, ShoppingBag, Coins, Star, Trophy, Gamepad2
} from 'lucide-react';
import { AppState, ViewState, DailyLog, UserProfile, DailyContent, ChatMessage, ThemeMode } from './types';
import { INITIAL_STATE, NAV_ITEMS, DEFAULT_USER, VOICE_OPTIONS } from './constants';
import { loadState, saveState, clearState } from './services/storageService';
import { generateDailyContent, generateSpeech, generateBabyChatResponse } from './services/geminiService';

// --- Utility Functions ---

const calculateWeeks = (lmp: string | null): number => {
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
    .animate-wiggle {
      animation: wiggle 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .animate-rub {
      animation: rub-vibrate 0.3s linear infinite;
    }
    .animate-particle {
      animation: float-out 0.8s ease-out forwards;
    }
    .animate-blob {
      animation: blob 12s ease-in-out infinite;
    }
    .animate-float-baby {
      animation: float-baby 6s ease-in-out infinite;
    }
    .animate-pop-in {
      animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    .animate-float-slow {
      animation: float-slow 8s ease-in-out infinite;
    }
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
    .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
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

const SoothingFeedback = ({ active }: { active: boolean }) => {
  if (!active) return null;
  return (
    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl px-5 py-2 rounded-full shadow-[0_10px_40px_-10px_rgba(255,100,150,0.3)] border border-pink-100/50 animate-fade-in-up z-30 whitespace-nowrap">
      <div className="flex items-center gap-2 text-pink-500 font-bold text-xs tracking-wide uppercase">
        <Heart size={14} fill="currentColor" className="animate-pulse" />
        <span>Sending Love...</span>
      </div>
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
  parallax
}: { 
  onClick: () => void, 
  onRub: () => void,
  isKicking: boolean,
  isRubbing: boolean,
  weeks: number,
  parallax: { x: number, y: number }
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
      {/* Soothing Popup */}
      <SoothingFeedback active={isRubbing} />

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
  onBubbleInteract: () => void
}) => {
  const [isKicking, setIsKicking] = useState(false);
  const [isRubbing, setIsRubbing] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const rubTimeoutRef = useRef<any>(null);

  const handleKick = () => {
    setIsKicking(true);
    onBubbleInteract();
    setTimeout(() => setIsKicking(false), 600);
  };

  const handleRub = () => {
    if (!isRubbing) setIsRubbing(true);
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

// --- Game View (Orange Game) ---

const CatchFruitGame = ({ onClose, onScore }: { onClose: () => void, onScore: (pts: number) => void }) => {
  const [fruits, setFruits] = useState<{ id: number, x: number, y: number }[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const requestRef = useRef<number>();

  useEffect(() => {
    const spawnInterval = setInterval(() => {
      setFruits(prev => [...prev, { id: Date.now(), x: Math.random() * 80 + 10, y: -10 }]);
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
      setFruits(prev => prev.map(f => ({ ...f, y: f.y + 0.8 })).filter(f => f.y < 110));
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      clearInterval(spawnInterval);
      clearInterval(timer);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [score, onClose, onScore]);

  const catchFruit = (id: number) => {
    setFruits(prev => prev.filter(f => f.id !== id));
    setScore(s => s + 10);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4 text-white font-bold text-xl">Time: {timeLeft}s</div>
      <div className="absolute top-4 left-4 text-orange-400 font-bold text-xl">Score: {score}</div>
      <div className="relative w-full h-full overflow-hidden">
        {fruits.map(f => (
          <div 
            key={f.id}
            onClick={() => catchFruit(f.id)}
            className="absolute text-4xl cursor-pointer active:scale-90 transition-transform z-50 touch-manipulation"
            style={{ left: `${f.x}%`, top: `${f.y}%` }}
          >
            🍊
          </div>
        ))}
      </div>
      <button onClick={onClose} className="absolute bottom-10 px-6 py-2 bg-white text-black rounded-full font-bold">Quit</button>
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
  onPlaySFX: (s:string) => void,
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
      onPlaySFX("Yay! Level up!");
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
      onPlaySFX("Yum yum!");
      newStats.hunger = Math.min(100, current.hunger + 30);
      addXP(10);
    } else if (type === 'shower') {
      setAction('shower');
      onPlaySFX("Splash!");
      newStats.hygiene = Math.min(100, current.hygiene + 30);
      addXP(10);
    } else if (type === 'play') {
      setAction('playing');
      onPlaySFX("Hehe!");
      newStats.fun = Math.min(100, current.fun + 30);
      newStats.energy = Math.max(0, current.energy - 10); // Play tires baby
      addXP(15);
    } else if (type === 'sleep') {
      setAction('sleeping');
      onPlaySFX("Goodnight...");
      newStats.energy = Math.min(100, current.energy + 40);
      addXP(5);
    } else if (type === 'hug') {
      setAction('hugging');
      onPlaySFX("I love you!");
      newStats.love = Math.min(100, current.love + 30);
      addXP(20);
    }

    onUpdateUser({ gameStats: newStats });
    setTimeout(() => setAction('idle'), 2500);
  };

  const handleMiniGameScore = (score: number) => {
    onUpdateUser({ coins: (user.coins || 0) + score });
    onPlaySFX("Woohoo!");
  };

  const handleBuy = (item: string, cost: number) => {
    if ((user.coins || 0) >= cost) {
      const newInventory = [...(user.inventory || []), item];
      onUpdateUser({ 
        coins: user.coins - cost,
        inventory: newInventory,
        equippedAccessory: item
      });
      onPlaySFX("Stylish!");
      setShowShop(false);
    } else {
      onPlaySFX("Need more coins!");
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
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Online</p>
            </div>
          </div>
        </div>
        <div className="bg-orange-50 dark:bg-gray-800 px-3 py-1 rounded-full text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider border border-orange-100 dark:border-gray-700 flex items-center gap-1.5 shadow-sm">
           <Volume2 size={10} />
           {VOICE_OPTIONS.find(v => v.id === voiceName)?.label}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pt-32 pb-48 px-4 space-y-6 scrollbar-hide">
        {history.length === 0 && (
          <div className="flex flex-col items-center justify-center h-3/4 text-center space-y-6 opacity-80 mt-12">
            <div className="w-32 h-32 bg-orange-50 dark:bg-gray-800 rounded-full flex items-center justify-center animate-pulse border-4 border-white dark:border-gray-700 shadow-sm">
               <Smile size={64} className="text-orange-300 dark:text-orange-600" />
            </div>
            <div className="max-w-xs space-y-2">
               <p className="text-gray-900 dark:text-white font-bold text-lg">Say hello to baby</p>
               <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed px-4">Baby is listening! Try saying "I love you" or "How are you today?"</p>
            </div>
          </div>
        )}
        
        {history.map((msg, idx) => {
          const isMom = msg.role === 'mom';
          const showAvatar = idx === 0 || history[idx - 1].role !== msg.role;
          
          return (
            <div 
              key={msg.id} 
              className={`flex items-end gap-2.5 ${isMom ? 'flex-row-reverse animate-slide-in-up' : 'flex-row animate-pop-in'}`}
            >
              {showAvatar ? (isMom ? <MomAvatar /> : <BabyAvatar />) : <div className="w-9" />}
              
              <div className="flex flex-col gap-1 max-w-[75%]">
                <div 
                  className={`px-5 py-3 text-[15px] leading-relaxed shadow-sm transition-all ${
                    isMom 
                      ? 'bg-gradient-to-br from-orange-500 to-rose-500 text-white rounded-2xl rounded-tr-sm shadow-orange-500/20' 
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm shadow-gray-200/50 dark:shadow-none'
                  }`}
                >
                  {msg.text}
                </div>
                {/* Timestamp */}
                <div className={`flex items-center gap-1 text-[10px] text-gray-400 font-medium ${isMom ? 'justify-end' : 'justify-start ml-1'}`}>
                   {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 pl-12 animate-fade-in">
             <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-3.5 rounded-2xl rounded-tl-sm shadow-sm flex gap-1.5">
               <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms'}}></span>
               <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms'}}></span>
               <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms'}}></span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Input Footer - Fixed above Navigation Tabs (bottom-28) */}
      <div className="fixed bottom-28 left-0 right-0 z-30 pointer-events-none px-4 flex justify-center">
        <div className="pointer-events-auto w-full max-w-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700 p-1.5 rounded-[2rem] shadow-xl flex items-center gap-2 pl-5">
          <input 
            type="text" 
            placeholder="Type a message to baby..." 
            className="flex-1 bg-transparent outline-none text-gray-800 dark:text-white placeholder:text-gray-400 text-[16px] py-3 font-medium"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="w-12 h-12 bg-gray-900 dark:bg-orange-500 text-white rounded-full flex items-center justify-center hover:bg-black dark:hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-md"
          >
            <Send size={20} strokeWidth={2.5} className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Settings View ---

const SettingsView = ({ 
  user, 
  onVoiceChange, 
  onReset,
  onPreviewVoice,
  onThemeChange,
  onUpdateUser
}: { 
  user: UserProfile, 
  onVoiceChange: (voice: string) => void, 
  onReset: () => void,
  onPreviewVoice: (voice: string) => void,
  onThemeChange: (theme: ThemeMode) => void,
  onUpdateUser: (u: Partial<UserProfile>) => void
}) => {
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);

  const handlePreview = (e: React.MouseEvent, voiceId: string) => {
    e.stopPropagation();
    setPlayingPreview(voiceId);
    onPreviewVoice(voiceId);
    setTimeout(() => setPlayingPreview(null), 3000);
  };

  const handleLmpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const newLmp = e.target.value;
     if (newLmp) {
       onUpdateUser({ 
         lmp: newLmp,
         weeksPregnant: calculateWeeks(newLmp)
       });
     }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-gray-950 pb-32 transition-colors duration-500">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 pt-16 pb-4 px-6 sticky top-0 z-20">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Profile</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6 mt-4">
        {/* Profile Hero Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-rose-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-orange-500/20 mb-8">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 bg-black/5 rounded-full blur-xl"></div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/50 mb-4 shadow-sm">
                 <span className="text-3xl">🤰</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-1">Week {user.weeksPregnant}</h2>
              <p className="text-orange-100 font-medium text-sm mb-6">Trimester {Math.ceil(user.weeksPregnant / 13)} • {Math.max(0, 40 - user.weeksPregnant)} weeks to go</p>

              {/* Progress Bar */}
              <div className="w-full bg-black/20 h-3 rounded-full overflow-hidden backdrop-blur-sm">
                 <div 
                   className="h-full bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-1000 ease-out rounded-full"
                   style={{ width: `${Math.min((user.weeksPregnant / 40) * 100, 100)}%` }}
                 />
              </div>
              <div className="w-full flex justify-between text-[10px] font-bold uppercase tracking-wider text-orange-100 mt-2">
                <span>Conception</span>
                <span>Due Date</span>
              </div>
            </div>
        </div>

        {/* Pregnancy Details */}
        <div className="space-y-3">
           <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-4">My Pregnancy</h3>
           <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
             <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-500">
                     <Calendar size={16} />
                  </div>
                  Last Period Date (LMP)
                </label>
                <div className="bg-orange-50 dark:bg-gray-800 px-2 py-1 rounded-md">
                   <Edit3 size={14} className="text-orange-400" />
                </div>
             </div>
             <input 
               type="date" 
               value={user.lmp || ''}
               onChange={handleLmpChange}
               className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-gray-900 dark:text-white font-bold text-lg outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-center"
             />
             <p className="text-xs text-gray-400 mt-3 ml-1 text-center font-medium">Updating this will recalculate your current week.</p>
           </div>
        </div>

        {/* Theme Settings */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-4">Appearance</h3>
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-2 flex gap-1">
            {['light', 'dark', 'system'].map((t) => (
              <button
                key={t}
                onClick={() => onThemeChange(t as ThemeMode)}
                className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all ${user.theme === t ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
              >
                {t === 'light' && <Sun size={16} />}
                {t === 'dark' && <Moon size={16} />}
                {t === 'system' && <Monitor size={16} />}
                <span className="capitalize">{t}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Voice Selection Group */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-4">Baby's Voice Personality</h3>
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800 scrollbar-thin scrollbar-thumb-orange-100">
              {VOICE_OPTIONS.map((voice) => (
                <div 
                  key={voice.id}
                  onClick={() => onVoiceChange(voice.id)}
                  className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${user.voiceName === voice.id ? 'bg-orange-50/50 dark:bg-orange-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${user.voiceName === voice.id ? 'border-orange-500 scale-105 bg-orange-100 dark:bg-orange-900' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'}`}>
                        {user.voiceName === voice.id ? <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" /> : <div className="w-2 h-2 bg-gray-300 rounded-full" />}
                    </div>
                    <div>
                      <p className={`font-bold text-[15px] ${user.voiceName === voice.id ? 'text-orange-900 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300'}`}>{voice.label}</p>
                      <p className="text-xs text-gray-400 font-medium">{voice.description}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => handlePreview(e, voice.id)}
                    className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full hover:bg-orange-100 dark:hover:bg-gray-700 hover:text-orange-600 transition-colors active:scale-90"
                  >
                    {playingPreview === voice.id ? <Volume2 size={18} className="animate-pulse" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-4">Account</h3>
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
             <button 
              onClick={onReset}
              className="w-full p-5 flex items-center justify-between text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group"
            >
              <span className="font-semibold text-[15px]">Reset All App Data</span>
              <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
            </button>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-2 pt-6 pb-20">
          <OrangeLogo className="w-8 h-8 opacity-50 grayscale" />
          <p className="text-xs text-gray-400 font-medium">Orange Kutty v1.7</p>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [view, setView] = useState<ViewState>(ViewState.ONBOARDING);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Initialize State
  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    if (loaded.user.hasCompletedOnboarding) {
      setView(ViewState.CONNECTION);
    }
    // Apply Theme
    if (loaded.user.theme) applyTheme(loaded.user.theme);
  }, []);

  const applyTheme = (theme: ThemeMode) => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      }
    }
  };

  // Initialize Audio Context on user interaction (safeguard)
  const ensureAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000 
      });
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  useEffect(() => {
    const initAudio = () => ensureAudioContext().catch(console.error);
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('touchstart', initAudio, { once: true });
    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  // Save State on Change
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Generate Daily Content if needed
  useEffect(() => {
    if (!state.user.hasCompletedOnboarding) return;

    const today = getTodayString();
    if (!state.cachedDailyContent[today]) {
      const fetchContent = async () => {
        const lastChat = state.dailyLogs[today]?.messages.slice(-1)[0]?.text;
        const content = await generateDailyContent(state.user, lastChat);
        const audioBase64 = await generateSpeech(content.audioText, state.user.voiceName);
        
        const newContent: DailyContent = {
          date: today,
          week: state.user.weeksPregnant,
          day: new Date().getDay(),
          ...content,
          audioBase64: audioBase64 || undefined
        };

        setState(prev => ({
          ...prev,
          cachedDailyContent: { ...prev.cachedDailyContent, [today]: newContent }
        }));
      };
      fetchContent();
    }
  }, [state.user, state.cachedDailyContent]);


  // --- Audio Handlers ---

  const stopAudio = () => {
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
        activeSourceRef.current.disconnect();
      } catch (e) { /* ignore */ }
      activeSourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const playAudio = async (base64Audio: string) => {
    try {
      const ctx = await ensureAudioContext();
      stopAudio(); // Stop any previous audio
      
      const u8 = base64ToUint8Array(base64Audio);
      const buffer = pcmToAudioBuffer(u8, ctx, 24000);
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      
      activeSourceRef.current = source;
      source.start(0);
      setIsPlaying(true);
    } catch (e) {
      console.error("Audio playback error", e);
      setIsPlaying(false);
    }
  };

  const playSFX = async (text: string = "Hehe!") => {
    try {
      const base64 = await generateSpeech(text, state.user.voiceName);
      if (base64) {
         const ctx = await ensureAudioContext();
         const u8 = base64ToUint8Array(base64);
         const buffer = pcmToAudioBuffer(u8, ctx, 24000);
         const source = ctx.createBufferSource();
         source.buffer = buffer;
         source.connect(ctx.destination);
         source.start(0);
      }
    } catch (e) { console.error("SFX error", e); }
  };

  // --- Interaction Handlers ---

  const handleUpdateUser = (updates: Partial<UserProfile>) => {
    if (updates.theme) applyTheme(updates.theme);
    setState(prev => ({ ...prev, user: { ...prev.user, ...updates } }));
  };

  const handleVoiceChange = async (newVoiceId: string) => {
    handleUpdateUser({ voiceName: newVoiceId });
    const today = getTodayString();
    const currentDaily = state.cachedDailyContent[today];
    
    if (currentDaily && currentDaily.audioText) {
      setState(prev => ({
        ...prev,
        cachedDailyContent: {
          ...prev.cachedDailyContent,
          [today]: { ...currentDaily, audioBase64: undefined }
        }
      }));
      const newAudio = await generateSpeech(currentDaily.audioText, newVoiceId);
      setState(prev => ({
        ...prev,
        cachedDailyContent: {
          ...prev.cachedDailyContent,
          [today]: { ...currentDaily, audioBase64: newAudio || undefined }
        }
      }));
    }
  };

  const handleVoicePreview = async (voiceId: string) => {
    const sample = "Hi Maa! It's me, your baby!";
    const base64 = await generateSpeech(sample, voiceId);
    if (base64) playAudio(base64);
  };

  const handleBubbleClick = () => {
    const sounds = ["Hehe!", "I love you!", "Mama!", "Yay!", "Hi Maa!"];
    const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
    playSFX(randomSound);
  };

  const handleSendMessage = async (text: string) => {
    const today = getTodayString();
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'mom',
      text,
      timestamp: Date.now()
    };

    const currentLog = state.dailyLogs[today] || { date: today, messages: [] };
    const updatedMessages = [...currentLog.messages, newMsg];
    
    setState(prev => ({
      ...prev,
      dailyLogs: { ...prev.dailyLogs, [today]: { ...currentLog, messages: updatedMessages } }
    }));

    setIsTyping(true);

    const replyText = await generateBabyChatResponse(state.user, updatedMessages, text);
    const audioBase64 = await generateSpeech(replyText, state.user.voiceName);

    const replyMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'baby',
      text: replyText,
      audioBase64: audioBase64 || undefined,
      timestamp: Date.now()
    };

    setIsTyping(false);

    setState(prev => ({
      ...prev,
      dailyLogs: { 
        ...prev.dailyLogs, 
        [today]: { ...currentLog, messages: [...updatedMessages, replyMsg] } 
      }
    }));

    if (audioBase64) {
      playAudio(audioBase64);
    }
  };

  // --- Render ---

  if (view === ViewState.ONBOARDING) {
    return <OnboardingView user={state.user} onUpdate={(u) => { handleUpdateUser(u); setView(ViewState.CONNECTION); }} />;
  }

  const today = getTodayString();
  const currentDaily = state.cachedDailyContent[today] || null;
  const currentHistory = state.dailyLogs[today]?.messages || [];

  return (
    <div className="font-sans text-gray-900 bg-[#FFF7ED] dark:bg-gray-950 min-h-screen flex flex-col antialiased selection:bg-orange-200 selection:text-orange-900 transition-colors duration-500">
      {/* Top Bar - Clickable Logo & App Name */}
      <div className="fixed top-0 left-0 right-0 z-40 p-4 flex justify-between items-center pointer-events-none">
        <div 
          className="pointer-events-auto flex items-center gap-2 bg-white/40 dark:bg-black/40 backdrop-blur-md pl-1 pr-4 py-1 rounded-full shadow-sm cursor-pointer active:scale-95 transition-transform"
          onClick={() => setView(ViewState.CONNECTION)}
        >
           <OrangeLogo className="w-9 h-9" />
           <span className="font-bold text-gray-900 dark:text-white text-sm tracking-tight font-display">Orange Kutty</span>
        </div>
      </div>

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-md mx-auto shadow-2xl overflow-hidden relative bg-white dark:bg-gray-900 min-h-screen transition-colors duration-500">
        {view === ViewState.CONNECTION && (
          <ConnectionView 
            user={state.user}
            dailyContent={currentDaily}
            isPlaying={isPlaying}
            onPlay={() => {
              if (isPlaying) stopAudio();
              else if (currentDaily?.audioBase64) playAudio(currentDaily.audioBase64);
            }}
            onBubbleInteract={handleBubbleClick}
          />
        )}

        {view === ViewState.CHAT && (
          <ChatView 
            history={currentHistory}
            onSend={handleSendMessage}
            isTyping={isTyping}
            voiceName={state.user.voiceName}
          />
        )}

        {view === ViewState.GAME && (
          <GameView 
            user={state.user} 
            onPlaySFX={playSFX} 
            onUpdateUser={handleUpdateUser}
          />
        )}

        {view === ViewState.SETTINGS && (
          <SettingsView 
            user={state.user}
            onVoiceChange={handleVoiceChange}
            onPreviewVoice={handleVoicePreview}
            onReset={() => { clearState(); window.location.reload(); }}
            onThemeChange={(t) => handleUpdateUser({ theme: t })}
            onUpdateUser={handleUpdateUser}
          />
        )}
      </main>

      {/* Floating Organic Bottom Navigation */}
      <nav className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/50 dark:border-gray-700 p-2 flex gap-2 max-w-[90%] transition-all">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.view;
          return (
            <button
              key={item.view}
              onClick={() => {
                stopAudio();
                setView(item.view as ViewState);
              }}
              className={`
                relative px-5 py-3 rounded-full flex items-center gap-2 transition-all duration-500 ease-out
                ${isActive ? 'bg-gray-900 dark:bg-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-gray-700'}
              `}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
              {isActive && (
                <span className="text-xs font-bold animate-fade-in whitespace-nowrap hidden sm:block">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
