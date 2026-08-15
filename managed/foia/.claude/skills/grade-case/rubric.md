# Case grading rubric

Derived from Origin Media's "What Makes a Good Case" SOP. Four criteria, each
graded 1–4 from the source article(s) alone. Every grade must cite verbatim
evidence — a quote copied from the article, never a paraphrase. If you cannot
quote support for a grade above 1, the grade is 1.

Final score = sum of the four grades (range 4–16), forced to 0 if any
disqualifier applies. Computed by `score.ts`, never in-head.

## Criteria

### narrative_arc — is there a real story, not just a clip?

- **4** — Full arc in the reporting: buildup, confrontation, and resolution,
  with specific detail beats (e.g. fled a stop → dragged a trooper → blood-
  stained shirt found → captured). The article alone could be storyboarded.
- **3** — Clear confrontation plus at least one of buildup or resolution;
  several concrete details.
- **2** — A single event described with little surrounding story ("man
  arrested after chase" with no texture).
- **1** — Police-blotter stub; no narrative detail beyond the charge.

### charge_severity — higher severity = higher priority

- **4** — Murder, shooting, hostage/abduction, bank robbery, or comparable
  major-news charges.
- **3** — Violent felony or high-stakes conduct: felonious assault, dragging
  or striking an officer, armed threats, high-speed pursuit with endangerment.
- **2** — Non-violent felony or stacked mid-tier charges (fleeing and
  eluding, grand theft, weapons possession).
- **1** — Misdemeanors or a plain DUI with nothing else. The SOP: avoid DUI
  "unless there are other crazy elements".

### action_intensity — the "crazy stuff" / shock factor

- **4** — Spectacle or shock: officer dragged by a car, parent using a child
  as a shield, a police sergeant caught stealing, massive multi-car chase.
- **3** — Sustained action: pursuit with maneuvers, window smashed at a stop,
  foot chase ending in a dumpster, weapons brandished.
- **2** — Some resistance or flight but brief and unremarkable.
- **1** — Compliant, routine interaction.

### bodycam_evidence — will usable footage exist?

- **4** — Body/dash camera footage is shown or quoted in the coverage and
  looks clear and watchable.
- **3** — Coverage explicitly references body-worn or dash camera recording
  of the incident, but no footage is shown.
- **2** — No camera mentioned, but the arresting agency and incident type
  (traffic stop, pursuit, on-scene arrest) make BWC capture likely. The SOP:
  footage shown in the snippet "is not a mandatory thing".
- **1** — Footage is shown but visibly unusable (pixelated, blurry, dark), or
  the incident type makes camera capture unlikely (e.g. events before police
  arrived, tips-only reporting).

## Disqualifiers

Any one of these zeroes the case regardless of grades. Each cited disqualifier
also needs verbatim evidence (or, for `no_jurisdiction`, a one-line statement
of what's missing).

- **no_jurisdiction** — No identifiable law-enforcement agency interaction to
  file a FOIA request against: no arrest, no named or inferable department, or
  the "incident" involved no police response worth footage (the SOP's
  alligator-attack example: a death with no meaningful police interaction).
- **case_open** — The case is ongoing: article says the investigation is
  active, charges are pending imminent developments, or the incident is more
  recent than the run's date cutoff. Closed cases only — "anything ongoing,
  99% of the time, you're never going to get the footage".
- **unusable_footage** — Footage embedded in the coverage is visibly too poor
  to build a video around (both SOP examples: "insanely pixelated", "just
  blurry"). Only applies when footage is actually shown.

Out of scope for grading, on purpose: competitor coverage / duplicate checks.
Humans filter duplicates at the approval gate.
