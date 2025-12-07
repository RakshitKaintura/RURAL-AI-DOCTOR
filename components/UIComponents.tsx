
import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { SUPPORTED_LANGUAGES } from '../utils/localization';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline' }> = ({ 
  className = '', 
  variant = 'primary', 
  children, 
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-emerald-600 text-white hover:bg-emerald-700",
    danger: "bg-red-600 text-white hover:bg-red-700 animate-pulse",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50",
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => (
  <div className={`bg-white rounded-2xl shadow-md p-5 border border-slate-100 ${className}`}>
    {title && <h3 className="text-lg font-bold text-slate-800 mb-3">{title}</h3>}
    {children}
  </div>
);

export const Header: React.FC<{ 
  onBack?: () => void; 
  title: string;
  lang: Language;
  setLang: (l: Language) => void;
}> = ({ onBack, title, lang, setLang }) => (
  <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
    <div className="flex items-center gap-2">
      {onBack && (
        <button onClick={onBack} className="p-2 -ml-2 text-slate-600 hover:text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
      )}
      <h1 className="text-lg sm:text-xl font-extrabold text-blue-900 tracking-tight truncate max-w-[150px] sm:max-w-none">{title}</h1>
    </div>
    
    <select 
      value={lang}
      onChange={(e) => setLang(e.target.value as Language)}
      className="text-sm font-bold px-2 py-1 bg-slate-100 rounded-lg text-slate-700 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[120px]"
    >
      {SUPPORTED_LANGUAGES.map(l => (
        <option key={l.code} value={l.code}>{l.name}</option>
      ))}
    </select>
  </header>
);

export const LoadingScreen: React.FC<{ text: string }> = ({ text }) => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
    <p className="text-xl font-medium text-slate-800 animate-pulse">{text}</p>
  </div>
);

export const Modal: React.FC<{ children: React.ReactNode; isOpen: boolean; onClose: () => void; title?: string }> = ({ children, isOpen, onClose, title }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">✕</button>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
};

export const TextToSpeechButton: React.FC<{ 
  text: string; 
  lang: Language; 
  labelSpeak: string;
  labelStop: string;
}> = ({ text, lang, labelSpeak, labelStop }) => {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const handleEnd = () => setSpeaking(false);
    window.speechSynthesis.addEventListener('end', handleEnd); 
    return () => window.speechSynthesis.removeEventListener('end', handleEnd);
  }, []);

  const toggleSpeak = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const langDef = SUPPORTED_LANGUAGES.find(l => l.code === lang);
      const voices = window.speechSynthesis.getVoices();
      const locale = langDef ? langDef.locale : 'en-US';
      const voice = voices.find(v => v.lang.startsWith(locale));
      if (voice) utterance.voice = voice;
      utterance.lang = locale;
      
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
      setSpeaking(true);
    }
  };

  return (
    <button
      onClick={toggleSpeak}
      className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-colors ${
        speaking ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100'
      }`}
    >
      {speaking ? (
         <>
           <span className="animate-pulse">🔊</span>
           {labelStop}
         </>
      ) : (
         <>
           <span>🔊</span>
           {labelSpeak}
         </>
      )}
    </button>
  );
};
