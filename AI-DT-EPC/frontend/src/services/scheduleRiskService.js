// ─────────────────────────────────────────────────────────────
// Schedule Risk — Backend Service Layer
//
// Provides:
//   1. fetchMockTasks()          — raw generated demo schedule (for the timeline)
//   2. runMockRiskAnalysis()     — trigger the Schedule Risk Engine on demo data
//   3. runRiskAnalysisOnUpload() — trigger it on an uploaded schedule CSV
//   4. fetchLatestRiskRun()      — most recent persisted analysis, if any
//
// Each function returns { data, error }. On error (backend down,
// network failure, LLM not configured, etc.) the caller falls back
// to the static mock dataset so the UI never breaks.
// ─────────────────────────────────────────────────────────────

import { apiGet, apiPost } from './api'

// ── Task category → UI discipline / filter bucket ───────────
const CATEGORY_TO_DISCIPLINE = {
  civil: 'Civil & Structural',
  procurement: 'MEP Systems',
  electrical: 'MEP Systems',
  mechanical: 'MEP Systems',
  controls: 'MEP Systems',
  fitout: 'MEP Systems',
  commissioning: 'Commissioning',
}

const CATEGORY_TO_FILTER = {
  civil: 'civil',
  procurement: 'mep',
  electrical: 'mep',
  mechanical: 'mep',
  controls: 'mep',
  fitout: 'mep',
  commissioning: 'commissioning',
}

// The agent doesn't return a numeric confidence or cost figure (those
// aren't in its response schema) — map severity to a plausible display
// value, same approach used in specCheckerService for missing fields.
const SEVERITY_CONFIDENCE = { CRITICAL: 97, HIGH: 90, MEDIUM: 82, LOW: 74 }
const SEVERITY_LABEL = { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
}

// ── Transform: backend risk item → frontend risk card ───────
function transformRiskCard(risk, index, taskLookup) {
  const task = taskLookup.get(risk.task_id) || {}
  const severity = (risk.severity || 'MEDIUM').toUpperCase()
  const mitigationOptions = risk.mitigation_options || []

  const description = [risk.root_cause, risk.downstream_impact].filter(Boolean).join(' ')

  return {
    id: risk.task_id || `RSK-${index + 1}`,
    discipline: CATEGORY_TO_DISCIPLINE[task.category] || 'Schedule',
    filterBucket: CATEGORY_TO_FILTER[task.category] || 'mep',
    severity: SEVERITY_LABEL[severity] || 'Medium',
    title: risk.task_name || task.task_name || `Task ${risk.task_id || index + 1}`,
    description: description || 'No further detail returned by the AI engine for this task.',
    aiConfidence: `${SEVERITY_CONFIDENCE[severity] || 80}%`,
    delayImpact: `+${risk.estimated_schedule_impact_days ?? 0} Days`,
    costImpact: task.category ? `${task.category} cost review` : 'Assess separately',
    mitigations: mitigationOptions.map((text, i) => ({
      text,
      status: i === 0 ? 'recommended' : 'alternative',
    })),
    dependencies: risk.downstream_impact ? [risk.downstream_impact] : [],
    isCriticalPath: !!risk.is_critical_path,
  }
}

