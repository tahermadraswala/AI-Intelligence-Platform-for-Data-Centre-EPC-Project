import { useState, useRef, useEffect } from 'react'
import {
  Brain,
  FileText,
  ChevronRight,
  Send,
  Loader2,
  Plus,
} from 'lucide-react'
import {
  documents as initialDocs,
  initialMessages,
  suggestedQuestions,
  cannedResponse,
} from '../data/documentQAData'
import {
  fetchDocuments,
  askQuestion,
  uploadDocument,
} from '../services/documentQAService'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const DISCIPLINE_ORDER = ['ELECTRICAL', 'MECHANICAL', 'STANDARDS', 'COMMISSIONING']
const DISCIPLINE_LABELS = {
  ELECTRICAL: 'Electrical',
  MECHANICAL: 'Mechanical',
  STANDARDS: 'Standards',
  COMMISSIONING: 'Commissioning',
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function formatTime() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// Parse reasoning text and render [N] as interactive superscript citations.
// e.stopPropagation prevents the parent message click from clearing the highlight.
function renderWithCitations(text, activeCitIndex, hoveredCitIndex, onCitClick, onCitHover, answerId) {
  if (!text) return null
  return text.split(/(\[\d+\])/g).map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/)
    if (match) {
      const idx = parseInt(match[1])
      const isActive = activeCitIndex === idx
      const isHovered = hoveredCitIndex === idx
      return (
        <sup
          key={i}
          id={`inline-cit-${answerId}-${idx}`}
          onClick={(e) => { e.stopPropagation(); onCitClick(idx) }}
          onMouseEnter={() => onCitHover && onCitHover(idx)}
          onMouseLeave={() => onCitHover && onCitHover(null)}
          className={`font-mono text-[9px] font-bold cursor-pointer select-none px-1 py-px mx-px transition-all duration-150 ${
            isActive
              ? 'bg-olive-primary text-card-bg'
              : isHovered
              ? 'bg-olive-primary/20 text-olive-primary border border-olive-primary/30'
              : 'text-olive-primary bg-olive-light/50 border border-transparent hover:bg-olive-light'
          }`}
        >
          {part}
        </sup>
      )
    }
    return <span key={i}>{part}</span>
  })
}

