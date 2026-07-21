// ─────────────────────────────────────────────────────────────
// Document Q&A — Backend Service Layer
//
// Provides three capabilities:
//   1. fetchDocuments()     — populate the document library
//   2. askQuestion()        — send a chat question to the RFI copilot
//   3. uploadDocument()     — ingest a new document via the backend
//
// Each function returns { data, error }. On error (backend down,
// network failure, etc.) the caller falls back to mock data so the
// UI never breaks.
// ─────────────────────────────────────────────────────────────

import { apiGet, apiPost } from './api'

// ── Collection → Discipline mapping ─────────────────────────
// The backend organises documents by "collection" (a vector-store
// namespace). The frontend groups them by engineering "discipline".
const COLLECTION_TO_DISCIPLINE = {
  specs_and_standards: 'STANDARDS',
  vendor_submittals: 'ELECTRICAL',   // best default; doc_type may refine
  project_docs_rfi: 'COMMISSIONING', // broad bucket — refine via doc_type
}

function inferDiscipline(collection, docType) {
  const dt = (docType || '').toUpperCase()
  if (dt.includes('MECH') || dt.includes('HVAC'))        return 'MECHANICAL'
  if (dt.includes('ELEC') || dt.includes('UPS'))          return 'ELECTRICAL'
  if (dt.includes('COMM') || dt.includes('FAT'))          return 'COMMISSIONING'
  if (dt.includes('SPEC') || dt.includes('STD'))          return 'STANDARDS'
  return COLLECTION_TO_DISCIPLINE[collection] || 'STANDARDS'
}

// ── Transform backend DocumentRecord → frontend doc shape ───
function transformDocument(record) {
  const uploaded = new Date(record.uploaded_at)
  return {
    id: record.id,
    code: record.filename.replace(/\.[^.]+$/, '').toUpperCase(),
    name: record.filename,
    discipline: inferDiscipline(record.collection, record.doc_type),
    docType: record.doc_type || record.collection,
    pages: '—',              // backend doesn't track page count
    size: '—',               // backend doesn't track file size
    status: 'indexed',
    chunks: record.chunks_indexed,
    lastUpdated: uploaded.toISOString().slice(0, 10),
    active: true,
  }
}

// ── Transform backend RFIQueryResponse → frontend answer msg ─
const CONFIDENCE_MAP = { HIGH: 92, MEDIUM: 70, LOW: 40 }

function transformCitation(cit, index) {
  return {
    index: index + 1,
    docCode: cit.source || 'Unknown Source',
    docName: cit.source || 'Document',
    page: parseInt(cit.section?.match(/\d+/)?.[0] || '1', 10),
    clause: cit.section || '—',
    relevance: 80,           // backend doesn't return relevance scores
    excerpt: cit.excerpt || '',
  }
}

function transformRFIResponse(apiResponse, questionId, startTime) {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const citations = (apiResponse.citations || []).map(transformCitation)

  // The backend returns a single "answer" field. We split it into the
  // three sections the UI expects (answer / reasoning / conclusion).
  // If the answer is short, we duplicate it into reasoning for visual
  // consistency; the UI is designed to always show all four sections.
  const rawAnswer = apiResponse.answer || ''
  const sentences = rawAnswer.split(/(?<=\.)\s+/)
  const totalSentences = sentences.length

  let answer, reasoning, conclusion
  if (totalSentences <= 3) {
    answer = rawAnswer
    reasoning = 'Analysis based on retrieved project documents.'
    conclusion = rawAnswer
  } else {
    // Split roughly into thirds
    const third = Math.ceil(totalSentences / 3)
    answer = sentences.slice(0, third).join(' ')
    reasoning = sentences.slice(third, third * 2).join(' ')
    conclusion = sentences.slice(third * 2).join(' ')
  }

  // Inject [N] citation references into the answer text so the
  // existing renderWithCitations() helper can highlight them.
  const citRefs = citations.map((_, i) => `[${i + 1}]`).join(' ')
  if (citations.length > 0 && !answer.includes('[')) {
    answer = `${answer} ${citRefs}`
  }

  return {
    id: `a-${Date.now()}`,
    type: 'answer',
    questionId,
    timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    confidence: CONFIDENCE_MAP[apiResponse.confidence] || 70,
    sourcesCount: citations.length,
    responseTime: parseFloat(elapsed),
    answer,
    reasoning,
    conclusion,
    citations,
    contextSufficient: apiResponse.context_sufficient,
    possibleDuplicateRfis: apiResponse.possible_duplicate_rfis || [],
  }
}

// ── Public API ──────────────────────────────────────────────

/**
 * Fetch all documents from the backend, transformed for the UI.
 * Returns { data: doc[], error } where data is null on failure.
 */
export async function fetchDocuments() {
  const { data, error } = await apiGet('/documents')
  if (error || !data) return { data: null, error }
  return { data: data.map(transformDocument), error: null }
}

/**
 * Ask a question to the RFI copilot agent.
 * Returns { data: transformedAnswerMsg, error }.
 */
export async function askQuestion(question, chatHistory = []) {
  const startTime = Date.now()
  const questionId = `q-${startTime}`

  const { data, error } = await apiPost(
    '/agents/rfi-copilot',
    { question, chat_history: chatHistory },
    { timeout: 60000 }  // LLM calls can be slow
  )

  if (error || !data) return { data: null, error }
  return {
    data: transformRFIResponse(data, questionId, startTime),
    error: null,
  }
}

/**
 * Upload a document to the backend for ingestion.
 * Returns { data: transformedDoc, error }.
 */
export async function uploadDocument(file, collection = 'project_docs_rfi', docType = '') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('collection', collection)
  formData.append('doc_type', docType)

  const { data, error } = await apiPost('/documents/upload', formData, { timeout: 120000 })
  if (error || !data) return { data: null, error }
  return { data: transformDocument(data), error: null }
}