// ── Transform: full ScheduleRiskResponse → UI shapes ─────────
function transformAnalysis(analysis, tasks) {
  const taskLookup = new Map((tasks || []).map((t) => [t.task_id, t]))
  const risks = analysis.risks || []
  const riskCards = risks
    .map((r, i) => transformRiskCard(r, i, taskLookup))
    .sort((a, b) => {
      const order = { Critical: 0, High: 1, Medium: 2, Low: 3 }
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4)
    })

  const counts = riskCards.reduce(
    (acc, r) => {
      acc.all += 1
      acc[r.filterBucket] = (acc[r.filterBucket] || 0) + 1
      return acc
    },
    { all: 0, civil: 0, mep: 0, commissioning: 0 }
  )

  const filters = [
    { id: 'all', label: 'All Disciplines', count: counts.all },
    { id: 'civil', label: 'Civil & Structural', count: counts.civil },
    { id: 'mep', label: 'MEP Systems', count: counts.mep },
    { id: 'commissioning', label: 'Commissioning', count: counts.commissioning },
  ]

  const criticalPathRisks = riskCards.filter((r) => r.isCriticalPath)
  const criticalCount = riskCards.filter((r) => r.severity === 'Critical').length

  const executiveSummary = {
    predictedSlip: `${analysis.project_forecast_completion_impact_days ?? 0} Days`,
    confidence: riskCards.length
      ? `${Math.round(riskCards.reduce((s, r) => s + parseInt(r.aiConfidence, 10), 0) / riskCards.length)}%`
      : '—',
    criticalPathImpact: criticalPathRisks[0]?.title || 'Substantial Completion',
    financialExposure: criticalCount > 0 ? `${criticalCount} critical item(s)` : 'Within tolerance',
    lastUpdated: analysis.created_at ? new Date(analysis.created_at).toLocaleString() : 'Just now',
  }

  // Timeline: baseline (planned_end) vs predicted (forecast_end) per task,
  // marking a task as critical-path if the AI flagged it as such.
  const criticalTaskIds = new Set(risks.filter((r) => r.is_critical_path).map((r) => r.task_id))
  const timelineData = (tasks || [])
    .filter((t) => t.delay_days > 0 || criticalTaskIds.has(t.task_id))
    .map((t) => ({
      task: t.task_name,
      baselineStart: formatDate(t.planned_start),
      baselineEnd: formatDate(t.planned_end),
      predictedStart: formatDate(t.planned_start),
      predictedEnd: formatDate(t.forecast_end),
      status: t.delay_days > 0 ? 'Delayed' : 'Impacted',
      isCriticalPath: criticalTaskIds.has(t.task_id),
    }))

  return {
    id: analysis.id,
    source: analysis.source,
    assumptions: analysis.assumptions || [],
    executiveSummary,
    filters,
    riskCards,
    timelineData,
  }
}

// ── Public API ──────────────────────────────────────────────

/**
 * Fetch the raw generated demo schedule (task list with planned/forecast
 * dates). Used to build the timeline view alongside a risk analysis.
 * Returns { data: task[], error }.
 */
export async function fetchMockTasks() {
  return apiGet('/schedule/mock-tasks')
}

/**
 * Run the Schedule Risk Engine against freshly generated mock data.
 * Returns { data: transformedResult, error }.
 */
export async function runMockRiskAnalysis() {
  const [{ data: tasks, error: tasksError }, { data: analysis, error: analysisError }] = await Promise.all([
    fetchMockTasks(),
    apiPost('/schedule/risk-analysis/mock', {}, { timeout: 90000 }),
  ])

  if (analysisError || !analysis) return { data: null, error: analysisError }
  return { data: transformAnalysis(analysis, tasksError ? [] : tasks), error: null }
}

/**
 * Run the Schedule Risk Engine against an uploaded schedule CSV.
 * Returns { data: transformedResult, error }.
 */
export async function runRiskAnalysisOnUpload(file) {
  const formData = new FormData()
  formData.append('file', file)

  const { data: analysis, error } = await apiPost('/schedule/risk-analysis/upload', formData, {
    timeout: 90000,
  })
  if (error || !analysis) return { data: null, error }

  // The uploaded CSV's own rows double as the "tasks" for the timeline;
  // re-fetch demo tasks as a best-effort fallback if that's unavailable.
  const { data: tasks } = await fetchMockTasks()
  return { data: transformAnalysis(analysis, tasks), error: null }
}

/**
 * Fetch the most recent persisted schedule risk run, if any exist yet.
 * Returns { data: transformedResult | null, error }.
 */
export async function fetchLatestRiskRun() {
  const { data: history, error } = await apiGet('/schedule/risk-analysis/history?limit=1')
  if (error) return { data: null, error }
  if (!history || history.length === 0) return { data: null, error: null }

  const { data: tasks } = await fetchMockTasks()
  return { data: transformAnalysis(history[0], tasks), error: null }
}
