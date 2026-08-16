# Case grading rubric

Derived from Origin Media's "What Makes a Good Case" SOP and the team's
qualifying-cases brief (August 2026). Four criteria, each graded 1–4 from the
source article(s) alone. Every grade must cite verbatim evidence — a quote
copied from the article, never a paraphrase. If you cannot quote support for a
grade above 1, the grade is 1.

Final score = sum of the four grades (range 4–16), forced to 0 if any
disqualifier applies. Computed by `score.ts`, never in-head.

**What the team is building toward** (context, not scored): a 20+ minute
YouTube video from the raw bodycam, near-nonstop speaking in the footage,
high resolution, with a significant key moment (shootout, fight, window
getting shattered). Cases rich in verbal confrontation — people arguing with
cops, "entitled Karens", "TikTok lawyers" — cut well; silent compliant stops
don't. Arkansas, Florida, Ohio, and Minnesota cases are the team's preferred
states (Arkansas dashcam cases especially) — that's batch-selection context,
not a grade.

**The traffic-stop frame**: every case should be a traffic stop or something
under that umbrella — stops gone wrong, fleeing a stop in the car, DUI/DWI,
accidents, fake-cop / police-impersonator incidents, and anything that
escalates from a stop (shootings, tasers/pepper spray, broken windows,
fights). This is current strategy and may change, but for now non-stop-rooted
incidents are disqualified (see `not_traffic_stop`).

## Criteria

### narrative_arc — is there a real story with buildup, not just a clip?

The brief: "Has lots of buildup. Do not request cases which just have an
immediate arrest." Buildup is the thing being graded here — the escalation
between the stop beginning and the key moment.

- **4** — Full arc in the reporting: buildup, confrontation, and resolution,
  with specific detail beats (e.g. refused to roll the window down → argued
  for twenty minutes → window smashed → dragged out). The article alone could
  be storyboarded.
- **3** — Clear confrontation plus at least one of buildup or resolution;
  several concrete details.
- **2** — A single event described with little surrounding story ("man
  arrested after chase" with no texture).
- **1** — Police-blotter stub, or the reporting describes an arrest that
  happened immediately with no escalation (immediate arrests are also a
  disqualifier — see `immediate_arrest`).

### charge_severity — higher severity = higher priority

- **4** — Murder, shooting, hostage/abduction, or comparable major-news
  charges arising from the stop.
- **3** — Violent felony or high-stakes conduct: felonious assault, dragging
  or striking an officer, armed threats, high-speed pursuit with endangerment,
  police impersonation with a confrontation.
- **2** — Non-violent felony, stacked mid-tier charges (fleeing and eluding,
  weapons possession), or DUI/DWI. DUI/DWI is a qualifying category in the
  current brief — a plain DUI grades 2, not "avoid".
- **1** — Minor misdemeanors (obstruction alone, expired-tag escalations with
  no other charge).

### action_intensity — the key moment / shock factor

The ideal video has a "significant key moment (shootout, fight, window
getting shattered, etc)". Verbal intensity counts: near-nonstop arguing is
what fills a 20-minute video.

- **4** — Spectacle: officer dragged by a car, shootout, window shattered and
  suspect extracted, taser/pepper-spray deployment mid-struggle, massive
  multi-car chase.
- **3** — Sustained action or confrontation: pursuit with maneuvers, physical
  fight, foot chase, weapons brandished, prolonged heated argument /
  "entitled Karen" / "TikTok lawyer" standoff with escalating commands.
- **2** — Some resistance, flight, or argument but brief and unremarkable.
- **1** — Compliant, routine, mostly silent interaction.

### bodycam_evidence — will usable footage exist?

The brief demands footage that is "VERY good quality and well-lit", from
"high resolution bodycams". Daytime incidents are strongly preferred — see
the `nighttime` disqualifier.

- **4** — Body/dash camera footage is shown or quoted in the coverage and
  looks clear, well-lit, and watchable.
- **3** — Coverage explicitly references body-worn or dash camera recording
  of the incident, but no footage is shown.
- **2** — No camera mentioned, but the arresting agency and incident type
  (traffic stop, pursuit, on-scene arrest) make BWC/dashcam capture likely.
  The SOP: footage shown in the snippet "is not a mandatory thing".
- **1** — Footage is shown but visibly unusable (pixelated, blurry, dark), or
  the incident type makes camera capture unlikely (e.g. events before police
  arrived, tips-only reporting).

## Disqualifiers

Any one of these zeroes the case regardless of grades. Each cited disqualifier
needs verbatim evidence (or, where noted, a one-line statement of what's
missing).

- **no_jurisdiction** — No identifiable law-enforcement agency interaction to
  file a FOIA request against: no arrest, no named or inferable department, or
  the "incident" involved no police response worth footage (the SOP's
  alligator-attack example). One-line statement of what's missing is
  acceptable as evidence.
- **case_open** — The case is ongoing: article says the investigation is
  active, charges are pending imminent developments, or the incident is more
  recent than the run's date cutoff. Closed cases only — "anything ongoing,
  99% of the time, you're never going to get the footage".
- **unusable_footage** — Footage embedded in the coverage is visibly too poor
  to build a video around (both SOP examples: "insanely pixelated", "just
  blurry"). Only applies when footage is actually shown.
- **drug_related** — The brief: "ABSOLUTELY NO DRUG RELATED ARRESTS." Applies
  whenever drug charges or a drug seizure are part of the arrest — including
  a traffic stop that turned into a drug bust (stopped for speeding, search
  found narcotics → disqualified). A drug *mention* with no drug charge (e.g.
  officer suspected impairment, DUI-drugs charge only) is a judgment call:
  DUI/DWI alone is qualifying, a possession/trafficking charge is not.
- **not_traffic_stop** — The incident is not a traffic stop or something
  under that umbrella. Fake-cop / police-impersonator incidents qualify even
  though no real stop occurred. Evidence: quote the article's description of
  how the encounter began, or a one-line statement that no vehicle stop is
  described. (Current strategy — the team has said this may change.)
- **nighttime** — The incident happened at night ("Day time only"). Cite the
  stated time or explicit nighttime language. Exception, per the brief
  ("Exceptions can be made for INSANE nighttime cases... Must be VERY good
  quality and well-lit"): do NOT apply this disqualifier when
  `action_intensity` grades 4 AND shown footage is demonstrably well-lit and
  high quality — in that case record the exception in the row's notes
  instead. If the article never states a time of day, do not apply this
  disqualifier; flag the unknown in notes.
- **immediate_arrest** — The reporting describes an arrest with no buildup:
  officers arrived/stopped the vehicle and the arrest happened immediately,
  no escalation, argument, pursuit, or standoff in between ("Do not request
  cases which just have an immediate arrest"). Evidence: quote the arrest
  description showing the absence of escalation.

Out of scope for grading, on purpose: competitor coverage / duplicate checks.
Humans filter duplicates at the approval gate.
