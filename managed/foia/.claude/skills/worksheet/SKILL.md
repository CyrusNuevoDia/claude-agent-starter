---
name: worksheet
description: Read and update the team's FOIA tracking spreadsheet (Requests / Departments / Batches tabs) through typed operations — append newly submitted requests, advance a request's status, mirror department portal facts, and record batch coverage. The sheet is the team's observability surface and the agent's database of record. It never marks a request Paid (payment is Henry's until auto-pay ships), never deletes rows, and never writes to tabs or fields outside the three-tab schema.
---

# worksheet

The spreadsheet ("FOIA Agent Worksheet") replaces the team's old
Sheet1/Received/Invoice workbook. Its schema lives in `schema.ts` in this
dir; `setup-sheet.ts` is the one-off that materialized it. Design rules the
schema encodes:

- **One row per request for its whole life.** Status changes; the row never
  moves or gets copied to another tab.
- **One type and meaning per field.** Invoice is a bare number, links each
  have their own column, everything else overflows into Notes.
- **Statuses are a strict vocabulary** (dropdown-enforced, validated by the
  script): `Sourced → Submitted → Invoiced → Paid → Received → Downloaded`,
  dead ends `Denied | No Record | Withdrawn`.
- **Request IDs are `YYYY-NNNNNNNN`** (8-digit counter), assigned by
  `append-request` — never by you.

## Operations

All ops run `worksheet.ts` (see the CLAUDE.md tool mapping) and print one
JSON line; failures exit 1 with `{"error": ...}` — fix the input and retry,
never work around a validation error.

- `overview` — tabs and content-row counts.
- `read <tab> [offset] [limit]` — rows as objects keyed by header, each with
  `_row` (its current sheet row number).
- `find <body>` — Requests rows where every given field equals the given
  value (whitespace/case-insensitive). Always pass at least one field.
- `append-request <body>` — new Requests row. Requires `Case` and
  `Department`; `Status` defaults to `Sourced`; `Request ID` and `Updated`
  are assigned. Returns the full row including the new ID.
- `update-request <body>` — body carries `"Request ID"` plus the fields to
  change; `Updated` is restamped. Unknown fields and bad statuses are
  rejected.
- `upsert-department <body>` — keyed by `Department` (loose match); updates
  the existing row (keeping its stored canonical name) or appends.
- `append-batch <body>` — one row per sourcing run, written once at the end
  of the batch with the same counts the batch report states.

## Who writes what

You own everything the pipeline produces: identity fields at append,
`Status` through `Submitted`/`Denied`/`No Record`, `Reference #`,
`Access Code`, `Portal`, `Invoice` + `Invoice Link` + `Status: Invoiced`
when an invoice surfaces, `Video`/`Received`/`Downloaded` when delivery
facts surface, and the Departments/Batches tabs. **`Paid` and
`Status: Paid` are Henry's** — record invoices, never payments — until the
team explicitly ships auto-pay to you. Humans also write `Notes` freely;
append to Notes, don't replace what a human wrote.

## Failure modes — read before writing

- **Reads return display strings, not values.** `Score` comes back as
  `"12"`, `Invoice` as `"$118.40"`, dates as `"2026-08-16"`. Parse before
  any comparison or arithmetic; never write the parsed-and-reformatted
  value back unless you're actually changing it.
- **Row numbers are not identities.** Humans sort and filter this sheet.
  `_row` is only valid for the call that returned it — re-`find` by
  `Request ID` before every update, and never store `_row` anywhere.
- **`update-request` saves whole cells.** Between your `find` and your
  update, a human may have edited the row; patch only the fields you mean
  to change and do it promptly — don't fetch, deliberate for ten minutes,
  then save.
- **An empty `find` query matches every row.** The script requires equality
  on the fields you pass; passing none returns everything. Suspect+
  Department is the working identity query; Request ID is the exact one.
- **Never append a second row for a lifecycle event.** An invoice arriving,
  video landing, or a denial is an `update-request` on the existing row —
  the old workbook's copy-the-row-per-stage habit is the disease this sheet
  cures.
- **The dropdown protects humans, the script protects you — from typos,
  not from wrong transitions.** Nothing stops `Downloaded → Sourced`.
  Status moves forward or to a dead end; if you believe a row needs to move
  backward, that's a note for the team, not a write.
- **No credentials or pasted page text in any cell.** The old sheet had
  portal passwords sitting in an amount column. Cells carry facts you
  distilled (verbatim-quote-backed), links, and numbers — never fetched-page
  prose, never login secrets, never the standing identity's password.
- **Department names must be canonical before they hit the sheet.**
  `upsert-department` keeps the stored name on update, so a sloppy variant
  won't clobber it — but a *first* write with a sloppy name becomes the
  canon. Resolve through the lookup-portal skill first, then mirror here.
- **The sheet and the batch report must agree.** The Batches row's counts
  are the same numbers as the report's summary block. If they differ,
  something was dropped — find it before emitting.
