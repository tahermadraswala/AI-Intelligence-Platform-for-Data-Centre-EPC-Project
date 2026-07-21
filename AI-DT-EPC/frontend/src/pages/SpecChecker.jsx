import { useState, useRef } from 'react'
import {
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Brain,
  FileText,
  ChevronRight,
  RotateCcw,
  Loader2,
} from 'lucide-react'
import { loadingSteps } from '../data/specCheckerData'
import {
  uploadSpecDocument,
  uploadSubmittalDocument,
  runSpecCompliance,
} from '../services/specCheckerService'

// ─────────────────────────────────────────────────────────────
// StatusBadge — Pill label for FAIL / WARNING / PASS
// ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    FAIL:    'bg-status-error/10 text-status-error border-status-error/30',
    WARNING: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    PASS:    'bg-status-success/10 text-status-success border-status-success/30',
  }
  return (
    <span className={`inline-flex items-center font-mono text-[10px] font-bold tracking-wider px-2 py-0.5 border ${styles[status] || styles.PASS}`}>
      {status}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// UploadZone — Document upload target with drag-and-drop
// Now triggers a real file upload to the backend.
//
// Props:
//   label, description         — UI text
//   uploadStatus               — 'idle' | 'uploading' | 'success' | 'error'
//   filename                   — name of the successfully uploaded file
//   fileSize                   — human-readable size
//   chunksIndexed              — chunk count returned by backend
//   errorMessage               — error string on failure
//   onFileSelect(file)         — callback when a file is chosen
//   onRemove()                 — callback to clear / allow re-upload
// ─────────────────────────────────────────────────────────────
function UploadZone({
  label,
  description,
  uploadStatus,
  filename,
  fileSize,
  chunksIndexed,
  errorMessage,
  onFileSelect,
  onRemove,
}) {
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)
  const fileInputRef = useRef(null)

  function handleDragEnter(e) {
    e.preventDefault()
    dragCounter.current++
    setIsDragging(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setIsDragging(false)
    }
  }

  function handleDragOver(e) {
    e.preventDefault()
  }

  function handleDrop(e) {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragging(false)

    const dropped = e.dataTransfer?.files?.[0]
    if (dropped) onFileSelect(dropped)
  }

  function handleFileInputChange(e) {
    const file = e.target.files?.[0]
    if (file) onFileSelect(file)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  return (
    <div>
      <p className="text-text-primary text-[13px] font-semibold mb-0.5">{label}</p>
      <p className="text-text-secondary text-[11px] mb-3">{description}</p>

      {/* Hidden file input for the file picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.csv"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* ── Uploading state ── */}
      {uploadStatus === 'uploading' && (
        <div className="border border-olive-primary/30 bg-olive-light/10 p-4 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-olive-primary animate-spin shrink-0" />
          <div>
            <p className="text-text-primary text-[12px] font-mono font-medium leading-snug">
              Uploading & indexing…
            </p>
            <p className="text-text-secondary/50 text-[10px] font-mono mt-0.5">
              Sending to backend for ingestion
            </p>
          </div>
        </div>
      )}

      {/* ── Success state ── */}
      {uploadStatus === 'success' && (
        <div
          className="border border-status-success/40 bg-status-success/5 p-4 flex items-center justify-between"
          style={{ animation: 'siqCheckBounce 380ms ease-out both' }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
            <div>
              <p className="text-text-primary text-[12px] font-mono font-medium leading-snug">{filename}</p>
              <p className="text-text-secondary/50 text-[10px] font-mono mt-0.5">
                {fileSize}{chunksIndexed != null ? ` · ${chunksIndexed} chunks indexed` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onRemove}
            className="text-text-secondary/40 hover:text-text-primary text-[11px] font-medium transition-colors duration-150 ml-3 shrink-0"
          >
            Remove
          </button>
        </div>
      )}

      {/* ── Error state ── */}
      {uploadStatus === 'error' && (
        <div
          className="border border-status-error/40 bg-status-error/5 p-4"
          style={{ animation: 'siqFadeUp 220ms ease-out both' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-4 h-4 text-status-error shrink-0" />
            <p className="text-text-primary text-[12px] font-medium">Upload failed</p>
          </div>
          <p className="text-text-secondary text-[11px] mb-3 leading-relaxed">
            {errorMessage || 'An unknown error occurred.'}
          </p>
          <button
            onClick={openFilePicker}
            className="text-olive-primary text-[11px] font-semibold underline underline-offset-2 hover:text-olive-dark transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* ── Idle / empty drop zone ── */}
      {uploadStatus === 'idle' && (
        <button
          type="button"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={openFilePicker}
          className={`w-full border-2 border-dashed p-10 flex flex-col items-center gap-3 group cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-olive-primary/70 bg-olive-light/20'
              : 'border-border-primary hover:border-olive-primary/40 bg-primary-bg hover:bg-olive-light/5'
          }`}
        >
          <Upload
            className={`w-7 h-7 transition-colors duration-200 ${
              isDragging
                ? 'text-olive-primary'
                : 'text-text-secondary/30 group-hover:text-olive-primary/60'
            }`}
          />
          <div className="text-center pointer-events-none">
            <p
              className={`text-[13px] transition-colors duration-200 ${
                isDragging
                  ? 'text-olive-primary font-medium'
                  : 'text-text-secondary group-hover:text-text-primary'
              }`}
            >
              {isDragging ? (
                'Release to upload'
              ) : (
                <>Drop PDF here or <span className="text-olive-primary underline underline-offset-2">browse</span></>
              )}
            </p>
            <p className="text-text-secondary/40 text-[11px] mt-1">PDF, TXT, or CSV up to 15 MB</p>
          </div>
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// AIReasoningPanel — Sticky right panel
// ─────────────────────────────────────────────────────────────
function AIReasoningPanel({ finding }) {
  if (!finding) {
    return (
      <div className="bg-card-bg border border-border-primary rounded-md shadow-sm flex flex-col items-center justify-center text-center px-8 py-12 min-h-[320px]">
        <div className="w-10 h-10 border border-border-primary/40 flex items-center justify-center mb-4">
          <Brain className="w-5 h-5 text-border-primary/40" />
        </div>
        <p className="text-text-primary text-[13px] font-medium">Select a finding</p>
        <p className="text-text-secondary/55 text-[12px] mt-2.5 max-w-[200px] leading-relaxed">
          Click any row to view the full AI analysis, source references, and recommended action.
        </p>
      </div>
    )
  }

  return (
    <div
      className="bg-card-bg border border-border-primary rounded-md shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 ease-in-out"
      style={{ animation: 'siqFadeUp 220ms ease-out both' }}
    >
      {/* Panel header */}
      <div className="px-5 py-3.5 border-b border-border-primary/60 bg-primary-bg/40 flex items-center gap-2">
        <Brain className="w-[14px] h-[14px] text-olive-primary shrink-0" />
        <span className="text-text-primary text-[12px] font-semibold">AI Analysis</span>
      </div>

      <div className="divide-y divide-border-primary/25">
        {/* 1. Parameter */}
        <div className="px-5 py-4">
          <p className="text-text-secondary/55 text-[9px] font-mono uppercase tracking-widest mb-1.5">
            Parameter
          </p>
          <p className="text-text-primary text-[13px] font-semibold leading-snug">
            {finding.parameter}
          </p>
        </div>

        {/* 2. Status + Confidence */}
        <div className="px-5 py-4 grid grid-cols-2 gap-5">
          <div>
            <p className="text-text-secondary/55 text-[9px] font-mono uppercase tracking-widest mb-2">
              Status
            </p>
            <StatusBadge status={finding.status} />
          </div>
          <div>
            <p className="text-text-secondary/55 text-[9px] font-mono uppercase tracking-widest mb-2">
              AI Confidence
            </p>
            <span className="font-mono text-[13px] font-bold text-text-primary">
              {finding.confidence}%
            </span>
            <div className="mt-1.5 h-0.5 bg-border-primary/30">
              <div
                className="h-0.5 bg-olive-primary/70 transition-all duration-700 ease-out"
                style={{ width: `${finding.confidence}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3. AI Reasoning */}
        <div className="px-5 py-4">
          <p className="text-text-secondary/55 text-[9px] font-mono uppercase tracking-widest mb-2">
            AI Reasoning
          </p>
          <p className="text-text-primary text-[12px] leading-[1.72]">
            {finding.reasoning}
          </p>
        </div>

        {/* 4. Source References */}
        <div className="px-5 py-4">
          <p className="text-text-secondary/55 text-[9px] font-mono uppercase tracking-widest mb-2.5">
            Source References
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <FileText className="w-3 h-3 text-text-secondary/35 mt-0.5 shrink-0" />
              <span className="text-[11px] text-text-secondary font-mono leading-snug">
                {finding.sourceSpec}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="w-3 h-3 text-text-secondary/35 mt-0.5 shrink-0" />
              <span className="text-[11px] text-text-secondary font-mono leading-snug">
                {finding.sourceSubmittal}
              </span>
            </div>
          </div>
        </div>

        {/* 5. Recommended Action — hidden for PASS */}
        {finding.status !== 'PASS' && (
          <div className="px-5 py-4 bg-olive-light/10">
            <p className="text-text-secondary/55 text-[9px] font-mono uppercase tracking-widest mb-2">
              Recommended Action
            </p>
            <p className="text-[12px] text-text-primary leading-[1.72]">
              {finding.action}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SpecChecker — Main page component
// State machine: 'upload' → 'loading' → 'results' | 'error'
// ─────────────────────────────────────────────────────────────
export default function SpecChecker() {
  // ── View state ────────────────────────────────────────────
  const [view, setView] = useState('upload')
  const [viewVisible, setViewVisible] = useState(true)

  // ── Spec upload state ─────────────────────────────────────
  const [specUploadStatus, setSpecUploadStatus] = useState('idle')   // idle | uploading | success | error
  const [specFilename, setSpecFilename] = useState(null)
  const [specFileSize, setSpecFileSize] = useState(null)
  const [specChunks, setSpecChunks] = useState(null)
  const [specDocId, setSpecDocId] = useState(null)
  const [specError, setSpecError] = useState(null)

  // ── Submittal upload state ────────────────────────────────
  const [submittalUploadStatus, setSubmittalUploadStatus] = useState('idle')
  const [submittalFilename, setSubmittalFilename] = useState(null)
  const [submittalFileSize, setSubmittalFileSize] = useState(null)
  const [submittalChunks, setSubmittalChunks] = useState(null)
  const [submittalDocId, setSubmittalDocId] = useState(null)
  const [submittalError, setSubmittalError] = useState(null)
  // Keep the raw File object so we can extract text for the compliance call
  const [submittalFileRef, setSubmittalFileRef] = useState(null)

  // ── Loading state ─────────────────────────────────────────
  const [completedSteps, setCompletedSteps] = useState([])

  // ── Results state ─────────────────────────────────────────
  const [analysisResult, setAnalysisResult] = useState(null)
  const [selectedFinding, setSelectedFinding] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')

  // ── Error state ───────────────────────────────────────────
  const [analysisError, setAnalysisError] = useState(null)

  // Ref for timeout IDs — allows safe cleanup on reset
  const timeoutsRef = useRef([])

  // ── Derived state ─────────────────────────────────────────
  const canRun = specUploadStatus === 'success' && submittalUploadStatus === 'success'

  const findings = analysisResult?.findings || []
  const filteredFindings = findings.filter((f) => {
    if (activeFilter === 'critical') return f.status === 'FAIL'
    if (activeFilter === 'warnings') return f.status === 'WARNING'
    if (activeFilter === 'passed')   return f.status === 'PASS'
    return true
  })

  const summary = analysisResult?.summary || { total: 0, critical: 0, warnings: 0, passed: 0 }
  const overallStatus = analysisResult?.overallStatus || 'UNKNOWN'
  const isCompliant = overallStatus === 'COMPLIANT'

  // ── Helpers ───────────────────────────────────────────────

  function clearAllTimeouts() {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }

  function switchToView(newView, callback) {
    setViewVisible(false)
    const t1 = setTimeout(() => {
      setView(newView)
      if (callback) callback()
      const t2 = setTimeout(() => setViewVisible(true), 40)
      timeoutsRef.current.push(t2)
    }, 280)
    timeoutsRef.current.push(t1)
  }

  // ── Upload Handlers ───────────────────────────────────────

  async function handleSpecFileSelect(file) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    setSpecUploadStatus('uploading')
    setSpecFilename(file.name)
    setSpecFileSize(`${sizeMB} MB`)
    setSpecError(null)

    const { data, error } = await uploadSpecDocument(file)

    if (error) {
      setSpecUploadStatus('error')
      setSpecError(error.message || 'Upload failed. Is the backend running?')
      return
    }

    setSpecDocId(data.id)
    setSpecFilename(data.filename)
    setSpecChunks(data.chunksIndexed)
    setSpecUploadStatus('success')
  }

  async function handleSubmittalFileSelect(file) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    setSubmittalUploadStatus('uploading')
    setSubmittalFilename(file.name)
    setSubmittalFileSize(`${sizeMB} MB`)
    setSubmittalError(null)
    setSubmittalFileRef(file)

    const { data, error } = await uploadSubmittalDocument(file)

    if (error) {
      setSubmittalUploadStatus('error')
      setSubmittalError(error.message || 'Upload failed. Is the backend running?')
      return
    }

    setSubmittalDocId(data.id)
    setSubmittalFilename(data.filename)
    setSubmittalChunks(data.chunksIndexed)
    setSubmittalUploadStatus('success')
  }

  function removeSpec() {
    setSpecUploadStatus('idle')
    setSpecFilename(null)
    setSpecFileSize(null)
    setSpecChunks(null)
    setSpecDocId(null)
    setSpecError(null)
  }

  function removeSubmittal() {
    setSubmittalUploadStatus('idle')
    setSubmittalFilename(null)
    setSubmittalFileSize(null)
    setSubmittalChunks(null)
    setSubmittalDocId(null)
    setSubmittalError(null)
    setSubmittalFileRef(null)
  }

  // ── Extract text from the submittal file for the API call ─
  async function extractSubmittalText() {
    if (!submittalFileRef) return submittalFilename || 'vendor submittal document'

    // For .txt and .csv files, read directly — both are plain text and
    // give the compliance agent the actual submittal content up front.
    const lowerName = submittalFileRef.name.toLowerCase()
    if (lowerName.endsWith('.txt') || lowerName.endsWith('.csv')) {
      return await submittalFileRef.text()
    }

    // For PDFs, send a description referencing the filename.
    // The backend will retrieve the relevant content from the vector store
    // where the submittal was already ingested.
    return `Vendor submittal document: ${submittalFilename}. Please check this submittal against the ingested specification documents for compliance. Retrieve all relevant specification clauses and compare against the submittal content in the vendor_submittals collection.`
  }

  // ── Run Analysis ──────────────────────────────────────────
  async function runAnalysis() {
    if (!canRun) return
    clearAllTimeouts()

    setAnalysisError(null)

    switchToView('loading', async () => {
      setCompletedSteps([])

      // Simulate step progression while waiting for the real API response
      const stepTimers = [800, 1800, 3000, 5000]
      stepTimers.forEach((delay, i) => {
        const t = setTimeout(() => {
          setCompletedSteps((prev) => [...prev, loadingSteps[i].id])
        }, delay)
        timeoutsRef.current.push(t)
      })

      try {
        const submittalText = await extractSubmittalText()

        const { data, error } = await runSpecCompliance(
          submittalText,
          '',  // equipmentType — let the AI determine
          specFilename,
          submittalFilename
        )

        clearAllTimeouts()

        if (error) {
          setCompletedSteps([])
          switchToView('error', () => {
            setAnalysisError(error.message || 'Compliance analysis failed.')
          })
          return
        }

        // Mark all steps as complete
        setCompletedSteps(loadingSteps.map((s) => s.id))

        // Brief pause so the user sees all steps completed
        const t = setTimeout(() => {
          switchToView('results', () => {
            setAnalysisResult(data)
            setSelectedFinding(data.findings[0] || null)
            setActiveFilter('all')
          })
        }, 600)
        timeoutsRef.current.push(t)
      } catch (err) {
        clearAllTimeouts()
        switchToView('error', () => {
          setAnalysisError(err.message || 'An unexpected error occurred.')
        })
      }
    })
  }

  // ── Reset ─────────────────────────────────────────────────
  function resetView() {
    clearAllTimeouts()
    switchToView('upload', () => {
      removeSpec()
      removeSubmittal()
      setCompletedSteps([])
      setSelectedFinding(null)
      setActiveFilter('all')
      setAnalysisResult(null)
      setAnalysisError(null)
    })
  }

  // ─────────────────────────────────────────────────────────
  // VIEW: Upload
  // ─────────────────────────────────────────────────────────
  const uploadView = (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-text-primary text-base font-semibold">New Compliance Analysis</h2>
        <p className="text-text-secondary text-xs mt-0.5">
          Upload two documents to begin AI-powered specification comparison
        </p>
      </div>

      <div className="bg-card-bg border border-border-primary rounded-md shadow-sm p-8">
        <div className="grid grid-cols-2 gap-8">
          <UploadZone
            label="Project Specification"
            description="Master spec, section, or clause document"
            uploadStatus={specUploadStatus}
            filename={specFilename}
            fileSize={specFileSize}
            chunksIndexed={specChunks}
            errorMessage={specError}
            onFileSelect={handleSpecFileSelect}
            onRemove={removeSpec}
          />
          <UploadZone
            label="Vendor Submittal"
            description="Equipment datasheet, drawing, or schedule"
            uploadStatus={submittalUploadStatus}
            filename={submittalFilename}
            fileSize={submittalFileSize}
            chunksIndexed={submittalChunks}
            errorMessage={submittalError}
            onFileSelect={handleSubmittalFileSelect}
            onRemove={removeSubmittal}
          />
        </div>

        {/* CTA Row */}
        <div className="mt-8 pt-6 border-t border-border-primary/40 flex items-center justify-between">
          <p className="text-text-secondary/55 text-[11px]">
            Supported: Text-readable PDF, TXT, or CSV · Max 15 MB per document
          </p>
          <button
            onClick={runAnalysis}
            disabled={!canRun}
            className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold transition-all duration-200 ${
              canRun
                ? 'bg-olive-primary hover:bg-olive-dark text-card-bg cursor-pointer'
                : 'bg-border-primary/30 text-text-secondary/40 cursor-not-allowed'
            }`}
          >
            Run Compliance Analysis
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────
  // VIEW: Loading
  // ─────────────────────────────────────────────────────────
  const loadingView = (
    <div className="flex items-center justify-center min-h-[55vh]">
      <div className="bg-card-bg border border-border-primary rounded-md shadow-sm p-10 w-full max-w-md">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Brain className="w-5 h-5 text-olive-primary shrink-0 animate-pulse" />
          <h2 className="text-text-primary text-[15px] font-semibold">
            AI is analysing your documents
          </h2>
        </div>

        {/* Indeterminate progress bar */}
        <div className="h-0.5 bg-border-primary/30 overflow-hidden mb-1.5 relative">
          <div className="h-0.5 bg-olive-primary absolute animate-pulse" style={{ width: '60%', left: '20%' }} />
        </div>
        <div className="flex items-center justify-between mb-7">
          <span className="text-text-secondary/35 text-[10px] font-mono">Processing…</span>
          <span className="font-mono text-[10px] text-text-secondary/60">
            {completedSteps.length} / {loadingSteps.length} steps
          </span>
        </div>

        {/* Step list */}
        <div className="space-y-4">
          {loadingSteps.map((step) => {
            const isDone   = completedSteps.includes(step.id)
            const isActive = !isDone && completedSteps.length === step.id - 1

            return (
              <div key={step.id} className="flex items-center gap-3">
                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-status-success" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 text-olive-primary animate-spin" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-border-primary/50" />
                  )}
                </div>
                <span
                  className={`text-[13px] transition-colors duration-300 ${
                    isDone   ? 'text-text-primary' :
                    isActive ? 'text-olive-primary font-medium' :
                               'text-text-secondary/35'
                  }`}
                >
                  {step.label}
                </span>
                {isDone && (
                  <span className="ml-auto text-[10px] font-mono text-text-secondary/40">done</span>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────
  // VIEW: Error
  // ─────────────────────────────────────────────────────────
  const errorView = (
    <div className="flex items-center justify-center min-h-[55vh]">
      <div className="bg-card-bg border border-border-primary rounded-md shadow-sm p-10 w-full max-w-md text-center">
        <div className="w-12 h-12 border border-status-error/30 bg-status-error/5 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-6 h-6 text-status-error" />
        </div>
        <h2 className="text-text-primary text-[15px] font-semibold mb-2">
          Analysis Failed
        </h2>
        <p className="text-text-secondary text-[12px] leading-relaxed mb-6 max-w-xs mx-auto">
          {analysisError || 'An unexpected error occurred while running the compliance analysis.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={runAnalysis}
            className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold bg-olive-primary hover:bg-olive-dark text-card-bg transition-all duration-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry Analysis
          </button>
          <button
            onClick={resetView}
            className="px-4 py-2.5 text-[12px] font-medium border border-border-primary text-text-secondary hover:text-text-primary hover:bg-primary-bg transition-all duration-150"
          >
            Start Over
          </button>
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────
  // VIEW: Results
  // ─────────────────────────────────────────────────────────
  const filterTabs = [
    { id: 'all',      label: 'All',      count: summary.total    },
    { id: 'critical', label: 'Critical', count: summary.critical },
    { id: 'warnings', label: 'Warnings', count: summary.warnings },
    { id: 'passed',   label: 'Passed',   count: summary.passed   },
  ]

  const resultsView = analysisResult ? (
    <div className="space-y-5">

      {/* ── Action bar ── */}
      <div
        className="flex items-center justify-between"
        style={{ animation: 'siqFadeUp 300ms ease-out both' }}
      >
        <div>
          <p className="text-text-secondary/55 text-[11px] font-mono">
            Analysis {analysisResult.id} ·{' '}
            {new Date(analysisResult.analysedAt).toLocaleDateString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
          {analysisResult.rawSummary && (
            <p className="text-text-secondary text-[11px] mt-1 max-w-2xl leading-relaxed">
              {analysisResult.rawSummary}
            </p>
          )}
        </div>
        <button
          onClick={resetView}
          className="flex items-center gap-2 px-4 py-2 border border-border-primary text-text-secondary text-[12px] font-medium hover:bg-primary-bg hover:text-text-primary transition-all duration-150"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          New Analysis
        </button>
      </div>

      {/* ── Compliance Verdict Strip ── */}
      <div
        className={`border-l-[5px] px-6 py-5 flex items-center justify-between ${
          isCompliant
            ? 'border-status-success bg-status-success/[0.04]'
            : 'border-status-error bg-status-error/[0.04]'
        }`}
        style={{ animation: 'siqFadeUp 300ms ease-out 50ms both' }}
      >
        <div className="flex items-start gap-4">
          {isCompliant ? (
            <CheckCircle2 className="w-[22px] h-[22px] text-status-success mt-0.5 shrink-0" />
          ) : (
            <XCircle className="w-[22px] h-[22px] text-status-error mt-0.5 shrink-0" />
          )}
          <div>
            <div
              className={`font-mono text-[13px] font-bold tracking-[0.25em] uppercase ${
                isCompliant ? 'text-status-success' : 'text-status-error'
              }`}
            >
              {overallStatus.replace(/_/g, ' ')}
            </div>
            <p className="text-text-primary text-[14px] font-semibold mt-1.5 tracking-tight">
              {analysisResult.documentName}
            </p>
            <p className="text-text-secondary text-[12px] mt-0.5">
              Analysed against:{' '}
              <span className="font-mono">{analysisResult.specDocument}</span>
            </p>
          </div>
        </div>
        <span
          className={`font-mono text-[11px] font-semibold px-3 py-1.5 shrink-0 border ${
            isCompliant
              ? 'bg-status-success/8 text-status-success border-status-success/20'
              : 'bg-status-error/8 text-status-error border-status-error/20'
          }`}
        >
          {summary.critical > 0
            ? `${summary.critical} critical · ${summary.warnings} warnings`
            : `${summary.warnings} warnings`}
        </span>
      </div>

      {/* ── KPI Cards ── */}
      <div
        className="grid grid-cols-4 gap-4"
        style={{ animation: 'siqFadeUp 300ms ease-out 150ms both' }}
      >
        {[
          { label: 'Total Checks',  value: summary.total,    color: 'text-text-primary'    },
          { label: 'Critical Fails', value: summary.critical, color: 'text-status-error'   },
          { label: 'Warnings',       value: summary.warnings, color: 'text-status-warning' },
          { label: 'Passed',         value: summary.passed,   color: 'text-status-success' },
        ].map((card) => (
          <div key={card.label} className="bg-card-bg border border-border-primary rounded-md shadow-sm px-5 py-5 hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 ease-in-out">
            <div className={`font-mono text-[2.25rem] font-bold leading-none tracking-tight ${card.color}`}>
              {card.value}
            </div>
            <div className="text-text-secondary/65 font-mono text-[9px] font-medium uppercase tracking-widest mt-2">
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Table + AI Panel ── */}
      <div
        className="flex gap-5 items-start"
        style={{ animation: 'siqFadeUp 300ms ease-out 260ms both' }}
      >

        {/* Left: Findings Table */}
        <div className="flex-1 min-w-0 bg-card-bg border border-border-primary rounded-md shadow-sm overflow-hidden">

          {/* Filter tabs */}
          <div className="px-5 py-3 border-b border-border-primary flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1.5 text-[12px] font-medium transition-all duration-200 ease-in-out rounded-sm ${
                    activeFilter === tab.id
                      ? 'bg-olive-light text-olive-dark'
                      : 'text-text-secondary hover:text-text-primary hover:bg-primary-bg/80'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`ml-1.5 font-mono text-[10px] transition-colors duration-200 ease-in-out ${
                      activeFilter === tab.id ? 'text-olive-primary' : 'text-text-secondary/50'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            <span className="text-text-secondary/45 text-[10px] font-mono">
              {filteredFindings.length} of {summary.total} findings
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto overflow-y-auto max-h-[46vh]">
            <table className="w-full">
              <thead className="sticky top-0 z-20">
                <tr className="border-b border-border-primary bg-card-bg">
                  {['#', 'Parameter', 'Required', 'Submitted', 'Variance', 'Status', 'AI Conf.'].map((col) => (
                    <th
                      key={col}
                      className="text-left text-[9px] font-mono text-text-secondary/60 uppercase tracking-widest px-4 py-3 first:pl-5 whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredFindings.map((finding, i) => {
                  const isSelected = selectedFinding?.id === finding.id

                  const accentBorder =
                    finding.status === 'FAIL'    ? 'border-l-[3px] border-status-error' :
                    finding.status === 'WARNING' ? 'border-l-[3px] border-status-warning' :
                                                   'border-l-[3px] border-transparent'

                  const varianceStyle =
                    finding.status === 'FAIL'    ? 'text-status-error font-bold' :
                    finding.status === 'WARNING' ? 'text-status-warning font-semibold' :
                                                   'text-text-secondary/40'

                  return (
                    <tr
                      key={finding.id}
                      tabIndex={0}
                      onClick={() => setSelectedFinding(finding)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedFinding(finding)
                        }
                      }}
                      className={`border-b border-border-primary/25 cursor-pointer outline-none transition-colors duration-200 ease-in-out ${accentBorder} ${
                        isSelected
                          ? 'bg-olive-light/50'
                          : 'hover:bg-primary-bg/60 focus-visible:bg-olive-light/25'
                      }`}
                    >
                      <td className="pl-5 pr-4 py-3.5 text-text-secondary/40 font-mono text-[10px]">
                        {String(i + 1).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-3.5 text-text-primary text-[13px] font-medium">
                        {finding.parameter}
                      </td>
                      <td className="px-4 py-3.5 text-text-secondary font-mono text-[11px] whitespace-nowrap">
                        {finding.required}
                      </td>
                      <td className="px-4 py-3.5 text-text-primary font-mono text-[11px] whitespace-nowrap">
                        {finding.submitted}
                      </td>
                      <td className={`px-4 py-3.5 font-mono text-[12px] ${varianceStyle}`}>
                        {finding.variance}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={finding.status} />
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-text-secondary/60">
                        {finding.confidence}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: AI Reasoning Panel */}
        <div className="w-[310px] shrink-0 sticky top-0">
          <AIReasoningPanel
            finding={selectedFinding}
            key={selectedFinding?.id ?? 'empty'}
          />
        </div>

      </div>
    </div>
  ) : null

  // ─────────────────────────────────────────────────────────
  // Root render
  // ─────────────────────────────────────────────────────────
  return (
    <div className={`transition-opacity duration-[280ms] ${viewVisible ? 'opacity-100' : 'opacity-0'}`}>
      {view === 'upload'  && uploadView}
      {view === 'loading' && loadingView}
      {view === 'results' && resultsView}
      {view === 'error'   && errorView}
    </div>
  )
}