// 5-dot visual confidence indicator
function ConfidenceDots({ value }) {
  const filled = Math.round(value / 20)
  return (
    <span className="flex items-center gap-[3px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
            i <= filled ? 'bg-olive-primary' : 'bg-border-primary'
          }`}
        />
      ))}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// DocumentLibrary — Left panel (280px fixed for premium density)
// Manages knowledge base scope via per-document toggles
// ─────────────────────────────────────────────────────────────
function DocumentLibrary({ docs, onToggle, onUpload, isUploading }) {
  const activeCount = docs.filter((d) => d.active).length
  const totalChunks = docs.reduce((sum, d) => sum + (d.active ? d.chunks : 0), 0)
  const fileInputRef = useRef(null)

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
    e.target.value = '' // reset so same file can be re-uploaded
  }

  return (
    <div className="w-[280px] shrink-0 border-r border-border-primary flex flex-col bg-card-bg">

      {/* Hidden file input for document upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header with technical RAG stats */}
      <div className="px-5 py-4 border-b border-border-primary shrink-0 bg-primary-bg/30">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-text-primary">
            Workspace Context
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1 text-olive-primary hover:text-olive-dark transition-colors duration-150 cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span className="text-[9px] font-mono uppercase tracking-wider font-semibold">
              {isUploading ? 'Uploading...' : 'Add Doc'}
            </span>
          </button>
        </div>
        
        {/* Technical RAG metrics board */}
        <div className="space-y-1.5 border border-border-primary/50 bg-card-bg p-2.5 font-mono text-[9px] text-text-secondary/70">
          <div className="flex justify-between items-center">
            <span>INDEXED DOCUMENTS</span>
            <span className="font-semibold text-text-primary">
              {activeCount} / {docs.length}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>INDEXED CHUNKS</span>
            <span className="font-semibold text-text-primary">
              {totalChunks.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>RETRIEVAL COVERAGE</span>
            <span className={`font-semibold ${activeCount === docs.length ? 'text-olive-primary' : 'text-status-warning'}`}>
              {Math.round((activeCount / docs.length) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Document list grouped by engineering discipline */}
      <div className="flex-1 overflow-y-auto py-1">
        {DISCIPLINE_ORDER.map((discipline) => {
          const group = docs.filter((d) => d.discipline === discipline)
          if (group.length === 0) return null

          return (
            <div key={discipline} className="mb-2">
              {/* Discipline heading */}
              <div className="px-5 pt-3 pb-1.5">
                <p className="text-[8px] font-mono uppercase tracking-widest text-text-secondary/45 font-bold">
                  {DISCIPLINE_LABELS[discipline]}
                </p>
              </div>

              {/* Document rows */}
              {group.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onToggle(doc.id)}
                  className={`w-full px-5 py-2.5 flex items-start gap-2.5 text-left transition-colors duration-200 ease-in-out hover:bg-olive-primary/5 cursor-pointer ${
                    doc.active ? '' : 'opacity-40'
                  }`}
                >
                  {/* Custom square checkbox */}
                  <div
                    className={`w-3.5 h-3.5 shrink-0 mt-0.5 border flex items-center justify-center transition-all duration-200 ${
                      doc.active
                        ? 'bg-olive-primary border-olive-primary'
                        : 'bg-transparent border-border-primary'
                    }`}
                  >
                    {doc.active && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path
                          d="M1 3L3 5L7 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Doc metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-mono text-[9.5px] font-semibold text-text-primary/90 leading-tight truncate">
                        {doc.code}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        <div
                          className={`w-1 h-1 rounded-full ${
                            doc.status === 'indexed'  ? 'bg-status-success' :
                            doc.status === 'indexing' ? 'bg-status-warning animate-pulse' :
                                                        'bg-status-error'
                          }`}
                        />
                        <span className="font-mono text-[7.5px] uppercase tracking-wider text-text-secondary/45">
                          {doc.status}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-text-secondary/70 mt-0.5 leading-snug line-clamp-2">
                      {doc.name}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap mt-1 font-mono text-[8px] text-text-secondary/50">
                      <span className="uppercase text-[7.5px] bg-primary-bg px-1 py-px border border-border-primary/30 rounded-xs shrink-0 font-medium">
                        {doc.docType}
                      </span>
                      <span className="text-text-secondary/25">•</span>
                      <span>{doc.pages} pgs</span>
                      <span className="text-text-secondary/25">•</span>
                      <span>{doc.lastUpdated}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )
        })}
      </div>

      {/* Footer — total indexed passages */}
      <div className="px-5 py-3 border-t border-border-primary/40 shrink-0">
        <p className="text-[9px] font-mono text-text-secondary/40">
          {totalChunks.toLocaleString()} passages active in session
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// QuestionMessage — Engineer's turn in the conversation
// ─────────────────────────────────────────────────────────────
function QuestionMessage({ message }) {
  return (
    <div className="py-5 border-b border-border-primary/20">
      <div className="flex items-start gap-3">
        <span className="font-mono text-[9px] uppercase tracking-widest text-text-secondary/45 mt-0.5 w-[52px] shrink-0 leading-tight">
          You
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-[13px] leading-relaxed">{message.text}</p>
          <p className="text-text-secondary/35 font-mono text-[9px] mt-2">
            {message.timestamp} · Querying {message.scope} documents
          </p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// AnswerMessage — AI's turn: 4 structured sections
// ─────────────────────────────────────────────────────────────
function AnswerMessage({
  message,
  isSelected,
  activeCitationIndex,
  hoveredCitationIndex,
  onSelect,
  onCitationClick,
  onCitationHover,
}) {
  return (
    <div
      onClick={onSelect}
      className={`py-5 border-b border-border-primary/20 cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-olive-light/10 shadow-[inset_3px_0_0_0_var(--color-olive-primary)]'
          : 'hover:bg-primary-bg/30'
      }`}
    >
      {/* Response meta bar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1.5 w-[52px] shrink-0">
          <Brain className="w-3 h-3 text-olive-primary" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-olive-primary font-bold">AI</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ConfidenceDots value={message.confidence} />
          <span className="font-mono text-[10px] text-text-secondary/60 font-semibold">{message.confidence}% confidence</span>
          <span className="text-text-secondary/30">·</span>
          <span className="font-mono text-[10px] text-text-secondary/60 font-semibold">{message.sourcesCount} sources</span>
          <span className="text-text-secondary/30">·</span>
          <span className="font-mono text-[10px] text-text-secondary/60 font-semibold">{message.responseTime}s</span>
        </div>
      </div>

      <div className="ml-[68px] space-y-3">
        {/* Unified, high-density structured layout */}
        <div className="border border-border-primary bg-card-bg rounded-md shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out">
          {/* SECTION 1: ANSWER */}
          <div className="px-4 py-3">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-olive-primary block mb-1">
              01 / Answer
            </span>
            <div className="text-text-primary text-[13.5px] font-semibold leading-[1.65]">
              {renderWithCitations(
                message.answer,
                activeCitationIndex,
                hoveredCitationIndex,
                (idx) => onCitationClick(message.id, idx),
                onCitationHover,
                message.id
              )}
            </div>
          </div>

          {/* SECTION 2: REASONING */}
          <div className="px-4 py-3 border-t border-border-primary/45">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-text-secondary/60 block mb-1">
              02 / Reasoning
            </span>
            <div className="text-text-primary text-[12.5px] leading-[1.7] text-text-primary/95">
              {renderWithCitations(
                message.reasoning,
                activeCitationIndex,
                hoveredCitationIndex,
                (idx) => onCitationClick(message.id, idx),
                onCitationHover,
                message.id
              )}
            </div>
          </div>

          {/* SECTION 3: SUPPORTING EVIDENCE */}
          <div className="px-4 py-3 border-t border-border-primary/45">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-text-secondary/60 block mb-1.5">
              03 / Supporting Evidence
            </span>
            <div className="space-y-2">
              {message.citations.map((cit) => {
                const isActive = activeCitationIndex === cit.index
                const isHovered = hoveredCitationIndex === cit.index
                return (
                  <div
                    key={cit.index}
                    onClick={(e) => { e.stopPropagation(); onCitationClick(message.id, cit.index) }}
                    onMouseEnter={() => onCitationHover && onCitationHover(cit.index)}
                    onMouseLeave={() => onCitationHover && onCitationHover(null)}
                    className={`p-2.5 border transition-all duration-200 cursor-pointer flex items-start gap-2.5 ${
                      isActive 
                        ? 'bg-olive-light/30 border-olive-primary' 
                        : isHovered
                        ? 'bg-primary-bg/70 border-border-primary/80'
                        : 'bg-primary-bg/25 border-border-primary/30 hover:border-border-primary/70 hover:bg-primary-bg/40'
                    }`}
                  >
                    <span className={`font-mono text-[10.5px] font-bold ${isActive ? 'text-olive-primary' : 'text-olive-primary/50'}`}>
                      [{cit.index}]
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[9.5px] font-bold text-text-primary/80">{cit.docCode}</span>
                        <span className="text-text-secondary/25 text-[9px] font-semibold">•</span>
                        <span className="font-mono text-[9px] text-text-secondary/65 font-medium">Page {cit.page} · {cit.clause}</span>
                        <span className="text-text-secondary/25 text-[9px] font-semibold">•</span>
                        <span className="font-mono text-[9px] font-bold text-status-success">{cit.relevance}% Match</span>
                      </div>
                      <p className="text-[11px] text-text-secondary/75 italic mt-1.5 leading-relaxed line-clamp-1">
                        {cit.excerpt}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* SECTION 4: CONCLUSION */}
          <div className="px-4 py-3 border-t border-border-primary/45">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-text-secondary/60 block mb-1">
              04 / Conclusion
            </span>
            <div className="text-text-primary text-[12.5px] leading-[1.65] font-medium text-text-primary/90">
              {renderWithCitations(
                message.conclusion,
                activeCitationIndex,
                hoveredCitationIndex,
                (idx) => onCitationClick(message.id, idx),
                onCitationHover,
                message.id
              )}
            </div>
          </div>
        </div>

        <p className="text-text-secondary/35 font-mono text-[9px]">{message.timestamp}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// GeneratingMessage — Shown while AI is processing
// Streams step-by-step through section boundaries
// ─────────────────────────────────────────────────────────────
function GeneratingMessage({ genMsg, activeDocs, messageCitations }) {
  const { phase, answer, reasoning, conclusion } = genMsg

  return (
    <div className="py-5 border-b border-border-primary/10">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1.5 w-[52px] shrink-0">
          <Brain className="w-3 h-3 text-olive-primary animate-pulse" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-olive-primary font-bold">AI</span>
        </div>

        {phase === 'searching' && (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-olive-primary/70 animate-spin" />
            <span className="text-text-secondary text-[12px] font-mono tracking-tight">
              SEARCHING {activeDocs} INDEXED DOCUMENTS...
            </span>
          </div>
        )}
      </div>

      {phase !== 'searching' && (
        <div className="ml-[68px]">
          <div className="border border-border-primary bg-card-bg rounded-md shadow-sm">
            {/* Answer Section */}
            <div className="px-4 py-3">
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-olive-primary block mb-1">
                01 / Answer
              </span>
              <div className="text-text-primary text-[13.5px] font-semibold leading-[1.65]">
                {answer}
                {phase === 'streaming_answer' && (
                  <span className="inline-block w-1.5 h-3 bg-olive-primary ml-1 align-middle animate-pulse" />
                )}
              </div>
            </div>

            {/* Reasoning Section */}
            {(phase === 'streaming_reasoning' || reasoning) && (
              <div className="px-4 py-3 border-t border-border-primary/45">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-text-secondary/60 block mb-1">
                  02 / Reasoning
                </span>
                <div className="text-text-primary text-[12.5px] leading-[1.7] text-text-primary/95">
                  {reasoning}
                  {phase === 'streaming_reasoning' && (
                    <span className="inline-block w-1.5 h-3 bg-olive-primary ml-1 align-middle animate-pulse" />
                  )}
                </div>
              </div>
            )}

            {/* Citations Section */}
            {(phase === 'citations' || phase === 'streaming_conclusion' || conclusion) && (
              <div className="px-4 py-3 border-t border-border-primary/45">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-text-secondary/60 block mb-1.5">
                  03 / Supporting Evidence
                </span>
                {phase === 'citations' ? (
                  <div className="flex items-center gap-2 py-1">
                    <Loader2 className="w-3 h-3 text-olive-primary/60 animate-spin" />
                    <span className="text-text-secondary/60 text-[11px] font-mono">RETRIEVING AUDIT EVIDENCE CHUNKS...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messageCitations.map((cit) => (
                      <div
                        key={cit.index}
                        className="p-2.5 border border-border-primary/30 bg-primary-bg/25 flex items-start gap-2.5"
                      >
                        <span className="font-mono text-[10.5px] font-bold text-olive-primary/50">
                          [{cit.index}]
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[9.5px] font-bold text-text-primary/80">{cit.docCode}</span>
                            <span className="text-text-secondary/25 text-[9px] font-semibold">•</span>
                            <span className="font-mono text-[9px] text-text-secondary/65 font-medium">Page {cit.page} · {cit.clause}</span>
                            <span className="text-text-secondary/25 text-[9px] font-semibold">•</span>
                            <span className="font-mono text-[9px] font-bold text-status-success">{cit.relevance}% Match</span>
                          </div>
                          <p className="text-[11px] text-text-secondary/75 italic mt-1.5 leading-relaxed line-clamp-1">
                            {cit.excerpt}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conclusion Section */}
            {(phase === 'streaming_conclusion' || conclusion) && (
              <div className="px-4 py-3 border-t border-border-primary/45">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-text-secondary/60 block mb-1">
                  04 / Conclusion
                </span>
                <div className="text-text-primary text-[12.5px] leading-[1.65] font-medium text-text-primary/90">
                  {conclusion}
                  {phase === 'streaming_conclusion' && (
                    <span className="inline-block w-1.5 h-3 bg-olive-primary ml-1 align-middle animate-pulse" />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// EmptyConversation — 2x2 custom prompt card layout
// ─────────────────────────────────────────────────────────────
function EmptyConversation({ onSuggestion }) {
  return (
    <div className="py-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-text-primary text-[18px] font-semibold tracking-tight mb-2.5">
          Enterprise Document Q&A Workstation
        </h1>
        <p className="text-text-secondary text-[13px] leading-relaxed max-w-xl">
          Query India-Mumbai-Phase1 EPC engineering project specifications, vendor datasheets, standards, and commissioning records. SiteIQ utilizes multi-document RAG to cross-reference constraints and flag compliance anomalies.
        </p>
      </div>

      <div>
        <p className="text-[9px] font-mono uppercase tracking-widest text-text-secondary/50 mb-3.5 font-bold">
          Example Engineering Prompts
        </p>
        <div className="grid grid-cols-2 gap-3.5">
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => onSuggestion(q)}
              className="text-left p-4 border border-border-primary bg-card-bg rounded-md shadow-sm text-text-secondary hover:text-text-primary hover:border-olive-primary/50 hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 ease-in-out flex flex-col justify-between h-[120px] cursor-pointer group"
            >
              <p className="text-[12px] leading-snug line-clamp-3 text-text-secondary/85 group-hover:text-text-primary transition-colors duration-150">
                {q}
              </p>
              <div className="flex items-center gap-1 text-[8.5px] font-mono uppercase tracking-wider text-olive-primary/70 mt-2 font-bold">
                <span>Run Query</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-150" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CitationCard — Custom source cards in the panel
// ─────────────────────────────────────────────────────────────
function CitationCard({
  citation,
  answerId,
  isHighlighted,
  isHovered,
  isStrongest,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) {
  const relevanceColor =
    citation.relevance >= 90 ? 'text-status-success' :
    citation.relevance >= 75 ? 'text-olive-primary' :
                               'text-status-warning'

  const confidenceLevel =
    citation.relevance >= 90 ? 'HIGH' :
    citation.relevance >= 75 ? 'MEDIUM' :
                               'LOW'

  return (
    <div
      id={`cit-${answerId}-${citation.index}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`px-5 py-4 border-b border-border-primary/25 cursor-pointer transition-all duration-200 ${
        isStrongest 
          ? 'bg-olive-light/5 border-l-2 border-l-olive-primary' 
          : 'border-l border-l-transparent'
      } ${
        isHighlighted
          ? 'bg-olive-light/20 shadow-xs'
          : isHovered
          ? 'bg-primary-bg/70'
          : 'hover:bg-primary-bg/40'
      }`}
    >
      {/* Standout banner for strongest match */}
      {isStrongest && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="bg-olive-primary text-card-bg text-[7.5px] font-mono font-bold px-1.5 py-0.5 tracking-wider uppercase">
            Strongest Match
          </span>
          <span className="text-[8px] font-mono text-olive-primary/70 font-bold">
            CONFIDENCE: {confidenceLevel}
          </span>
        </div>
      )}

      {/* Citation header row */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-start gap-2 min-w-0">
          <span className="font-mono text-[11px] font-bold text-olive-primary shrink-0 mt-px">
            [{citation.index}]
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[9.5px] font-bold text-text-primary/95 leading-tight truncate">
              {citation.docCode}
            </p>
            <p className="text-[10px] text-text-secondary/65 mt-0.5 leading-snug">
              {citation.docName}
            </p>
          </div>
        </div>
        {/* Relevance score */}
        <div className="flex flex-col items-end shrink-0">
          <span className={`font-mono text-[10px] font-bold ${relevanceColor}`}>
            {citation.relevance}%
          </span>
          <span className="text-[7.5px] font-mono text-text-secondary/40 uppercase font-semibold">
            Relevance
          </span>
        </div>
      </div>

      {/* Relevance progress bar */}
      <div className="ml-6 mb-2.5">
        <div className="h-1 bg-border-primary/20 rounded-none overflow-hidden">
          <div
            className="h-full bg-olive-primary/65 transition-all duration-700 ease-out"
            style={{ width: `${citation.relevance}%` }}
          />
        </div>
      </div>

      {/* Exact location in document */}
      <div className="ml-6 mb-2.5 flex items-center justify-between">
        <span className="font-mono text-[9.5px] text-olive-primary/80 font-semibold">
          Page {citation.page} · Clause {citation.clause}
        </span>
        {!isStrongest && (
          <span className="text-[7.5px] font-mono text-text-secondary/50 uppercase font-bold">
            Confidence: {confidenceLevel}
          </span>
        )}
      </div>

      {/* Verbatim excerpt */}
      <div className="ml-6 bg-primary-bg border border-border-primary/20 px-3 py-2.5">
        <p className="text-[11px] text-text-secondary/80 italic leading-[1.65]">
          {citation.excerpt}
        </p>
      </div>

      {/* View in document link */}
      <div className="ml-6 mt-2.5">
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-olive-primary/60 hover:text-olive-primary text-[10px] transition-colors duration-150 font-bold uppercase tracking-wide cursor-pointer"
        >
          View in document
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CitationPanel — Right panel (320px fixed)
// ─────────────────────────────────────────────────────────────
function CitationPanel({
  citations,
  questionText,
  answerId,
  activeCitationIndex,
  hoveredCitationIndex,
  onCitationSelect,
  onCitationHover,
}) {
  const hasCitations = citations.length > 0
  const maxRelevance = hasCitations ? Math.max(...citations.map((c) => c.relevance)) : 0

  return (
    <div className="w-[320px] shrink-0 border-l border-border-primary flex flex-col bg-card-bg">

      {/* Header */}
      <div className="px-5 py-4 border-b border-border-primary shrink-0 bg-primary-bg/30">
        <p className="text-[9px] font-mono uppercase tracking-widest text-text-secondary/55 mb-1.5 font-bold">
          Sources
        </p>
        {hasCitations ? (
          <>
            <p className="text-text-primary text-[12px] font-bold">
              {citations.length} passages retrieved
            </p>
            <p className="text-text-secondary/55 text-[10px] mt-1 leading-snug font-mono">
              For: &ldquo;{questionText && questionText.length > 52
                ? questionText.substring(0, 52) + '…'
                : questionText}&rdquo;
            </p>
          </>
        ) : (
          <p className="text-text-secondary/45 text-[12px] font-mono">No answer selected</p>
        )}
      </div>

      {/* Citation list */}
      <div className="flex-1 overflow-y-auto">
        {!hasCitations ? (
          /* Empty state */
          <div className="px-5 py-10 flex flex-col items-center text-center">
            <FileText className="w-7 h-7 text-border-primary/40 mb-3" />
            <p className="text-text-secondary/45 text-[12px] leading-relaxed max-w-[185px] font-mono">
              Click any AI response in the conversation to view its source citations here.
            </p>
          </div>
        ) : (
          <div key={answerId} style={{ animation: 'siqFadeUp 260ms ease-out both' }}>
            {citations.map((cit) => (
              <CitationCard
                key={cit.index}
                citation={cit}
                answerId={answerId}
                isHighlighted={activeCitationIndex === cit.index}
                isHovered={hoveredCitationIndex === cit.index}
                isStrongest={cit.relevance === maxRelevance}
                onClick={() => onCitationSelect(cit.index)}
                onMouseEnter={() => onCitationHover && onCitationHover(cit.index)}
                onMouseLeave={() => onCitationHover && onCitationHover(null)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DocumentQA — Main orchestrator
// ─────────────────────────────────────────────────────────────
export default function DocumentQA() {

  // ── State ────────────────────────────────────────────────
  const [docs, setDocs] = useState(initialDocs)
  const [messages, setMessages] = useState(initialMessages)
  // Default to the last pre-loaded answer so the right panel is populated on load
  const [selectedAnswerId, setSelectedAnswerId] = useState('init-a-3')
  const [activeCitationIndex, setActiveCitationIndex] = useState(null)
  const [hoveredCitationIndex, setHoveredCitationIndex] = useState(null)
  const [inputText, setInputText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingMessage, setGeneratingMessage] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [backendAvailable, setBackendAvailable] = useState(false)

  const timeoutsRef  = useRef([])
  const intervalsRef = useRef([])
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // ── Derived ──────────────────────────────────────────────
  const activeDocs = docs.filter((d) => d.active).length
  const selectedAnswer   = messages.find((m) => m.id === selectedAnswerId && m.type === 'answer')
  const selectedQuestion = messages.find((m) => m.id === selectedAnswer?.questionId)

  // ── Effects ──────────────────────────────────────────────

  // On mount: try to load documents from the backend.
  // If backend is down, keep mock data — the user never notices.
  useEffect(() => {
    let cancelled = false
    async function loadDocs() {
      const { data, error } = await fetchDocuments()
      if (cancelled) return
      if (data && data.length > 0) {
        setDocs(data)
        setBackendAvailable(true)
        // Clear mock messages since we're live now
        setMessages([])
        setSelectedAnswerId(null)
      } else {
        // Backend unreachable or empty — keep mock data
        setBackendAvailable(false)
      }
    }
    loadDocs()
    return () => { cancelled = true }
  }, [])

  // Auto-scroll to latest message when conversation grows
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, generatingMessage?.phase])

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout)
      intervalsRef.current.forEach(clearInterval)
    }
  }, [])

  // ── Handlers ─────────────────────────────────────────────

  function toggleDoc(docId) {
    setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, active: !d.active } : d)))
  }

  // Clicking an answer message selects it for the right panel
  function handleAnswerSelect(msgId) {
    setSelectedAnswerId(msgId)
    setActiveCitationIndex(null) // clear citation highlight when switching responses
  }

  // Clicking [N] inline: select the answer AND highlight that citation card in the panel
  function handleCitationClick(msgId, citIndex) {
    setSelectedAnswerId(msgId)
    setActiveCitationIndex(citIndex)
    // Scroll the highlighted citation card into view in the right panel
    setTimeout(() => {
      document.getElementById(`cit-${msgId}-${citIndex}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }, 50)
  }

  // Clicking a citation card in the right panel: toggles highlight and scrolls inline citation into view
  function handleCitationCardSelect(citIndex) {
    setActiveCitationIndex((prev) => (prev === citIndex ? null : citIndex))
    setTimeout(() => {
      document.getElementById(`inline-cit-${selectedAnswerId}-${citIndex}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 50)
  }

  // Populate input with suggested question
  function handleSuggestion(text) {
    setInputText(text)
    inputRef.current?.focus()
  }

  function clearAllTimers() {
    timeoutsRef.current.forEach(clearTimeout)
    intervalsRef.current.forEach(clearInterval)
    timeoutsRef.current = []
    intervalsRef.current = []
  }

  // ── Upload handler ─────────────────────────────────────────
  async function handleUpload(file) {
    setIsUploading(true)
    const { data, error } = await uploadDocument(file)
    setIsUploading(false)

    if (data) {
      setDocs((prev) => [data, ...prev])
      setBackendAvailable(true)
    } else {
      console.warn('Document upload failed:', error?.message)
    }
  }

  // ── Streaming animation for backend response ──────────────
  // Takes a completed response object and animates it section-
  // by-section through the same visual phases as the mock flow.
  function streamResponse(responseMsg, questionId) {
    clearAllTimers()
    setGeneratingMessage({ phase: 'searching', answer: '', reasoning: '', conclusion: '' })

    const t1 = setTimeout(() => {
      setGeneratingMessage({ phase: 'streaming_answer', answer: '', reasoning: '', conclusion: '' })

      const answerWords = (responseMsg.answer || '').split(' ')
      let answerWordIdx = 0

      const answerInterval = setInterval(() => {
        if (answerWordIdx < answerWords.length) {
          setGeneratingMessage((prev) => ({
            ...prev,
            answer: prev.answer + (answerWordIdx === 0 ? '' : ' ') + answerWords[answerWordIdx],
          }))
          answerWordIdx++
        } else {
          clearInterval(answerInterval)
          setGeneratingMessage((prev) => ({ ...prev, phase: 'streaming_reasoning' }))

          const reasoningWords = (responseMsg.reasoning || '').split(' ')
          let reasoningWordIdx = 0

          const reasoningInterval = setInterval(() => {
            if (reasoningWordIdx < reasoningWords.length) {
              setGeneratingMessage((prev) => ({
                ...prev,
                reasoning: prev.reasoning + (reasoningWordIdx === 0 ? '' : ' ') + reasoningWords[reasoningWordIdx],
              }))
              reasoningWordIdx++
            } else {
              clearInterval(reasoningInterval)
              setGeneratingMessage((prev) => ({ ...prev, phase: 'citations' }))

              const t2 = setTimeout(() => {
                setGeneratingMessage((prev) => ({ ...prev, phase: 'streaming_conclusion' }))

                const conclusionWords = (responseMsg.conclusion || '').split(' ')
                let conclusionWordIdx = 0

                const conclusionInterval = setInterval(() => {
                  if (conclusionWordIdx < conclusionWords.length) {
                    setGeneratingMessage((prev) => ({
                      ...prev,
                      conclusion: prev.conclusion + (conclusionWordIdx === 0 ? '' : ' ') + conclusionWords[conclusionWordIdx],
                    }))
                    conclusionWordIdx++
                  } else {
                    clearInterval(conclusionInterval)

                    const t3 = setTimeout(() => {
                      setMessages((prev) => [...prev, responseMsg])
                      setSelectedAnswerId(responseMsg.id)
                      setActiveCitationIndex(null)
                      setIsGenerating(false)
                      setGeneratingMessage(null)
                    }, 500)
                    timeoutsRef.current.push(t3)
                  }
                }, 28)
                intervalsRef.current.push(conclusionInterval)
              }, 500)
              timeoutsRef.current.push(t2)
            }
          }, 28)
          intervalsRef.current.push(reasoningInterval)
        }
      }, 28)
      intervalsRef.current.push(answerInterval)
    }, 700)
    timeoutsRef.current.push(t1)
  }

  // ── Generation sequence ───────────────────────────────────
  // Tries the backend first; falls back to mock canned response.
  async function handleSubmit() {
    if (!inputText.trim() || isGenerating) return

    const question = inputText.trim()
    const questionId = `q-${Date.now()}`

    setInputText('')

    // Add question to conversation immediately
    setMessages((prev) => [
      ...prev,
      {
        id: questionId,
        type: 'question',
        text: question,
        timestamp: formatTime(),
        scope: activeDocs,
      },
    ])

    setIsGenerating(true)

    if (backendAvailable) {
      // ── Live backend path ──────────────────────────
      setGeneratingMessage({ phase: 'searching', answer: '', reasoning: '', conclusion: '' })

      const { data: responseMsg, error } = await askQuestion(question)

      if (responseMsg) {
        // Override questionId to link question → answer
        responseMsg.questionId = questionId
        streamResponse(responseMsg, questionId)
        return
      }

      // Backend call failed — fall through to mock path
      console.warn('Backend call failed, using mock response:', error?.message)
    }

    // ── Mock fallback path ────────────────────────────
    const answerId = `a-${Date.now() + 1}`
    const mockResponse = {
      id: answerId,
      type: 'answer',
      questionId,
      timestamp: formatTime(),
      ...cannedResponse,
    }
    streamResponse(mockResponse, questionId)
  }

  // ── Render ───────────────────────────────────────────────
  // -mx-12 -my-10: negate Layout's padding to build a full-height workstation
  return (
    <div className="flex -mx-12 -my-10 h-[calc(100vh-72px)]">

      {/* ── Left: Document Library ── */}
      <DocumentLibrary docs={docs} onToggle={toggleDoc} onUpload={handleUpload} isUploading={isUploading} />

      {/* ── Center: Conversation Workspace ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-primary-bg/25 border-r border-border-primary/50">

        {/* Scrollable messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {messages.length === 0 && !generatingMessage ? (
            <EmptyConversation onSuggestion={handleSuggestion} />
          ) : (
            <div className="max-w-[760px]">
              {messages.map((msg) =>
                msg.type === 'question' ? (
                  <QuestionMessage key={msg.id} message={msg} />
                ) : (
                  <AnswerMessage
                    key={msg.id}
                    message={msg}
                    isSelected={selectedAnswerId === msg.id}
                    activeCitationIndex={selectedAnswerId === msg.id ? activeCitationIndex : null}
                    hoveredCitationIndex={selectedAnswerId === msg.id ? hoveredCitationIndex : null}
                    onSelect={() => handleAnswerSelect(msg.id)}
                    onCitationClick={handleCitationClick}
                    onCitationHover={setHoveredCitationIndex}
                  />
                )
              )}

              {generatingMessage && (
                <GeneratingMessage
                  genMsg={generatingMessage}
                  activeDocs={activeDocs}
                  messageCitations={generatingMessage._liveCitations || cannedResponse.citations}
                />
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Fixed input bar */}
        <div className="shrink-0 border-t border-border-primary bg-card-bg px-8 py-4">
          <div className="max-w-[760px]">
            <div className="flex items-end gap-3">
              {/* Textarea */}
              <div className="flex-1 border border-border-primary rounded-md shadow-sm bg-primary-bg/50 focus-within:border-olive-primary/50 focus-within:shadow-md transition-all duration-200 ease-in-out">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit()
                    }
                  }}
                  placeholder="Ask about specifications, drawings, standards, commissioning records or vendor documents..."
                  rows={2}
                  disabled={isGenerating}
                  className="w-full px-4 py-3 bg-transparent text-text-primary text-[13px] leading-relaxed placeholder:text-text-secondary/40 resize-none outline-none disabled:opacity-50"
                />
              </div>

              {/* Send button */}
              <button
                onClick={handleSubmit}
                disabled={!inputText.trim() || isGenerating}
                className={`shrink-0 flex items-center justify-center w-11 h-11 rounded-md transition-all duration-200 ease-in-out ${
                  inputText.trim() && !isGenerating
                    ? 'bg-olive-primary hover:bg-olive-dark text-card-bg cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-[1px]'
                    : 'bg-border-primary/30 text-text-secondary/40 cursor-not-allowed'
                }`}
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Scope + keyboard hint */}
            <p className="text-text-secondary/35 text-[10px] font-mono mt-2 select-none">
              Querying {activeDocs} of {docs.length} documents · Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* ── Right: Citation Panel ── */}
      <CitationPanel
        citations={selectedAnswer?.citations || []}
        questionText={selectedQuestion?.text}
        answerId={selectedAnswerId}
        activeCitationIndex={activeCitationIndex}
        hoveredCitationIndex={hoveredCitationIndex}
        onCitationSelect={handleCitationCardSelect}
        onCitationHover={setHoveredCitationIndex}
      />

    </div>
  )
}
