import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, AlertTriangle, ShieldAlert, Brain, Settings,
  Activity, ListTodo, GitCommit, FileText, ChevronRight, XCircle,
  Loader2, RefreshCw, WifiOff
} from 'lucide-react';
import {
  executiveReadiness as mockExecutiveReadiness,
  commissioningProgress as mockCommissioningProgress,
  fatSatStatus, filters,
  equipmentMatrix as mockEquipmentMatrix,
  aiAssessments as mockAiAssessments,
  ncrList as mockNcrList,
  punchList, timelines
} from '../data/commissioningData';
import { runMockQAAssessment, fetchLatestQARun } from '../services/commissioningService';

export default function Commissioning() {
  const [selectedEq, setSelectedEq] = useState('default');
  const [activeLevel, setActiveLevel] = useState('All Levels');

  const [executiveReadiness, setExecutiveReadiness] = useState(mockExecutiveReadiness);
  const [commissioningProgress, setCommissioningProgress] = useState(mockCommissioningProgress);
  const [equipmentMatrix, setEquipmentMatrix] = useState(mockEquipmentMatrix);
  const [aiAssessments, setAiAssessments] = useState(mockAiAssessments);
  const [ncrList, setNcrList] = useState(mockNcrList);
  const [source, setSource] = useState('mock');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const currentAssessment = aiAssessments[selectedEq] || aiAssessments['default'];

  function applyResult(result) {
    setExecutiveReadiness(result.executiveReadiness);
    setCommissioningProgress(result.commissioningProgress.length ? result.commissioningProgress : mockCommissioningProgress);
    setEquipmentMatrix(result.equipmentMatrix.length ? result.equipmentMatrix : mockEquipmentMatrix);
    setAiAssessments(Object.keys(result.aiAssessments).length ? result.aiAssessments : mockAiAssessments);
    setNcrList(result.ncrList.length ? result.ncrList : mockNcrList);
  }

  // On mount, silently check for a previous AI run (no LLM call needed).
  useEffect(() => {
    let cancelled = false;
    async function loadLatest() {
      const { data, error } = await fetchLatestQARun();
      if (cancelled) return;
      if (!error && data) {
        applyResult(data);
        setSource('live');
      }
    }
    loadLatest();
    return () => { cancelled = true };
  }, []);

  const handleRunAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    const { data, error } = await runMockQAAssessment();
    setIsAnalyzing(false);

    if (error || !data) {
      setErrorMessage(error?.message || 'Commissioning QA assessment failed.');
      return;
    }
    applyResult(data);
    setSelectedEq('default');
    setSource('live');
  }, []);

  return (
    <div className="h-full flex flex-col animate-[siqFadeUp_0.4s_ease-out]">

      {/* 1. Executive Readiness Summary */}
      <div className="sticky top-0 z-30 bg-[var(--color-primary-bg)] pt-2 pb-6">
        <div className="border-b border-border-primary pb-6">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h1 className="text-text-primary text-2xl font-medium tracking-tight">Commissioning Intelligence</h1>
              <p className="text-text-secondary text-sm mt-1 flex items-center">
                <Settings className="w-4 h-4 mr-1.5 text-olive-primary" />
                {source === 'live'
                  ? <>AI Copilot assessment • Last updated {executiveReadiness.lastUpdated}</>
                  : <>Demo data shown • Run the AI copilot for a live assessment</>}
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
                    <span>Assessing…</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Run AI Assessment</span>
                  </>
                )}
              </button>
              <div className="flex items-center space-x-2 bg-text-primary text-primary-bg px-4 py-2 rounded-md cursor-pointer hover:bg-olive-dark transition-colors duration-200 ease-in-out">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Generate Go-Live Certificate</span>
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
              <p className="text-text-secondary text-[10px] uppercase tracking-wider font-medium mb-1">Overall Readiness</p>
              <p className="font-mono text-3xl font-semibold text-text-primary">{executiveReadiness.overallReadiness}</p>
            </div>
            <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm">
              <p className="text-text-secondary text-[10px] uppercase tracking-wider font-medium mb-1">Systems Ready</p>
              <p className="font-mono text-2xl font-medium text-text-primary mt-1.5">{executiveReadiness.systemsReady}</p>
            </div>
            <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm">
              <p className="text-text-secondary text-[10px] uppercase tracking-wider font-medium mb-1">Failed / Blocked</p>
              <div className="flex items-center mt-1.5">
                <span className="font-mono text-2xl font-semibold text-status-error mr-2">{executiveReadiness.failedSystems}</span>
                <span className="text-[9px] uppercase tracking-wider bg-status-error/10 text-status-error px-1.5 py-0.5 rounded font-bold">Investigate</span>
              </div>
            </div>
            <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm">
              <p className="text-text-secondary text-[10px] uppercase tracking-wider font-medium mb-1">Outstanding NCRs</p>
              <p className="font-mono text-2xl font-semibold text-status-warning mt-1.5">{executiveReadiness.openNCRs}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid (12 cols) */}
      <div className="grid grid-cols-12 gap-6 flex-1 pb-12 items-start">

        {/* Left Column (col-span-3) */}
        <div className="col-span-3 space-y-6">

          {/* 9. Filters */}
          <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out">
            <h2 className="text-text-primary font-medium text-[10px] tracking-wider uppercase mb-3 text-text-secondary">Cx Levels</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {filters.levels.map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setActiveLevel(lvl)}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors duration-200 ease-in-out ${activeLevel === lvl ? 'bg-olive-primary/10 border-olive-primary/30 text-olive-primary font-medium' : 'bg-primary-bg border-border-primary text-text-secondary hover:text-text-primary'}`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* 4. FAT / SAT Status */}
          <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out">
             <h2 className="text-text-primary font-medium text-sm tracking-wide uppercase mb-3">Acceptance Testing</h2>
             <div className="space-y-4">
               <div>
                 <div className="flex justify-between text-xs text-text-secondary mb-1"><span>Factory (FAT)</span> <span className="font-mono">{fatSatStatus.fat.completed} Done</span></div>
                 <div className="flex h-1.5 rounded-full overflow-hidden bg-primary-bg border border-border-primary/50">
                    <div className="bg-olive-primary h-full" style={{width: '100%'}}></div>
                 </div>
               </div>
               <div>
                 <div className="flex justify-between text-xs text-text-secondary mb-1"><span>Site (SAT)</span> <span className="font-mono text-status-warning">{fatSatStatus.sat.pending} Pending</span></div>
                 <div className="flex h-1.5 rounded-full overflow-hidden bg-primary-bg border border-border-primary/50">
                    <div className="bg-olive-primary h-full" style={{width: '85%'}}></div>
                    <div className="bg-status-warning h-full" style={{width: '12%'}}></div>
                    <div className="bg-status-error h-full" style={{width: '3%'}}></div>
                 </div>
               </div>
             </div>
          </div>

          {/* 8. Timeline */}
          <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out">
            <h2 className="text-text-primary font-medium text-sm tracking-wide uppercase mb-4">Cx Timeline</h2>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[1px] before:bg-border-primary">
              {timelines.map((time, idx) => (
                <div key={idx} className="relative flex items-center space-x-3">
                  <div className={`bg-card-bg p-1 rounded-full border z-10 ${time.status === 'completed' ? 'border-olive-primary text-olive-primary' : time.status === 'current' ? 'border-status-warning text-status-warning' : 'border-border-primary text-border-primary'}`}>
                     <GitCommit className="w-2 h-2" />
                  </div>
                  <div className="flex-1 min-w-0 flex justify-between items-center">
                    <p className={`text-xs font-medium ${time.status === 'completed' ? 'text-text-secondary' : time.status === 'current' ? 'text-text-primary' : 'text-text-secondary'}`}>{time.phase}</p>
                    <span className="font-mono text-[10px] text-text-secondary">{time.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 7. Punch List */}
          <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out">
             <h2 className="text-text-primary font-medium text-sm tracking-wide uppercase mb-3 flex justify-between items-center">
               Punch List
               <span className="text-[9px] bg-primary-bg border border-border-primary px-1.5 py-0.5 rounded text-text-secondary">{punchList.filter(p => p.status === 'open').length} Open</span>
             </h2>
             <div className="space-y-2">
               {punchList.map(item => (
                 <div key={item.id} className="flex items-start space-x-2 text-xs">
                   {item.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5 text-olive-primary shrink-0 mt-0.5" /> : <div className="w-3.5 h-3.5 border border-border-primary rounded-full shrink-0 mt-0.5" />}
                   <div>
                     <p className={`font-medium ${item.status === 'completed' ? 'text-text-secondary line-through' : 'text-text-primary'}`}>{item.task}</p>
                     <p className="text-[10px] text-text-secondary mt-0.5">{item.owner} • {item.eta}</p>
                   </div>
                 </div>
               ))}
             </div>
          </div>

        </div>

        {/* Center Column (col-span-6) */}
        <div className="col-span-6 space-y-6">

          {/* 2. Commissioning Progress */}
          <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out">
            <h2 className="text-text-primary font-medium text-sm tracking-wide uppercase mb-4">Level 1-5 Completion</h2>
            <div className="grid grid-cols-5 gap-2">
              {commissioningProgress.map((level, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className="w-full relative h-1.5 bg-primary-bg rounded-full overflow-hidden border border-border-primary/50 mb-2">
                    <div className="absolute top-0 bottom-0 left-0 bg-olive-primary" style={{width: `${level.progress}%`}} />
                  </div>
                  <span className="text-[10px] font-bold text-text-primary">{level.level}</span>
                  <span className="text-[9px] text-text-secondary uppercase tracking-widest mt-0.5">{level.progress}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Equipment Readiness Matrix */}
          <div className="bg-card-bg border border-border-primary rounded-md shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 ease-in-out">
            <div className="p-4 border-b border-border-primary bg-primary-bg flex justify-between items-center">
              <h2 className="text-text-primary font-medium text-sm tracking-wide uppercase">Equipment Readiness Matrix</h2>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-primary text-text-secondary text-[10px] uppercase tracking-wider bg-card-bg">
                  <th className="py-2.5 px-4 font-medium">ID</th>
                  <th className="py-2.5 px-4 font-medium">Equipment</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">NCRs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary/50">
                {equipmentMatrix.map((eq) => (
                  <tr
                    key={eq.id}
                    onClick={() => setSelectedEq(eq.id)}
                    tabIndex={0}
                    className={`cursor-pointer outline-none transition-colors duration-200 ease-in-out ${selectedEq === eq.id ? 'bg-olive-primary/5' : 'hover:bg-olive-primary/5'} focus:bg-olive-primary/10`}
                  >
                    <td className="py-3 px-4 font-mono text-xs font-medium text-text-primary">{eq.id}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-text-primary text-xs">{eq.equipment}</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">{eq.discipline}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold ${
                        eq.status === 'Ready' ? 'bg-olive-primary/10 text-olive-primary' :
                        eq.status === 'Failed' ? 'bg-status-error/10 text-status-error' :
                        eq.status === 'Blocked' ? 'bg-status-error/10 text-status-error' :
                        'bg-status-warning/10 text-status-warning'
                      }`}>
                        {eq.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-mono text-xs ${eq.ncrCount > 0 ? 'text-status-warning font-bold' : 'text-text-secondary'}`}>{eq.ncrCount}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 5. Outstanding NCR Panel */}
          <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out">
            <h2 className="text-text-primary font-medium text-sm tracking-wide uppercase mb-4 flex items-center">
              <FileText className="w-4 h-4 mr-2 text-text-secondary" /> Outstanding NCRs
            </h2>
            <div className="space-y-3">
              {ncrList.length === 0 && (
                <p className="text-xs text-text-secondary italic">No open NCRs.</p>
              )}
              {ncrList.map(ncr => (
                <div key={ncr.id} className="p-4 border border-border-primary rounded-md bg-primary-bg hover:border-olive-primary/40 hover:shadow-sm transition-all duration-200 ease-in-out">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs font-bold text-text-primary">{ncr.id} <span className="font-sans font-normal text-text-secondary ml-1">• {ncr.equipment}</span></span>
                    <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${ncr.severity === 'Critical' ? 'bg-status-error/10 text-status-error' : 'bg-status-warning/10 text-status-warning'}`}>
                      {ncr.severity}
                    </span>
                  </div>
                  <p className="text-xs text-text-primary mb-2">{ncr.summary}</p>
                  <div className="flex justify-between items-center text-[10px] text-text-secondary">
                    <span>{ncr.team}</span>
                    <span className="font-mono">{ncr.closureDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (col-span-3) */}
        <div className="col-span-3">
          {/* 6. AI Readiness Assessment Panel (Sticky) */}
          <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out sticky top-[190px]">
             <h2 className="text-text-primary font-medium text-sm tracking-wide uppercase mb-4 flex items-center">
                <Brain className="w-4 h-4 mr-2 text-olive-primary" /> AI Assessment
             </h2>

             {selectedEq !== 'default' && (
               <div className="mb-4 inline-flex items-center text-xs font-mono bg-primary-bg border border-border-primary px-2 py-1 rounded-sm text-text-primary">
                 Target: {selectedEq}
                 <button onClick={() => setSelectedEq('default')} className="ml-2 text-text-secondary hover:text-status-error transition-colors duration-200 ease-in-out"><XCircle className="w-3 h-3" /></button>
               </div>
             )}

             <div className="space-y-5">
               <div>
                 <p className="text-[10px] uppercase tracking-wider text-text-secondary font-medium mb-1">Recommendation</p>
                 <div className={`text-xs font-bold px-2 py-1.5 rounded-md uppercase tracking-wide border ${
                   currentAssessment.recommendation === 'ON TRACK' ? 'bg-olive-primary/10 border-olive-primary/20 text-olive-primary' :
                   currentAssessment.recommendation === 'DO NOT PROCEED' ? 'bg-status-error/10 border-status-error/20 text-status-error' :
                   'bg-status-warning/10 border-status-warning/20 text-status-warning'
                 }`}>
                   {currentAssessment.recommendation}
                 </div>
               </div>

               <div>
                 <p className="text-[10px] uppercase tracking-wider text-text-secondary font-medium mb-1">Reasoning</p>
                 <p className="text-xs text-text-primary leading-relaxed">{currentAssessment.reasoning}</p>
               </div>

               <div>
                 <p className="text-[10px] uppercase tracking-wider text-status-error font-medium mb-1 flex items-center">
                   <ShieldAlert className="w-3 h-3 mr-1" /> Operational Blockers
                 </p>
                 <ul className="text-xs text-text-primary space-y-1 ml-4 list-disc marker:text-border-primary">
                   {currentAssessment.blockers.map((b, i) => <li key={i}>{b}</li>)}
                 </ul>
               </div>

               <div>
                 <p className="text-[10px] uppercase tracking-wider text-olive-primary font-medium mb-1 flex items-center">
                   <ListTodo className="w-3 h-3 mr-1" /> Required Actions
                 </p>
                 <div className="space-y-1.5 mt-2">
                   {currentAssessment.actions.length === 0 && (
                     <p className="text-xs text-text-secondary italic">No outstanding actions.</p>
                   )}
                   {currentAssessment.actions.map((act, i) => (
                     <div key={i} className="flex items-center text-xs border border-border-primary rounded-md p-2 bg-primary-bg hover:border-olive-primary/30 transition-colors duration-200 ease-in-out">
                       <div className="w-2 h-2 rounded-full border border-text-secondary mr-2" />
                       <span className="text-text-primary font-medium">{act}</span>
                     </div>
                   ))}
                 </div>
               </div>

               <div className="pt-4 border-t border-border-primary">
                 <div className="flex justify-between items-center text-[10px]">
                   <span className="uppercase tracking-wider text-text-secondary">AI Confidence</span>
                   <span className="font-mono font-bold text-olive-primary">{currentAssessment.confidence}</span>
                 </div>
               </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  )
}
