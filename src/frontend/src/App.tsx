import { useContext, useState } from "react";
import styles from "./app.module.css";
import InfoTip from "./components/InfoTip";
import SliderRow from "./components/SliderRow";
import Accordion from "./components/Accordion";
import SetLanguage from "./components/SetLanguage";
import {
  Policy,
  Result,
  DEFAULT_POLICY,
  STRICTNESS_PROFILES,
  StrictnessLevel,
  AnalyzeRequest,
  AnalyzeResponse,
  AnalyzeErrorResponse,
  AnalyzeChoiceResponse,
} from "./types";
import { verdictToLabel } from "./types";
import useLocalStorage from "./hooks/useLocalStorage";
import { LanguageContext } from "./contexts/LanguageContext";
import {
  FaExclamationTriangle,
  FaExclamationCircle,
  FaCheckCircle,
  FaLockOpen,
  FaUnlock,
  FaLock,
} from "react-icons/fa";
import { MdStars } from "react-icons/md";

export const colorsObj = {
  red: "#F5002D",
  amber: "#B38F00",
  teal: "#2E9E93",
  green: "#2E9E36",
  yellow: "#B38F00",
};

function VerdictIcon({ verdict }: { verdict: Result["verdict"] }) {
  // Colors chosen for good contrast on white (#fff) and light backgrounds
  // Heikko (Weak) – red
  // Kohtalainen (Moderate) – warm yellow
  // Hyvä (Good) – teal
  // Erinomainen (Excellent) – green with yellow star detail
  switch (verdict) {
    case "Heikko":
      return (
        <FaExclamationTriangle
          aria-hidden="true"
          style={{
            color: colorsObj.red,
            fontSize: "2.25rem",
            verticalAlign: "middle",
            marginRight: "0.35rem",
          }}
        />
      );
    case "Kohtalainen":
      return (
        <FaExclamationCircle
          aria-hidden="true"
          style={{
            color: colorsObj.amber,
            fontSize: "2.25rem",
            verticalAlign: "middle",
            marginRight: "0.35rem",
          }}
        />
      );
    case "Hyvä":
      return (
        <FaCheckCircle
          aria-hidden="true"
          style={{
            color: colorsObj.teal,
            fontSize: "2.25rem",
            verticalAlign: "middle",
            marginRight: "0.35rem",
          }}
        />
      );
    case "Erinomainen":
      return (
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2.4rem",
            marginRight: "0.35rem",
          }}
        >
          <MdStars
            style={{
              color: colorsObj.green, // green for outer shape
              filter: "drop-shadow(0 0 2px rgba(0,0,0,0.4))",
            }}
          />
          {/* Slight visual hint of yellow center via text shadow */}
          <span
            style={{
              position: "absolute",
              width: "1.2rem",
              height: "1.2rem",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, " +
                colorsObj.yellow +
                " 0%, transparent 70%)",
            }}
          />
        </span>
      );
    default:
      return null;
  }
}

