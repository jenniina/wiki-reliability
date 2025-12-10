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

function clamp(x: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, x));
}

export type HighlightId =
  | "ManyReferences"
  | "CitationNeededMany"
  | "ProblemTemplates"
  | "RecentEdits"
  | "VeryStale"
  | "HighRevertRate"
  | "TalkDisputesMany"
  | "LongArticle"
  | "VeryShortArticle"
  | "GoodStructure"
  | "FeaturedArticle"
  | "GoodArticle"
  | "StubArticle"
  | "ProtectedPage"
  | "ManyEditors"
  | "CitationNeededSome"
  | "ProblemTemplatesSome"
  | "Stale"
  | "ModerateRevertRate"
  | "TalkDisputesSome"
  | "ShortArticle"
  | "WeakStructure"
  | "MissingQualityBadge"
  | "MultipleSmallWeaknesses";

export type Highlight = {
  type: "positive" | "negative";
  id: HighlightId;
  sortKey?: number;
};

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
  const positives: Highlight[] = [];
  const negatives: Highlight[] = [];

  // References
  const refContribution = Math.min(
    w.references,
    s.referenceCount * (w.references / 15)
  );
  score += refContribution;
  if (s.referenceCount >= 15) {
    positives.push({
      type: "positive",
      id: "ManyReferences",
      sortKey: refContribution,
    });
  }

  // Citation needed markers
  const cnPenalty = Math.min(
    w.citationNeededPenalty,
    s.citationNeeded * (w.citationNeededPenalty / 5)
  );
  score -= cnPenalty;
  if (s.citationNeeded >= 3) {
    negatives.push({
      type: "negative",
      id: "CitationNeededMany",
      sortKey: cnPenalty,
    });
  }

  // Problem templates
  const tmplPenalty = Math.min(
    w.problemTemplatesPenalty,
    s.problemTemplates * (w.problemTemplatesPenalty / 2)
  );
  score -= tmplPenalty;
  if (s.problemTemplates > 0) {
    negatives.push({
      type: "negative",
      id: "ProblemTemplates",
      sortKey: tmplPenalty,
    });
  }

  // Recency
  const recencyContribution =
    s.daysSinceLastEdit > 365 ? 0 : w.recency * (1 - s.daysSinceLastEdit / 365);
  score += recencyContribution;
  if (s.daysSinceLastEdit <= 30 && recencyContribution > 0) {
    positives.push({
      type: "positive",
      id: "RecentEdits",
      sortKey: recencyContribution,
    });
  }
  if (s.daysSinceLastEdit > 365 * 3) {
    negatives.push({
      type: "negative",
      id: "VeryStale",
      sortKey: s.daysSinceLastEdit,
    });
  }

  // Revert rate
  const revertContribution = w.revert * (1 - s.revertRate);
  score += revertContribution;
  if (s.revertRate >= 0.4) {
    negatives.push({
      type: "negative",
      id: "HighRevertRate",
      sortKey: s.revertRate,
    });
  }

  // Talk page issues
  const talkPenalty = Math.min(
    w.talkPenalty,
    s.talkIssues * (w.talkPenalty / 2)
  );
  score -= talkPenalty;
  if (s.talkIssues >= 3) {
    negatives.push({
      type: "negative",
      id: "TalkDisputesMany",
      sortKey: talkPenalty,
    });
  }

  // Length: reward up to an ideal word count
  if (s.wordCount > 0) {
    const ideal = 2000;
    const capped = Math.min(s.wordCount, ideal);
    const lengthScore = capped / ideal; // 0..1
    const lengthContribution = w.length * lengthScore;
    score += lengthContribution;
    if (s.wordCount >= 1500) {
      positives.push({
        type: "positive",
        id: "LongArticle",
        sortKey: lengthContribution,
      });
    } else if (s.wordCount < 300) {
      negatives.push({
        type: "negative",
        id: "VeryShortArticle",
        sortKey: lengthContribution,
      });
    }
  }

  // Structure: more headings (up to 5) is better
  const structureScore = Math.min(s.headingCount / 5, 1);
  const structureContribution = w.structure * structureScore;
  score += structureContribution;
  if (s.headingCount >= 4) {
    positives.push({
      type: "positive",
      id: "GoodStructure",
      sortKey: structureContribution,
    });
  }

  // Quality templates: featured/good/stub
  if (s.isFeaturedArticle) {
    score += w.qualityBonus;
    positives.push({
      type: "positive",
      id: "FeaturedArticle",
      sortKey: w.qualityBonus,
    });
  } else if (s.isGoodArticle) {
    const bonus = w.qualityBonus * 0.7;
    score += bonus;
    positives.push({
      type: "positive",
      id: "GoodArticle",
      sortKey: bonus,
    });
  } else if (s.isStub) {
    const penalty = w.qualityBonus * 0.7;
    score -= penalty;
    negatives.push({
      type: "negative",
      id: "StubArticle",
      sortKey: penalty,
    });
  }

  // Protection: light bonus if protected at all
  if (s.isProtected) {
    score += w.protectionBonus;
    positives.push({
      type: "positive",
      id: "ProtectedPage",
      sortKey: w.protectionBonus,
    });
  }

  // Editor diversity: more unique editors up to 10
  const editorScore = s.uniqueEditors ? Math.min(s.uniqueEditors / 10, 1) : 0;
  const editorContribution = w.editorDiversity * editorScore;
  score += editorContribution;
  if (s.uniqueEditors >= 5) {
    positives.push({
      type: "positive",
      id: "ManyEditors",
      sortKey: editorContribution,
    });
  }

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
  // Pick top 2–3 highlights from each side.
  // If the verdict is Heikko but no negatives crossed their thresholds,
  // surface a generic negative to avoid "Ei vahvoja miinuksia" on a weak score.
  const topPositives = positives
    .sort((a, b) => (b.sortKey || 0) - (a.sortKey || 0))
    .slice(0, 3)
    .map(({ sortKey: _sortKey, ...rest }) => rest);

  // If the verdict is Heikko but no individual penalty crossed its own
  // "strong" threshold, surface the criteria that actually reduced the
  // score as red tags instead of a single generic sentence.
  let negs = negatives;
  if (verdict === "Heikko" && negatives.length === 0) {
    const synthetic: Highlight[] = [];

    // Synthetically add tags for the criteria that contributed penalties
    // or missed out on bonuses, using slightly softer thresholds than the
    // main highlight logic.
    if (s.citationNeeded > 0) {
      synthetic.push({
        type: "negative",
        id: s.citationNeeded >= 3 ? "CitationNeededMany" : "CitationNeededSome",
      });
    }
    if (s.problemTemplates > 0) {
      synthetic.push({
        type: "negative",
        id:
          s.problemTemplates >= 2 ? "ProblemTemplates" : "ProblemTemplatesSome",
      });
    }
    if (s.daysSinceLastEdit > 365) {
      synthetic.push({
        type: "negative",
        id: s.daysSinceLastEdit > 365 * 3 ? "VeryStale" : "Stale",
      });
    }
    if (s.revertRate > 0.2) {
      synthetic.push({
        type: "negative",
        id: s.revertRate >= 0.4 ? "HighRevertRate" : "ModerateRevertRate",
      });
    }
    if (s.talkIssues > 0) {
      synthetic.push({
        type: "negative",
        id: s.talkIssues >= 3 ? "TalkDisputesMany" : "TalkDisputesSome",
      });
    }
    if (s.wordCount > 0 && s.wordCount < 600) {
      synthetic.push({
        type: "negative",
        id: s.wordCount < 300 ? "VeryShortArticle" : "ShortArticle",
      });
    }
    if (s.headingCount < 3) {
      synthetic.push({
        type: "negative",
        id: "WeakStructure",
      });
    }
    if (s.isStub) {
      synthetic.push({
        type: "negative",
        id: "StubArticle",
      });
    }
    if (!s.isGoodArticle && !s.isFeaturedArticle) {
      synthetic.push({
        type: "negative",
        id: "MissingQualityBadge",
      });
    }

    // If for some reason we still end up with nothing, keep one very
    // short generic tag so the UI never shows an empty column.
    if (synthetic.length === 0) {
      synthetic.push({
        type: "negative",
        id: "MultipleSmallWeaknesses",
      });
    }

    negs = synthetic;
  }

  const topNegatives = negs
    .sort((a, b) => (b.sortKey || 0) - (a.sortKey || 0))
    .slice(0, 3)
    .map(({ sortKey: _sortKey, ...rest }) => rest);

  return {
    score,
    verdict,
    rejected: false as const,
    highlights: { positives: topPositives, negatives: topNegatives },
  };
}
