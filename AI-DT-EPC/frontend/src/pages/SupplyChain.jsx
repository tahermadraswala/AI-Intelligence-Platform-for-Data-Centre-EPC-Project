import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe2, AlertOctagon, Anchor, Factory, CheckCircle2,
  MapPin, Clock, ArrowRight, ShieldAlert, Package, Thermometer,
  Loader2, RefreshCw, WifiOff
} from 'lucide-react';
import {
  logisticsSummary as mockLogisticsSummary,
  shipmentOverview as mockShipmentOverview,
  riskAlerts as mockRiskAlerts,
  procurementTimeline as mockProcurementTimeline,
  mapLocations
} from '../data/supplyChainData';
import { runMockRiskAnalysis, fetchLatestRiskRun } from '../services/supplyChainService';

export default function SupplyChain() {
  const [logisticsSummary, setLogisticsSummary] = useState(mockLogisticsSummary);
  const [shipmentOverview, setShipmentOverview] = useState(mockShipmentOverview);
  const [riskAlerts, setRiskAlerts] = useState(mockRiskAlerts);
  const [procurementTimeline, setProcurementTimeline] = useState(mockProcurementTimeline);
  const [source, setSource] = useState('mock');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  function applyResult(result) {
    setLogisticsSummary(result.logisticsSummary);
    setShipmentOverview(result.shipmentOverview.length ? result.shipmentOverview : mockShipmentOverview);
    setRiskAlerts(result.riskAlerts.length ? result.riskAlerts : mockRiskAlerts);
    setProcurementTimeline(result.procurementTimeline.length ? result.procurementTimeline : mockProcurementTimeline);
  }

  // On mount, silently check for a previous AI run (no LLM call needed).
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

  const handleRunAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    const { data, error } = await runMockRiskAnalysis();
    setIsAnalyzing(false);

    if (error || !data) {
      setErrorMessage(error?.message || 'Supply chain risk analysis failed.');
      return;
    }
    applyResult(data);
    setSource('live');
  }, []);

  return (
    <div className="h-full flex flex-col animate-[siqFadeUp_0.4s_ease-out]">

      {/* 1. Executive Logistics Summary (Sticky Header) */}
      <div className="sticky top-0 z-30 bg-[var(--color-primary-bg)] pt-2 pb-6">
        <div className="border-b border-border-primary pb-6">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h1 className="text-text-primary text-2xl font-medium tracking-tight">Global Supply Chain</h1>
              <p className="text-text-secondary text-sm mt-1 flex items-center">
                <Globe2 className="w-4 h-4 mr-1.5 text-olive-primary" />
                {source === 'live'
                  ? <>AI Engine analysis • Last updated {logisticsSummary.lastUpdated}</>
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
              <div className="flex items-center space-x-2 bg-text-primary text-primary-bg px-3 py-1.5 rounded-sm">
                <Package className="w-4 h-4" />
                <span className="text-sm font-medium">Track AWB/PO Number</span>
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
              <p className="text-text-secondary text-xs uppercase tracking-wider font-medium mb-1">Total Value in Transit</p>
              <p className="font-mono text-3xl font-semibold text-text-primary">{logisticsSummary.totalValueInTransit}</p>
            </div>
            <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm">
              <p className="text-text-secondary text-xs uppercase tracking-wider font-medium mb-1">Active Shipments</p>
              <p className="font-mono text-2xl font-medium text-text-primary mt-1.5">{logisticsSummary.activeShipments}</p>
            </div>
            <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm">
              <p className="text-text-secondary text-xs uppercase tracking-wider font-medium mb-1">Critical Path Delayed</p>
              <div className="flex items-center mt-1.5">
                <span className="font-mono text-2xl font-semibold text-status-error mr-2">{logisticsSummary.criticalPathDelayed}</span>
                <span className="text-[10px] uppercase tracking-wider bg-status-error/10 text-status-error px-1.5 py-0.5 rounded font-bold">Action Req</span>
              </div>
            </div>
            <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm">
              <p className="text-text-secondary text-xs uppercase tracking-wider font-medium mb-1">Overall On-Time Delivery</p>
              <p className="font-mono text-2xl font-semibold text-olive-primary">{logisticsSummary.overallOnTime}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid (3 Asymmetrical Columns) */}
      <div className="grid grid-cols-12 gap-6 flex-1 pb-12 items-start">

        {/* Left Column (25% -> col-span-3): Risk Alerts & Mitigations */}
        <div className="col-span-3 sticky top-[190px] space-y-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-text-primary font-medium text-sm tracking-wide uppercase flex items-center">
              <ShieldAlert className="w-4 h-4 mr-2 text-status-error" /> Urgent Alerts
            </h2>
            <span className="text-xs bg-status-error/10 text-status-error px-2 py-0.5 rounded font-bold uppercase">{riskAlerts.length} Active</span>
          </div>

          <div className="space-y-4">
            {riskAlerts.length === 0 && (
              <p className="text-xs text-text-secondary italic">No risk alerts flagged by the AI engine.</p>
            )}
            {riskAlerts.map(alert => (
              <div key={alert.id} className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm hover:border-olive-primary/40 hover:shadow-md hover:-translate-y-[1px] transition-all duration-200 ease-in-out group">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-xs font-bold text-text-primary">{alert.id}</span>
                  <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                    alert.severity === 'Critical' ? 'bg-status-error/10 text-status-error' :
                    alert.severity === 'High' ? 'bg-status-warning/10 text-status-warning' :
                    'bg-primary-bg text-text-secondary border border-border-primary'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-text-primary mb-1.5">{alert.title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed mb-4">{alert.description}</p>

                {/* AI Action */}
                <div className="bg-olive-primary/5 border border-olive-primary/20 rounded-md p-2.5">
                  <p className="text-[10px] font-bold tracking-wide uppercase text-olive-primary mb-1.5 flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> AI Recommended Action
                  </p>
                  <p className="text-xs text-text-primary font-medium">{alert.aiAction}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Column (45% -> col-span-5): Global Map & Overview */}
        <div className="col-span-5 space-y-6">

          {/* Shipment Overview Status */}
          <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out">
             <h2 className="text-text-primary font-medium text-sm tracking-wide uppercase mb-4">Network Status</h2>
             <div className="grid grid-cols-2 gap-3">
               {shipmentOverview.map((stat, i) => (
                 <div key={i} className={`p-3 rounded-md border border-border-primary/50 flex justify-between items-center ${stat.bg}`}>
                   <span className="text-xs font-medium text-text-secondary">{stat.status}</span>
                   <span className={`font-mono text-lg font-semibold ${stat.color}`}>{stat.count}</span>
                 </div>
               ))}
             </div>
          </div>

          {/* Interactive Global Map */}
          <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-text-primary font-medium text-sm tracking-wide uppercase">Live Shipment Map</h2>
              <button className="text-[10px] uppercase tracking-wider text-text-secondary hover:text-text-primary font-medium flex items-center">
                Expand Map <ArrowRight className="w-3 h-3 ml-1" />
              </button>
            </div>

            {/* Map Visualization (CSS-based mock) */}
            <div className="relative w-full h-[320px] bg-primary-bg border border-border-primary rounded-md overflow-hidden flex items-center justify-center">
              {/* Abstract Map Background Grid */}
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#1F2937 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

              <Globe2 className="absolute w-[400px] h-[400px] text-border-primary/30 stroke-[0.5]" />

              {/* Nodes */}
              {mapLocations.map(loc => (
                <div key={loc.id} className="absolute flex flex-col items-center group cursor-pointer" style={{ left: loc.coords.x, top: loc.coords.y }}>
                  <div className={`relative flex items-center justify-center w-5 h-5 rounded-full border-2 bg-card-bg z-10 transition-transform duration-200 ease-in-out group-hover:scale-125 ${
                    loc.status === 'Critical' ? 'border-status-error text-status-error' :
                    loc.status === 'On Time' ? 'border-olive-primary text-olive-primary' :
                    loc.status === 'Destination' ? 'border-text-primary text-text-primary' :
                    'border-status-warning text-status-warning'
                  }`}>
                    {loc.type === 'Port' && <Anchor className="w-2.5 h-2.5" />}
                    {loc.type === 'Factory' && <Factory className="w-2.5 h-2.5" />}
                    {loc.type === 'Ship' && <Globe2 className="w-2.5 h-2.5" />}
                    {loc.type === 'Site' && <MapPin className="w-2.5 h-2.5" />}
                  </div>
                  {loc.status === 'Critical' && (
                    <div className="absolute w-10 h-10 border border-status-error/40 rounded-full animate-ping opacity-50" />
                  )}
                  <div className="mt-1.5 px-1.5 py-0.5 bg-card-bg/90 backdrop-blur border border-border-primary rounded-[4px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out z-50">
                    <p className="text-[10px] font-bold text-text-primary">{loc.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (30% -> col-span-4): Procurement Timelines */}
        <div className="col-span-4 space-y-6">
          <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out">
            <h2 className="text-text-primary font-medium text-sm tracking-wide uppercase mb-5 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-text-secondary" /> Procurement Timelines
            </h2>

            <div className="space-y-6">
              {procurementTimeline.map((item, idx) => (
                <div key={idx} className="border border-border-primary/50 p-4 rounded-md bg-primary-bg hover:border-olive-primary/40 hover:shadow-sm transition-all duration-200 ease-in-out">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">{item.item}</h3>
                      <p className="text-xs text-text-secondary">{item.vendor} • <span className="font-mono">{item.poId}</span></p>
                    </div>
                    <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                      item.status === 'Critical Risk' ? 'bg-status-error/10 text-status-error' :
                      item.status === 'Delayed' ? 'bg-status-warning/10 text-status-warning' :
                      'bg-olive-primary/10 text-olive-primary'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  {/* Phase Progress Bars */}
                  <div className="mt-4 space-y-3">
                    {/* Mfg */}
                    <div>
                      <div className="flex justify-between text-[10px] uppercase tracking-wider text-text-secondary mb-1">
                        <span>Manufacturing</span>
                        <span className="font-mono">{item.manufacturing}%</span>
                      </div>
                      <div className="w-full h-1 bg-border-primary/50 rounded-full overflow-hidden">
                        <div className={`h-full ${item.manufacturing === 100 ? 'bg-text-secondary/50' : 'bg-olive-primary'}`} style={{ width: `${item.manufacturing}%` }} />
                      </div>
                    </div>
                    {/* Transit */}
                    <div>
                      <div className="flex justify-between text-[10px] uppercase tracking-wider text-text-secondary mb-1">
                        <span>Transit</span>
                        <span className="font-mono">{item.transit}%</span>
                      </div>
                      <div className="w-full h-1 bg-border-primary/50 rounded-full overflow-hidden">
                        <div className={`h-full ${item.status === 'Critical Risk' && item.transit > 0 && item.transit < 100 ? 'bg-status-error' : item.transit === 100 ? 'bg-text-secondary/50' : 'bg-olive-primary'}`} style={{ width: `${item.transit}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="mt-4 pt-3 border-t border-border-primary/50 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[10px] text-text-secondary uppercase tracking-wider block mb-0.5">Required On Site</span>
                      <span className="font-mono text-text-primary font-medium">{item.rosDate}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-text-secondary uppercase tracking-wider block mb-0.5">Predicted Arrival</span>
                      <span className={`font-mono font-bold ${item.status === 'Critical Risk' ? 'text-status-error' : item.status === 'Delayed' ? 'text-status-warning' : 'text-olive-primary'}`}>
                        {item.predictedDate}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-4 py-2 border border-border-primary rounded-md text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-olive-primary/5 transition-all duration-200 ease-in-out">
              View All {procurementTimeline.length} Shipments
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
