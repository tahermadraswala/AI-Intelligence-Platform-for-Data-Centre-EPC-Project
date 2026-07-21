import { useLocation } from 'react-router-dom'
import { Search, Bell, RefreshCw } from 'lucide-react'

export default function Topbar() {
  const { pathname } = useLocation()

  // Routing metadata mapping for dynamic title & subtitle resolution
  const routeMetadata = {
    '/dashboard': {
      title: 'Dashboard',
      subtitle: 'Real time health of DataCentre Mumbai Phase 1'
    },
    '/spec-checker': {
      title: 'Spec Checker',
      subtitle: 'AI powered specification compliance analysis'
    },
    '/schedule-risk': {
      title: 'Schedule Risk',
      subtitle: 'Predict delays before they impact construction'
    },
    '/supply-chain': {
      title: 'Supply Chain',
      subtitle: 'Monitor critical equipment deliveries'
    },
    '/commissioning': {
      title: 'Commissioning',
      subtitle: 'Track testing and quality assurance progress'
    },
    '/document-qa': {
      title: 'Document Intelligence',
      subtitle: 'Ask questions across every project document'
    }
  }

  // Resolve current route data, fall back to dashboard if match is missing
  const current = routeMetadata[pathname] || routeMetadata['/dashboard']

  return (
    <header className="h-[72px] border-b border-border-primary/50 bg-card-bg flex items-center justify-between px-12 shrink-0 font-sans">
      
      {/* 1. LEFT SECTION: Dynamic Page Context */}
      <div className="space-y-0.5">
        <h1 className="text-text-primary text-lg font-semibold tracking-tight">
          {current.title}
        </h1>
        <p className="text-text-secondary text-xs">
          {current.subtitle}
        </p>
      </div>

      {/* 2. CENTER SECTION: Intentionally Empty for calm/spacious workspace */}
      <div className="flex-1" />

      {/* 3. RIGHT SECTION: Global Actions & Profile Context */}
      <div className="flex items-center gap-6">
        
        {/* Global AI Search Activator */}
        <div 
          className="relative flex items-center group cursor-pointer w-56"
          onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
        >
          <Search className="absolute left-3 w-4 h-4 text-text-secondary/60 group-hover:text-text-primary transition-colors duration-200" />
          <div className="w-full pl-9 pr-3 py-1.5 bg-primary-bg/50 hover:bg-primary-bg border border-border-primary/40 hover:border-olive-primary/30 rounded-md text-text-secondary/70 group-hover:text-text-primary transition-all duration-200 ease-in-out text-xs flex items-center justify-between select-none">
            <span>Search anything...</span>
            <kbd className="font-mono text-[9px] bg-card-bg border border-border-primary/60 px-1 py-0.5 text-text-secondary rounded-[4px] tracking-tighter">
              Ctrl + K
            </kbd>
          </div>
        </div>

        {/* Sync Status Tracker */}
        <div className="flex items-center gap-1.5 text-text-secondary/70">
          <RefreshCw className="w-3.5 h-3.5 text-text-secondary/50" />
          <span className="font-mono text-[10px]">
            Synced 4 min ago
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="h-4 w-px bg-border-primary/50" />

        {/* Notification Bell */}
        <button className="relative p-1.5 hover:bg-olive-primary/5 text-text-secondary/80 hover:text-text-primary transition-all duration-200 ease-in-out rounded-md">
          <Bell className="w-[18px] h-[18px]" />
          {/* Active alerts counter badge */}
          <span className="absolute -top-1 -right-1 bg-status-error text-card-bg font-mono text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none scale-90">
            3
          </span>
        </button>

        {/* User Account / Context */}
        <div className="flex items-center gap-2.5 pl-2">
          <div className="w-8 h-8 rounded-md border border-border-primary/60 bg-primary-bg flex items-center justify-center text-xs font-mono font-bold text-text-primary select-none hover:border-olive-primary/30 transition-colors duration-200 cursor-pointer">
            JD
          </div>
        </div>

      </div>

    </header>
  )
}