export default function App() {
  const { t } = useContext(LanguageContext)!;
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [chooseMode, setChooseMode] = useState<boolean>(false);
  const [resolvedFrom, setResolvedFrom] = useState<string | undefined>(
    undefined
  );
  const [title, setTitle] = useLocalStorage("wiki-title", "");
  const [lang, setLang] = useLocalStorage("wiki-lang", "en");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [policy, setPolicy] = useLocalStorage<Policy>(
    "wiki-policy",
    DEFAULT_POLICY
  );
  const [autoRejectCN, setAutoRejectCN] = useLocalStorage(
    "wiki-autoRejectCN",
    false
  );
  const [strictnessLevel, setStrictnessLevel] =
    useLocalStorage<StrictnessLevel>("wiki-strictness", "normal");

  const isPresetPolicy = (
    ["permissive", "normal", "strict"] as StrictnessLevel[]
  ).some(
    (level) =>
      JSON.stringify(policy) === JSON.stringify(STRICTNESS_PROFILES[level])
  );

  // Handle strictness level changes
  const handleStrictnessChange = (level: StrictnessLevel) => {
    setStrictnessLevel(level);
    const newPolicy = STRICTNESS_PROFILES[level];
    setPolicy(newPolicy);
    // Update autoRejectCN based on the profile
    setAutoRejectCN(!!newPolicy.rejectIf?.citationNeededGreaterThan);
  };

  const analyzeWithChosen = async (pickedTitle: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body: AnalyzeRequest = { title: pickedTitle, lang, policy };
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json: AnalyzeResponse = await r.json();
      if (!r.ok) throw new Error((json as { error?: string }).error || "Virhe");
      setResult(json as Result);
      setTitle((json as Result).title ?? pickedTitle);
      setChooseMode(false);
      setSuggestions([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const analyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSuggestions([]);
    setChooseMode(false);
    setResolvedFrom(undefined);
    try {
      const isUrl = /^https?:\/\//i.test(title.trim());
      const p: Policy = {
        ...policy,
        rejectIf: {
          ...policy.rejectIf,
          citationNeededGreaterThan: autoRejectCN
            ? 0
            : policy.rejectIf?.citationNeededGreaterThan,
        },
      };

      const body: AnalyzeRequest = {
        ...(isUrl ? { url: title.trim() } : { title, lang }),
        policy: p,
        preferChoice: !isUrl, // URL:lle ei tarvita valintaa; nimihauille pyydetään ehdotukset ensin
      };

      // VAIHE 1: hae ehdotukset (tai analyysi, jos URL tai yksiselitteinen)
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json: AnalyzeResponse = await r.json();

      if (!r.ok) {
        if (
          r.status === 404 &&
          "error" in json &&
          "suggestions" in json &&
          Array.isArray(json.suggestions) &&
          json.suggestions.length
        ) {
          const errorResponse = json as AnalyzeErrorResponse;
          setError(errorResponse.error || t("NotFound"));
          setSuggestions(errorResponse.suggestions || []);
          setChooseMode(true);
          return;
        }
        const errorResponse = json as AnalyzeErrorResponse;
        throw new Error(errorResponse.error || t("Error"));
      }

      // Jos palvelin pyytää valitsemaan ensin; näytetään lista eikä vielä analysoida
      if ("choose" in json && json.choose && "suggestions" in json) {
        const choiceResponse = json as AnalyzeChoiceResponse;
        setSuggestions(choiceResponse.suggestions);
        setResolvedFrom(choiceResponse.resolvedFrom);
        setChooseMode(true);
        return;
      }

      // Muuten; suoraan analyysitulokset
      const result = json as Result;
      setResult(result);
      if (result.title) setTitle(result.title);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const reanalyze = async () => {
    if (!result) return; // nothing to re-run

    setLoading(true);
    setError(null);

    try {
      const body: AnalyzeRequest = {
        title: result.title,
        lang: result.lang,
        policy,
        preferChoice: false,
      };

      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json: AnalyzeResponse = await r.json();
      if (!r.ok) throw new Error((json as any).error || "Error");

      // Here we assume backend returns a final Result, not a choose-response,
      // because we already know the exact page.
      const newResult = json as Result;
      setResult(newResult);
      if (newResult.title) setTitle(newResult.title);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <a href="#main-content" className={styles["skip-link"]}>
        Skip to main content
      </a>
      <main id="main-content" className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t("WikipediaReliabilityChecker")}</h1>
          <SetLanguage />
        </header>

        <form
          className={styles["search-container"]}
          onSubmit={(e) => {
            e.preventDefault();
            analyze();
          }}
        >
          <label htmlFor="article-input" className={styles.scr}>
            {t("ArticleNameOrURL")}
          </label>
          <input
            id="article-input"
            placeholder={t("ArticleNameOrURL")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles["search-input"]}
          />
          <div className={styles["lang-container"]}>
            <label htmlFor="language-input" className={styles.scr}>
              {t("LanguageCodeTitle")}
            </label>
            <input
              id="language-input"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className={styles["lang-input"]}
              title={t("LanguageCodeTitle")}
            />
            <InfoTip text={t("LanguageCodeHelp")} horizontal="left" />
          </div>
          <button
            type="submit"
            disabled={!title || loading}
            className={styles["analyze-button"]}
            aria-describedby={loading ? "loading-status" : undefined}
          >
            {loading ? t("Analyzing") : t("Analyze")}
          </button>
        </form>

        {loading && (
          <div
            id="loading-status"
            role="status"
            aria-live="polite"
            className={styles.scr}
          >
            {t("Analyzing")}
          </div>
        )}

        {error && (
          <div role="alert" aria-live="assertive" className={styles.error}>
            {error}
          </div>
        )}

        {chooseMode && suggestions.length > 0 && (
          <div className={styles["choice-container"]}>
            <div className={styles["choice-header"]}>
              {t("ChooseArticle")}
              {resolvedFrom && (
                <span className={styles["choice-resolved-from"]}>
                  ({t("YourSearch")} &quot;{resolvedFrom}&quot;)
                </span>
              )}
            </div>
            <div className={styles["choice-grid"]}>
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => analyzeWithChosen(s)}
                  className={styles["choice-button"]}
                  title={`${t("Analyze")}: ${s}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className={styles["choice-actions"]}>
              <button
                onClick={() => {
                  setChooseMode(false);
                  setSuggestions([]);
                }}
                className={styles["cancel-button"]}
              >
                {t("Cancel")}
              </button>
            </div>
          </div>
        )}

        {result && result.signals && (
          <section
            className={styles["result-section"]}
            aria-labelledby="results-heading"
          >
            <div className={styles["result-container"]}>
              <h2 id="results-heading" className={styles["result-header"]}>
                <VerdictIcon verdict={result.verdict} />
                {verdictToLabel(result.verdict, t)}
                {!result.rejected && (
                  <span className={styles["progressbar-wrapper"]}>
                    <span
                      className={styles["progressbar-track"]}
                      aria-hidden="true"
                    >
                      <span
                        className={styles["progressbar-fill"]}
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(100, Math.round(result.score))
                          )}%`,
                          backgroundColor:
                            result.verdict === "Heikko"
                              ? colorsObj.red
                              : result.verdict === "Kohtalainen"
                                ? colorsObj.amber
                                : result.verdict === "Hyvä"
                                  ? colorsObj.teal
                                  : result.verdict === "Erinomainen"
                                    ? colorsObj.green
                                    : "gray",
                        }}
                      />
                    </span>
                    <span className={styles["progressbar-label"]}>
                      {Math.round(result.score)} / 100
                    </span>
                  </span>
                )}
                {result.rejected && <span>{t("Rejected")}</span>}

                <InfoTip text={t("PointsHelp")} horizontal="right" />
                <button
                  type="button"
                  className={styles.reanalyze}
                  onClick={() => reanalyze()}
                >
                  {loading ? t("Analyzing") : t("ReAnalyze")}
                </button>
              </h2>
              {result.rejected && (
                <div className={styles["result-reason"]}>
                  {t("Reason")} {String(result.reason)}
                </div>
              )}
              {result.highlights && (
                <div className={styles.highlights}>
                  <div>
                    <div className={styles["highlights-column-title"]}>
                      {t("Pluses")}
                    </div>
                    <div className={styles["tag-list"]}>
                      {result.highlights.positives.map((h, idx) => (
                        <span
                          key={`pos-${idx}-${h.id}`}
                          className={styles["tag-positive"]}
                        >
                          {t(h.id as never)}
                        </span>
                      ))}
                      {result.highlights.positives.length === 0 && (
                        <span className={styles["tag-neutral"]}>
                          {t("NoStrongPluses")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className={styles["highlights-column-title"]}>
                      {t("Minuses")}
                    </div>
                    <div className={styles["tag-list"]}>
                      {result.highlights.negatives.map((h, idx) => (
                        <span
                          key={`neg-${idx}-${h.id}`}
                          className={styles["tag-negative"]}
                        >
                          {t(h.id as never)}
                        </span>
                      ))}
                      {result.highlights.negatives.length === 0 && (
                        <span className={styles["tag-neutral"]}>
                          {t("NoStrongMinuses")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className={styles["evidence-container"]}>
              {result.evidence.map((e) => (
                <a
                  key={e.url}
                  href={e.url}
                  target="_blank"
                  rel="noreferrer"
                  className={styles["evidence-link"]}
                >
                  {e.label}
                </a>
              ))}
            </div>
            <details className={styles["policy-details"]}>
              <summary className={styles["policy-summary"]}>
                <span className={styles["policy-summary-text"]}>
                  {t("UsedProfile")}
                </span>
                <span className={styles["policy-summary-badge"]}>
                  {(() => {
                    const levels: StrictnessLevel[] = [
                      "permissive",
                      "normal",
                      "strict",
                    ];
                    const match = levels.find(
                      (level) =>
                        JSON.stringify(result.policy) ===
                        JSON.stringify(STRICTNESS_PROFILES[level])
                    );
                    if (!match) return t("CustomProfile");
                    if (match === "permissive") return t("Permissive");
                    if (match === "strict") return t("Strict");
                    return t("Regular");
                  })()}
                </span>
              </summary>
              <div className={styles["policy-grid"]}>
                <div>
                  <div className={styles["policy-group-title"]}>
                    {t("WeightsAndEffects")}
                  </div>
                  <ul className={styles["policy-list"]}>
                    <li>
                      <span className={styles["policy-list-label"]}>
                        {t("References")}:
                      </span>{" "}
                      <span className={styles["policy-list-value"]}>
                        {result.policy.weights.references}
                      </span>
                    </li>
                    <li>
                      <span className={styles["policy-list-label"]}>
                        {t("Recency")}:
                      </span>{" "}
                      <span className={styles["policy-list-value"]}>
                        {result.policy.weights.recency}
                      </span>
                    </li>
                    <li>
                      <span className={styles["policy-list-label"]}>
                        {t("RevertRate")}:
                      </span>{" "}
                      <span className={styles["policy-list-value"]}>
                        {result.policy.weights.revert}
                      </span>
                    </li>
                    <li>
                      <span className={styles["policy-list-label"]}>
                        {t("CitationNeededPenalty")}:
                      </span>{" "}
                      <span className={styles["policy-list-value"]}>
                        {result.policy.weights.citationNeededPenalty}
                      </span>
                    </li>
                    <li>
                      <span className={styles["policy-list-label"]}>
                        {t("ProblemTemplatesPenalty")}:
                      </span>{" "}
                      <span className={styles["policy-list-value"]}>
                        {result.policy.weights.problemTemplatesPenalty}
                      </span>
                    </li>
                    <li>
                      <span className={styles["policy-list-label"]}>
                        {t("TalkPenalty")}:
                      </span>{" "}
                      <span className={styles["policy-list-value"]}>
                        {result.policy.weights.talkPenalty}
                      </span>
                    </li>
                  </ul>
                </div>
                <div>
                  <div className={styles["policy-group-title"]}>
                    {t("RejectRules")}
                  </div>
                  <ul className={styles["policy-list"]}>
                    <li>
                      <span className={styles["policy-list-label"]}>
                        {t("RejectIfCitationNeeded")}:
                      </span>{" "}
                      <span className={styles["policy-list-value"]}>
                        {result.policy.rejectIf?.citationNeededGreaterThan ===
                        undefined
                          ? "No"
                          : "Yes"}
                      </span>
                    </li>
                    <li>
                      <span className={styles["policy-list-label"]}>
                        {t("RejectIfProblemTemplates")}:
                      </span>{" "}
                      <span className={styles["policy-list-value"]}>
                        {result.policy.rejectIf?.hasProblemTemplates
                          ? "Yes"
                          : "No"}
                      </span>
                    </li>
                    <li>
                      <span className={styles["policy-list-label"]}>
                        {t("RejectIfRevertRateAbove")}:
                      </span>{" "}
                      <span className={styles["policy-list-value"]}>
                        {result.policy.rejectIf?.revertRateAbove ?? "-"}
                      </span>
                    </li>
                    <li>
                      <span className={styles["policy-list-label"]}>
                        {t("RejectIfDaysSinceLastEditAbove")}:
                      </span>{" "}
                      <span className={styles["policy-list-value"]}>
                        {result.policy.rejectIf?.daysSinceLastEditAbove ?? "-"}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </details>
          </section>
        )}

        {/* Strictness Profile Selector */}
        <div className={styles["strictness-section"]}>
          <h3 className={styles["strictness-section-title"]}>
            {t("StrictnessProfile")}
            <InfoTip text={t("StrictnessProfileHelp")} />
          </h3>
          <div className={styles["strictness-grid"]}>
            <button
              onClick={() => handleStrictnessChange("permissive")}
              className={`${styles.permissive} ${
                strictnessLevel === "permissive" && isPresetPolicy
                  ? styles["profile-button-active"]
                  : styles["profile-button"]
              }`}
            >
              <div className={styles["profile-button-title"]}>
                <FaLockOpen /> {t("Permissive")}
              </div>
              <div className={styles["profile-button-description"]}>
                {t("PermissiveDesc")}
              </div>
            </button>
            <button
              onClick={() => handleStrictnessChange("normal")}
              className={`${styles.normal} ${
                strictnessLevel === "normal" && isPresetPolicy
                  ? styles["profile-button-active"]
                  : styles["profile-button"]
              }`}
            >
              <div className={styles["profile-button-title"]}>
                <FaUnlock /> {t("Regular")}
              </div>
              <div className={styles["profile-button-description"]}>
                {t("NormalDesc")}
              </div>
            </button>
            <button
              onClick={() => handleStrictnessChange("strict")}
              className={`${styles.strict} ${
                strictnessLevel === "strict" && isPresetPolicy
                  ? styles["profile-button-active"]
                  : styles["profile-button"]
              }`}
            >
              <div className={styles["profile-button-title"]}>
                <FaLock /> {t("Strict")}
              </div>
              <div className={styles["profile-button-description"]}>
                {t("StrictDesc")}
              </div>
            </button>
          </div>
        </div>

        <section className={styles["config-section"]}>
          <Accordion
            className=""
            wrapperClass={styles.advanced}
            text={t("AdvancedSettings")}
            isOpen={false}
          >
            <div className={styles["weights-div-wrapper"]}>
              <h2 className={styles["config-section-subtitle"]}>
                {t("CustomizeProfile")}{" "}
                {!isPresetPolicy && <span>({t("CustomProfile")})</span>}
              </h2>
              <div className={styles["weights-div"]}>
                <div
                  className={`${styles["config-panel"]} ${styles["config-panel-wide"]}`}
                >
                  <h3 className={styles["config-panel-title"]}>
                    {t("WeightsAndEffects")}
                  </h3>
                  <div>
                    <SliderRow
                      label={t("References")}
                      help={t("ReferencesWeightHelp")}
                      value={policy.weights.references}
                      onChange={(n) =>
                        setPolicy((p) => ({
                          ...p,
                          weights: { ...p.weights, references: n },
                        }))
                      }
                      min={0}
                      max={40}
                      leftNote={t("AffectsLess")}
                      rightNote={t("AffectsMore")}
                    />

                    <SliderRow
                      label={t("CitationNeededPenalty")}
                      help={t("CitationNeededPenaltyHelp")}
                      value={policy.weights.citationNeededPenalty}
                      onChange={(n) =>
                        setPolicy((p) => ({
                          ...p,
                          weights: { ...p.weights, citationNeededPenalty: n },
                        }))
                      }
                      min={0}
                      max={40}
                      leftNote={t("MilderPenalty")}
                      rightNote={t("HarsherPenalty")}
                    />

                    <SliderRow
                      label={t("ProblemTemplatesPenalty")}
                      help={t("ProblemTemplatesPenaltyHelp")}
                      value={policy.weights.problemTemplatesPenalty}
                      onChange={(n) =>
                        setPolicy((p) => ({
                          ...p,
                          weights: { ...p.weights, problemTemplatesPenalty: n },
                        }))
                      }
                      min={0}
                      max={40}
                      leftNote={t("MilderPenalty")}
                      rightNote={t("HarsherPenalty")}
                    />
                  </div>
                  <div>
                    <SliderRow
                      label={t("TalkPenalty")}
                      help={t("TalkPenaltyHelp")}
                      value={policy.weights.talkPenalty}
                      onChange={(n) =>
                        setPolicy((p) => ({
                          ...p,
                          weights: { ...p.weights, talkPenalty: n },
                        }))
                      }
                      min={0}
                      max={40}
                      leftNote={t("MilderPenalty")}
                      rightNote={t("HarsherPenalty")}
                    />

                    <SliderRow
                      label={t("RevertRate")}
                      help={t("RevertRateWeightHelp")}
                      value={policy.weights.revert}
                      onChange={(n) =>
                        setPolicy((p) => ({
                          ...p,
                          weights: { ...p.weights, revert: n },
                        }))
                      }
                      min={0}
                      max={40}
                      leftNote={t("AffectsLess")}
                      rightNote={t("AffectsMore")}
                    />

                    <SliderRow
                      label={t("Recency")}
                      help={t("RecencyWeightHelp")}
                      value={policy.weights.recency}
                      onChange={(n) =>
                        setPolicy((p) => ({
                          ...p,
                          weights: { ...p.weights, recency: n },
                        }))
                      }
                      min={0}
                      max={40}
                      leftNote={t("AffectsLess")}
                      rightNote={t("AffectsMore")}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={styles["weights-div-wrapper"]}>
              <div className={styles["weights-div"]}>
                <div className={styles["config-panel"]}>
                  <h3 className={styles["config-panel-title"]}>
                    {t("RejectRules")}
                  </h3>

                  <label className={styles["checkbox-label"]}>
                    <input
                      type="checkbox"
                      checked={autoRejectCN}
                      onChange={(e) => setAutoRejectCN(e.target.checked)}
                    />
                    <span className={styles["checkbox-span"]}>
                      {t("RejectIfCitationNeeded")}
                      <InfoTip text={t("RejectIfCitationNeededHelp")} />
                    </span>
                  </label>

                  <label className={styles["checkbox-label"]}>
                    <input
                      type="checkbox"
                      checked={!!policy.rejectIf?.hasProblemTemplates}
                      onChange={(e) =>
                        setPolicy((p) => ({
                          ...p,
                          rejectIf: {
                            ...p.rejectIf,
                            hasProblemTemplates: e.target.checked,
                          },
                        }))
                      }
                    />
                    <span className={styles["checkbox-span"]}>
                      {t("RejectIfProblemTemplates")}
                      <InfoTip text={t("RejectIfProblemTemplatesHelp")} />
                    </span>
                  </label>

                  <div className={styles["reject-rule-container"]}>
                    <span className={styles["reject-rule-span"]}>
                      {t("RejectIfRevertRateAbove")}
                      <InfoTip text={t("RejectIfRevertRateAboveHelp")} />
                    </span>
                    <input
                      aria-label={t("RejectIfRevertRateAbove")}
                      type="number"
                      step={0.05}
                      min={0}
                      max={1}
                      value={policy.rejectIf?.revertRateAbove ?? ""}
                      placeholder="0.6"
                      onChange={(e) =>
                        setPolicy((p) => ({
                          ...p,
                          rejectIf: {
                            ...p.rejectIf,
                            revertRateAbove:
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                          },
                        }))
                      }
                      className={styles["reject-rule-input"]}
                    />
                  </div>

                  <div className={styles["reject-rule-container"]}>
                    <span className={styles["reject-rule-span"]}>
                      {t("RejectIfDaysSinceLastEditAbove")}
                      <InfoTip text={t("RejectIfDaysSinceLastEditAboveHelp")} />
                    </span>
                    <input
                      aria-label={t("RejectIfDaysSinceLastEditAbove")}
                      type="number"
                      min={1}
                      value={policy.rejectIf?.daysSinceLastEditAbove ?? ""}
                      placeholder="3650"
                      onChange={(e) =>
                        setPolicy((p) => ({
                          ...p,
                          rejectIf: {
                            ...p.rejectIf,
                            daysSinceLastEditAbove:
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                          },
                        }))
                      }
                      className={styles["reject-rule-input"]}
                    />
                  </div>

                  <p className={styles["reject-rule-hint"]}>
                    {t("RejectRuleHint")}
                  </p>
                </div>
              </div>
            </div>
          </Accordion>
        </section>
      </main>
    </>
  );
}
