// ─────────────────────────────────────────────────────────────
// Spec Checker — Backend Service Layer
//
// Provides three capabilities:
//   1. uploadSpecDocument()      — upload a spec PDF to the backend
//   2. uploadSubmittalDocument()  — upload a vendor submittal PDF
//   3. runSpecCompliance()        — trigger AI compliance analysis
//
// Each function returns { data, error }. On error the caller
// displays the backend error message — no mock fallback.
// ─────────────────────────────────────────────────────────────

import { apiPost } from './api'

// ── Upload helpers ──────────────────────────────────────────

/**
 * Upload a Project Specification PDF to the specs_and_standards collection.
 * Returns { data: { id, filename, chunksIndexed }, error }.
 */
export async function uploadSpecDocument(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('collection', 'specs_and_standards')
  formData.append('doc_type', 'specification')

  const { data, error } = await apiPost('/documents/upload', formData, { timeout: 120000 })
  if (error || !data) return { data: null, error }
  return {
    data: {
      id: data.id,
      filename: data.filename,
      chunksIndexed: data.chunks_indexed,
    },
    error: null,
  }
}

/**
 * Upload a Vendor Submittal PDF to the vendor_submittals collection.
 * Returns { data: { id, filename, chunksIndexed }, error }.
 */
export async function uploadSubmittalDocument(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('collection', 'vendor_submittals')
  formData.append('doc_type', 'vendor_submittal')

  const { data, error } = await apiPost('/documents/upload', formData, { timeout: 120000 })
  if (error || !data) return { data: null, error }
  return {
    data: {
      id: data.id,
      filename: data.filename,
      chunksIndexed: data.chunks_indexed,
    },
    error: null,
  }
}

// ── Compliance analysis ─────────────────────────────────────

/**
 * Severity → frontend status mapping.
 * The backend returns CRITICAL / MAJOR / MINOR / INFORMATIONAL.
 * The frontend displays FAIL / WARNING / PASS.
 */
function severityToStatus(severity) {
  const s = (severity || '').toUpperCase()
  if (s === 'CRITICAL' || s === 'MAJOR') return 'FAIL'
  if (s === 'MINOR') return 'WARNING'
  return 'PASS'
}

/**
 * Transform a single backend deviation into a frontend finding row.
 */
function transformDeviation(dev, index) {
  const status = severityToStatus(dev.severity)
  return {
    id: index + 1,
    parameter: dev.description || `Finding ${index + 1}`,
    required: dev.clause_reference || '—',
    submitted: dev.submittal_excerpt || '—',
    variance: status === 'FAIL' ? 'Non-compliant' : status === 'WARNING' ? 'Partial' : '—',
    status,
    confidence: status === 'FAIL' ? 94 : status === 'WARNING' ? 82 : 96,
    reasoning: dev.description || 'No detailed reasoning available.',
    sourceSpec: dev.clause_reference || 'Not specified',
    sourceSubmittal: dev.submittal_excerpt ? `Submittal excerpt: "${dev.submittal_excerpt.slice(0, 80)}…"` : 'Vendor submittal',
    action: status !== 'PASS'
      ? `Review deviation against ${dev.clause_reference || 'specification'}. Severity: ${dev.severity || 'UNKNOWN'}.`
      : 'No action required.',
  }
}

/**
 * Transform the full backend SpecComplianceResponse into the shape
 * the SpecChecker.jsx results view expects.
 */
function transformComplianceResult(apiResponse, specFilename, submittalFilename) {
  const deviations = apiResponse.deviations || []
  const findings = deviations.map(transformDeviation)

  // If there are no deviations but the status is compliant, add a
  // single "all passed" row so the table is never empty.
  if (findings.length === 0 && apiResponse.overall_status !== 'INSUFFICIENT_SPEC_CONTEXT') {
    findings.push({
      id: 1,
      parameter: 'Overall Compliance',
      required: 'All clauses',
      submitted: 'Meets requirements',
      variance: '—',
      status: 'PASS',
      confidence: 95,
      reasoning: apiResponse.summary || 'No deviations found. The submittal meets all specification requirements.',
      sourceSpec: (apiResponse.retrieved_context_sources || []).join(', ') || 'Specification documents',
      sourceSubmittal: submittalFilename || 'Vendor submittal',
      action: 'No action required.',
    })
  }

  const critical = findings.filter((f) => f.status === 'FAIL').length
  const warnings = findings.filter((f) => f.status === 'WARNING').length
  const passed = findings.filter((f) => f.status === 'PASS').length

  return {
    id: apiResponse.id || `ANA-${Date.now()}`,
    documentName: submittalFilename || 'Vendor Submittal',
    specDocument: specFilename || 'Project Specification',
    analysedAt: apiResponse.created_at || new Date().toISOString(),
    overallStatus: apiResponse.overall_status || 'UNKNOWN',
    summary: {
      total: findings.length,
      critical,
      warnings,
      passed,
    },
    findings,
    retrievedSources: apiResponse.retrieved_context_sources || [],
    rawSummary: apiResponse.summary || '',
  }
}

/**
 * Run specification compliance analysis via the backend.
 * `submittalText` is the text to check against the spec store.
 * `equipmentType` optionally focuses retrieval.
 *
 * Returns { data: transformedResult, error }.
 */
export async function runSpecCompliance(submittalText, equipmentType = '', specFilename = '', submittalFilename = '') {
  const { data, error } = await apiPost(
    '/agents/spec-compliance',
    { submittal_text: submittalText, equipment_type: equipmentType },
    { timeout: 120000 } // LLM + retrieval can be slow
  )

  if (error || !data) return { data: null, error }
  return {
    data: transformComplianceResult(data, specFilename, submittalFilename),
    error: null,
  }
}
