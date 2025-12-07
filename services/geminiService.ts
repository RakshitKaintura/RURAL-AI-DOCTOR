
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, Language, UserProfile, ConsultationRecord, TrendAnalysisResult } from "../types";
import { SUPPORTED_LANGUAGES } from "../utils/localization";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isEmergency: { type: Type.BOOLEAN },
    needsFollowUp: { type: Type.BOOLEAN },
    followUpQuestions: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Max 2 questions in TARGET LANGUAGE." 
    },
    conditionName: { type: Type.STRING, description: "Condition name in TARGET LANGUAGE." },
    riskLevel: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "EMERGENCY"] },
    riskLevelTranslated: { type: Type.STRING, description: "Translated Risk Level." },
    riskScore: { type: Type.INTEGER },
    explanation: { type: Type.STRING, description: "Max 2 sentences in TARGET LANGUAGE." },
    firstAidSteps: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Max 5 bullet points in TARGET LANGUAGE."
    },
    whatNotToDo: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Max 3 bullet points in TARGET LANGUAGE."
    },
    careRecommendation: { type: Type.STRING, description: "1 sentence in TARGET LANGUAGE." },
  },
  required: ["isEmergency", "needsFollowUp", "riskLevel", "explanation", "firstAidSteps", "careRecommendation"],
};

const trendSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    trend: { type: Type.STRING, enum: ["IMPROVING", "WORSENING", "STABLE"] },
    summary: { type: Type.STRING },
    advice: { type: Type.STRING },
  },
  required: ["trend", "summary", "advice"],
};

export const analyzeSymptoms = async (
  symptoms: string,
  imageBase64: string | null,
  language: Language,
  history: string,
  profile?: UserProfile
): Promise<AnalysisResult> => {
  try {
    const parts: any[] = [];
    
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64,
        },
      });
    }

    const targetLangObj = SUPPORTED_LANGUAGES.find(l => l.code === language);
    const targetLangName = targetLangObj ? targetLangObj.name : "English";

    let profileContext = "Profile: Unknown";
    if (profile) {
      profileContext = `Patient: ${profile.name}, Age: ${profile.age}, Gender: ${profile.gender}, Conditions: ${profile.knownConditions || "None"}`;
    }

    // Highly optimized system instruction for speed and single-shot execution
    const SYSTEM_INSTRUCTION = `
    Role: 'Rural AI Doctor'. Goal: Fast, Safe Triage.
    
    INSTRUCTIONS:
    1. Analyze input (Text/Audio/Image) & Context.
    2. REASON internally in English to check for Emergencies.
    3. OUTPUT JSON strictly in ${targetLangName}.
    
    CONSTRAINTS:
    - Max 5 First Aid Steps.
    - Max 3 'What Not To Do' points.
    - Max 2 Follow-up questions (only if critical info missing).
    - Explanation: Concise, under 30 words.
    - EMERGENCY if: Chest pain, Stroke signs, Heavy bleeding, Unconscious.
    
    Output JSON ONLY.
    `;
    
    parts.push({
      text: `${profileContext}\nHistory: ${history}\nInput: ${symptoms}`
    });

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    if (response.text) {
      const result = JSON.parse(response.text) as AnalysisResult;
      result.language = language; 
      return result;
    }
    throw new Error("No response");

  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      isEmergency: false,
      needsFollowUp: false,
      conditionName: "Error",
      riskLevel: "LOW",
      riskLevelTranslated: "Error",
      riskScore: 0,
      explanation: "Connection error. Please try again.",
      firstAidSteps: ["Visit a doctor."],
      whatNotToDo: [],
      careRecommendation: "Consult a doctor.",
      language: language
    };
  }
};

export const analyzeHealthTrend = async (
  records: ConsultationRecord[],
  language: Language,
  profile: UserProfile
): Promise<TrendAnalysisResult> => {
  try {
    const targetLangObj = SUPPORTED_LANGUAGES.find(l => l.code === language);
    const targetLangName = targetLangObj ? targetLangObj.name : "English";

    const historyText = records.map(r => 
      `${r.date}: ${r.symptoms} (Risk: ${r.diagnosis?.riskLevel})`
    ).join('\n');

    const prompt = `
    Analyze health trend for ${profile.name} (${profile.age}).
    History:
    ${historyText}

    Task: IMPROVING, WORSENING, or STABLE?
    Output concise JSON in ${targetLangName}.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: trendSchema,
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as TrendAnalysisResult;
    }
    throw new Error("No response");
  } catch (error) {
    return {
      trend: "STABLE",
      summary: "Analysis failed.",
      advice: "Consult a doctor."
    };
  }
};
