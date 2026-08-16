---
name: lookup-portal
description: Resolve the law-enforcement agency that handled an incident to its canonical name and records-request portal URL or clerk email, using a cached map with web-search fallback, and curate the map (evictions, better direct URLs) as portals change. Resolves and maintains the map only; it never registers accounts, submits requests, or contacts departments.
---

# lookup-portal

Input: an incident (article text, location, agency phrases as the article
states them). Output: canonical department name + `portalURL` and/or `email`,
plus any map updates.

## The map

`portal-map.json` (in this skill's directory) is the seed, built from Origin's
datasheet by `seed-portal-map.ts`. The authoritative copy lives in your memory
store: on first run, copy the seed there; after that, read and write only the
memory copy. Entries: `{ department, state, portalURL, email, rowCount }`
keyed by normalized name.

**Normalization** (must match `normalizeDepartment` in `seed-portal-map.ts`):
curly quotes → straight, collapse whitespace, lowercase, expand `pd` → `police
department` / `so` → `sheriff's office` / `dept` → `department`, strip trailing
punctuation.

## Procedure

1. **Identify the agency from the article, not the dateline.** The agency
   whose officers had the on-body interaction is the one holding the footage.
   Quote the phrase that names it.
2. Normalize and look up. On hit, use the entry — but sanity-check `state`
   against the incident's state.
3. On miss, web-search: `"<department name>" public records request body worn
   camera` and the department's own site. A valid result is a page that
   accepts records requests (JustFOIA/GovQA/NextRequest tenant, or the
   department's own request form) or a named records-custodian email.
4. **Verify on use**: before emitting a cached or found URL, fetch it. If it
   404s, redirects to a generic homepage, or no longer serves a request page,
   evict/replace and re-search.
5. Write back: new entries, evictions, and upgrades (see curation) go to the
   memory copy immediately, with `rowCount: 0` for entries not from the
   datasheet.

## Curating better URLs

The seed URLs are whatever the human team pasted — sometimes a portal home
rather than the direct request form. When resolution lands on a better direct
URL (e.g. a GovQA `CustomerIssues.aspx?rqst=...` request form vs the
`SupportHome.aspx` landing, or a NextRequest `/requests/new`), upgrade the
entry and note the old URL in the entry as `previousURL` so a bad upgrade can
be reverted. Never store per-session state: strip GovQA `/(S(...))/` path
segments and `sSessionID` params; if a URL only works with session state,
store the portal's base and note it.

## Failure modes — read before resolving

- **City-based misattribution.** The SOP's own positive example reads as a
  "Boynton Beach" story, but the dragged officer was a Florida Highway Patrol
  trooper — Boynton Beach PD only assisted. State troopers, county sheriffs,
  city PDs, and university PDs overlap on the same map dot. Resolve the
  agency the article names as making the stop/arrest, and when multiple
  agencies took part, prefer the one whose officer wore the camera during the
  interesting interaction; list the others in `notes`.
- **One metro, many agencies.** "Miami" alone is ambiguous across Miami PD,
  Miami-Dade Sheriff's Office, Miami Beach PD, and more, each with its own
  portal and login. Never resolve from a city name; resolve from the agency
  name in the article.
- **Same county name, different state.** Lee County exists in Florida,
  Georgia, and a dozen other states. The map stores `state` — treat a
  state mismatch as a miss, not a hit.
- **Near-miss agency names from search.** Searching a small department's
  portal will surface a similarly-named department first (a "Springfield PD"
  problem). Corroborate: the found portal's own text must name the same
  jurisdiction and state before you trust it.
- **Datasheet seed noise.** Seed entries were hand-entered; at least one
  ("seminole police department") looks like a garbled "Seminole County
  Sheriff's Office". A cache hit on a suspicious entry (agency name that
  doesn't match how articles state it, tiny rowCount, missing state) deserves
  the same verification as a miss.
- **Portal vendors churn.** Departments migrate JustFOIA → GovQA →
  NextRequest; the old tenant URL may still load a dead form. "Page loads" is
  not verification — the page must currently accept records requests.
- **Session-state poisoning.** GovQA URLs copied from a browser embed
  `/(S(...))/` and `sSessionID`. Stored verbatim they expire and break the
  next run. Always strip before writing back.
- **Concluding "no portal" from page 1.** Small departments bury their
  records page. Sweep: department site nav ("Records", "Public Records",
  "Transparency"), county clerk site, then state-level portals — before
  falling back to a clerk email, and only then report unresolved.
- **Email-only is a complete resolution, not a failure.** Some agencies
  (Florida Highway Patrol, observed live: its flhsmv.gov "open government"
  page accepts no requests and names a mail custodian only) take requests
  exclusively by email. Store the entry with the verified records email and
  `portalURL: null` — never keep a landing page that accepts no requests as
  the portalURL just to fill the field; that's an eviction. An email-only
  entry means the email path is how this department gets requests
  (submission handling for those cases is the pipeline's call, not this
  skill's).
