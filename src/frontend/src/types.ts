import { translations } from "./translations";

export type Policy = {
  weights: {
    references: number;
    citationNeededPenalty: number;
    problemTemplatesPenalty: number;
    recency: number;
    revert: number;
    talkPenalty: number;
    length: number;
    structure: number;
    qualityBonus: number;
    protectionBonus: number;
    editorDiversity: number;
  };
  rejectIf?: {
    citationNeededGreaterThan?: number;
    hasProblemTemplates?: boolean;
    revertRateAbove?: number;
    daysSinceLastEditAbove?: number;
  };
};

export type Result = {
  score: number;
  // Mirrors backend Verdict type in scoring.ts
  verdict: "Heikko" | "Kohtalainen" | "Hyvä" | "Erinomainen";
  rejected?: boolean;
  reason?: string;
  highlights?: {
    positives: { type: "positive"; id: string }[];
    negatives: { type: "negative"; id: string }[];
  };
  signals: {
    referenceCount: number;
    citationNeeded: number;
    problemTemplates: number;
    daysSinceLastEdit: number;
    revertRate: number;
    talkIssues: number;
    wordCount: number;
    headingCount: number;
    isStub: boolean;
    isGoodArticle: boolean;
    isFeaturedArticle: boolean;
    isProtected: boolean;
    uniqueEditors: number;
  };
  evidence: { label: string; url: string }[];
  policy: Policy;
  lang: string;
  title: string;
  resolvedFrom?: string;
  suggestions?: string[];
};

// Helper to convert backend verdicts (Finnish) to English labels
// Returns a localized label for the verdict. If `t` is provided, uses it
// to translate a translation key; otherwise falls back to English labels.
export function verdictToLabel(
  v: Result["verdict"] | string,
  t?: (key: keyof typeof translations) => string
) {
  // Map the backend Finnish verdicts to translation keys
  const map: Record<string, keyof typeof translations> = {
    Heikko: "Weak",
    Kohtalainen: "Moderate",
    Hyvä: "Good",
    Erinomainen: "Excellent",
  };
  const key = map[String(v)] || "Good";
  if (t) return t(key);
  // Fallback to simple English words if t() isn't provided
  switch (String(v)) {
    case "Luotettava":
      return "Good";
    case "Kohtalainen":
      return "Moderate";
    case "Heikko":
      return "Weak";
    default:
      return String(v);
  }
}

// API request types
export type AnalyzeRequest = {
  title?: string;
  url?: string;
  lang?: string;
  policy: Policy;
  preferChoice?: boolean;
};

// API response types
export type AnalyzeErrorResponse = {
  error: string;
  suggestions?: string[];
};

export type AnalyzeChoiceResponse = {
  choose: true;
  suggestions: string[];
  resolvedFrom?: string;
};

export type AnalyzeResponse =
  | Result
  | AnalyzeChoiceResponse
  | AnalyzeErrorResponse;

export type SliderRowProps = {
  label: string;
  help: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  leftNote: string;
  rightNote: string;
  suffix?: string;
};

export type InfoTipProps = {
  text: string;
  before?: boolean;
  vertical?: "above" | "below";
  horizontal?: "left" | "right" | "center";
};

export const DEFAULT_POLICY: Policy = {
  // Normal, balanced default (mirrors backend)
  weights: {
    references: 35,
    citationNeededPenalty: 8,
    problemTemplatesPenalty: 16,
    recency: 18,
    revert: 12,
    talkPenalty: 8,
    length: 10,
    structure: 8,
    qualityBonus: 12,
    protectionBonus: 4,
    editorDiversity: 8,
  },
  rejectIf: {},
};

// Strictness profile configurations (must match backend scoring.ts)
export const STRICTNESS_PROFILES = {
  // Tiukka profiili - Minimizes risks, may reject good articles
  strict: {
    weights: {
      references: 20,
      citationNeededPenalty: 30,
      problemTemplatesPenalty: 35,
      recency: 25,
      revert: 20,
      talkPenalty: 15,
      length: 8,
      structure: 10,
      qualityBonus: 18,
      protectionBonus: 4,
      editorDiversity: 10,
    },
    rejectIf: {
      citationNeededGreaterThan: 0,
      hasProblemTemplates: true,
      revertRateAbove: 0.4,
      daysSinceLastEditAbove: 1825, // 5 years
    },
  } as Policy,

  // Normaali profiili - Default balanced approach
  normal: DEFAULT_POLICY,

  // Salliva profiili - Quick overview, fewer rejections
  permissive: {
    weights: {
      references: 40,
      citationNeededPenalty: 5,
      problemTemplatesPenalty: 10,
      recency: 18,
      revert: 8,
      talkPenalty: 4,
      length: 12,
      structure: 6,
      qualityBonus: 10,
      protectionBonus: 3,
      editorDiversity: 6,
    },
    rejectIf: {
      revertRateAbove: 0.9,
    },
  } as Policy,
};

export type StrictnessLevel = keyof typeof STRICTNESS_PROFILES;

export enum ELanguages {
  en = "en",
  fi = "fi",
  es = "es",
  fr = "fr",
  de = "de",
  pt = "pt",
  cs = "cs",
}
export enum ELanguagesLong {
  en = "English",
  fi = "Suomi",
  es = "Español",
  fr = "Français",
  de = "Deutch",
  pt = "Português",
  cs = "Čeština",
}
export enum ELanguageTitle {
  en = "Language",
  es = "Idioma",
  fr = "Langue",
  de = "Sprache",
  pt = "Língua",
  cs = "Jazyk",
  fi = "Kieli",
}

export type EGeneric<T> = {
  [key in keyof T]: T[key];
};
