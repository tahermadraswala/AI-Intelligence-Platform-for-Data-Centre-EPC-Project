// ─────────────────────────────────────────────────────────────
// Commissioning — Backend Service Layer
//
// Provides:
//   1. fetchMockRecords()        — raw generated demo equipment/NCR list
//   2. runMockQAAssessment()     — trigger the Commissioning QA Copilot on demo data
//   3. runQAAssessmentOnUpload() — trigger it on an uploaded equipment/NCR CSV
//   4. fetchLatestQARun()        — most recent persisted assessment, if any
//
// Each function returns { data, error }. On error the caller falls back
// to the static mock dataset so the UI never breaks.
//
// Note: the Punch List and FAT/SAT sub-counts in commissioningData.js
// track categories the agent's response schema doesn't cover (general
// punch-list items, and a fat-vs-sat split within test results), so
// those two panels stay on static demo data here — everything else
// (readiness summary, level progress, equipment matrix, NCR panel, AI
// assessment) is wired to the real agent.
// ─────────────────────────────────────────────────────────────

import { apiGet, apiPost } from './api'

const STATUS_LABEL = { READY: 'Ready', TESTING: 'Testing', BLOCKED: 'Blocked', FAILED: 'Failed' }
const RECOMMENDATION_LABEL = {
  PROCEED: 'ON TRACK',
  PROCEED_WITH_CAUTION: 'PROCEED WITH CAUTION',
  DO_NOT_PROCEED: 'DO NOT PROCEED',
}
const DISCIPLINE_LABEL = {
  mechanical: 'Mechanical',
  electrical: 'Electrical',
  life_safety: 'Fire & Life Safety',
  controls: 'BMS/Controls',
}
const LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5']
const LEVEL_NAMES = {
  L1: 'Factory Acceptance',
  L2: 'Site Acceptance',
  L3: 'Pre-Functional',
  L4: 'Functional Testing',
  L5: 'Integrated Systems',
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
}

