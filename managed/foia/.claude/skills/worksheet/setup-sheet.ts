// One-off: build the FOIA tracking sheet's structure (tabs, headers,
// validation, formats). Safe to re-run only on a blank/fresh spreadsheet —
// it renames the first tab and overwrites header rows. Kept here as the
// schema-as-code record for the worksheet skill.
//
//   FOIA_SHEET_ID=<id> bun setup-sheet.ts
//
// Auth: GOOGLE_SA_KEY_FILE (path to service-account JSON key).

import { readFileSync } from "node:fs";

import { JWT } from "google-auth-library";

import {
  BATCH_HEADERS,
  DEPARTMENT_HEADERS,
  REQUEST_HEADERS,
  STATUSES,
} from "./schema.ts";

const SHEET_ID = process.env.FOIA_SHEET_ID ?? "";
const KEY_FILE = process.env.GOOGLE_SA_KEY_FILE ?? "";
if (!(SHEET_ID && KEY_FILE)) {
  console.error("FOIA_SHEET_ID and GOOGLE_SA_KEY_FILE must be set");
  process.exit(1);
}

const creds = JSON.parse(readFileSync(KEY_FILE, "utf-8"));
const auth = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const { token } = await auth.getAccessToken();
const BASE = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;

async function api(path: string, method: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error(JSON.stringify(json, null, 2));
    process.exit(1);
  }
  return json;
}

const REQUESTS = 0; // the spreadsheet's original first tab, renamed
const DEPARTMENTS = 100;
const BATCHES = 200;

// Status → header row color family for at-a-glance state
const STATUS_COLORS: Record<
  string,
  { red: number; green: number; blue: number }
> = {
  Denied: { blue: 0.85, green: 0.85, red: 0.96 },
  Downloaded: { blue: 0.8, green: 0.92, red: 0.8 },
  Invoiced: { blue: 0.75, green: 0.93, red: 1 },
  "No Record": { blue: 0.85, green: 0.85, red: 0.96 },
  Paid: { blue: 0.88, green: 0.95, red: 0.85 },
  Received: { blue: 0.84, green: 0.94, red: 0.84 },
  Sourced: { blue: 0.93, green: 0.93, red: 0.93 },
  Submitted: { blue: 0.98, green: 0.93, red: 0.85 },
  Withdrawn: { blue: 0.9, green: 0.9, red: 0.9 },
};

function headerRow(sheetId: number, headers: readonly string[]) {
  return {
    updateCells: {
      fields: "userEnteredValue,userEnteredFormat",
      rows: [
        {
          values: headers.map((h) => ({
            userEnteredFormat: {
              backgroundColor: { blue: 0.2, green: 0.17, red: 0.15 },
              textFormat: {
                bold: true,
                foregroundColor: { blue: 1, green: 1, red: 1 },
              },
            },
            userEnteredValue: { stringValue: h },
          })),
        },
      ],
      start: { columnIndex: 0, rowIndex: 0, sheetId },
    },
  };
}

function columnFormat(col: number, pattern: { type: string; pattern: string }) {
  return {
    repeatCell: {
      cell: { userEnteredFormat: { numberFormat: pattern } },
      fields: "userEnteredFormat.numberFormat",
      range: {
        endColumnIndex: col + 1,
        sheetId: REQUESTS,
        startColumnIndex: col,
        startRowIndex: 1,
      },
    },
  };
}

const info = await api("?fields=sheets.properties", "GET");
const firstSheet = info.sheets[0].properties;

const widths: [number, number][] = [
  [0, 110], // Status
  [1, 160], // Suspect
  [2, 320], // Case
  [3, 150], // Location
  [4, 110], // Incident Date
  [5, 230], // Department
  [6, 60], // Score
  [7, 110], // Submitted
  [8, 150], // Reference #
  [9, 95], // Invoice
  [10, 110], // Paid
  [11, 200], // Video
  [12, 260], // Notes
  [13, 340], // Description
  [14, 220], // Charges
  [15, 200], // Article
  [16, 200], // Portal
  [17, 110], // Access Code
  [18, 200], // Invoice Link
  [19, 130], // Batch
  [20, 125], // Request ID
  [21, 110], // Updated
];

await api(":batchUpdate", "POST", {
  requests: [
    {
      updateSheetProperties: {
        fields:
          "title,gridProperties.frozenRowCount,gridProperties.columnCount,sheetId,index",
        properties: {
          gridProperties: {
            columnCount: REQUEST_HEADERS.length,
            frozenRowCount: 1,
          },
          index: 0,
          sheetId: REQUESTS,
          title: "Requests",
        },
      },
    },
    {
      addSheet: {
        properties: {
          gridProperties: {
            columnCount: DEPARTMENT_HEADERS.length,
            frozenRowCount: 1,
            rowCount: 1000,
          },
          index: 1,
          sheetId: DEPARTMENTS,
          title: "Departments",
        },
      },
    },
    {
      addSheet: {
        properties: {
          gridProperties: {
            columnCount: BATCH_HEADERS.length,
            frozenRowCount: 1,
            rowCount: 1000,
          },
          index: 2,
          sheetId: BATCHES,
          title: "Batches",
        },
      },
    },
    headerRow(REQUESTS, REQUEST_HEADERS),
    headerRow(DEPARTMENTS, DEPARTMENT_HEADERS),
    headerRow(BATCHES, BATCH_HEADERS),
    // Status dropdown (strict, with UI)
    {
      setDataValidation: {
        range: {
          endColumnIndex: 1,
          sheetId: REQUESTS,
          startColumnIndex: 0,
          startRowIndex: 1,
        },
        rule: {
          condition: {
            type: "ONE_OF_LIST",
            values: STATUSES.map((s) => ({ userEnteredValue: s })),
          },
          showCustomUi: true,
          strict: true,
        },
      },
    },
    // Typed columns: dates, score, currency
    columnFormat(4, { pattern: "yyyy-mm-dd", type: "DATE" }), // Incident Date
    columnFormat(7, { pattern: "yyyy-mm-dd", type: "DATE" }), // Submitted
    columnFormat(6, { pattern: "0", type: "NUMBER" }), // Score
    columnFormat(9, { pattern: "$#,##0.00", type: "CURRENCY" }), // Invoice
    columnFormat(10, { pattern: "yyyy-mm-dd", type: "DATE" }), // Paid
    columnFormat(21, { pattern: "yyyy-mm-dd", type: "DATE" }), // Updated
    // Row tinting by status
    ...STATUSES.map((status, i) => ({
      addConditionalFormatRule: {
        index: i,
        rule: {
          booleanRule: {
            condition: {
              type: "CUSTOM_FORMULA",
              values: [{ userEnteredValue: `=$A2="${status}"` }],
            },
            format: { backgroundColor: STATUS_COLORS[status] },
          },
          ranges: [
            {
              endColumnIndex: REQUEST_HEADERS.length,
              sheetId: REQUESTS,
              startColumnIndex: 0,
              startRowIndex: 1,
            },
          ],
        },
      },
    })),
    // Column widths
    ...widths.map(([col, px]) => ({
      updateDimensionProperties: {
        fields: "pixelSize",
        properties: { pixelSize: px },
        range: {
          dimension: "COLUMNS",
          endIndex: col + 1,
          sheetId: REQUESTS,
          startIndex: col,
        },
      },
    })),
  ],
});

console.log(
  `structured ${SHEET_ID}: Requests (was "${firstSheet.title}"), Departments, Batches`
);
