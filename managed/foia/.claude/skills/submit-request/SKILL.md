---
name: submit-request
description: Submit one qualified case's public-records request through the department's online portal by driving a Browser Use cloud browser agent, registering or signing in with Origin's standing portal identity when the portal requires an account, and capture the portal's confirmation/reference number. Portal submissions only — it does not pay invoices, respond to department follow-ups, or send email requests (email-only departments are reported as skipped, not submitted).
---

# submit-request

Input: one graded case row (already past the score filter) with a resolved
`portalURL`, plus the requester contact fields Origin designates (at minimum
`requesterEmail` — invoices and status updates arrive there). Output: the
submission record JSON below.

## Modes

- **`dry_run`** (default): the browser agent walks the portal to the filled
  form and stops — it must never click a final Submit. Use for new portals,
  new vendors, and any case where the form recon is stale.
- **`live`**: actually submits. One live run per case, ever, unless a human
  explicitly clears a retry (see failure modes — double-submission is the
  expensive mistake).

## Procedure

1. **Preconditions.** The case has `portalURL` (email-only departments:
   return `{"status": "skipped_email_only"}` — the email path is not built).
   The portal URL was verified by lookup-portal this batch.
2. **Compose the request text** from the row's fields with this template
   (standard public-records BWC request; replace with Origin's own template
   verbatim when they provide it — theirs is ripped from proven competitor
   requests and takes precedence the moment it lands in this skill dir):

   > Pursuant to the applicable public records law, I request copies of all
   > body-worn camera and dash camera footage related to the arrest of
   > {suspect} on or about {incidentDate} in {cityState}, involving
   > {department} (charges: {charges}). {one-sentence incident description}.
   > Please advise of any fees before processing; this request is for
   > footage in electronic format.

3. **Create the browser task** with `browser-task.ts run` (body:
   `{"task": ..., "model": "gpt-5.6-luna", "maxCostUsd": 2}`). The task text
   given to the browser agent must state, in this order: the portal URL; the
   mode (and for dry_run, the literal instruction "you must NOT click any
   final Submit button"); the request type to select (body-worn camera /
   police records); every field value to enter; which fields to leave blank
   (requester name and address whenever the form accepts blanks — ~95% of
   portals do, and anonymous is the standard practice); and the exact JSON
   shape to return.
4. **Poll** `status <run_id>` until terminal; on anything other than a clean
   finish, pull `events <run_id>` before deciding anything.
5. **Verify before recording.** A live submission is `submitted` only when
   the browser agent returns a confirmation/reference number (or
   confirmation-page text) **quoted from the page**. No visible
   confirmation → `status: "unconfirmed"`, never `submitted`.

## Output record

```
{"caseSuspect": "...", "department": "...", "portalURL": "...", "mode": "dry_run|live", "status": "submitted|dry_run_ok|blocked|skipped_email_only|unconfirmed|failed", "referenceNumber": "<verbatim from confirmation page, or null>", "confirmationQuote": "<verbatim page text, or null>", "blockers": ["account_required|captcha|payment_upfront|form_not_found|..."], "browserRunId": "...", "costUsd": <from the run object>, "accountCreated": <true only when this run registered a new portal account, else omit>, "notes": "..."}
```

## Vendor notes — observed by live recon during prototyping

- **GovQA** (Lee County SO observed): anonymous request form exists
  (`RequestOpen.aspx?anon=1&rqst=...` behind "Submit Request" → "Public
  Records Request"), no account needed, requester name optional. A BotDetect
  image CAPTCHA is required — the browser agent read and completed it in a
  dry run when instructed to (see the CAPTCHA failure mode below), but GovQA
  offers no way to validate the answer short of submitting, so solve
  correctness is only proven on a live submit. Required fields: "I am a"
  dropdown, "Describe the Record(s) Requested", "Preferred Method to Receive
  Records". Involved-party name/DOB fields carry the case's suspect data.
  Assume other GovQA tenants vary — recon each tenant once and record it in
  the portal map.
- **NextRequest** (Dayton PD observed): no account, **no CAPTCHA**, but the
  form hard-requires requester Name, Phone, Street address, City, State,
  ZIP even though the portal displays an anonymous-requests notice — the
  team's "~95% leave name blank" claim does not hold here. No request-type
  selector: pick the police department in the Departments dropdown and
  describe the bodycam footage in the description. Submit button stays
  disabled until required fields are filled (which makes half-filled dry
  runs mechanically safe).
- **JustFOIA** (seen in the team's datasheet, not yet recon'd live): issues
  a per-request **access code** to anonymous requesters for status checks —
  no account needed. Capture any access code the confirmation page shows
  into the submission record (`accessCode` field alongside
  `referenceNumber`); losing it means losing anonymous status access.
- The recon that produced these notes is the pattern to repeat: a
  `dry_run` browser task that maps the form and returns structured
  findings. Persist each portal's recon into its portal-map entry (a
  `submission` object: accountRequired, captcha, anonymousOk, direct form
  URL, required fields) so live runs stop rediscovering it.
