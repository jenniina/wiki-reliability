export function parseWikiUrl(
  input: string
): { title: string; lang: string } | null {
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return null;
  }

  const host = u.hostname.toLowerCase();
  const m = host.match(/^([a-z-]+)\.(m\.)?wikipedia\.org$/);
  if (!m) return null;
  const lang = m[1];

  let rawTitle = "";
  if (u.pathname.startsWith("/wiki/")) {
    rawTitle = decodeURIComponent(u.pathname.replace(/^\/wiki\//, ""));
  } else if (u.pathname === "/w/index.php") {
    rawTitle = u.searchParams.get("title") || "";
  }
  if (!rawTitle) return null;

  rawTitle = rawTitle.split("#")[0].replace(/_/g, " ");
  const title = rawTitle.replace(/^Talk:/i, "");
  return { title, lang };
}
