import type { Signals } from "./scoring.js";

const UA = { headers: { "user-agent": "WikiReliability/1.0 (+example)" } };

// Wikipedia API response types
interface WikiPage {
  title?: string;
  missing?: boolean;
  pageprops?: {
    disambiguation?: boolean;
  };
  protection?: { type: string; level: string }[];
}

interface WikiRedirect {
  from?: string;
  to?: string;
}

interface WikiRevision {
  timestamp?: string;
  tags?: string[];
  user?: string;
}

interface WikiTemplate {
  "*"?: string;
}

interface WikiSearchResult {
  title: string;
}

interface WikiQueryResponse {
  query?: {
    pages?: Record<string, WikiPage>;
    redirects?: WikiRedirect[];
    search?: WikiSearchResult[];
    prefixsearch?: WikiSearchResult[];
  };
}

interface WikiParseResponse {
  parse?: {
    text?: {
      "*"?: string;
    };
    wikitext?: {
      "*"?: string;
    };
    templates?: WikiTemplate[];
  };
}

interface WikiRevisionResponse {
  query: {
    pages: Record<
      string,
      {
        revisions?: WikiRevision[];
      }
    >;
  };
}

function uniq<T>(arr: T[]) {
  return [...new Set(arr)];
}

// Hae kerralla sivujen tila + ohjaukset
async function batchResolveTitles(titles: string[], lang: string) {
  const base = `https://${lang}.wikipedia.org/w/api.php`;
  const joined = titles.map((t) => encodeURIComponent(t)).join("|");
  const j = await fetchJSON<WikiQueryResponse>(
    `${base}?action=query&format=json&redirects=1&prop=pageprops|info&inprop=displaytitle&titles=${joined}&origin=*`
  );

  // ohjaukset: from -> to
  const redirMap = new Map<string, string>();
  for (const r of j.query?.redirects || []) {
    if (r.from && r.to) redirMap.set(r.from, r.to);
  }

  const out: Array<{
    inputTitle: string;
    canonical: string;
    exists: boolean;
    isDisambig: boolean;
  }> = [];
  const pages = j.query?.pages || {};
  const byTitle = new Map<string, WikiPage>();
  for (const p of Object.values<WikiPage>(pages)) {
    if (p.title) byTitle.set(p.title, p);
  }

  for (const t of titles) {
    const canonTitle = redirMap.get(t) || t;
    const p = byTitle.get(canonTitle);
    const exists = !!p && !p.missing;
    // Tarkista täsmennyssivu usealla tavalla
    const isDisambigByProp = !!p?.pageprops?.disambiguation;
    const isDisambigByTitle =
      canonTitle.toLowerCase().includes("(täsmennyssivu)") ||
      canonTitle.toLowerCase().includes("(disambiguation)") ||
      canonTitle.toLowerCase().endsWith(" (täsmennys)");
    const isDisambig = isDisambigByProp || isDisambigByTitle;

    out.push({ inputTitle: t, canonical: canonTitle, exists, isDisambig });
  }
  return out;
}

/** Suodata ehdokkaat:
 * - jätä vain olemassa olevat
 * - korvaa ohjaukset kanonisiksi otsikoiksi
 * - poista duplikaatit kanonisen mukaan
 * - optionaalisesti: piilota ohjaukset (näytä vain kanoninen otsikko)
 */
async function filterCandidates(
  cands: string[],
  lang: string,
  showRedirectAliases = false
) {
  const info = await batchResolveTitles(cands, lang);
  const seenCanon = new Set<string>();
  const keep: string[] = [];
  for (const i of info) {
    if (!i.exists) continue;
    if (i.isDisambig) continue;
    const display = showRedirectAliases ? i.inputTitle : i.canonical;
    if (seenCanon.has(i.canonical)) continue;
    seenCanon.add(i.canonical);
    keep.push(display);
  }
  return keep;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const r = await fetch(url, UA as RequestInit);
  if (!r.ok) throw new Error(`Fetch ${r.status} for ${url}`);
  return r.json() as Promise<T>;
}

