import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import CommandPalette from './CommandPalette'
export default function Layout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-primary-bg text-text-primary">
      <CommandPalette />
      {/* 1. Left Sidebar Area */}
      <Sidebar />

      {/* Right Column: Topbar + Scrollable Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 2. Topbar Area */}
        <Topbar />

        {/* 3. Main Content Slot */}
        <main className="flex-1 overflow-y-auto bg-[var(--color-primary-bg)] px-12">
          <div className="max-w-6xl mx-auto w-full py-10">
            {/* Renders the matching child route page component */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
