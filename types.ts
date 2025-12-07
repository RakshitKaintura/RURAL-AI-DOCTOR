
export enum AppScreen {
  HOME = 'HOME',
  ANALYSIS = 'ANALYSIS',
  HISTORY = 'HISTORY',
  LOADING = 'LOADING',
  PROFILES = 'PROFILES',
  OFFLINE_GUIDE = 'OFFLINE_GUIDE',
  TIMELINE = 'TIMELINE',
}

// Strictly supported languages
export type Language = 
  | 'en' // English
  | 'hi' // Hindi
  | 'bn' // Bengali
  | 'ta' // Tamil
  | 'te' // Telugu
  | 'mr' // Marathi
  | 'es' // Spanish
  | 'fr' // French
  | 'ar' // Arabic
  | 'zh'; // Chinese

export enum RiskLevel {
  LOW = 'Low Risk',
  MEDIUM = 'Medium Risk',
  HIGH = 'High Risk',
  EMERGENCY = 'EMERGENCY',
}

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  knownConditions: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
}

export interface ConsultationRecord {
  id: string;
  profileId?: string;
  date: string;
  timestamp: number;
  symptoms: string;
  diagnosis?: AnalysisResult;
  imagePreview?: string;
}

export interface AnalysisResult {
  isEmergency: boolean;
  needsFollowUp: boolean;
  followUpQuestions?: string[];
  conditionName: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  riskLevelTranslated?: string;
  riskScore: number;
  explanation: string;
  firstAidSteps: string[];
  whatNotToDo: string[];
  careRecommendation: string;
  language: string;
}

export interface TrendAnalysisResult {
  trend: 'IMPROVING' | 'WORSENING' | 'STABLE';
  summary: string;
  advice: string;
}

export interface OfflineGuide {
  id: string;
  title: string;
  icon: string;
  steps: string[];
  warning: string;
}
