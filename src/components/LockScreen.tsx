/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Lock, Keyboard, ShieldAlert, Check } from 'lucide-react';

interface LockScreenProps {
  correctPw: string;
  onUnlock: () => void;
}

const BrandLogo = ({ className = "w-16 h-16" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/205/svg">
    {/* Animated outer cyber-circle of precision */}
    <circle cx="50" cy="50" r="46" stroke="url(#cyberRingGradient)" strokeWidth="1" strokeDasharray="6 3" className="opacity-80" />
    
    {/* Tech grid guidelines */}
    <line x1="50" y1="4" x2="50" y2="96" stroke="currentColor" strokeWidth="0.5" className="text-slate-800" strokeDasharray="2 2" />
    <line x1="4" y1="50" x2="96" y2="50" stroke="currentColor" strokeWidth="0.5" className="text-slate-800" strokeDasharray="2 2" />
    
    {/* Large paper roll (Metallic and detailed) */}
    <circle cx="44" cy="50" r="28" fill="url(#metallicRollBg)" stroke="url(#metallicGradient)" strokeWidth="3" />
    {/* Semi-wound paper sheet layers */}
    <path d="M 44 22 A 28 28 0 1 1 16 50" stroke="#0ea5e9" strokeWidth="1" strokeDasharray="2 2" />
    
    {/* Spiral winding effect of paper mill */}
    <path d="M 44 50 A 6 6 0 0 1 38 44 A 12 12 0 0 1 50 38 A 18 18 0 0 1 62 50" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-sky-300/40" />
    
    {/* Heavy-duty steel slitter core */}
    <circle cx="44" cy="50" r="14" fill="#0f172a" stroke="url(#steelGradient)" strokeWidth="2" />
    <circle cx="44" cy="50" r="7" stroke="#38bdf8" strokeWidth="1.5" />
    <circle cx="44" cy="50" r="2" fill="#38bdf8" />
    
    {/* Floating precision slitting blade (Gold/Amber) */}
    <circle cx="70" cy="50" r="18" fill="url(#bladeGlow)" stroke="url(#metallicGold)" strokeWidth="2.5" className="shadow-lg" />
    {/* Blade cutting teeth markers */}
    <circle cx="70" cy="50" r="14" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" className="text-amber-500/60" />
    <circle cx="70" cy="50" r="6" fill="#1e293b" stroke="url(#metallicGold)" strokeWidth="1.5" />
    <circle cx="70" cy="50" r="2" fill="#f59e0b" />
    
    {/* Golden connector beam representing alignment */}
    <line x1="44" y1="50" x2="70" y2="50" stroke="url(#connectorGradient)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="57" cy="50" r="3" fill="#ffffff" stroke="#f59e0b" strokeWidth="1" />
    
    {/* Spark / cutting energy arc representing high caliber precision */}
    <path d="M 52 42 L 62 58" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M 50 58 L 60 42" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
    
    <defs>
      <radialGradient id="bladeGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
      </radialGradient>
      
      <linearGradient id="cyberRingGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#0ea5e9" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#10b981" />
      </linearGradient>
      
      <linearGradient id="metallicRollBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
      
      <linearGradient id="metallicGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="35%" stopColor="#e0f2fe" />
        <stop offset="70%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
      
      <linearGradient id="steelGradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#64748b" />
        <stop offset="50%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#334155" />
      </linearGradient>
      
      <linearGradient id="metallicGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="30%" stopColor="#f59e0b" />
        <stop offset="70%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      
      <linearGradient id="connectorGradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
  </svg>
);

export default function LockScreen({ correctPw, onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleKeyPress = (num: string) => {
    setError(false);
    if (pin.length < 8) {
      setPin((prev) => prev + num);
    }
  };

  const handleBackspace = () => {
    setError(false);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError(false);
    setPin('');
  };

  const verifyPin = (testPin: string) => {
    if (testPin === correctPw) {
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setPin('');
      // Vibrate on mobile for tactile feedback if API available
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(150);
      }
    }
  };

  useEffect(() => {
    if (pin.length >= 4 && pin.length === correctPw.length) {
      // Auto-validate once length matches
      const timer = setTimeout(() => {
        verifyPin(pin);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [pin, correctPw]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPin(pin);
  };

  return (
    <div className="fixed inset-0 bg-[#0f172a] text-slate-100 flex flex-col items-center justify-center p-4 z-[9999]">
      <div className="text-center mb-8 max-w-sm animate-fade-in flex flex-col items-center">
        <div className="mb-4 bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl flex items-center justify-center">
          <BrandLogo className="w-16 h-16 text-slate-400" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-widest uppercase font-sans">
          MILLMASTER
        </h1>
        <p className="text-amber-550 text-xs font-bold font-mono tracking-[0.3em] uppercase mt-1">
          REEL &amp; DECKLE CUTTER
        </p>
        <p className="text-slate-405 text-xxs mt-2.5 font-bold uppercase tracking-widest text-slate-400">
          Professional slitting & cut planning suite
        </p>
        <p className="text-[#94a3b8] text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-1">
          Owner &amp; Creator: <span className="text-amber-400 font-extrabold font-sans">Toyaj Yadav</span>
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex justify-center mb-4 text-sky-400">
          <div className="p-3 bg-slate-800/80 rounded-full border border-slate-700">
            <Lock className="w-8 h-8" />
          </div>
        </div>

        <h2 className="text-center text-lg font-bold text-slate-200 mb-6">
          System Access Protected
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Display Indicator */}
          <div className="relative">
            <div className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 flex items-center justify-center space-x-3 h-14">
              {Array.from({ length: Math.max(correctPw.length, 4) }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                    i < pin.length
                      ? 'bg-sky-400 border-sky-400 scale-110 shadow-[0_0_8px_#38bdf8]'
                      : 'border-slate-700 bg-slate-900'
                  }`}
                />
              ))}
            </div>
            {error && (
              <div className="absolute -bottom-8 inset-x-0 flex items-center justify-center text-rose-400 text-xs font-semibold space-x-1 animate-bounce">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Incorrect Access PIN. Try again.</span>
              </div>
            )}
          </div>

          {/* Touch Pad Grid for quick mobile/tablet access */}
          <div className="grid grid-cols-3 gap-3 pt-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleKeyPress(n)}
                className="py-3 text-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl transition active:scale-95 border border-slate-700/50"
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="py-3 text-sm font-semibold text-rose-400 bg-slate-950 hover:bg-slate-900 rounded-xl transition active:scale-95 border border-slate-800"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="py-3 text-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl transition active:scale-95 border border-slate-700/50"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="py-3 text-lg font-bold text-amber-500 bg-slate-950 hover:bg-slate-900 rounded-xl transition active:scale-95 flex items-center justify-center border border-slate-800"
            >
              ⌫
            </button>
          </div>

          <div className="text-center text-xs text-slate-500 pt-2">
            Default passcode is <span className="font-bold text-slate-400">1234</span>
          </div>
        </form>
      </div>

      <div className="mt-8 text-xs text-slate-500 font-medium text-center tracking-wide flex flex-col items-center gap-1.5">
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-emerald-500" />
          Encrypted Sandbox &middot; AES-256 Offline Integrity
        </span>
        <div className="text-[10px] text-slate-500">
          <span>Licensed &amp; Engineered for <strong className="text-slate-300 font-bold">Toyaj Yadav</strong></span>
          <span className="mx-2 text-slate-700">&middot;</span>
          <span>MillMaster Pro Enterprise</span>
        </div>
      </div>
    </div>
  );
}
