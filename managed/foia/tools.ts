import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { CustomToolSpec } from "@/lib/claude-managed-agent.ts";

// Validates this agent's env requirements at load time (fail fast, not
// mid-batch); the spawned skill scripts inherit the loaded process.env.
import "./env.ts";

// Handlers run in *this* process (repo checkout; bun auto-loads .env for the
// spawned scripts) and shell out to the exact scripts the prototype
// exercised — the deployed sandbox has neither the API keys nor these
// scripts on a guaranteed runtime.

const REPO_ROOT = new URL("../..", import.meta.url).pathname;
const FINDALL = "managed/foia/.claude/skills/find-cases/findall.ts";
const SCORE = "managed/foia/.claude/skills/grade-case/score.ts";
const BROWSER_TASK =
  "managed/foia/.claude/skills/submit-request/browser-task.ts";
const WORKSHEET = "managed/foia/.claude/skills/worksheet/worksheet.ts";

function runScript(
  script: string,
  args: string[],
  stdinText?: string
): Promise<string> {
  // spawn is callback-based, so the promise has to be constructed here.
  // oxlint-disable-next-line promise/avoid-new
  return new Promise((resolve) => {
    const proc = spawn("bun", [script, ...args], {
      cwd: REPO_ROOT,
      stdio: [stdinText === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    proc.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    proc.on("error", (err) => resolve(JSON.stringify({ error: String(err) })));
    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        resolve(JSON.stringify({ error: stderr.trim() || `exit ${code}` }));
      }
    });
    if (stdinText !== undefined && proc.stdin) {
      proc.stdin.write(stdinText);
      proc.stdin.end();
    }
  });
}

