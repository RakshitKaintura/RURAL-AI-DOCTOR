
import React, { useState, useEffect } from 'react';
import { SUPPORTED_LANGUAGES } from '../utils/localization';
import { Language } from '../types';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  lang: Language;
  label?: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, lang, label }) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      
      recog.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        onTranscript(text);
        setIsListening(false);
      };

      recog.onerror = (e: any) => {
        console.error("Speech Error", e);
        setIsListening(false);
      };
      
      recog.onend = () => setIsListening(false);

      setRecognition(recog);
    }
  }, [onTranscript]);

  const toggleListening = () => {
    if (!recognition) {
      alert("Voice input not supported in this browser.");
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      // Find the correct BCP 47 tag
      const langDef = SUPPORTED_LANGUAGES.find(l => l.code === lang);
      recognition.lang = langDef ? langDef.locale : 'en-US';
      
      try {
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.error("Failed to start", e);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`relative p-4 rounded-full transition-all flex items-center justify-center gap-2 ${
        isListening 
          ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200' 
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
      aria-label="Toggle voice input"
      title={label}
    >
      {isListening ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
      )}
      {label && <span className="text-sm font-bold hidden sm:block">{label}</span>}
    </button>
  );
};