- **Safe testing data**: the team's datasheet holds real submitted requests
  with reference numbers (e.g. GovQA `P276151-060226` at Lee County,
  NextRequest `26-2897` at Dayton, JustFOIA `PRR-2026-2128` with access
  code) — status-check flows can be exercised against these without filing
  anything new.

## Failure modes — read before submitting

- **The browser agent claims success without proof.** Sub-agents report
  "request submitted successfully" when they saw a spinner. `submitted`
  requires a verbatim confirmation number or confirmation-page quote in the
  agent's returned JSON. Anything less is `unconfirmed` — and an
  `unconfirmed` case goes to a human, because the request may or may not
  exist on the department's side.
- **Double submission.** Portals dedupe nothing; a retry after a timeout can
  file the same request twice and annoy the exact department relationship
  the team is protecting. After any ambiguous live run, read `events` to
  see how far the agent got before deciding — and never re-run live on the
  same case without a human clearing it.
- **Dry-run leakage.** A browser agent told to "fill the form" will
  sometimes helpfully submit it. The no-submit instruction must be the
  loudest line in the task text, and after a dry run, check `events` for
  submit-shaped clicks before trusting `dry_run_ok`.
- **Account walls: register or sign in with the standing identity.** Many
  GovQA tenants require registration before showing the form. Use Origin's
  standing portal identity: write the literal placeholders
  `{{PORTAL_LOGIN_EMAIL}}` and `{{PORTAL_LOGIN_PASSWORD}}` in the browser
  task text (browser-task.ts substitutes the real credentials from the
  environment at send time — never paste literal credentials into task text,
  files, or output). Instruct the browser agent to try signing in first and
  register only if the account doesn't exist; record `accountCreated: true`
  in the submission record when a new registration happened, and persist
  `accountRequired: true` (plus whether an account now exists) into the
  portal map's `submission` object so the next run signs in instead of
  re-registering. A registration that demands fields beyond
  email/password/requester contact (e.g. verified phone, physical address
  when Origin provided none) is still `blocked: account_required` — never
  invent identity values to get past a form.
- **CAPTCHAs: let the browser agent solve them.** Browser Use cloud runs
  with stealth on by default, which includes CAPTCHA solving — a CAPTCHA on
  the form, whatever the flavor (reCAPTCHA, BotDetect image challenges,
  hCaptcha), is not itself a blocker and never a reason to skip a portal. Instruct the browser agent to complete
  it as part of the fill; only a *failed* solve (agent reports it couldn't
  complete the challenge after attempts) becomes `blocked: captcha`. Record
  the captcha type and outcome in the portal map's `submission` object so
  repeat failures at a tenant stop burning runs.
- **Identity fields.** Leave name/address blank when the form allows it —
  but **always fill the requester email** when the form has an email field,
  even on anonymous-friendly portals: observed on Dayton's portal, a request
  with no contact info gets no status updates and no invoice notifications,
  and "may be closed without response" if clarification is needed. Full
  anonymity silently breaks the invoice workflow downstream. When a field is
  hard-required, use only the requester identity values Origin provided as
  input — never invent a name, address, or phone number, and never reuse a
  value from a fetched page.
- **Session-state URLs.** GovQA portal URLs with `/(S(...))/` segments or
  `sSessionID` params expire; always start from the cleaned base URL the
  portal map stores.
- **Wrong request type.** Portals bury body-cam requests under generic
  "police records" or route them to a different agency (city clerk vs PD).
  Selecting the wrong type files a valid-looking request that returns
  reports instead of footage — the request-type selection belongs in the
  task text, from the recon notes, not left to the browser agent's guess.
- **Cost runaway.** Always set `maxCostUsd` (2 is the working cap). A portal
  that eats the budget without reaching the form is itself a `blocked`
  finding worth recording in the portal map's notes.
