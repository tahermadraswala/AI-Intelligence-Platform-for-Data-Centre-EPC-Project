export const logisticsSummary = {
  totalValueInTransit: "$142.5M",
  criticalPathDelayed: 2,
  overallOnTime: "92%",
  activeShipments: 114,
  lastUpdated: "Just now"
};

export const shipmentOverview = [
  { status: "Manufacturing (FAT/SAT)", count: 42, color: "text-text-primary", bg: "bg-primary-bg" },
  { status: "In Transit (Ocean/Air)", count: 38, color: "text-olive-primary", bg: "bg-olive-primary/10" },
  { status: "Customs & Port Hold", count: 7, color: "text-status-warning", bg: "bg-status-warning/10" },
  { status: "Delivered to Site", count: 27, color: "text-text-secondary", bg: "bg-card-bg" }
];

export const riskAlerts = [
  {
    id: "ALT-801",
    severity: "Critical",
    title: "Port Strike: Rotterdam",
    description: "Impending union strike threatens to delay offloading of MV Switchgear (PO-9921) by 7-10 days.",
    aiAction: "Reroute vessel to Antwerp port.",
    confidence: "94%"
  },
  {
    id: "ALT-804",
    severity: "High",
    title: "Temperature Excursion",
    description: "Container sensors on AWB-441 (Fiber Optics) reported temps exceeding 45°C for 3 hours. Potential degradation.",
    aiAction: "Dispatch local QA for inspection upon arrival.",
    confidence: "99%"
  },
  {
    id: "ALT-812",
    severity: "Medium",
    title: "Customs Documentation Hold",
    description: "Missing commercial invoice for Backup Generators (CAT-001) at Port of Hamburg.",
    aiAction: "Auto-email broker with cached invoice.",
    confidence: "100%"
  }
];

export const procurementTimeline = [
  {
    item: "CRAC Units (x45)",
    vendor: "Vertiv",
    poId: "PO-7742",
    currentPhase: "In Transit",
    rosDate: "Dec 10",
    predictedDate: "Dec 08",
    status: "On Time",
    manufacturing: 100,
    transit: 60,
    customs: 0
  },
  {
    item: "HV Transformers",
    vendor: "ABB",
    poId: "PO-8011",
    currentPhase: "Manufacturing",
    rosDate: "Jan 15",
    predictedDate: "Jan 22",
    status: "Delayed",
    manufacturing: 75,
    transit: 0,
    customs: 0
  },
  {
    item: "Switchgear (MV)",
    vendor: "Schneider",
    poId: "PO-9921",
    currentPhase: "Port Hold",
    rosDate: "Nov 30",
    predictedDate: "Dec 12",
    status: "Critical Risk",
    manufacturing: 100,
    transit: 100,
    customs: 20
  }
];

export const mapLocations = [
  { id: 1, name: "Rotterdam Port", status: "Critical", type: "Port", coords: { x: "48%", y: "32%" } },
  { id: 2, name: "Shanghai Mfg", status: "On Time", type: "Factory", coords: { x: "82%", y: "45%" } },
  { id: 3, name: "Vessel MSC Anna", status: "In Transit", type: "Ship", coords: { x: "65%", y: "60%" } },
  { id: 4, name: "Frankfurt Site", status: "Destination", type: "Site", coords: { x: "50%", y: "30%" } },
];
