// ─────────────────────────────────────────────────────────────
// Spec Checker — Static UI Data
// Only loading-step labels live here. All analysis data now
// comes from the FastAPI backend at runtime.
// ─────────────────────────────────────────────────────────────

export const loadingSteps = [
  { id: 1, label: 'Uploading documents to AI engine' },
  { id: 2, label: 'Parsing and extracting parameters' },
  { id: 3, label: 'Retrieving specification context' },
  { id: 4, label: 'Running compliance matrix comparison' },
  { id: 5, label: 'Generating AI reasoning report' },
]
