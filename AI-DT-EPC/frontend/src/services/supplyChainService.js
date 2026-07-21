// ─────────────────────────────────────────────────────────────
// Supply Chain — Backend Service Layer
//
// Provides:
//   1. fetchMockShipments()      — raw generated demo procurement/shipment list
//   2. runMockRiskAnalysis()     — trigger the Supply Chain Risk Agent on demo data
//   3. runRiskAnalysisOnUpload() — trigger it on an uploaded shipment-tracking CSV
//   4. fetchLatestRiskRun()      — most recent persisted analysis, if any
//
// Each function returns { data, error }. On error (backend down,
// network failure, LLM not configured, etc.) the caller falls back
// to the static mock dataset so the UI never breaks.
//
// Note: the "Live Shipment Map" node positions in supplyChainData.js are
// hand-placed decorative coordinates with no equivalent in the agent's
// response schema, so they're left as static demo visuals here — every
// other panel (summary, network status, risk alerts, procurement
// timelines) is wired to the real agent.
// ─────────────────────────────────────────────────────────────

import { apiGet, apiPost } from './api'

const PHASE_LABELS = {
  MANUFACTURING: 'Manufacturing (FAT/SAT)',
  IN_TRANSIT: 'In Transit (Ocean/Air)',
  CUSTOMS_HOLD: 'Customs & Port Hold',
  DELIVERED: 'Delivered to Site',
}

const PHASE_STYLE = {
  MANUFACTURING: { color: 'text-text-primary', bg: 'bg-primary-bg' },
  IN_TRANSIT: { color: 'text-olive-primary', bg: 'bg-olive-primary/10' },
  CUSTOMS_HOLD: { color: 'text-status-warning', bg: 'bg-status-warning/10' },
  DELIVERED: { color: 'text-text-secondary', bg: 'bg-card-bg' },
}

// The agent doesn't return a numeric confidence for each risk (that's not
// in its response schema) — map severity to a plausible display value,
// same approach used in scheduleRiskService for the schedule risk engine.
const SEVERITY_CONFIDENCE = { CRITICAL: 96, HIGH: 91, MEDIUM: 84, LOW: 76 }
const SEVERITY_LABEL = { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }

const RISK_TYPE_LABEL = {
  port_congestion: 'Port Congestion',
  customs_hold: 'Customs Hold',
  quality_excursion: 'Quality Excursion',
  manufacturing_delay: 'Manufacturing Delay',
  route_disruption: 'Route Disruption',
  other: 'Logistics Risk',
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
}

function formatUsd(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

// ── Transform: full response + raw shipments → UI shapes ────
function transformAnalysis(analysis, shipments) {
  const shipmentLookup = new Map((shipments || []).map((s) => [s.po_id, s]))
  const risks = analysis.shipment_risks || []

  const riskAlerts = risks
    .map((r) => ({
      id: r.po_id,
      severity: SEVERITY_LABEL[(r.severity || 'MEDIUM').toUpperCase()] || 'Medium',
      title: `${RISK_TYPE_LABEL[r.risk_type] || 'Logistics Risk'}: ${r.item || r.po_id}`,
      description: r.description || 'No further detail returned by the AI engine.',
      aiAction: r.recommended_action || 'Review with procurement team.',
      confidence: `${SEVERITY_CONFIDENCE[(r.severity || 'MEDIUM').toUpperCase()] || 80}%`,
    }))
    .sort((a, b) => {
      const order = { Critical: 0, High: 1, Medium: 2, Low: 3 }
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4)
    })

  const phaseCounts = (shipments || []).reduce((acc, s) => {
    acc[s.current_phase] = (acc[s.current_phase] || 0) + 1
    return acc
  }, {})
  const shipmentOverview = Object.keys(PHASE_LABELS).map((phase) => ({
    status: PHASE_LABELS[phase],
    count: phaseCounts[phase] || 0,
    ...PHASE_STYLE[phase],
  }))

  const riskByPoId = new Map(risks.map((r) => [r.po_id, r]))
  const procurementTimeline = (shipments || []).map((s) => {
    const risk = riskByPoId.get(s.po_id)
    const severity = risk ? (risk.severity || 'MEDIUM').toUpperCase() : null
    const status = severity === 'CRITICAL' ? 'Critical Risk' : severity ? 'Delayed' : 'On Time'
    return {
      item: s.item,
      vendor: s.vendor,
      poId: s.po_id,
      currentPhase: PHASE_LABELS[s.current_phase] || s.current_phase,
      rosDate: formatDate(s.required_on_site_date),
      predictedDate: formatDate(s.predicted_delivery_date),
      status,
      manufacturing: s.manufacturing_pct ?? 0,
      transit: s.transit_pct ?? 0,
      customs: s.customs_pct ?? 0,
    }
  })

  const activeShipments = (shipments || []).filter((s) => s.current_phase !== 'DELIVERED').length
  const totalValueInTransit = (shipments || [])
    .filter((s) => s.current_phase !== 'DELIVERED')
    .reduce((sum, s) => sum + (s.value_usd || 0), 0)
  const criticalPathDelayed = risks.filter((r) => (r.severity || '').toUpperCase() === 'CRITICAL').length

  const logisticsSummary = {
    totalValueInTransit: formatUsd(totalValueInTransit),
    activeShipments,
    criticalPathDelayed,
    overallOnTime: `${Math.round(analysis.overall_on_time_percentage ?? 0)}%`,
    lastUpdated: analysis.created_at ? new Date(analysis.created_at).toLocaleString() : 'Just now',
  }

  return {
    id: analysis.id,
    source: analysis.source,
    assumptions: analysis.assumptions || [],
    totalValueAtRisk: formatUsd(analysis.total_value_at_risk_usd),
    logisticsSummary,
    shipmentOverview,
    riskAlerts,
    procurementTimeline,
  }
}

// ── Public API ──────────────────────────────────────────────

/** Fetch the raw generated demo procurement/shipment list. */
export async function fetchMockShipments() {
  return apiGet('/supply-chain/mock-shipments')
}

/** Run the Supply Chain Risk Agent against freshly generated mock data. */
export async function runMockRiskAnalysis() {
  const [{ data: shipments, error: shipmentsError }, { data: analysis, error: analysisError }] = await Promise.all([
    fetchMockShipments(),
    apiPost('/supply-chain/risk-analysis/mock', {}, { timeout: 90000 }),
  ])

  if (analysisError || !analysis) return { data: null, error: analysisError }
  return { data: transformAnalysis(analysis, shipmentsError ? [] : shipments), error: null }
}

/** Run the Supply Chain Risk Agent against an uploaded shipment-tracking CSV. */
export async function runRiskAnalysisOnUpload(file) {
  const formData = new FormData()
  formData.append('file', file)

  const { data: analysis, error } = await apiPost('/supply-chain/risk-analysis/upload', formData, {
    timeout: 90000,
  })
  if (error || !analysis) return { data: null, error }

  const { data: shipments } = await fetchMockShipments()
  return { data: transformAnalysis(analysis, shipments), error: null }
}

/** Fetch the most recent persisted supply chain risk run, if any exist yet. */
export async function fetchLatestRiskRun() {
  const { data: history, error } = await apiGet('/supply-chain/risk-analysis/history?limit=1')
  if (error) return { data: null, error }
  if (!history || history.length === 0) return { data: null, error: null }

  const { data: shipments } = await fetchMockShipments()
  return { data: transformAnalysis(history[0], shipments), error: null }
}
