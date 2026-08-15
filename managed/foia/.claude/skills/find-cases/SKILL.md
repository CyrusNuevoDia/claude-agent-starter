---
name: find-cases
description: Turn a batch spec (states + incident date window) into candidate arrest incidents with source article URLs, via Parallel FindAll with Exa news search as fallback. Discovers candidates only; grading happens in grade-case, and nothing here decides what gets requested.
---

# find-cases

Input: states + date window (e.g. "Florida, incidents June–December 2025"),
optionally a target candidate count. Output: a candidate list — suspect name
(if named), one-line incident summary, incident date, city/state, agency as
stated, and source article URL(s).

## Primary path — Parallel FindAll

Use `findall.ts` in this skill's directory (needs `PARALLEL_API_KEY`).

1. Author the schema yourself — do not use the `/ingest` endpoint's output
   unreviewed. Known-good shape:
   - `objective`: "FindAll arrest incidents reported by local news in
     <STATE> where the incident occurred between <START> and <END> and
     involved <a vehicle pursuit, violent confrontation, weapons, or officers
     being assaulted or dragged>"
   - `entity_type`: `"arrest incidents"`
   - `match_conditions`, objective facts only (judgment belongs to
     grade-case): incident in target state; incident date in window; a named
     law-enforcement agency made an arrest; a local news article covers it.
     Keep temporal conditions explicit ("between June 1 and December 31,
     2025") — vague phrasing gets reinterpreted as "in the last year".
   - `generator`: `"preview"` first, always. Only after preview returns
     plausible incidents with real article URLs, rerun with `"base"` or
     `"core"` and a real `match_limit`.
2. `bun findall.ts create schema.json`, then poll `status` until terminal
   (runs take minutes — do other batch work between polls), then `result`.
3. From each matched candidate keep: name/description, the `basis` citation
   URLs (these are your article sources), and the condition evidence. A
   candidate whose citations don't include a fetchable news article is not a
   candidate — drop it and say how many were dropped.

Observed preview result (Florida, Jun–Dec 2025, during prototyping): 5
generated / 3 matched, terminated `low_match_rate`. The matches were genuinely
strong leads with news citations, but two of the three were the same incident
under different entity names, and both unmatched candidates were LinkedIn
person-pages. So: FindAll works as primary, the merge step is mandatory, and
per-run yield is low — expect to run several FindAll rounds and/or lean on the
Exa fallback to fill a batch.

## Fallback path — Exa search

If FindAll's preview returns junk entities for this domain, or a run
completes with near-zero matches on sane conditions, fall back to Exa
(`bun findall.ts exa-search query.json`, needs `EXA_API_KEY`). Run one query
per angle, not one mega-query — e.g. for each region/month slice:
`{"query": "man arrested after high-speed chase <region> <month year> bodycam", "type": "auto", "numResults": 25, "category": "news", "startPublishedDate": "...", "endPublishedDate": "..."}`
with angle variants: pursuit/fled traffic stop, officer dragged/assaulted,
shooting arrest, standoff/barricade. Extract candidates from titles +
snippets; the full-text read happens in grade-case.

## Failure modes — read before discovering

- **FindAll is tuned for companies and people; "arrest incidents" is
  off-menu.** Preview is the cheap test of whether it can represent this
  entity type at all. Junk looks like: entities that are people-pages or
  department-pages rather than incidents, duplicate incidents under
  different names, or citations pointing at YouTube compilations instead of
  news articles. Junk preview → fall back, don't tune conditions forever.
- **Incidents don't dedupe like companies.** The same arrest surfaces as
  "Florida man flees stop" (Fox) and "Deputies arrest Lehigh Acres man"
  (NBC2) with no canonical URL. Before emitting, merge candidates that share
  suspect name + jurisdiction + compatible date; near-miss names are
  different people until an article ties them together.
- **Publish date is not incident date.** Search filters and FindAll
  conditions see publish dates; articles about old incidents republish, and
  fresh articles cover week-old arrests. The date-window condition must be
  about the incident, and grade-case re-checks it from article text.
- **Page 1 lies.** One search angle or one results page is not coverage.
  Sweep every angle and page you planned, then report totals: candidates
  found per angle, dropped as duplicates, dropped for no fetchable source.
- **Volume skew.** High-drama metros (Miami, Tampa, Orlando) dominate news
  search; a whole batch from one metro starves the others. Slice queries by
  region/county cluster so smaller departments — often the least-contested
  FOIA targets — surface at all.
- **Aggregator and compilation URLs.** Police1, YouTube, Reddit, and
  "crazy bodycam moments" roundups will match every query. A candidate's
  source must be a news article about the specific incident; aggregators are
  acceptable only as a pointer to find the original coverage.