// ── Transform: full response + raw records → UI shapes ──────
function transformAssessment(assessment, records) {
  const recordLookup = new Map((records || []).map((r) => [r.equipment_id, r]))
  const assessments = assessment.equipment_assessments || []
  const assessmentLookup = new Map(assessments.map((a) => [a.equipment_id, a]))

  const equipmentMatrix = (records || []).map((rec) => {
    const a = assessmentLookup.get(rec.equipment_id)
    const status = a ? (STATUS_LABEL[a.readiness_status] || a.readiness_status) : STATUS_LABEL[rec.status] || rec.status
    return {
      id: rec.equipment_id,
      equipment: rec.equipment_name,
      discipline: DISCIPLINE_LABEL[rec.discipline] || rec.discipline,
      status,
      ready: status === 'Ready',
      blocked: status === 'Blocked',
      ncrCount: (rec.open_ncrs || []).length,
      lastTest: formatDate(rec.last_test_date),
      engineer: rec.responsible_engineer,
    }
  })

  const ncrList = []
  for (const rec of records || []) {
    const a = assessmentLookup.get(rec.equipment_id)
    for (const ncr of rec.open_ncrs || []) {
      ncrList.push({
        id: ncr.ncr_id,
        equipment: rec.equipment_id,
        severity: ncr.severity ? ncr.severity.charAt(0) + ncr.severity.slice(1).toLowerCase() : 'Medium',
        summary: ncr.summary,
        team: DISCIPLINE_LABEL[rec.discipline] || rec.discipline,
        aiAction: a?.recommended_actions?.[0] || 'Review with responsible engineer.',
        closureDate: 'Pending',
      })
    }
  }

  // Per-level progress, derived from how far each piece of equipment has
  // gotten in the L1-L5 sequence (a level is "complete" for a unit once
  // it has reached or passed that level).
  const total = (records || []).length || 1
  const commissioningProgress = LEVELS.map((level, idx) => {
    const reachedCount = (records || []).filter((rec) => {
      const reachedIdx = LEVELS.indexOf(rec.commissioning_level_reached)
      return reachedIdx >= idx
    }).length
    return { level, name: LEVEL_NAMES[level], progress: Math.round((reachedCount / total) * 100) }
  })

  const readyCount = equipmentMatrix.filter((e) => e.ready).length
  const failedOrBlockedCount = equipmentMatrix.filter((e) => e.status === 'Failed' || e.status === 'Blocked').length
  const avgConfidence = assessments.length
    ? Math.round(assessments.reduce((s, a) => s + (a.confidence || 0), 0) / assessments.length)
    : 0

  const executiveReadiness = {
    overallReadiness: `${Math.round(assessment.overall_readiness_percentage ?? 0)}%`,
    systemsReady: `${readyCount} / ${equipmentMatrix.length}`,
    failedSystems: failedOrBlockedCount,
    openNCRs: ncrList.length,
    aiConfidence: `${avgConfidence}%`,
    lastUpdated: assessment.created_at ? new Date(assessment.created_at).toLocaleString() : 'Just now',
  }

  // Per-equipment AI assessment panel data, plus a synthesized "default"
  // (facility-wide) view for when nothing is selected.
  const aiAssessments = { }
  for (const a of assessments) {
    aiAssessments[a.equipment_id] = {
      confidence: `${a.confidence ?? 0}%`,
      reasoning: a.reasoning || '',
      blockers: (a.blocking_ncrs || []).length
        ? a.blocking_ncrs.map((id) => {
            const rec = [...recordLookup.values()].find((r) => (r.open_ncrs || []).some((n) => n.ncr_id === id))
            const ncr = rec?.open_ncrs?.find((n) => n.ncr_id === id)
            return ncr ? `${id}: ${ncr.summary}` : id
          })
        : ['No open NCRs blocking this unit.'],
      actions: a.recommended_actions || [],
      recommendation:
        a.readiness_status === 'FAILED' || a.readiness_status === 'BLOCKED'
          ? 'DO NOT PROCEED'
          : a.readiness_status === 'TESTING'
          ? 'PROCEED WITH CAUTION'
          : 'ON TRACK',
    }
  }
  aiAssessments['default'] = {
    confidence: executiveReadiness.aiConfidence,
    reasoning: assessment.assumptions?.length
      ? `Facility-wide readiness assessment. ${assessment.assumptions.join(' ')}`
      : 'Facility-wide readiness assessment based on current equipment test records and open NCRs.',
    blockers: assessment.critical_blockers?.length ? assessment.critical_blockers : ['No critical blockers identified.'],
    actions: assessments
      .filter((a) => a.readiness_status === 'BLOCKED' || a.readiness_status === 'FAILED')
      .flatMap((a) => a.recommended_actions || [])
      .slice(0, 4),
    recommendation: RECOMMENDATION_LABEL[assessment.go_no_go_recommendation] || 'PROCEED WITH CAUTION',
  }

  return {
    id: assessment.id,
    source: assessment.source,
    assumptions: assessment.assumptions || [],
    executiveReadiness,
    commissioningProgress,
    equipmentMatrix,
    ncrList,
    aiAssessments,
  }
}

// ── Public API ──────────────────────────────────────────────

/** Fetch the raw generated demo equipment/NCR list. */
export async function fetchMockRecords() {
  return apiGet('/commissioning/mock-records')
}

/** Run the Commissioning QA Copilot against freshly generated mock data. */
export async function runMockQAAssessment() {
  const [{ data: records, error: recordsError }, { data: assessment, error: assessmentError }] = await Promise.all([
    fetchMockRecords(),
    apiPost('/commissioning/qa-assessment/mock', {}, { timeout: 90000 }),
  ])

  if (assessmentError || !assessment) return { data: null, error: assessmentError }
  return { data: transformAssessment(assessment, recordsError ? [] : records), error: null }
}

/** Run the Commissioning QA Copilot against an uploaded equipment/NCR CSV. */
export async function runQAAssessmentOnUpload(file) {
  const formData = new FormData()
  formData.append('file', file)

  const { data: assessment, error } = await apiPost('/commissioning/qa-assessment/upload', formData, {
    timeout: 90000,
  })
  if (error || !assessment) return { data: null, error }

  const { data: records } = await fetchMockRecords()
  return { data: transformAssessment(assessment, records), error: null }
}

/** Fetch the most recent persisted commissioning QA run, if any exist yet. */
export async function fetchLatestQARun() {
  const { data: history, error } = await apiGet('/commissioning/qa-assessment/history?limit=1')
  if (error) return { data: null, error }
  if (!history || history.length === 0) return { data: null, error: null }

  const { data: records } = await fetchMockRecords()
  return { data: transformAssessment(history[0], records), error: null }
}
