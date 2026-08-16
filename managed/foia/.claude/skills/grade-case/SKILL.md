---
name: grade-case
description: Grade one candidate case against the Origin Media rubric — read the source article, grade four criteria 1–4 with verbatim quotes, check disqualifiers, and compute the score with score.ts. Grades and cites only; it does not decide whether to submit a request, and it does not check for duplicates or competitor coverage.
---

# grade-case

Input: one candidate (suspect, incident summary, source article URL(s)).
Output: the grades/disqualifiers JSON plus the `{ score }` from `score.ts`.

## Procedure

1. Fetch the full article text (Exa `/contents` with `"text": true`; fall back
   to a direct fetch if Exa returns empty text). If every source URL fails,
   report the candidate as a fetch failure — do not grade from snippets.
2. Read `rubric.md` (in this skill's directory). Grade the four criteria
   against its level definitions, copying a verbatim quote for each grade.
3. Check every disqualifier the rubric lists, each with verbatim evidence
   (for `no_jurisdiction` and `not_traffic_stop`, a one-line statement of
   what's missing is acceptable). Note the `nighttime` exception rule — an
   INSANE, demonstrably well-lit nighttime case is kept, with the exception
   recorded in notes.
4. Write the JSON to a file and run:
   `bun <this-skill-dir>/score.ts grades.json`
   The single line it prints — `{"score": N}` — is the case's score.
5. If `score.ts` exits non-zero, your JSON is malformed; fix the grader
   output and rerun. Never hand-compute a score around a validation error.

## Failure modes — read before grading

- **Paraphrase dressed as evidence.** "Suspect was violent" is your summary,
  not evidence. Evidence is characters copied from the article. If you can't
  find a quote supporting a grade, the grade is lower than you think.
- **Grading from the headline or search snippet.** Headlines oversell;
  "VIDEO:" in a headline does not mean bodycam exists (it's often aerial or
  bystander video). Grade `bodycam_evidence` above 2 only when body-worn or
  dash camera recording is explicitly referenced in the body text or shown.
- **Inference presented as fact.** Sub-model extractors and your own reading
  will infer ("charges suggest a pursuit occurred"). An inference can inform
  which grade band you check, but the evidence quote must state the fact.
- **Confusing low-quality with disqualified.** A boring, cooperative DUI
  arrest scores 4–6; it is NOT disqualified. Disqualifiers are structural (no
  agency to file against, case still open, footage shown but unwatchable) —
  never a synonym for "bad case". Low scores rank to the bottom on their own.
- **Missing `drug_related` on stops that turned into busts.** The team's rule
  is absolute — "ABSOLUTELY NO DRUG RELATED ARRESTS" — and the common miss is
  a routine traffic stop where the search found narcotics. Scan the charges
  list for possession/trafficking before grading anything else; a
  high-scoring pursuit still zeroes if drugs were part of the arrest.
- **Missing `case_open` on recent incidents.** Local news reports arrests
  within days, long before cases close. Phrases like "charges are pending",
  "the investigation remains active/ongoing", "detectives are still
  interviewing" trip `case_open`. So does an incident date inside the run's
  exclusion window. Silence about case status on an old incident is fine;
  silence on a weeks-old incident is not — check for follow-up coverage
  before assuming closed.
- **One incident, two suspects → one row each.** If an article covers
  multiple arrestees in one incident, grade the incident once but emit one
  row per suspect only when charges differ materially; otherwise a single
  row listing all suspects, matching how the team's datasheet does it.
- **Computing the sum in-head.** Even when the arithmetic is obvious, run
  `score.ts`. The validation (grade ranges, evidence presence, known
  disqualifier ids) is the point, not the addition.
- **Grading the case you wish you had.** The SOP's alligator example failed
  not because the story was small but because there was no police
  interaction to request footage of. When the exciting part of the story
  happened off-camera or before police arrived, `bodycam_evidence` and
  `no_jurisdiction` are where that shows up — be strict there.