async function runWithBodyFile(
  script: string,
  subcommand: string,
  body: unknown
) {
  const dir = join(REPO_ROOT, "managed/foia/.tool-io");
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${subcommand}-${randomUUID()}.json`);
  await writeFile(path, JSON.stringify(body));
  try {
    return await runScript(script, [subcommand, path]);
  } finally {
    await unlink(path).catch(() => {
      // The body file is scratch; a failed cleanup must not fail the tool.
    });
  }
}

export const tools: CustomToolSpec[] = [
  {
    description:
      "Fetch the full text of one or more web pages (news articles, records-request portal pages) via the Exa /contents API. Use this for every article you grade — never grade from a headline or snippet — and to verify a portal URL currently serves a records-request page. Returns Exa's JSON: results[] with url, title, and text. Empty text for a URL means the fetch failed for it; report it as a fetch failure rather than guessing.",
    handler: (input) =>
      runWithBodyFile(FINDALL, "exa-contents", {
        text: true,
        urls: input.urls,
      }),
    input_schema: {
      properties: {
        urls: {
          description: "Absolute URLs to fetch (batch related URLs together).",
          items: { type: "string" },
          type: "array",
        },
      },
      required: ["urls"],
      type: "object",
    },
    name: "exa_fetch_articles",
  },
  {
    description:
      "Web search via the Exa /search API. Use for the find-cases fallback path (news-article discovery, one query per angle/region slice) and for the lookup-portal web-search fallback on a cache miss. Body is passed through verbatim, so include type/numResults/category/date filters as the skill specifies. Returns Exa's JSON search results.",
    handler: (input) => runWithBodyFile(FINDALL, "exa-search", input.body),
    input_schema: {
      properties: {
        body: {
          description:
            'Raw Exa /search request body, e.g. {"query": "...", "type": "auto", "numResults": 25, "category": "news"}.',
          type: "object",
        },
      },
      required: ["body"],
      type: "object",
    },
    name: "exa_search",
  },
  {
    description:
      "Operate Parallel FindAll runs for the find-cases primary path. op=create takes a full schema body (objective, entity_type, match_conditions, generator, match_limit) and returns a findall_id; op=status polls a run; op=result fetches the candidate snapshot. Runs take minutes — create, do other batch work, poll, then fetch. Always run generator 'preview' before a paid base/core run.",
    handler: (input) => {
      if (input.op === "create") {
        return runWithBodyFile(FINDALL, "create", input.schema);
      }
      return runScript(FINDALL, [String(input.op), String(input.findall_id)]);
    },
    input_schema: {
      properties: {
        findall_id: {
          description: "For op=status / op=result: the run id.",
          type: "string",
        },
        op: { enum: ["create", "status", "result"], type: "string" },
        schema: {
          description: "For op=create: the FindAll run schema body.",
          type: "object",
        },
      },
      required: ["op"],
      type: "object",
    },
    name: "findall_run",
  },
  {
    description:
      "Operate Browser Use cloud browser-agent runs for the submit-request skill. op=run takes a raw v4 RunCreateRequest body (task text, model, maxCostUsd — always set maxCostUsd) and returns a run id; op=status polls; op=get returns the full run with its result; op=events returns the step-by-step browser actions (read these before trusting any dry_run or after any ambiguous live run); op=cancel stops a run. Task text may reference {{PORTAL_LOGIN_EMAIL}}/{{PORTAL_LOGIN_PASSWORD}} — the script substitutes the real standing-identity credentials from the environment at send time; never put literal credentials in the task text. Portal submissions only, per the submit-request skill's modes and no-double-submission rule.",
    handler: (input) => {
      if (input.op === "run") {
        return runWithBodyFile(BROWSER_TASK, "run", input.body);
      }
      return runScript(BROWSER_TASK, [String(input.op), String(input.run_id)]);
    },
    input_schema: {
      properties: {
        body: {
          description:
            "For op=run: the raw Browser Use v4 RunCreateRequest body.",
          type: "object",
        },
        op: {
          enum: ["run", "get", "status", "events", "cancel"],
          type: "string",
        },
        run_id: {
          description: "For op=status/get/events/cancel: the run id.",
          type: "string",
        },
      },
      required: ["op"],
      type: "object",
    },
    name: "browser_submit_run",
  },
  {
    description:
      'Typed operations on the team\'s FOIA tracking spreadsheet (Requests/Departments/Batches), per the worksheet skill. op=overview lists tabs; op=read pages a tab (args: tab, offset, limit); op=find matches Requests rows by field equality (body = the query); op=append-request adds a request row (assigns the Request ID — never invent one); op=update-request patches a row (body carries "Request ID" + changed fields); op=upsert-department mirrors a resolved department; op=append-batch records a sourcing run. One JSON line back; {"error": ...} means fix the input and retry, never work around validation.',
    handler: (input) => {
      if (input.op === "overview") {
        return runScript(WORKSHEET, ["overview"]);
      }
      if (input.op === "read") {
        return runScript(WORKSHEET, [
          "read",
          String(input.tab ?? "Requests"),
          String(input.offset ?? 0),
          String(input.limit ?? 100),
        ]);
      }
      return runWithBodyFile(WORKSHEET, String(input.op), input.body);
    },
    input_schema: {
      properties: {
        body: {
          description:
            "For find/append-request/update-request/upsert-department/append-batch: the operation's JSON body, fields keyed by exact column header.",
          type: "object",
        },
        limit: {
          description: "For op=read: max rows (default 100).",
          type: "number",
        },
        offset: { description: "For op=read: rows to skip.", type: "number" },
        op: {
          enum: [
            "overview",
            "read",
            "find",
            "append-request",
            "update-request",
            "upsert-department",
            "append-batch",
          ],
          type: "string",
        },
        tab: {
          description:
            "For op=read: Requests (default), Departments, or Batches.",
          type: "string",
        },
      },
      required: ["op"],
      type: "object",
    },
    name: "worksheet_run",
  },
  {
    description:
      'Deterministically score one graded case by running the grade-case skill\'s score.ts validator. Input is the grades/disqualifiers JSON exactly as the rubric specifies (four criteria graded 1-4 with verbatim evidence, disqualifiers array). Returns {"score": N} (0 when disqualified, else the 4-16 sum) or {"error": ...} when the grader JSON is malformed — fix the JSON and call again; never hand-compute a score around a validation error.',
    handler: (input) =>
      runScript(
        SCORE,
        [],
        JSON.stringify({
          disqualifiers: input.disqualifiers,
          grades: input.grades,
        })
      ),
    input_schema: {
      properties: {
        disqualifiers: {
          description: "Array of {id, evidence}; empty array when none apply.",
          items: { type: "object" },
          type: "array",
        },
        grades: {
          description:
            "Map of narrative_arc / charge_severity / action_intensity / bodycam_evidence to {grade, evidence}.",
          type: "object",
        },
      },
      required: ["grades", "disqualifiers"],
      type: "object",
    },
    name: "score_case",
  },
];
