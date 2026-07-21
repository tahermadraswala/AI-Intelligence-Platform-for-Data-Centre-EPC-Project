import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/shared/Layout'
import Dashboard from './pages/Dashboard'
import SpecChecker from './pages/SpecChecker'
import ScheduleRisk from './pages/ScheduleRisk'
import SupplyChain from './pages/SupplyChain'
import Commissioning from './pages/Commissioning'
import DocumentQA from './pages/DocumentQA'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Nested Layout Route wrapping all dashboard sub-views */}
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/spec-checker" element={<SpecChecker />} />
          <Route path="/schedule-risk" element={<ScheduleRisk />} />
          <Route path="/supply-chain" element={<SupplyChain />} />
          <Route path="/commissioning" element={<Commissioning />} />
          <Route path="/document-qa" element={<DocumentQA />} />
        </Route>
        
        {/* Fallback route redirects standard invalid requests to /dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