function countReferencesFromHTML(html: string): number {
  const ids = new Set<string>();
  (html.match(/id="cite_ref-[^"]+"/gi) || []).forEach((m) => ids.add(m));
  let n = ids.size;
  if (n === 0)
    n = (html.match(/<sup[^>]*class="[^"]*\breference\b[^"]*"[^>]*>/gi) || [])
      .length;
  if (n === 0) n = (html.match(/role="doc-noteref"/gi) || []).length;
  return n;
}
function countCitationNeeded(html: string, wikitext: string): number {
  let n =
    (html.match(/Template-Fact/gi) || []).length +
    (html.match(/\bcitation needed\b/gi) || []).length +
    (html.match(/\[lähde\?\]/gi) || []).length;
  n += (wikitext.match(/\{\{\s*(citation needed|fact|cn)\b/gi) || []).length;
  n += (wikitext.match(/\{\{\s*lähde\?\s*\}\}/gi) || []).length;
  return n;
}

export async function collectSignals(
  title: string,
  lang = "en"
): Promise<Signals> {
  const base = `https://${lang}.wikipedia.org/w/api.php`;

  const parsed = await fetchJSON<WikiParseResponse>(
    `${base}?action=parse&page=${encodeURIComponent(
      title
    )}&prop=text|wikitext|templates|externallinks&format=json&origin=*`
  );
  const html: string = parsed.parse?.text?.["*"] ?? "";
  const wikitext: string = parsed.parse?.wikitext?.["*"] ?? "";

  const plainText = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const words = plainText.trim().split(/\s+/);
  const wordCount = words.filter(Boolean).length;
  const headingCount = (html.match(/<h[2-4][^>]*>/gi) || []).length;

  const referenceCountHTML = countReferencesFromHTML(html);
  const referenceCountWT = (wikitext.match(/<ref[\s>]/gi) || []).length;
  const referenceCount = referenceCountHTML || referenceCountWT;

  const citationNeeded = countCitationNeeded(html, wikitext);

  const templates = (parsed.parse?.templates || []).map((t: WikiTemplate) =>
    String(t?.["*"] || "").toLowerCase()
  );
  const problemTemplates = templates.filter((t: string) =>
    ["disputed", "advert", "unreferenced", "coi", "hoax"].some((f) =>
      t.includes(f)
    )
  ).length;

  const isStub = templates.some((t: string) => t.includes("stub"));
  const isGoodArticle = templates.some(
    (t: string) =>
      t.includes("good article") || t.includes("laadukas artikkeli")
  );
  const isFeaturedArticle = templates.some(
    (t: string) =>
      t.includes("featured article") || t.includes("valittu artikkeli")
  );

  const now = Date.now();
  const rv = await fetchJSON<WikiRevisionResponse>(
    `${base}?action=query&format=json&prop=revisions&rvprop=ids|timestamp|flags|tags&rvlimit=200&titles=${encodeURIComponent(
      title
    )}&origin=*`
  );
  const page = Object.values(rv.query.pages)[0];
  const revs: WikiRevision[] = page?.revisions || [];
  const lastEdit = revs[0]?.timestamp
    ? new Date(revs[0].timestamp).getTime()
    : 0;
  const daysSinceLastEdit = lastEdit ? (now - lastEdit) / 86400000 : 999;
  const revertRate = revs.length
    ? revs.filter((r) =>
        (r.tags || []).some(
          (t: string) => t.includes("rollback") || t.includes("undo")
        )
      ).length / revs.length
    : 0;

  const users = revs.map((r) => r.user).filter(Boolean) as string[];
  const uniqueEditors = new Set(users).size;

  const isProtected =
    Array.isArray((page as WikiPage).protection) &&
    (page as WikiPage).protection!.length > 0;

  const talk = await fetchJSON<WikiParseResponse>(
    `${base}?action=parse&page=Talk:${encodeURIComponent(
      title
    )}&prop=text&format=json&origin=*`
  ).catch(() => null);
  const talkHTML: string = talk?.parse?.text?.["*"] ?? "";
  const talkIssues = (
    talkHTML.match(/dispute|pov|controvers|merge|cleanup/gi) || []
  ).length;

  return {
    referenceCount,
    citationNeeded,
    problemTemplates,
    daysSinceLastEdit,
    revertRate,
    talkIssues,
    wordCount,
    headingCount,
    isStub,
    isGoodArticle,
    isFeaturedArticle,
    isProtected,
    uniqueEditors,
  };
}

export function evidenceLinks(title: string, lang = "en") {
  return [
    {
      label: "Article",
      url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    },
    {
      label: "History",
      url: `https://${lang}.wikipedia.org/w/index.php?title=${encodeURIComponent(
        title
      )}&action=history`,
    },
    {
      label: "Talk",
      url: `https://${lang}.wikipedia.org/wiki/Talk:${encodeURIComponent(
        title
      )}`,
    },
  ];
}

async function tryExactTitle(title: string, lang: string) {
  const base = `https://${lang}.wikipedia.org/w/api.php`;
  const url = `${base}?action=query&format=json&redirects=1&prop=pageprops|info&inprop=displaytitle&titles=${encodeURIComponent(
    title
  )}&origin=*`;
  const j = await fetchJSON<WikiQueryResponse>(url);
  const page: WikiPage = Object.values(j.query?.pages || {})[0] || {};
  if (!page || page.missing) return { kind: "missing" as const };
  const normalized = page.title as string;
  const isDisambigByProp = !!page.pageprops?.disambiguation;
  const isDisambigByTitle =
    normalized.toLowerCase().includes("(täsmennyssivu)") ||
    normalized.toLowerCase().includes("(disambiguation)") ||
    normalized.toLowerCase().endsWith(" (täsmennys)");
  const isDisambig = isDisambigByProp || isDisambigByTitle;
  return { kind: isDisambig ? "disambiguation" : "ok", title: normalized };
}

async function searchCandidates(title: string, lang: string, limit = 10) {
  const base = `https://${lang}.wikipedia.org/w/api.php`;
  const q = encodeURIComponent(title);

  // 1) perushaut
  const [sNear, sPrefix, sFull] = await Promise.all([
    fetchJSON<WikiQueryResponse>(
      `${base}?action=query&format=json&list=search&srwhat=nearmatch&srlimit=${limit}&srsearch=${q}&origin=*`
    ),
    fetchJSON<WikiQueryResponse>(
      `${base}?action=query&format=json&list=prefixsearch&pslimit=${Math.min(
        5,
        limit
      )}&pssearch=${q}&origin=*`
    ),
    fetchJSON<WikiQueryResponse>(
      `${base}?action=query&format=json&list=search&srlimit=${limit}&srsearch=${q}&origin=*`
    ),
  ]);

  // 2) lisäpassi: hae täsmennetyt muodot "<title> ("
  const qParen = encodeURIComponent(`${title} (`);
  const sParen = await fetchJSON<WikiQueryResponse>(
    `${base}?action=query&format=json&list=prefixsearch&pslimit=${limit}&pssearch=${qParen}&origin=*`
  ).catch(() => null);

  // kerää kandidaatit
  const cand: string[] = [];
  for (const r of sNear?.query?.search || []) cand.push(r.title);
  for (const r of sPrefix?.query?.prefixsearch || []) cand.push(r.title);
  for (const r of sFull?.query?.search || []) cand.push(r.title);
  for (const r of sParen?.query?.prefixsearch || []) cand.push(r.title);

  // rankkaus: suositaan tarkkaa osumaa; alkuosumaa; ja erityisesti sulkeilla täsmennettyä alkuosumaa
  const qLower = title.toLowerCase();
  const score = (t: string) => {
    const x = t.toLowerCase();
    const exact = x === qLower;
    const starts = x.startsWith(qLower);
    const hasParen = x.includes("(");
    return (
      (exact ? 100 : 0) +
      (starts ? 60 : 0) +
      (starts && hasParen ? 50 : 0) + // nostaa esim. "Iso-Britannia (saari)"
      (x.includes(qLower) ? 10 : 0)
    );
  };

  const ranked = cand.sort((a, b) => score(b) - score(a));

  // UUSI: suodata pois puuttuvat + ohjaukset -> kanoninen otsikko + poista duplikaatit
  const cleaned = await filterCandidates(
    uniq(ranked),
    lang,
    /*showRedirectAliases=*/ false
  );

  return cleaned.slice(0, limit);
}

export async function resolveWikiTitle(
  input: string,
  lang = "fi",
  opts: { withAlternatives?: boolean; limit?: number } = {}
) {
  const { limit = 8 } = opts;

  // suora osuma / ohjaus / täsmennyssivu
  const exact = await tryExactTitle(input, lang);

  // hae vaihtoehdot aina
  const alternatives = await searchCandidates(input, lang, limit);

  if (exact.kind === "ok") {
    const canonical = exact.title!;
    // Tarkista että kanoninen otsikko ei ole täsmennyssivu ennen sen lisäämistä
    const allSuggestions = [
      canonical,
      ...alternatives.filter((s) => s !== canonical),
    ];
    // Suodata täsmennyssivut pois myös tästä listasta
    const filteredSuggestions = await filterCandidates(
      allSuggestions,
      lang,
      false
    );
    return { ok: true, title: canonical, suggestions: filteredSuggestions };
  }
  // Varmista että alternatives on suodatettu täsmennyssivuista
  const filteredAlternatives = await filterCandidates(
    alternatives,
    lang,
    false
  );
  return {
    ok: false,
    reason:
      exact.kind === "disambiguation"
        ? ("disambiguation" as const)
        : ("missing" as const),
    suggestions: filteredAlternatives,
  };
}
