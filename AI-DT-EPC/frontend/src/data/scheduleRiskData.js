export const executiveSummary = {
  predictedSlip: "14 Days",
  confidence: "94%",
  criticalPathImpact: "Substantial Completion",
  financialExposure: "$420,000",
  lastUpdated: "Just now"
};

export const filters = [
  { id: 'all', label: 'All Disciplines', count: 12 },
  { id: 'civil', label: 'Civil & Structural', count: 2 },
  { id: 'mep', label: 'MEP Systems', count: 7 },
  { id: 'commissioning', label: 'Commissioning', count: 3 },
];

export const riskCards = [
  {
    id: "RSK-092",
    discipline: "MEP Systems",
    severity: "Critical",
    title: "Chiller Plant Delivery Delay",
    description: "Vendor (Trane) has flagged a supply chain bottleneck for the primary compressors. Factory Acceptance Testing (FAT) pushed back by 2 weeks.",
    aiConfidence: "98%",
    delayImpact: "+14 Days",
    costImpact: "$120k / week overhead",
    mitigations: [
      { text: "Approve partial shipment of available units", status: "recommended" },
      { text: "Shift rough-in sequence to Generator Room", status: "alternative" }
    ],
    dependencies: ["Chiller Plant Comm.", "Data Hall HVAC Bal."]
  },
  {
    id: "RSK-104",
    discipline: "Civil & Structural",
    severity: "High",
    title: "Weather Disruption: Roof Sealing",
    description: "Historical weather patterns combined with current forecasts indicate a 70% probability of heavy rain during the scheduled roof sealing window.",
    aiConfidence: "85%",
    delayImpact: "+4 Days",
    costImpact: "Crane rental extension",
    mitigations: [
      { text: "Authorize weekend overtime prior to storm", status: "recommended" }
    ],
    dependencies: ["Interior Fit-out", "Electrical First Fix"]
  },
  {
    id: "RSK-112",
    discipline: "Commissioning",
    severity: "Medium",
    title: "Switchgear Submittal Revision",
    description: "Submittal SUB-045 requires a 3rd revision due to non-compliance with the updated fire suppression specs in Zone A.",
    aiConfidence: "92%",
    delayImpact: "+2 Days",
    costImpact: "Engineering redesign fees",
    mitigations: [
      { text: "Schedule emergency design review meeting", status: "recommended" },
      { text: "Isolate Zone A commissioning", status: "alternative" }
    ],
    dependencies: ["MV Power On", "IST Phase 1"]
  }
];

export const timelineData = [
  {
    task: "Civil Enclosure",
    baselineStart: "Oct 01",
    baselineEnd: "Oct 15",
    predictedStart: "Oct 01",
    predictedEnd: "Oct 19",
    status: "Delayed",
    isCriticalPath: false
  },
  {
    task: "MEP Rough-in",
    baselineStart: "Oct 16",
    baselineEnd: "Nov 30",
    predictedStart: "Oct 20",
    predictedEnd: "Dec 05",
    status: "Delayed",
    isCriticalPath: true
  },
  {
    task: "Chiller Plant FAT",
    baselineStart: "Nov 15",
    baselineEnd: "Nov 20",
    predictedStart: "Nov 29",
    predictedEnd: "Dec 04",
    status: "Critical Risk",
    isCriticalPath: true
  },
  {
    task: "Substantial Completion",
    baselineStart: "Jan 15",
    baselineEnd: "Jan 15",
    predictedStart: "Jan 29",
    predictedEnd: "Jan 29",
    status: "Impacted",
    isCriticalPath: true
  }
];
