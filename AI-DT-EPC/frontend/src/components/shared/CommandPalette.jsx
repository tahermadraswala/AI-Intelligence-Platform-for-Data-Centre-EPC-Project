import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft, Clock, Command } from 'lucide-react'
import { searchIndex, defaultPages, defaultActions } from '../../data/searchIndex'

// Highlighting component
function Highlight({ text = '', query = '' }) {
  if (!query) return <span>{text}</span>
  
  const regex = new RegExp(`(${query})`, 'gi')
  const parts = text.split(regex)
  
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? <span key={i} className="text-olive-primary font-bold">{part}</span> : part
      )}
    </span>
  )
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentActions, setRecentActions] = useState([])
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    try {
      const stored = localStorage.getItem('siteiq_recent_actions')
      if (stored) {
        setRecentActions(JSON.parse(stored))
      }
    } catch (e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
    }
    const handleOpenEvent = () => setIsOpen(true)

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('open-command-palette', handleOpenEvent)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('open-command-palette', handleOpenEvent)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [isOpen])

  // Prevent background scrolling when palette is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Filter items based on query
  let filteredItems = []
  
  if (!query.trim()) {
    // Empty state
    // Create an array that deduplicates quick actions and pages if they are in recent
    filteredItems = [
      ...defaultPages,
      ...(recentActions.length > 0 ? recentActions : []),
      ...defaultActions
    ]
  } else {
    // Search state
    const q = query.toLowerCase()
    filteredItems = searchIndex.filter(item => 
      item.title.toLowerCase().includes(q) || 
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      (item.id && item.id.toLowerCase().includes(q))
    )
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(prev => (prev + 1) % (filteredItems.length || 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(prev => (prev - 1 + (filteredItems.length || 1)) % (filteredItems.length || 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredItems[activeIndex]) {
          handleSelect(filteredItems[activeIndex])
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredItems, activeIndex])
  
  // Auto-scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]')
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [activeIndex, isOpen, query])

  const handleSelect = (item) => {
    // Save to recents
    if (item.category !== 'Quick Actions') {
      setRecentActions(prev => {
        const filtered = prev.filter(p => p.id !== item.id)
        const updated = [{ ...item, category: 'Recent Actions' }, ...filtered].slice(0, 8)
        localStorage.setItem('siteiq_recent_actions', JSON.stringify(updated))
        return updated
      })
    }

    setIsOpen(false)
    navigate(item.path)
  }

  if (!isOpen) return null

  // Grouping for render
  const grouped = filteredItems.reduce((acc, item) => {
    const cat = item.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  let globalIndex = 0

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-text-primary/10 backdrop-blur-sm transition-all duration-150 ease-in-out">
      {/* Click outside to close */}
      <div className="absolute inset-0 z-0" onClick={() => setIsOpen(false)} />
      
      <div className="relative z-10 w-full max-w-[640px] bg-card-bg border border-border-primary/80 shadow-2xl rounded-md overflow-hidden flex flex-col font-sans animate-in fade-in zoom-in-95 duration-150 ease-out">
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-border-primary/50">
          <Search className="w-4 h-4 text-text-secondary/60 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-text-primary placeholder:text-text-secondary/50 font-medium"
            placeholder="Search projects, documents, risks, or actions..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
          />
          <kbd className="hidden sm:flex items-center font-mono text-[9px] text-text-secondary/50 bg-primary-bg px-1.5 py-0.5 rounded border border-border-primary/50 shrink-0 ml-2 uppercase font-bold tracking-wider">
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div className="max-h-[50vh] overflow-y-auto" ref={listRef}>
          {Object.keys(grouped).length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-[13px] text-text-secondary font-semibold">No results found for "{query}"</p>
              <p className="text-[11.5px] text-text-secondary/50 mt-1.5">Try searching for NCRs, shipments, or documents</p>
            </div>
          ) : (
            <div className="p-2 space-y-3.5">
              {Object.entries(grouped).map(([category, items]) => {
                const isRecent = category === 'Recent Actions'
                return (
                  <div key={category}>
                    <div className="px-3 py-1 flex items-center gap-1.5 mb-1">
                       {isRecent && <Clock className="w-3 h-3 text-text-secondary/50" />}
                       <p className="text-[9.5px] font-mono font-bold uppercase tracking-widest text-text-secondary/55">
                        {category}
                      </p>
                    </div>
                    
                    <div className="space-y-0.5">
                      {items.map((item) => {
                        const currentIndex = globalIndex++
                        const isActive = currentIndex === activeIndex
                        
                        return (
                          <div
                            key={`${category}-${item.id}`}
                            data-active={isActive}
                            onMouseEnter={() => setActiveIndex(currentIndex)}
                            onClick={() => handleSelect(item)}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer transition-colors duration-150 ease-in-out ${
                              isActive ? 'bg-olive-primary/10 text-olive-primary border-none shadow-[inset_2px_0_0_0_var(--color-olive-primary)]' : 'text-text-primary border-none hover:bg-primary-bg/60'
                            }`}
                          >
                            <div className="flex flex-col min-w-0 pr-4">
                              <span className={`text-[13px] font-semibold leading-snug truncate ${isActive ? 'text-olive-primary' : 'text-text-primary/95'}`}>
                                <Highlight text={item.title} query={query} />
                              </span>
                              {item.subtitle && (
                                <span className={`text-[11px] font-mono truncate mt-0.5 ${isActive ? 'text-olive-primary/70' : 'text-text-secondary/65'}`}>
                                  <Highlight text={item.subtitle} query={query} />
                                </span>
                              )}
                            </div>
                            
                            <div className="shrink-0 flex items-center gap-3">
                              <span className={`text-[9px] font-mono uppercase tracking-widest ${isActive ? 'text-olive-primary/60' : 'text-text-secondary/40'}`}>
                                {item.path.replace('/', '')}
                              </span>
                              {isActive && (
                                <CornerDownLeft className="w-3.5 h-3.5 text-olive-primary/80" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border-primary/50 bg-primary-bg/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-[9.5px] font-mono text-text-secondary/60 font-semibold">
            <span className="flex items-center gap-1.5">
              <kbd className="bg-card-bg border border-border-primary/60 px-1 py-0.5 rounded text-text-secondary font-sans leading-none">↑</kbd>
              <kbd className="bg-card-bg border border-border-primary/60 px-1 py-0.5 rounded text-text-secondary font-sans leading-none">↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="bg-card-bg border border-border-primary/60 px-1.5 py-0.5 rounded text-text-secondary font-sans leading-none">↵</kbd>
              <span>Select</span>
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-olive-primary/50 font-bold tracking-widest uppercase">
             <Command className="w-3 h-3" />
             SiteIQ Command
          </div>
        </div>
      </div>
    </div>
  )
}
