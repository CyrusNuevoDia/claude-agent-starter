// Deterministic scorer for rubric grades. The grader model judges; this sums.
// Usage: bun score.ts <grades.json>   (or pipe JSON on stdin)
// Input shape:
//   {
//     "grades": {
//       "narrative_arc":    { "grade": 1-4, "evidence": "verbatim quote" },
//       "charge_severity":  { "grade": 1-4, "evidence": "..." },
//       "action_intensity": { "grade": 1-4, "evidence": "..." },
//       "bodycam_evidence": { "grade": 1-4, "evidence": "..." }
//     },
//     "disqualifiers": [ { "id": "case_open", "evidence": "..." } ]
//   }
// Output (stdout, always exactly one line): {"score": <0 or 4-16>}
// Validation failures exit 1 with the reason on stderr — fix the grader
// output and rerun; never hand-compute a score around a validation error.

const CRITERIA = [
  "narrative_arc",
  "charge_severity",
  "action_intensity",
  "bodycam_evidence",
] as const;

const DISQUALIFIERS = new Set([
  "no_jurisdiction",
  "case_open",
  "unusable_footage",
]);

function fail(msg: string): never {
  console.error(`invalid grader output: ${msg}`);
  process.exit(1);
}

import { file, stdin } from "bun";

const raw = process.argv[2]
  ? await file(process.argv[2]).text()
  : await new Response(stdin.stream()).text();

let input: unknown;
try {
  input = JSON.parse(raw);
} catch (e) {
  fail(`not JSON (${e})`);
}
if (typeof input !== "object" || input === null) {
  fail("top level must be an object");
}
const { grades, disqualifiers } = input as Record<string, unknown>;

if (typeof grades !== "object" || grades === null) {
  fail("missing 'grades' object");
}
const gradeMap = grades as Record<string, unknown>;
for (const key of Object.keys(gradeMap)) {
  if (!(CRITERIA as readonly string[]).includes(key)) {
    fail(`unknown criterion '${key}'`);
  }
}

let sum = 0;
for (const criterion of CRITERIA) {
  const entry = gradeMap[criterion];
  if (typeof entry !== "object" || entry === null) {
    fail(`missing criterion '${criterion}'`);
  }
  const { grade, evidence } = entry as Record<string, unknown>;
  if (
    !Number.isInteger(grade) ||
    (grade as number) < 1 ||
    (grade as number) > 4
  ) {
    fail(
      `'${criterion}'.grade must be an integer 1-4, got ${JSON.stringify(grade)}`
    );
  }
  if (typeof evidence !== "string" || evidence.trim().length < 5) {
    fail(`'${criterion}'.evidence must be a verbatim quote (min 5 chars)`);
  }
  sum += grade as number;
}

if (!Array.isArray(disqualifiers)) {
  fail("'disqualifiers' must be an array (use [] for none)");
}
for (const d of disqualifiers) {
  if (typeof d !== "object" || d === null) {
    fail("each disqualifier must be an object");
  }
  const { id, evidence } = d as Record<string, unknown>;
  if (typeof id !== "string" || !DISQUALIFIERS.has(id)) {
    fail(`unknown disqualifier id ${JSON.stringify(id)}`);
  }
  if (typeof evidence !== "string" || evidence.trim().length < 5) {
    fail(`disqualifier '${id}' needs evidence`);
  }
}

console.log(JSON.stringify({ score: disqualifiers.length > 0 ? 0 : sum }));
