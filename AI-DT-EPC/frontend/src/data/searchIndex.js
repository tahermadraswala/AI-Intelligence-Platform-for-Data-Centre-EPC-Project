import { criticalRisks } from './dashboardData'
import { documents } from './documentQAData'
import { riskCards } from './scheduleRiskData'
import { procurementTimeline } from './supplyChainData'
import { equipmentMatrix, ncrList } from './commissioningData'

// Helper to standardise search items
function createSearchItem(id, category, title, subtitle, path, actionId = null) {
  return { id, category, title, subtitle, path, actionId }
}

const pages = [
  createSearchItem('page-1', 'Pages', 'Dashboard', 'Real time health of DataCentre Mumbai Phase 1', '/dashboard'),
  createSearchItem('page-2', 'Pages', 'Spec Checker', 'AI powered specification compliance analysis', '/spec-checker'),
  createSearchItem('page-3', 'Pages', 'Schedule Risk', 'Predict delays before they impact construction', '/schedule-risk'),
  createSearchItem('page-4', 'Pages', 'Supply Chain', 'Monitor critical equipment deliveries', '/supply-chain'),
  createSearchItem('page-5', 'Pages', 'Commissioning', 'Track testing and quality assurance progress', '/commissioning'),
  createSearchItem('page-6', 'Pages', 'Document Intelligence', 'Ask questions across every project document', '/document-qa'),
]

const quickActions = [
  createSearchItem('action-1', 'Quick Actions', 'Run Compliance Analysis', 'Spec Checker', '/spec-checker'),
  createSearchItem('action-2', 'Quick Actions', 'Ask Document AI', 'Document Intelligence', '/document-qa'),
  createSearchItem('action-3', 'Quick Actions', 'Generate Go-Live Certificate', 'Commissioning', '/commissioning'),
  createSearchItem('action-4', 'Quick Actions', 'Track Shipment', 'Supply Chain', '/supply-chain'),
  createSearchItem('action-5', 'Quick Actions', 'Open Critical Risks', 'Schedule Risk', '/schedule-risk'),
]

const mappedDocuments = documents.map(doc => 
  createSearchItem(doc.id, 'Documents', doc.code, doc.name, '/document-qa')
)

const mappedRisks = [
  ...criticalRisks.map(risk => createSearchItem(risk.id, 'Risks', risk.id, risk.description, '/dashboard')),
  ...riskCards.map(risk => createSearchItem(risk.id, 'Risks', risk.id, risk.title, '/schedule-risk'))
]

const mappedEquipment = equipmentMatrix.map(eq => 
  createSearchItem(eq.id, 'Equipment', eq.equipment, `${eq.system} System`, '/commissioning')
)

const mappedShipments = procurementTimeline.map(po => 
  createSearchItem(po.poId, 'Shipments', po.poId, `${po.item} - ${po.vendor}`, '/supply-chain')
)

const mappedNCRs = ncrList.map(ncr => 
  createSearchItem(ncr.id, 'NCRs', ncr.id, ncr.title, '/commissioning')
)

// The combined searchable index
export const searchIndex = [
  ...pages,
  ...mappedDocuments,
  ...mappedRisks,
  ...mappedEquipment,
  ...mappedShipments,
  ...mappedNCRs,
  ...quickActions
]

// Expose these as predefined arrays for the empty state
export const defaultPages = pages
export const defaultActions = quickActions
