import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardCheck,
  CalendarClock,
  Package,
  Cpu,
  MessageSquare,
  Settings,
  LogOut
} from 'lucide-react'

export default function Sidebar() {
  const groups = [
    {
      id: 'overview',
      title: 'Overview',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }
      ]
    },
    {
      id: 'intelligence',
      title: 'Project Intelligence',
      items: [
        { name: 'Spec Checker', path: '/spec-checker', icon: ClipboardCheck, count: 3, countColor: 'warning' },
        { name: 'Schedule Risk', path: '/schedule-risk', icon: CalendarClock, count: 2, countColor: 'error' }
      ]
    },
    {
      id: 'execution',
      title: 'Execution',
      items: [
        { name: 'Supply Chain', path: '/supply-chain', icon: Package, count: 4, countColor: 'warning' },
        { name: 'Commissioning', path: '/commissioning', icon: Cpu, badge: '78%' }
      ]
    },
    {
      id: 'knowledge',
      title: 'Knowledge',
      items: [
        { name: 'Document Q&A', path: '/document-qa', icon: MessageSquare }
      ]
    }
  ]

  return (
    <aside className="w-[240px] border-r border-border-primary/50 bg-card-bg flex flex-col justify-between shrink-0 h-full font-sans">
      
      {/* 1. TOP SECTION: Project Selection Context */}
      <div className="p-6 border-b border-border-primary/30">
        <h2 className="text-text-primary text-base font-semibold tracking-tight">
          SiteIQ
        </h2>
        <div className="mt-3">
          <p className="text-text-primary text-xs font-medium truncate">
            DataCentre Mumbai Phase 1
          </p>
          <p className="text-text-secondary text-[11px] font-mono mt-0.5">
            Phase 2 • Week 14 of 24
          </p>
        </div>
      </div>

      {/* 2. MIDDLE SECTION: Navigation Items */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {groups.map((group) => (
          <div key={group.id} className="space-y-1.5">
            {/* Category Header */}
            <h3 className="text-text-secondary text-[10px] font-semibold font-mono uppercase tracking-wider px-3">
              {group.title}
            </h3>
            
            {/* Nav Links */}
            <nav className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `relative flex items-center justify-between pl-3 pr-3 py-2 text-[13px] rounded-md transition-all duration-200 ease-in-out ${
                      isActive
                        ? 'bg-olive-light text-olive-dark font-semibold'
                        : 'text-text-secondary hover:text-text-primary hover:bg-olive-primary/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Active Indicator Accent Bar */}
                      {isActive && (
                        <span className="absolute left-[3px] top-[6px] bottom-[6px] w-[3px] bg-olive-primary rounded-sm" />
                      )}
                      
                      {/* Label + Icon */}
                      <div className="flex items-center gap-2.5">
                        <item.icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-olive-primary' : 'text-text-secondary/70'
                          }`}
                        />
                        <span>{item.name}</span>
                      </div>
                      
                      {/* Optional Status Indicators */}
                      {item.count !== undefined && (
                        <span
                          className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-sm ${
                            item.countColor === 'error'
                              ? 'bg-status-error/10 text-status-error'
                              : 'bg-status-warning/10 text-status-warning'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                      
                      {item.badge !== undefined && (
                        <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-status-success/10 text-status-success">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* 3. BOTTOM SECTION: Telemetry Metrics */}
      <div className="p-6 border-t border-border-primary/30 bg-primary-bg/30 space-y-4">
        {/* Hours Saved Indicator */}
        <div>
          <div className="text-olive-primary font-mono text-2xl font-bold tracking-tight">
            847
          </div>
          <div className="text-text-secondary text-[10px] font-semibold font-mono uppercase tracking-wider mt-0.5">
            Hours Saved
          </div>
        </div>
        
        {/* AI Status Indicator */}
        <button className="flex items-center gap-3 w-full px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary hover:bg-olive-primary/5 rounded-md transition-all duration-200 ease-in-out group">
          <Settings className="w-4 h-4 shrink-0 transition-colors group-hover:text-olive-primary" />
          <span>Project Settings</span>
        </button>
        <button className="flex items-center gap-3 w-full px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary hover:bg-olive-primary/5 rounded-md transition-all duration-200 ease-in-out group">
          <LogOut className="w-4 h-4 shrink-0 transition-colors group-hover:text-status-error" />
          <span>Log out</span>
        </button>
        <div className="pt-2 border-t border-border-primary/20 flex items-center justify-between">
          <span className="text-text-secondary text-[11px] font-medium">
            AI Status
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-status-success font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
            Online
          </span>
        </div>
      </div>

    </aside>
  )
}
