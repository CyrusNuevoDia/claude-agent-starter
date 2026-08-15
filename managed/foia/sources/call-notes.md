# Background: Sergeant Curtis and Origin Media

- Origin Media (Henry and Tom) manages YouTube IP and channels, including Sergeant Curtis
- Sergeant Curtis stats: 650K avg views per video, 1 in 4 videos exceeds 1M views, 250M views in 10 months
- Content style: high-impact police body cam footage (arrests, sovereign citizens, police stops)
- Revenue streams: YouTube AdSense, brand deals (Adam’s focus), merch (launched ~1 month ago), speaking gigs, content syndication
- Core problem: currently reusing scraped footage from other YouTube channels; need original FOIA-sourced content

# FOIA Process Walkthrough

- Current workflow is manual, run by a team of outsourced workers (“Mechanical Turks”)
  - Workers follow SOPs to identify qualifying cases from news articles
  - Cases logged in a Google Sheet: subject name, department, date, time, incident details
- Requests submitted via two methods:
  - FOIA portals (90%+): each police department has its own URL (e.g. JustFOIA, GovQA); each requires separate account registration
  - Direct email (~10%): copy-paste template sent to county clerk; requires manual follow-up replies
- After submission, departments respond with either:
  - An invoice (preferred): means Origin is first to request; invoices range from a few dollars to $13-14K
  - Footage directly (skip): means someone else already paid; these cases are deprioritized
- Invoice payment:
  - Credit card accepted by most; some require physical or digital checks
  - Currently banking with RBC (Canadian); opening US accounts now
  - Plan: auto-pay invoices under ~$300-400; flag larger ones for manual review
- Footage delivery: takes weeks to over a year depending on the case; expires after a set window
- Key constraints:
  - Only closed cases are eligible (ongoing cases almost never yield footage)
  - Date filter recommended: requests before January 2026 or earlier
  - Florida is by far the best state (lax release laws); a condensed list of top states and departments is feasible
  - Sending thousands of requests risks annoying departments; leaving name/address blank is standard practice (~95% of requests)
- Current volume: ~100-150 requests/day; target with automation is ~1,000/day

# Automation Scope and Approach

- Goal: agent system that runs 24/7, maximizing FOIA request volume with minimal human involvement
- Proposed pipeline:
  1. Scrape news sources to identify qualifying incidents
  2. Extract structured case data (subject, department, date, time)
  3. Submit requests via FOIA portals or email, handling logins and CAPTCHAs
  4. Monitor for invoices; auto-pay below threshold via API; flag high-cost ones
  5. Download footage on receipt and store in a persistent folder (e.g. Google Drive)
- Prioritization strategy: catalog all US departments, rank by ease of access (no CAPTCHA, credit card accepted, no login required), and start with the easiest
- Longer-term vision: internal platform for the team to review all requests and footage in one place
- Human team stays in the loop for check payments and edge cases; automation handles the rest
- Banking recommendation: Mercury (mercury.com) for its API support covering ACH, checks, and credit cards with no transfer fees
