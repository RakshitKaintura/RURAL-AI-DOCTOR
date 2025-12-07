
import React, { useState, useEffect } from 'react';
import { analyzeSymptoms, analyzeHealthTrend } from './services/geminiService';
import { AppScreen, AnalysisResult, ConsultationRecord, Language, UserProfile, TrendAnalysisResult } from './types';
import { Button, Card, Header, LoadingScreen, TextToSpeechButton, Modal } from './components/UIComponents';
import { VoiceInput } from './components/VoiceInput';
import { CameraInput } from './components/CameraInput';
import { getBrowserLang, getTranslation } from './utils/localization';
import { OFFLINE_GUIDES } from './utils/offlineData';

// Demo Cases
const DEMO_CASES = [
  { label: "Fever", text: "High fever (102F), headache." },
  { label: "Cut", text: "Deep cut on hand, bleeding." }
];

const DEMO_PROFILE: UserProfile = {
  id: 'demo_1',
  name: 'Demo Patient',
  age: 45,
  gender: 'Male',
  knownConditions: 'BP',
  emergencyContactName: 'Emergency',
  emergencyContactNumber: '9999999999'
};

export default function App() {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.HOME);
  
  // Language State
  const [language, setLanguage] = useState<Language>('en');
  
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Data State
  const [symptoms, setSymptoms] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<ConsultationRecord[]>([]);
  
  // Profile State
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  
  // UI State
  const [loadingText, setLoadingText] = useState<string | null>(null);
  const [conversationContext, setConversationContext] = useState<string>('');
  const [userLocation, setUserLocation] = useState<string>('');
  const [manualLoc, setManualLoc] = useState('');
  
  // Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysisResult | null>(null);

  // Helper for translations
  const t = (key: any) => getTranslation(key, language);

  useEffect(() => {
    setLanguage(getBrowserLang());

    const savedProfiles = localStorage.getItem('rad_profiles');
    if (savedProfiles) {
      const parsed = JSON.parse(savedProfiles);
      if (parsed.length > 0) {
        setProfiles(parsed);
        if (!selectedProfileId) setSelectedProfileId(parsed[0].id);
      } else {
        setProfiles([DEMO_PROFILE]);
        setSelectedProfileId(DEMO_PROFILE.id);
      }
    } else {
      setProfiles([DEMO_PROFILE]);
      setSelectedProfileId(DEMO_PROFILE.id);
    }
    
    const savedHistory = localStorage.getItem('rad_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (profiles.length > 0) localStorage.setItem('rad_profiles', JSON.stringify(profiles));
  }, [profiles]);
  
  useEffect(() => {
    localStorage.setItem('rad_history', JSON.stringify(history));
  }, [history]);

  const currentProfile = profiles.find(p => p.id === selectedProfileId);

  const handleAnalysis = async (inputText: string, img: string | null, isFollowUp = false) => {
    if (isOffline) {
       setScreen(AppScreen.OFFLINE_GUIDE);
       return;
    }

    setLoadingText(isFollowUp ? t('thinking') : t('loading'));
    setScreen(AppScreen.LOADING);

    const currentContext = isFollowUp 
      ? conversationContext + `\nUser Answer: ${inputText}` 
      : `New Consultation.`;

    const result = await analyzeSymptoms(inputText, img, language, currentContext, currentProfile);
    
    setConversationContext(prev => prev + `\nAI: ${JSON.stringify(result)}`);
    setAnalysis(result);
    setLoadingText(null);
    setScreen(AppScreen.ANALYSIS);
    
    if (result.isEmergency) {
      setTimeout(() => {
        const textToSpeak = `${t('emergencyTitle')}. ${result.explanation}`;
        const u = new SpeechSynthesisUtterance(textToSpeak);
        const locale = (window as any).SUPPORTED_LANGUAGES?.find((l:any) => l.code === language)?.locale || 'en-US'; 
        u.lang = locale;
        window.speechSynthesis.speak(u);
      }, 500);
    }

    if (!result.needsFollowUp && !isFollowUp) {
      const newRecord: ConsultationRecord = {
        id: Date.now().toString(),
        profileId: selectedProfileId,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now(),
        symptoms: inputText,
        diagnosis: result,
        imagePreview: img ? `data:image/jpeg;base64,${img}` : undefined
      };
      setHistory(prev => [newRecord, ...prev]);
    }
  };

  const handleCreateProfile = (name: string, age: string, gender: string, conditions: string, cName: string, cNum: string) => {
    const newProfile: UserProfile = {
      id: Date.now().toString(),
      name,
      age: parseInt(age),
      gender,
      knownConditions: conditions,
      emergencyContactName: cName,
      emergencyContactNumber: cNum
    };
    setProfiles(prev => [...prev, newProfile]);
    setSelectedProfileId(newProfile.id);
    setIsProfileModalOpen(false);
  };

  const handleReset = () => {
    setSymptoms('');
    setImageBase64(null);
    setAnalysis(null);
    setConversationContext('');
    setScreen(AppScreen.HOME);
    window.speechSynthesis.cancel();
  };

  const getMapsLink = (query: string) => {
    const loc = manualLoc || userLocation || '';
    return `https://www.google.com/maps/search/${query}+near+${loc}`;
  };

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation(`${pos.coords.latitude},${pos.coords.longitude}`);
        alert("Location Detected");
      }, () => alert("Permission denied. Enter city manually."));
    }
  };

  const sendEmergencySMS = () => {
    if (!analysis) return;
    const p = currentProfile;
    const contact = p?.emergencyContactNumber || "";
    
    let body = `EMERGENCY ALERT: ${p?.name || 'Patient'} (Age ${p?.age || '?'}) needs help! 
    \nSymptoms: ${symptoms.substring(0, 50)}...
    \nRisk: ${analysis.riskLevel}
    \nLoc: ${userLocation || manualLoc || 'Unknown'}`;

    const encodedBody = encodeURIComponent(body);
    window.location.href = `sms:${contact}?body=${encodedBody}`;
  };

  const handleTrendAnalysis = async () => {
    if (!currentProfile) return;
    const profileHistory = history.filter(h => h.profileId === selectedProfileId);
    if (profileHistory.length < 2) {
      alert(t('noHistoryForTrend'));
      return;
    }
    
    setLoadingText(t('analyzingTrend'));
    setScreen(AppScreen.LOADING);
    const result = await analyzeHealthTrend(profileHistory.slice(0, 5), language, currentProfile);
    setTrendAnalysis(result);
    setLoadingText(null);
    setScreen(AppScreen.TIMELINE);
  };

  const renderProfileModal = () => {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('Male');
    const [cond, setCond] = useState('');
    const [cName, setCName] = useState('');
    const [cNum, setCNum] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
      if (!name || !age || !cNum) {
        setError(t('fillRequired'));
        return;
      }
      handleCreateProfile(name, age, gender, cond, cName, cNum);
    };

    return (
      <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title={t('createProfile')}>
        <div className="space-y-4">
          <div>
             <label className="block text-sm font-bold text-slate-700 mb-1">{t('name')} *</label>
             <input className="w-full p-3 border rounded-lg" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('age')} *</label>
              <input className="w-full p-3 border rounded-lg" type="number" value={age} onChange={e => setAge(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('gender')}</label>
              <select className="w-full p-3 border rounded-lg bg-white" value={gender} onChange={e => setGender(e.target.value)}>
                <option value="Male">{t('male')}</option>
                <option value="Female">{t('female')}</option>
                <option value="Other">{t('other')}</option>
              </select>
            </div>
          </div>
          <div>
             <label className="block text-sm font-bold text-slate-700 mb-1">{t('conditions')}</label>
             <input className="w-full p-3 border rounded-lg" value={cond} onChange={e => setCond(e.target.value)} placeholder="e.g. Diabetes" />
          </div>
          <div>
             <label className="block text-sm font-bold text-slate-700 mb-1">{t('contactName')}</label>
             <input className="w-full p-3 border rounded-lg" value={cName} onChange={e => setCName(e.target.value)} />
          </div>
          <div>
             <label className="block text-sm font-bold text-slate-700 mb-1">{t('contactNum')} *</label>
             <input className="w-full p-3 border rounded-lg" type="tel" value={cNum} onChange={e => setCNum(e.target.value)} />
          </div>
          {error && <div className="text-red-500 text-sm font-bold">{error}</div>}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsProfileModalOpen(false)}>{t('cancel')}</Button>
            <Button className="flex-1" onClick={handleSubmit}>{t('save')}</Button>
          </div>
        </div>
      </Modal>
    );
  };

  const renderProfilesList = () => (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-blue-900">{t('profiles')}</h2>
        <Button onClick={() => setIsProfileModalOpen(true)} className="px-4 py-2 text-sm">
           + {t('addProfile')}
        </Button>
      </div>
      <div className="grid gap-3">
        {profiles.map(p => (
          <Card key={p.id} className={`cursor-pointer transition-all ${selectedProfileId === p.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
            <div onClick={() => { setSelectedProfileId(p.id); setScreen(AppScreen.HOME); }} className="flex justify-between items-center">
              <div>
                <div className="font-bold text-lg text-slate-800">{p.name}, {p.age}</div>
                <div className="text-sm text-slate-500">{p.gender} • {p.knownConditions || "No conditions"}</div>
              </div>
              {selectedProfileId === p.id && <div className="bg-blue-600 text-white rounded-full p-1">✓</div>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="flex flex-col gap-6 p-4 max-w-lg mx-auto w-full pb-20">
      {isOffline && (
        <div onClick={() => setScreen(AppScreen.OFFLINE_GUIDE)} className="bg-red-600 text-white p-3 rounded-xl flex justify-between items-center shadow-lg cursor-pointer animate-pulse">
          <div className="flex items-center gap-2 font-bold">
            <span>📡</span> {t('offlineMode')}
          </div>
          <span className="text-sm underline">{t('viewOfflineGuides')}</span>
        </div>
      )}

      <Card className="py-3 px-4 flex justify-between items-center bg-white border-blue-100 shadow-sm">
         <div className="flex items-center gap-3">
           <div className="bg-blue-100 p-2 rounded-full text-blue-600 font-bold text-lg">👤</div>
           <div>
             <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('currentPatient')}</div>
             <div className="font-bold text-slate-800 leading-tight">
               {currentProfile ? `${currentProfile.name}, ${currentProfile.age}` : t('selectProfile')}
             </div>
           </div>
         </div>
         <button onClick={() => setScreen(AppScreen.PROFILES)} className="text-blue-600 text-xs font-bold border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-50">
           Change
         </button>
      </Card>

      <Card className="bg-blue-50 border-blue-100">
        <h2 className="text-xl font-bold text-blue-900 mb-2">{t('homeTitle')}</h2>
        <p className="text-sm text-slate-500 mb-3">{t('homeSubtitle')}</p>
        <div className="relative">
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder={t('inputPlaceholder')}
            className="w-full p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 min-h-[120px] text-lg mb-3 shadow-inner"
          />
          <div className="flex gap-3 items-center justify-end">
             {imageBase64 && (
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-300">
                  <img src={`data:image/jpeg;base64,${imageBase64}`} className="w-full h-full object-cover" alt="Selected" />
                  <button onClick={() => setImageBase64(null)} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center font-bold text-xs">X</button>
                </div>
              )}
            <CameraInput onImageSelected={setImageBase64} />
            <VoiceInput onTranscript={(text) => setSymptoms(prev => prev + " " + text)} lang={language} label="" />
          </div>
        </div>
      </Card>

      <Button onClick={() => handleAnalysis(symptoms, imageBase64)} disabled={(!symptoms && !imageBase64)} className="w-full shadow-lg shadow-blue-200">
        {t('checkBtn')}
      </Button>

      <div className="mt-2">
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">{t('demoLabel')}</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {DEMO_CASES.map((demo, idx) => (
            <button key={idx} onClick={() => { setSymptoms(demo.text); setTimeout(() => handleAnalysis(demo.text, null), 100); }} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 whitespace-nowrap shadow-sm active:bg-slate-50">
              {demo.label}
            </button>
          ))}
        </div>
      </div>
       <div className="mt-2 p-4 bg-yellow-50 rounded-xl border border-yellow-100 text-xs text-yellow-800">
        <strong>{t('disclaimer')}</strong>
      </div>
    </div>
  );

  const renderAnalysis = () => {
    if (!analysis) return null;
    const isEmerg = analysis.isEmergency;
    const riskColors: any = { 'LOW': 'bg-emerald-100 text-emerald-800', 'MEDIUM': 'bg-amber-100 text-amber-800', 'HIGH': 'bg-orange-100 text-orange-800', 'EMERGENCY': 'bg-red-600 text-white shadow-xl shadow-red-200' };

    if (analysis.needsFollowUp && analysis.followUpQuestions && !isEmerg) {
      return (
        <div className="flex flex-col gap-6 p-4 max-w-lg mx-auto w-full">
           <Card className="bg-blue-50 border-blue-200">
             <h2 className="text-xl font-bold text-blue-900 mb-2">{t('followUpTitle')}</h2>
             <p className="text-blue-800 mb-4">{analysis.explanation}</p>
             <div className="space-y-4">
                {analysis.followUpQuestions.map((q, i) => (
                  <div key={i} className="bg-white p-3 rounded-lg border border-blue-100 text-blue-900 font-medium">{q}</div>
                ))}
             </div>
             <div className="mt-4 flex justify-end">
               <TextToSpeechButton text={`${analysis.explanation}. ${analysis.followUpQuestions.join('? ')}`} lang={language} labelSpeak={t('speakResult')} labelStop={t('stopSpeaking')} />
             </div>
           </Card>
           <div className="space-y-2">
             <label className="text-sm font-bold text-slate-600">{t('yourAnswer')}:</label>
             <div className="relative">
                <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} className="w-full p-4 rounded-xl border border-slate-300 min-h-[100px]" placeholder="..." />
                <div className="absolute bottom-2 right-2">
                   <VoiceInput onTranscript={(text) => setSymptoms(prev => prev + " " + text)} lang={language} />
                </div>
             </div>
           </div>
           <Button onClick={() => handleAnalysis(symptoms, null, true)} className="w-full">{t('submitAnswers')}</Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6 p-4 max-w-lg mx-auto w-full pb-20">
        <div className={`p-6 rounded-3xl border text-center ${riskColors[analysis.riskLevel] || riskColors.LOW} ${isEmerg ? 'animate-pulse' : ''}`}>
          {isEmerg && <div className="text-5xl mb-2">🚨</div>}
          <div className="text-sm font-bold uppercase tracking-wide opacity-80">{t('risk')}</div>
          <div className="text-3xl font-extrabold">{analysis.riskLevelTranslated || analysis.riskLevel}</div>
          <div className="mt-2 text-sm font-medium">{analysis.conditionName}</div>
        </div>

        {isEmerg && (
          <div className="grid gap-3">
             <Button variant="danger" onClick={() => window.location.href = 'tel:102'} className="text-lg py-4 shadow-red-300 shadow-lg">{t('callAmbulance')}</Button>
             <Button variant="secondary" onClick={sendEmergencySMS} className="text-lg py-4 bg-slate-800 hover:bg-slate-900">{t('sendSMS')}</Button>
          </div>
        )}

        <div className="flex justify-end">
           <TextToSpeechButton text={`${analysis.explanation}. ${analysis.careRecommendation}`} lang={language} labelSpeak={t('speakResult')} labelStop={t('stopSpeaking')} />
        </div>

        <Card title={t('assessment')}>
          <p className="text-slate-700 leading-relaxed">{analysis.explanation}</p>
        </Card>

        <Card title={t('firstAid')}>
          <ul className="space-y-3">
             {analysis.firstAidSteps.map((step, i) => (
               <li key={i} className="flex items-start gap-3 text-slate-700">
                 <span className="text-emerald-500 font-bold">✓</span>{step}
               </li>
             ))}
          </ul>
        </Card>

        {(analysis.riskLevel !== 'LOW' || isEmerg) && (
          <Card title={t('nearbyHelp')} className="bg-slate-50">
             <div className="flex gap-2 mb-3">
               <input className="flex-1 p-2 border rounded-lg text-sm" placeholder={t('enterLocation')} value={manualLoc} onChange={(e) => setManualLoc(e.target.value)} />
               <button onClick={detectLocation} className="bg-blue-100 text-blue-700 p-2 rounded-lg">📍</button>
             </div>
             <div className="grid grid-cols-2 gap-3">
               <a href={getMapsLink('hospital')} target="_blank" rel="noreferrer" className="bg-white border border-slate-200 p-3 rounded-xl text-center font-bold text-red-600 hover:bg-red-50">🏥 {t('hospitals')}</a>
               <a href={getMapsLink('pharmacy')} target="_blank" rel="noreferrer" className="bg-white border border-slate-200 p-3 rounded-xl text-center font-bold text-green-600 hover:bg-green-50">💊 {t('pharmacy')}</a>
             </div>
          </Card>
        )}
        <Button variant="outline" onClick={handleReset} className="w-full">{t('startOver')}</Button>
      </div>
    );
  };

  const renderTimeline = () => {
    const filtered = selectedProfileId ? history.filter(h => h.profileId === selectedProfileId) : history;
    const sorted = filtered.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));

    return (
      <div className="p-4 max-w-lg mx-auto w-full pb-20 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">{t('timeline')}</h2>
          {currentProfile && <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">{currentProfile.name}</span>}
        </div>
        {sorted.length >= 2 && (
          <div className="mb-4">
            {!trendAnalysis ? (
              <Button variant="secondary" onClick={handleTrendAnalysis} className="w-full text-sm py-2">{t('analyzeTrend')}</Button>
            ) : (
              <Card className="bg-indigo-50 border-indigo-200">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-indigo-900">{t('trendTitle')}</h3>
                  <button onClick={() => setTrendAnalysis(null)} className="text-indigo-400 text-xs">✕</button>
                </div>
                <div className={`mt-2 font-bold text-lg ${trendAnalysis.trend === 'IMPROVING' ? 'text-green-600' : trendAnalysis.trend === 'WORSENING' ? 'text-red-600' : 'text-slate-600'}`}>
                  {trendAnalysis.trend === 'IMPROVING' && '📈'} 
                  {trendAnalysis.trend === 'WORSENING' && '📉'} 
                  {trendAnalysis.trend === 'STABLE' && '➡️'} 
                  {t(trendAnalysis.trend.toLowerCase())}
                </div>
                <p className="text-sm text-indigo-800 mt-1">{trendAnalysis.summary}</p>
                <div className="mt-2 text-xs bg-white p-2 rounded border border-indigo-100 text-slate-600">💡 {trendAnalysis.advice}</div>
              </Card>
            )}
          </div>
        )}
        <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pl-6 py-2">
          {sorted.map(record => (
            <div key={record.id} className="relative">
              <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-white ${record.diagnosis?.riskLevel === 'HIGH' || record.diagnosis?.riskLevel === 'EMERGENCY' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-400">{record.date}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${record.diagnosis?.riskLevel === 'HIGH' || record.diagnosis?.riskLevel === 'EMERGENCY' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {record.diagnosis?.riskLevelTranslated || record.diagnosis?.riskLevel}
                  </span>
                </div>
                <p className="text-slate-800 font-medium text-sm line-clamp-2">{record.symptoms}</p>
                {record.diagnosis && <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded">AI: {record.diagnosis.conditionName}</div>}
              </Card>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderOfflineGuides = () => (
    <div className="p-4 space-y-4 pb-20">
      <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
        <h2 className="text-xl font-bold text-red-700 mb-2">{t('offlineMode')}</h2>
        <p className="text-red-600 mb-4">{t('offlineDesc')}</p>
        <Button variant="danger" onClick={() => window.location.href = "tel:102"}>📞 Call 102 / 911</Button>
      </div>
      <div className="grid gap-4">
        {OFFLINE_GUIDES.map(guide => (
          <Card key={guide.id}>
            <div className="flex items-center gap-3 mb-3 border-b border-slate-100 pb-2">
              <span className="text-3xl">{guide.icon}</span>
              <h3 className="font-bold text-lg text-slate-800">{guide.title}</h3>
            </div>
            <ul className="space-y-2 mb-3">
              {guide.steps.map((step, idx) => (
                <li key={idx} className="flex gap-2 text-slate-700">
                  <span className="font-bold text-slate-400">{idx+1}.</span>
                  {step}
                </li>
              ))}
            </ul>
            <div className="bg-orange-50 p-2 rounded text-xs font-bold text-orange-800">⚠️ {guide.warning}</div>
          </Card>
        ))}
      </div>
      <Button variant="outline" onClick={() => setScreen(AppScreen.HOME)} className="w-full">{t('startOver')}</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {screen === AppScreen.LOADING && loadingText && <LoadingScreen text={loadingText} />}
      {renderProfileModal()}
      
      <Header title={t('appTitle')} lang={language} setLang={setLanguage} onBack={screen !== AppScreen.HOME ? () => setScreen(AppScreen.HOME) : undefined} />

      <main>
        {screen === AppScreen.HOME && renderHome()}
        {screen === AppScreen.ANALYSIS && renderAnalysis()}
        {screen === AppScreen.PROFILES && renderProfilesList()}
        {screen === AppScreen.TIMELINE && renderTimeline()}
        {screen === AppScreen.OFFLINE_GUIDE && renderOfflineGuides()}
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-around p-3 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] safe-area-bottom">
        <button onClick={() => setScreen(AppScreen.HOME)} className={`flex flex-col items-center ${screen === AppScreen.HOME ? 'text-blue-600' : 'text-slate-400'}`}>
          <span className="text-xl">🏠</span>
          <span className="text-[10px] font-bold mt-1">Home</span>
        </button>
        <button onClick={() => setScreen(AppScreen.TIMELINE)} className={`flex flex-col items-center ${screen === AppScreen.TIMELINE ? 'text-blue-600' : 'text-slate-400'}`}>
          <span className="text-xl">📊</span>
          <span className="text-[10px] font-bold mt-1">Timeline</span>
        </button>
        <button onClick={() => setScreen(AppScreen.OFFLINE_GUIDE)} className={`flex flex-col items-center ${screen === AppScreen.OFFLINE_GUIDE ? 'text-red-600' : 'text-slate-400'}`}>
          <span className="text-xl">🆘</span>
          <span className="text-[10px] font-bold mt-1 text-red-600">Guides</span>
        </button>
      </nav>
    </div>
  );
}
