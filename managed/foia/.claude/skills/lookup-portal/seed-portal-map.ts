// Rebuild portal-map.json from a datasheet CSV export.
// Usage: bun seed-portal-map.ts <datasheet.csv> [out.json]
// One-time seeding + occasional refresh when the team shares a newer sheet;
// at runtime the agent treats its memory copy of the map as authoritative.

import { file, write } from "bun";

import { parse } from "./vendor/std-csv/parse.js";

// Canonical key for a department name. Must match the normalization rules
// in SKILL.md: straight quotes, collapsed whitespace, lowercase, expanded
// abbreviations, no trailing punctuation.
export function normalizeDepartment(name: string): string {
  return name
    .replaceAll(/[‘’ʼ]/gu, "'")
    .replaceAll(/[“”]/gu, '"')
    .replaceAll(/\s+/gu, " ")
    .trim()
    .toLowerCase()
    .replaceAll(/\bpd\b/gu, "police department")
    .replaceAll(/\bso\b/gu, "sheriff's office")
    .replaceAll(/\bdept\.?\b/gu, "department")
    .replaceAll(/[.\s]+$/gu, "");
}

// Some sheet cells contain a URL with a second URL-encoded URL glued on.
const ENCODED_URL_RE = /https?%3A%2F%2F/iu;
// GovQA embeds an ASP.NET session segment /(S(...))/ in the path.
const GOVQA_SESSION_RE = /\/\(S\([^)]*\)\)/giu;

// Strip per-session state from portal URLs so the cached URL is stable.
export function cleanPortalURL(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes("@")) {
    return null; // emails handled separately
  }
  const glued = trimmed.search(ENCODED_URL_RE);
  const candidate = glued > 0 ? trimmed.slice(0, glued) : trimmed;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  const path = url.pathname.replace(GOVQA_SESSION_RE, "");
  if (url.hostname.endsWith(".govqa.us")) {
    return `${url.origin}/WEBAPP/_rs/SupportHome.aspx`;
  }
  url.searchParams.delete("sSessionID");
  const query = url.searchParams.toString();
  return `${url.origin}${path}${query ? `?${query}` : ""}`;
}

type Entry = {
  department: string; // canonical display name (most frequent original spelling)
  state: string | null;
  portalURL: string | null;
  email: string | null;
  rowCount: number; // how many datasheet rows backed this entry
};

type Group = {
  names: Map<string, number>;
  urls: Map<string, number>;
  emails: Map<string, number>;
  states: Map<string, number>;
  rowCount: number;
};

const CURLY_APOSTROPHE_RE = /[‘’ʼ]/gu;

const bump = (m: Map<string, number>, k: string) =>
  m.set(k, (m.get(k) ?? 0) + 1);

// The most frequent value in a tally, or null when the tally is empty.
const top = (m: Map<string, number>) =>
  [...m.entries()].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? null;

function accumulate(
  g: Group,
  rawDept: string,
  contact: string,
  cityState: string
) {
  g.rowCount += 1;
  bump(g.names, rawDept.replace(CURLY_APOSTROPHE_RE, "'"));
  if (contact.includes("@") && !contact.includes("/")) {
    bump(g.emails, contact.toLowerCase());
  } else if (contact) {
    const url = cleanPortalURL(contact);
    if (url) {
      bump(g.urls, url);
    }
  }
  const state = cityState.split(",").pop()?.trim();
  if (state) {
    bump(g.states, state);
  }
}

async function main() {
  const [
    csvPath,
    outPath = new URL("portal-map.json", import.meta.url).pathname,
  ] = process.argv.slice(2);
  if (!csvPath) {
    console.error("usage: bun seed-portal-map.ts <datasheet.csv> [out.json]");
    process.exit(1);
  }
  const rows = parse(await file(csvPath).text());
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const deptIdx = header.indexOf("police department");
  const contactIdx = header.indexOf("email");
  const cityIdx = header.indexOf("city and state");
  if (deptIdx === -1 || contactIdx === -1) {
    console.error("missing 'police department' or 'email' column");
    process.exit(1);
  }

  const groups = new Map<string, Group>();
  for (const r of rows.slice(1)) {
    const rawDept = (r[deptIdx] ?? "").trim();
    if (!rawDept) {
      continue;
    }
    const key = normalizeDepartment(rawDept);
    let g = groups.get(key);
    if (!g) {
      g = {
        emails: new Map(),
        names: new Map(),
        rowCount: 0,
        states: new Map(),
        urls: new Map(),
      };
      groups.set(key, g);
    }
    accumulate(
      g,
      rawDept,
      (r[contactIdx] ?? "").trim(),
      (r[cityIdx] ?? "").trim()
    );
  }

  const map: Record<string, Entry> = {};
  for (const [key, g] of [...groups.entries()].toSorted()) {
    map[key] = {
      department: top(g.names) ?? key,
      email: top(g.emails),
      portalURL: top(g.urls),
      rowCount: g.rowCount,
      state: top(g.states),
    };
  }

  await write(outPath, `${JSON.stringify(map, null, 2)}\n`);
  const entries = Object.values(map);
  console.log(
    `${entries.length} departments — ${entries.filter((e) => e.portalURL).length} with portal URL, ${entries.filter((e) => e.email).length} with email, ${entries.filter((e) => !(e.portalURL || e.email)).length} with neither`
  );
}

if (import.meta.main) {
  await main();
}
