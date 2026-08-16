// Typed operations on the FOIA tracking spreadsheet (Requests / Departments /
// Batches). The sheet's structure is defined by setup-sheet.ts in this dir.
//
//   bun worksheet.ts overview
//   bun worksheet.ts read <tab> [offset] [limit]
//   bun worksheet.ts find <body.json|stdin>              equality match on Requests
//   bun worksheet.ts append-request <body.json|stdin>    assigns Request ID
//   bun worksheet.ts update-request <body.json|stdin>    body carries "Request ID" + patch
//   bun worksheet.ts upsert-department <body.json|stdin> keyed by Department
//   bun worksheet.ts append-batch <body.json|stdin>
//
// Requires FOIA_SHEET_ID and GOOGLE_SA_KEY_FILE in the environment. All
// output is a single JSON line; errors exit 1 with JSON {"error": ...}.

import { readFileSync } from "node:fs";

import { JWT } from "google-auth-library";
import { GoogleSpreadsheet } from "google-spreadsheet";

import {
  BATCH_HEADERS,
  DEPARTMENT_HEADERS,
  REQUEST_HEADERS,
  STATUSES,
} from "./schema.ts";

const SHEET_ID = process.env.FOIA_SHEET_ID ?? "";
const KEY_FILE = process.env.GOOGLE_SA_KEY_FILE ?? "";

function die(error: string): never {
  console.error(JSON.stringify({ error }));
  process.exit(1);
}

if (!(SHEET_ID && KEY_FILE)) {
  die("FOIA_SHEET_ID and GOOGLE_SA_KEY_FILE must be set");
}

const creds = JSON.parse(readFileSync(KEY_FILE, "utf-8"));
const doc = new GoogleSpreadsheet(
  SHEET_ID,
  new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })
);
await doc.loadInfo();

const TAB_HEADERS: Record<string, readonly string[]> = {
  Batches: BATCH_HEADERS,
  Departments: DEPARTMENT_HEADERS,
  Requests: REQUEST_HEADERS,
};

function tab(title: string) {
  const sheet = doc.sheetsByTitle[title];
  if (!sheet) {
    die(
      `no tab "${title}" (have: ${doc.sheetsByIndex.map((s) => s.title).join(", ")})`
    );
  }
  return sheet;
}

function checkFields(tabTitle: string, body: Record<string, unknown>) {
  const headers = TAB_HEADERS[tabTitle];
  for (const key of Object.keys(body)) {
    if (!headers.includes(key)) {
      die(
        `unknown ${tabTitle} field "${key}" (headers: ${headers.join(", ")})`
      );
    }
  }
  if (
    "Status" in body &&
    // SAFETY: widening the literal tuple to check membership of a caller value.
    !(STATUSES as readonly string[]).includes(String(body.Status))
  ) {
    die(`invalid Status "${body.Status}" (one of: ${STATUSES.join(", ")})`);
  }
}

const norm = (v: unknown) =>
  String(v ?? "")
    .replaceAll(/\s+/gu, " ")
    .trim()
    .toLowerCase();

const today = () => new Date().toISOString().slice(0, 10);

async function readBody(): Promise<Record<string, unknown>> {
  const raw = process.argv[3]
    ? readFileSync(process.argv[3], "utf-8")
    : await new Response(Bun.stdin.stream()).text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    die(`body is not JSON (${error})`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    die("body must be a JSON object");
  }
  // SAFETY: the guard above exited unless `parsed` is a non-null, non-array
  // object.
  return parsed as Record<string, unknown>;
}

const [op] = process.argv.slice(2);

