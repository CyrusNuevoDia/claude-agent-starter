// The FOIA tracking sheet's schema — single source of truth for tab headers
// and the Status vocabulary. setup-sheet.ts materializes it; worksheet.ts
// validates against it.

export const STATUSES = [
  "Sourced",
  "Submitted",
  "Invoiced",
  "Paid",
  "Received",
  "Downloaded",
  "Denied",
  "No Record",
  "Withdrawn",
] as const;

export const REQUEST_HEADERS = [
  "Status",
  "Suspect",
  "Case",
  "Location",
  "Incident Date",
  "Department",
  "Score",
  "Rubric",
  "Submitted",
  "Reference #",
  "Invoice",
  "Paid",
  "Video",
  "Notes",
  "Agent Notes",
  "Description",
  "Charges",
  "Article",
  "Portal",
  "Access Code",
  "Invoice Link",
  "Batch",
  "Request ID",
  "Updated",
] as const;

export const DEPARTMENT_HEADERS = [
  "Department",
  "State",
  "Portal",
  "Email",
  "Vendor",
  "Account",
  "Notes",
] as const;

export const BATCH_HEADERS = [
  "Batch",
  "States",
  "Window",
  "Threshold",
  "Discovered",
  "Graded",
  "Submitted",
  "Run Date",
] as const;
