import React from 'react';
import { 
  Activity, Clock, DollarSign, AlertTriangle, Brain, Zap,
  TrendingUp, TrendingDown, ArrowRight, ShieldAlert,
  Package, CheckCircle2, ChevronRight
} from 'lucide-react';
import { kpiData, timelineData, criticalRisks, supplyChainStatus, activityFeed } from '../data/dashboardData';

const iconMap = {
  Activity, Clock, DollarSign, AlertTriangle, Brain, Zap
};

export default function Dashboard() {
  return (
    <div className="space-y-8 pb-12 animate-[siqFadeUp_0.4s_ease-out]">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-border-primary pb-4">
        <div>
          <h1 className="text-text-primary text-2xl font-medium tracking-tight">Project Command Center</h1>
          <p className="text-text-secondary text-sm mt-1">Frankfurt Hyper-Scale DC 01 • Live Monitoring</p>
        </div>
        <div className="flex space-x-3 text-sm">
          <span className="flex items-center text-olive-primary bg-olive-primary/10 px-2 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-olive-primary mr-2 animate-pulse"></span>
            System Live
          </span>
          <span className="text-text-secondary px-2 py-1">Last sync: Just now</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiData.map((kpi, idx) => {
          const Icon = iconMap[kpi.icon];
          const isCritical = kpi.status === 'critical';
          const isWarning = kpi.status === 'warning';
          
          return (
            <div key={idx} className="bg-card-bg border border-border-primary rounded-md p-5 hover:border-olive-primary/40 transition-all duration-200 ease-in-out flex flex-col justify-between h-32 shadow-sm hover:shadow-md hover:-translate-y-[1px]">
              <div className="flex justify-between items-start">
                <span className="text-text-secondary text-xs uppercase tracking-wider font-medium">{kpi.title}</span>
                <Icon className={`w-4 h-4 ${isCritical ? 'text-status-error' : isWarning ? 'text-status-warning' : 'text-olive-primary'}`} />
              </div>
              <div>
                <div className="font-mono text-2xl font-semibold text-text-primary">{kpi.value}</div>
                <div className={`text-xs mt-1 flex items-center ${isCritical ? 'text-status-error' : isWarning ? 'text-status-warning' : 'text-text-secondary'}`}>
                  {kpi.trend.includes('+') || kpi.trend.includes('ROI') || kpi.trend.includes('Based') ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {kpi.trend}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Timeline & Supply Chain */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Project Timeline */}
          <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-text-primary font-medium text-sm tracking-wide uppercase">Project Health Timeline</h2>
              <button className="text-xs text-olive-primary hover:text-olive-dark transition-colors duration-200 flex items-center">
                View Full Schedule <ArrowRight className="w-3 h-3 ml-1" />
              </button>
            </div>
            <div className="space-y-6">
              {timelineData.map((phase, idx) => (
                <div key={idx} className="relative">
                  <div className="flex justify-between text-xs mb-2">
                    <span className={`font-medium ${phase.status === 'In Progress' ? 'text-olive-primary' : 'text-text-primary'}`}>{phase.phase}</span>
                    <span className="font-mono text-text-secondary">{phase.progress}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-primary-bg border border-border-primary/50 rounded-sm overflow-hidden">
                    <div 
                      className={`h-full ${phase.status === 'Complete' ? 'bg-text-secondary/40' : 'bg-olive-primary'}`} 
                      style={{ width: `${phase.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-text-secondary mt-1.5 uppercase tracking-wider font-mono">
                    <span>Baseline: {phase.baselineEnd}</span>
                    <span>Actual: {phase.actualEnd}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supply Chain Status */}
          <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out">
            <h2 className="text-text-primary font-medium text-sm tracking-wide uppercase mb-4">Supply Chain Snapshot</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-primary text-text-secondary text-xs uppercase tracking-wider">
                    <th className="pb-3 font-medium">Equipment</th>
                    <th className="pb-3 font-medium">Vendor</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">ETA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-primary/50">
                  {supplyChainStatus.map((item, idx) => (
                    <tr key={idx} className="hover:bg-olive-primary/5 transition-colors duration-200">
                      <td className="py-3.5 font-medium text-text-primary flex items-center">
                        <Package className="w-4 h-4 mr-2 text-text-secondary" /> {item.item}
                      </td>
                      <td className="py-3.5 text-text-secondary">{item.vendor}</td>
                      <td className="py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${item.risk === 'High' ? 'bg-status-error/10 text-status-error' : item.risk === 'Medium' ? 'bg-status-warning/10 text-status-warning' : 'bg-olive-primary/10 text-olive-primary'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 font-mono text-text-secondary text-xs">{item.eta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Risks & Activity */}
        <div className="space-y-6">
          
          {/* Critical Risks */}
          <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-text-primary font-medium text-sm tracking-wide uppercase flex items-center">
                <ShieldAlert className="w-4 h-4 mr-2 text-status-error" /> Critical Risks
              </h2>
              <span className="text-xs bg-status-error/10 text-status-error px-2 py-0.5 rounded font-bold uppercase tracking-wider">3 Active</span>
            </div>
            <div className="space-y-4">
              {criticalRisks.map((risk, idx) => (
                <div key={idx} className="p-5 border border-border-primary rounded-md bg-primary-bg hover:border-olive-primary/40 hover:bg-olive-primary/5 transition-all duration-200 ease-in-out group">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-mono font-bold text-text-primary">{risk.id}</span>
                    <span className="text-[10px] uppercase tracking-wider bg-card-bg border border-border-primary px-1.5 py-0.5 rounded text-text-secondary font-medium">{risk.category}</span>
                  </div>
                  <p className="text-sm text-text-primary leading-relaxed mb-4">{risk.description}</p>
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center text-olive-primary font-medium">
                      <Brain className="w-3.5 h-3.5 mr-1" /> {risk.aiConfidence} confidence
                    </span>
                    <button className="text-text-secondary group-hover:text-olive-primary flex items-center transition-colors duration-200 font-medium">
                      {risk.action} <ChevronRight className="w-3 h-3 ml-0.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Activity */}
          <div className="bg-card-bg border border-border-primary rounded-md p-5 shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out">
            <h2 className="text-text-primary font-medium text-sm tracking-wide uppercase mb-5">Live Activity</h2>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[1px] before:bg-gradient-to-b before:from-border-primary before:via-border-primary before:to-transparent">
              {activityFeed.map((activity, idx) => (
                <div key={idx} className="relative flex items-start space-x-4">
                  <div className="bg-card-bg p-1 rounded-full border border-border-primary z-10 text-olive-primary mt-0.5">
                     {activity.user === 'AI Engine' ? <Brain className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5 text-text-secondary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary leading-snug">{activity.action}</p>
                    <div className="flex items-center mt-1 text-xs text-text-secondary font-medium">
                      <span className="mr-2 text-text-primary">{activity.user}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider">{activity.time}</span>
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
