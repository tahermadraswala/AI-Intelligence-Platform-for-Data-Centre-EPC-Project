import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Brain, Filter, ChevronRight, CheckCircle2,
  Clock, GitCommit, GitBranch, ArrowRight, Activity, DollarSign,
  Loader2, RefreshCw, WifiOff
} from 'lucide-react';
import {
  executiveSummary as mockExecutiveSummary,
  filters as mockFilters,
  riskCards as mockRiskCards,
  timelineData as mockTimelineData,
} from '../data/scheduleRiskData';
import { runMockRiskAnalysis, fetchLatestRiskRun } from '../services/scheduleRiskService';

export default function ScheduleRisk() {
  const [activeFilter, setActiveFilter] = useState('all');

  // Live backend state. `source` tracks whether what's on screen is
  // 'mock' (static demo data / fallback) or 'live' (a real AI Schedule
  // Risk Engine run), so the UI can be honest about what it's showing.
  const [executiveSummary, setExecutiveSummary] = useState(mockExecutiveSummary);
  const [filters, setFilters] = useState(mockFilters);
  const [riskCards, setRiskCards] = useState(mockRiskCards);
  const [timelineData, setTimelineData] = useState(mockTimelineData);
  const [source, setSource] = useState('mock');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  function applyResult(result) {
    setExecutiveSummary(result.executiveSummary);
    setFilters(result.filters);
    setRiskCards(result.riskCards.length ? result.riskCards : mockRiskCards);
    setTimelineData(result.timelineData.length ? result.timelineData : mockTimelineData);
  }

  // On mount, silently check whether a previous AI analysis is already
  // on record (no LLM call needed) and show it instead of static mock data.
  useEffect(() => {
    let cancelled = false;
    async function loadLatest() {
      const { data, error } = await fetchLatestRiskRun();
      if (cancelled) return;
      if (!error && data) {
        applyResult(data);
        setSource('live');
      }
    }
    loadLatest();
    return () => { cancelled = true };
  }, []);

  // Mock risk cards don't carry `filterBucket` (that's only added by the
  // live transform), so fall back to matching on the discipline label.
  const DISCIPLINE_TO_FILTER = {
    'Civil & Structural': 'civil',
    'MEP Systems': 'mep',
    'Commissioning': 'commissioning',
  };
  function matchesFilter(risk, filterId) {
    if (filterId === 'all') return true;
    const bucket = risk.filterBucket || DISCIPLINE_TO_FILTER[risk.discipline] || 'mep';
    return bucket === filterId;
  }

  const handleRunAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    const { data, error } = await runMockRiskAnalysis();
    setIsAnalyzing(false);

    if (error || !data) {
      setErrorMessage(error?.message || 'Schedule risk analysis failed.');
      return;
    }
    applyResult(data);
    setSource('live');
  }, []);

  return (
    <div className="h-full flex flex-col animate-[siqFadeUp_0.4s_ease-out]">

      {/* 1. Sticky Executive Risk Summary Header */}
      <div className="sticky top-0 z-30 bg-[var(--color-primary-bg)] pt-2 pb-6">
        <div className="border-b border-border-primary pb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-text-primary text-2xl font-medium tracking-tight">Predictive Schedule Risk</h1>
              <p className="text-text-secondary text-sm mt-1 flex items-center">
                <Brain className="w-4 h-4 mr-1.5 text-olive-primary" />
                {source === 'live'
                  ? <>AI Engine analysis • Last updated {executiveSummary.lastUpdated}</>
                  : <>Demo data shown • Run the AI engine for a live analysis</>}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className="flex items-center space-x-2 bg-olive-primary text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-olive-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing…</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Run AI Analysis</span>
                  </>
                )}
              </button>
              <div className="flex items-center space-x-2 bg-status-error/10 text-status-error px-3 py-1.5 rounded border border-status-error/20">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-bold tracking-wide uppercase">Action Required</span>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-center space-x-2 bg-status-error/10 text-status-error px-3 py-2 rounded border border-status-error/20 text-sm mb-4">
              <WifiOff className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage} — showing {source === 'live' ? 'the last successful' : 'demo'} data below.</span>
            </div>
          )}

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm">
              <p className="text-text-secondary text-xs uppercase tracking-wider font-medium mb-1">Predicted Project Slip</p>
              <p className="font-mono text-3xl font-semibold text-status-error">{executiveSummary.predictedSlip}</p>
            </div>
            <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm">
              <p className="text-text-secondary text-xs uppercase tracking-wider font-medium mb-1">Critical Path Impact</p>
              <p className="font-mono text-xl font-medium text-text-primary truncate mt-2">{executiveSummary.criticalPathImpact}</p>
            </div>
            <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm">
              <p className="text-text-secondary text-xs uppercase tracking-wider font-medium mb-1">Financial Exposure</p>
              <p className="font-mono text-2xl font-semibold text-status-warning">{executiveSummary.financialExposure}</p>
            </div>
            <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm">
              <p className="text-text-secondary text-xs uppercase tracking-wider font-medium mb-1">AI Confidence</p>
              <p className="font-mono text-2xl font-semibold text-olive-primary flex items-center">
                {executiveSummary.confidence} <Brain className="w-5 h-5 ml-2 opacity-50" />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid (3 Columns) */}
      <div className="grid grid-cols-12 gap-8 flex-1 pb-12 items-start">

        {/* 9. Filters (Sticky Sidebar) */}
        <div className="col-span-2 sticky top-[180px]">
          <div className="flex items-center text-text-primary font-medium text-sm tracking-wide uppercase mb-4">
            <Filter className="w-4 h-4 mr-2 text-text-secondary" /> Filters
          </div>
          <div className="space-y-1">
            {filters.map(filter => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`w-full flex justify-between items-center px-3 py-2 text-sm rounded-md transition-all duration-200 ease-in-out ${
                  activeFilter === filter.id
                    ? 'bg-olive-primary/10 text-olive-primary font-medium border border-olive-primary/20'
                    : 'text-text-secondary hover:bg-card-bg hover:text-text-primary border border-transparent'
                }`}
              >
                <span>{filter.label}</span>
                <span className="font-mono text-xs opacity-70">{filter.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4, 6, 7, 8. AI Risk Cards (Scrollable Center) */}
        <div className="col-span-5 space-y-5">
          <div className="flex items-center justify-between mb-2">
             <h2 className="text-text-primary font-medium text-sm tracking-wide uppercase">Identified Risks</h2>
             <span className="text-xs text-text-secondary font-mono">
               {riskCards.filter(r => matchesFilter(r, activeFilter)).length} Items
             </span>
          </div>

          {riskCards.filter(r => matchesFilter(r, activeFilter)).map(risk => (
            <div key={risk.id} className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm hover:border-olive-primary/40 hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 ease-in-out">
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-text-primary bg-primary-bg border border-border-primary px-1.5 py-0.5 rounded">{risk.id}</span>
                  <span className="text-[10px] uppercase tracking-wider text-text-secondary font-medium">{risk.discipline}</span>
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                  risk.severity === 'Critical' ? 'bg-status-error/10 text-status-error' : 'bg-status-warning/10 text-status-warning'
                }`}>
                  {risk.severity}
                </span>
              </div>

              {/* Title & Desc */}
              <h3 className="text-base font-medium text-text-primary mb-2">{risk.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed mb-4">{risk.description}</p>

              {/* 7. Resource & Impact Grid */}
              <div className="grid grid-cols-2 gap-3 mb-5 bg-primary-bg p-3 border border-border-primary/50 rounded-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-secondary mb-1 flex items-center">
                    <Clock className="w-3 h-3 mr-1" /> Delay Impact
                  </p>
                  <p className="font-mono text-sm font-semibold text-status-error">{risk.delayImpact}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-secondary mb-1 flex items-center">
                    <DollarSign className="w-3 h-3 mr-1" /> Resource Impact
                  </p>
                  <p className="font-mono text-sm font-medium text-text-primary">{risk.costImpact}</p>
                </div>
              </div>

              {/* 6. Mitigations */}
              <div className="space-y-2 mb-4">
                <p className="text-xs font-medium tracking-wide uppercase text-text-primary mb-2">AI Mitigations</p>
                {risk.mitigations.length === 0 && (
                  <p className="text-xs text-text-secondary italic">No mitigation options returned.</p>
                )}
                {risk.mitigations.map((mit, i) => (
                  <button key={i} className="w-full flex items-center justify-between text-left p-2.5 text-sm border border-border-primary rounded-md hover:border-olive-primary hover:bg-olive-primary/5 transition-all duration-200 ease-in-out group">
                    <div className="flex items-center">
                      {mit.status === 'recommended' ? (
                        <CheckCircle2 className="w-4 h-4 mr-2 text-olive-primary" />
                      ) : (
                        <ArrowRight className="w-4 h-4 mr-2 text-text-secondary group-hover:text-olive-primary" />
                      )}
                      <span className={mit.status === 'recommended' ? 'text-text-primary font-medium' : 'text-text-secondary'}>
                        {mit.text}
                      </span>
                    </div>
                    {mit.status === 'recommended' && <span className="text-[10px] uppercase tracking-wider text-olive-primary bg-olive-primary/10 px-1.5 py-0.5 rounded">Recommended</span>}
                  </button>
                ))}
              </div>

              {/* 8. Confidence & 5. Dependencies trigger */}
              <div className="flex justify-between items-center pt-3 border-t border-border-primary mt-4">
                <span className="flex items-center text-xs font-medium text-olive-primary">
                  <Brain className="w-3.5 h-3.5 mr-1.5" /> {risk.aiConfidence} Confidence
                </span>
                <button className="text-xs text-text-secondary hover:text-text-primary flex items-center font-medium transition-colors duration-200 ease-in-out">
                  <GitBranch className="w-3.5 h-3.5 mr-1" /> Show Dependencies ({risk.dependencies.length})
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 2, 3. Critical Path & Prediction Timeline (Scrollable Right) */}
        <div className="col-span-5 space-y-6">
          <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out sticky top-[180px]">
            <h2 className="text-text-primary font-medium text-sm tracking-wide uppercase mb-6 flex items-center">
              <Activity className="w-4 h-4 mr-2 text-text-secondary" /> Delay Prediction Timeline
            </h2>

            <div className="space-y-6">
              {timelineData.map((item, idx) => (
                <div key={idx} className="relative">
                  {/* Timeline connecting line */}
                  {idx !== timelineData.length - 1 && (
                    <div className="absolute left-2 top-6 bottom-[-24px] w-px bg-border-primary" />
                  )}

                  <div className="flex items-start">
                    <div className="bg-primary-bg border-2 border-border-primary w-4 h-4 rounded-full mt-0.5 z-10 flex-shrink-0" />
                    <div className="ml-4 flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-sm font-medium ${item.isCriticalPath ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {item.task}
                        </span>
                        {item.isCriticalPath && (
                          <span className="text-[9px] uppercase tracking-wider bg-status-error/10 text-status-error px-1.5 py-0.5 rounded font-bold">Critical Path</span>
                        )}
                      </div>

                      {/* Baseline vs Predicted visualization */}
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center text-xs">
                          <span className="w-16 text-text-secondary uppercase tracking-wider text-[10px]">Baseline</span>
                          <div className="flex-1 mx-3 h-1.5 bg-border-primary rounded-full relative">
                             <div className="absolute left-0 top-0 bottom-0 bg-text-secondary/30 rounded-full w-2/3" />
                          </div>
                          <span className="font-mono text-text-secondary">{item.baselineEnd}</span>
                        </div>

                        <div className="flex items-center text-xs">
                          <span className="w-16 text-status-error font-medium uppercase tracking-wider text-[10px]">Predicted</span>
                          <div className="flex-1 mx-3 h-1.5 bg-border-primary rounded-full relative">
                             <div className="absolute left-[10%] top-0 bottom-0 bg-status-error rounded-full w-3/4" />
                          </div>
                          <span className="font-mono text-status-error font-semibold">{item.predictedEnd}</span>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