switch (op) {
  case "overview": {
    const tabs = [];
    for (const s of doc.sheetsByIndex) {
      // Sequential on purpose: the Sheets API rate-limits per-spreadsheet
      // reads, and this loop runs once per tab.
      // oxlint-disable-next-line eslint/no-await-in-loop
      const rows = await s.getRows();
      tabs.push({ contentRows: rows.length, tab: s.title });
    }
    console.log(JSON.stringify({ spreadsheet: doc.title, tabs }));
    break;
  }

  case "read": {
    const sheet = tab(process.argv[3] ?? "Requests");
    const offset = Number(process.argv[4] ?? 0);
    const limit = Number(process.argv[5] ?? 100);
    const rows = await sheet.getRows({ limit, offset });
    console.log(
      JSON.stringify({
        offset,
        returned: rows.length,
        rows: rows.map((r) => ({ _row: r.rowNumber, ...r.toObject() })),
      })
    );
    break;
  }

  case "find": {
    const query = await readBody();
    checkFields("Requests", query);
    const rows = await tab("Requests").getRows();
    const matches = rows.filter((r) =>
      Object.entries(query).every(([k, v]) => norm(r.get(k)) === norm(v))
    );
    console.log(
      JSON.stringify({
        matched: matches.length,
        rows: matches.map((r) => ({ _row: r.rowNumber, ...r.toObject() })),
      })
    );
    break;
  }

  case "append-request": {
    const body = await readBody();
    if ("Request ID" in body || "Updated" in body) {
      die("Request ID and Updated are assigned by this script — omit them");
    }
    checkFields("Requests", body);
    if (!(body.Case && body.Department)) {
      die("append-request requires at least Case and Department");
    }
    body.Status ??= "Sourced";
    const sheet = tab("Requests");
    const rows = await sheet.getRows();
    const year = new Date().getFullYear();
    const counters = rows
      .map((r) => String(r.get("Request ID") ?? ""))
      .filter((id) => id.startsWith(`${year}-`))
      // parseInt, not Number: it stops at the first non-digit instead of
      // turning a hand-edited Request ID into NaN.
      // oxlint-disable-next-line unicorn/prefer-number-coercion
      .map((id) => Number.parseInt(id.slice(5), 10))
      .filter(Number.isFinite);
    const next = (counters.length ? Math.max(...counters) : 0) + 1;
    body["Request ID"] = `${year}-${String(next).padStart(8, "0")}`;
    body.Updated = today();
    // SAFETY: readBody validated the payload against the tab's header
    // schema, whose fields are all scalar cells.
    const added = await sheet.addRow(body as Record<string, string | number>);
    console.log(JSON.stringify({ _row: added.rowNumber, ...added.toObject() }));
    break;
  }

  case "update-request": {
    const body = await readBody();
    const id = String(body["Request ID"] ?? "");
    if (!id) {
      die('update-request body needs "Request ID"');
    }
    const patch = { ...body };
    delete patch["Request ID"];
    checkFields("Requests", patch);
    const rows = await tab("Requests").getRows();
    const row = rows.find((r) => norm(r.get("Request ID")) === norm(id));
    if (!row) {
      die(`no Requests row with Request ID "${id}"`);
    }
    // SAFETY: readBody validated the payload against the tab's header
    // schema, whose fields are all scalar cells.
    row.assign({ ...patch, Updated: today() } as Record<
      string,
      string | number
    >);
    await row.save();
    console.log(JSON.stringify({ _row: row.rowNumber, ...row.toObject() }));
    break;
  }

  case "upsert-department": {
    const body = await readBody();
    checkFields("Departments", body);
    if (!body.Department) {
      die('upsert-department body needs "Department"');
    }
    const sheet = tab("Departments");
    const rows = await sheet.getRows();
    const existing = rows.find(
      (r) => norm(r.get("Department")) === norm(body.Department)
    );
    if (existing) {
      // keep the stored canonical name — the caller's key may be a loose match
      // SAFETY: readBody validated the payload against the tab's header
      // schema, whose fields are all scalar cells.
      existing.assign({
        ...body,
        Department: existing.get("Department"),
      } as Record<string, string | number>);
      await existing.save();
      console.log(
        JSON.stringify({
          _row: existing.rowNumber,
          updated: true,
          ...existing.toObject(),
        })
      );
    } else {
      // SAFETY: readBody validated the payload against the tab's header
      // schema, whose fields are all scalar cells.
      const added = await sheet.addRow(body as Record<string, string | number>);
      console.log(
        JSON.stringify({
          _row: added.rowNumber,
          updated: false,
          ...added.toObject(),
        })
      );
    }
    break;
  }

  case "append-batch": {
    const body = await readBody();
    checkFields("Batches", body);
    if (!body.Batch) {
      die('append-batch body needs "Batch"');
    }
    // SAFETY: readBody validated the payload against the tab's header
    // schema, whose fields are all scalar cells.
    const added = await tab("Batches").addRow(
      body as Record<string, string | number>
    );
    console.log(JSON.stringify({ _row: added.rowNumber, ...added.toObject() }));
    break;
  }

  default: {
    die(
      "usage: bun worksheet.ts overview|read|find|append-request|update-request|upsert-department|append-batch"
    );
  }
}
