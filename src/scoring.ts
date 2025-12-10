export type Signals = {
  referenceCount: number;
  citationNeeded: number;
  problemTemplates: number;
  daysSinceLastEdit: number;
  revertRate: number; // 0..1
  talkIssues: number;

  // Extended content/quality/metadata signals
  wordCount: number;
  headingCount: number;
  isStub: boolean;
  isGoodArticle: boolean;
  isFeaturedArticle: boolean;
  isProtected: boolean;
  uniqueEditors: number;
};

// Granular verdict scale (Finnish labels kept for backward compatibility)
// Heikko < Kohtalainen < Hyvä < Erinomainen
export type Verdict = "Heikko" | "Kohtalainen" | "Hyvä" | "Erinomainen";

export type Policy = {
  weights: {
    references: number;
    citationNeededPenalty: number;
    problemTemplatesPenalty: number;
    recency: number;
    revert: number;
    talkPenalty: number;

    // New weights for extended signals
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

export const DEFAULT_POLICY: Policy = {
  // Normal, balanced default
  weights: {
    references: 30,
    citationNeededPenalty: 10,
    problemTemplatesPenalty: 20,
    recency: 20,
    revert: 15,
    talkPenalty: 10,

    length: 10,
    structure: 8,
    qualityBonus: 12,
    protectionBonus: 4,
    editorDiversity: 8,
  },
  rejectIf: {},
};

// Strictness profile configurations
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
      references: 35,
      citationNeededPenalty: 6,
      problemTemplatesPenalty: 12,
      recency: 18,
      revert: 10,
      talkPenalty: 5,

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

function clamp(x: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, x));
}

export function applyPolicy(s: Signals, policy: Policy = DEFAULT_POLICY) {
  if (
    policy.rejectIf?.citationNeededGreaterThan != null &&
    s.citationNeeded > policy.rejectIf.citationNeededGreaterThan
  ) {
    return {
      score: 0,
      verdict: "Heikko" as Verdict,
      rejected: true,
      reason: "citation needed",
    };
  }
  if (policy.rejectIf?.hasProblemTemplates && s.problemTemplates > 0) {
    return {
      score: 0,
      verdict: "Heikko" as Verdict,
      rejected: true,
      reason: "problem templates",
    };
  }
  if (
    policy.rejectIf?.revertRateAbove != null &&
    s.revertRate > policy.rejectIf.revertRateAbove
  ) {
    return {
      score: 0,
      verdict: "Heikko" as Verdict,
      rejected: true,
      reason: "revert rate",
    };
  }
  if (
    policy.rejectIf?.daysSinceLastEditAbove != null &&
    s.daysSinceLastEdit > policy.rejectIf.daysSinceLastEditAbove
  ) {
    return {
      score: 0,
      verdict: "Heikko" as Verdict,
      rejected: true,
      reason: "stale",
    };
  }

  const w = policy.weights;
  let score = 0;
  score += Math.min(w.references, s.referenceCount * (w.references / 15));
  score -= Math.min(
    w.citationNeededPenalty,
    s.citationNeeded * (w.citationNeededPenalty / 5)
  );
  score -= Math.min(
    w.problemTemplatesPenalty,
    s.problemTemplates * (w.problemTemplatesPenalty / 2)
  );
  score +=
    s.daysSinceLastEdit > 365 ? 0 : w.recency * (1 - s.daysSinceLastEdit / 365);
  score += w.revert * (1 - s.revertRate);
  score -= Math.min(w.talkPenalty, s.talkIssues * (w.talkPenalty / 2));

  // Length: reward up to an ideal word count
  if (s.wordCount > 0) {
    const ideal = 2000;
    const capped = Math.min(s.wordCount, ideal);
    const lengthScore = capped / ideal; // 0..1
    score += w.length * lengthScore;
  }

  // Structure: more headings (up to 5) is better
  const structureScore = Math.min(s.headingCount / 5, 1);
  score += w.structure * structureScore;

  // Quality templates: featured/good/stub
  if (s.isFeaturedArticle) score += w.qualityBonus;
  else if (s.isGoodArticle) score += w.qualityBonus * 0.7;
  else if (s.isStub) score -= w.qualityBonus * 0.7;

  // Protection: light bonus if protected at all
  if (s.isProtected) score += w.protectionBonus;

  // Editor diversity: more unique editors up to 10
  const editorScore = s.uniqueEditors ? Math.min(s.uniqueEditors / 10, 1) : 0;
  score += w.editorDiversity * editorScore;

  score = clamp(score);
  // More granular verdict thresholds
  // 0-39: Heikko (Weak)
  // 40-59: Kohtalainen (Moderate)
  // 60-84: Hyvä (Good)
  // 85-100: Erinomainen (Excellent)
  const verdict: Verdict =
    score >= 85
      ? "Erinomainen"
      : score >= 60
        ? "Hyvä"
        : score >= 40
          ? "Kohtalainen"
          : "Heikko";
  return { score, verdict, rejected: false as const };
}
