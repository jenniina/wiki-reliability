import express, { Request, Response } from "express";
import cors from "cors";
import path from "node:path";
import { collectSignals, evidenceLinks, resolveWikiTitle } from "./wiki.js";
import { applyPolicy, DEFAULT_POLICY, type Policy } from "./scoring.js";
import { parseWikiUrl } from "./url.js";

type AnalyzeRequest = {
  title?: string;
  lang?: string;
  url?: string;
  policy?: Policy;
  preferChoice?: boolean;
};

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors());
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

app.post(
  "/api/analyze",
  async (req: Request<unknown, unknown, AnalyzeRequest>, res: Response) => {
    try {
      let {
        title,
        lang = "fi",
        url,
        policy,
        preferChoice = false,
      } = req.body || {};

      let resolvedFrom: string | undefined = undefined;
      let suggestions: string[] = [];

      if (typeof url === "string") {
        const parsed = parseWikiUrl(url);
        if (!parsed)
          return res.status(400).json({ error: "Not a Wikipedia article URL" });
        title = parsed.title;
        lang = parsed.lang;
      } else if (typeof title === "string") {
        const r = await resolveWikiTitle(title, lang, {
          withAlternatives: true,
          limit: 8,
        });
        if (!r.ok) {
          return res.status(404).json({
            error:
              r.reason === "disambiguation"
                ? "Täsmennyssivu; valitse tarkempi otsikko"
                : "Artikkelia ei löytynyt",
            suggestions: r.suggestions || [],
          });
        }
        const canonical = r.title!;
        const suggestions = [
          canonical,
          ...(r.suggestions || []).filter((s) => s !== canonical),
        ];
        const resolvedFrom = canonical !== title ? title : undefined;

        if (preferChoice) {
          return res.json({ choose: true, suggestions, resolvedFrom, lang });
        }
        // muissa tapauksissa analysoi suoraan:
        title = canonical;
      }

      if (!title || typeof title !== "string") {
        return res.status(400).json({ error: "title or url required" });
      }

      const safePolicy: Policy =
        policy && typeof policy === "object"
          ? {
              ...DEFAULT_POLICY,
              ...policy,
              weights: { ...DEFAULT_POLICY.weights, ...(policy.weights || {}) },
            }
          : DEFAULT_POLICY;

      const signals = await collectSignals(title, lang);
      const outcome = applyPolicy(signals, safePolicy);
      const evidence = evidenceLinks(title, lang);

      return res.json({
        ...outcome,
        signals,
        evidence,
        lang,
        title,
        resolvedFrom,
        suggestions, // lähetetään mukaan; voi näyttää “muut mahdolliset”
        policy: safePolicy,
      });
    } catch (e: unknown) {
      return res.status(500).json({
        error: e instanceof Error ? e.message : "internal error",
      });
    }
  }
);

if (process.env.NODE_ENV === "production") {
  const distDir = path.resolve("dist", "frontend");
  app.use(express.static(distDir));
  app.get("*", (_req: Request, res: Response) =>
    res.sendFile(path.join(distDir, "index.html"))
  );
}

// eslint-disable-next-line no-console
app.listen(PORT, () => console.log(`server on http://localhost:${PORT}`));
