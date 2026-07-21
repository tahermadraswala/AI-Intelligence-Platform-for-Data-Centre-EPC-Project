export const executiveReadiness = {
  overallReadiness: "78%",
  systemsReady: "42 / 55",
  failedSystems: 2,
  openNCRs: 14,
  aiConfidence: "91%",
  goLiveDate: "Feb 14",
  lastUpdated: "Just now"
};

export const commissioningProgress = [
  { level: "L1", name: "Factory Acceptance", progress: 100 },
  { level: "L2", name: "Site Acceptance", progress: 100 },
  { level: "L3", name: "Pre-Functional", progress: 85 },
  { level: "L4", name: "Functional Testing", progress: 40 },
  { level: "L5", name: "Integrated Systems", progress: 0 }
];

export const fatSatStatus = {
  fat: { completed: 110, pending: 0, failed: 0, retest: 0 },
  sat: { completed: 92, pending: 15, failed: 2, retest: 1 }
};

export const filters = {
  disciplines: ["All Disciplines", "Electrical", "Mechanical", "Fire & Life Safety", "BMS/Controls"],
  levels: ["All Levels", "Level 1", "Level 2", "Level 3", "Level 4", "Level 5"],
  status: ["All Statuses", "Ready", "Testing", "Blocked", "Failed"]
};

export const equipmentMatrix = [
  {
    id: "CHLR-01",
    equipment: "Primary Chiller Bank A",
    discipline: "Mechanical",
    status: "Testing",
    ready: false,
    blocked: false,
    ncrCount: 0,
    lastTest: "Oct 24",
    engineer: "J. Smith"
  },
  {
    id: "GEN-03",
    equipment: "Backup Generator Unit 3",
    discipline: "Electrical",
    status: "Blocked",
    ready: false,
    blocked: true,
    ncrCount: 2,
    lastTest: "Oct 22",
    engineer: "S. Patel"
  },
  {
    id: "UPS-01",
    equipment: "Uninterruptible Power Supply A",
    discipline: "Electrical",
    status: "Ready",
    ready: true,
    blocked: false,
    ncrCount: 0,
    lastTest: "Oct 20",
    engineer: "M. Chen"
  },
  {
    id: "CRAC-12",
    equipment: "Data Hall Cooling Unit 12",
    discipline: "Mechanical",
    status: "Failed",
    ready: false,
    blocked: false,
    ncrCount: 1,
    lastTest: "Oct 25",
    engineer: "J. Smith"
  },
  {
    id: "FAS-01",
    equipment: "Fire Alarm Control Panel",
    discipline: "Fire & Life Safety",
    status: "Ready",
    ready: true,
    blocked: false,
    ncrCount: 0,
    lastTest: "Oct 15",
    engineer: "A. Torres"
  }
];

export const aiAssessments = {
  "default": {
    confidence: "91%",
    reasoning: "Overall facility readiness is progressing nominally. Current bottlenecks are isolated to Generator Bank B and localized cooling units. L4 Functional Testing is on the critical path.",
    blockers: ["2 Failed SATs (CRAC units)", "14 Open NCRs"],
    actions: ["Prioritize GEN-03 Blockage", "Retest CRAC-12"],
    recommendation: "PROCEED WITH CAUTION",
    procedures: ["Cx-PRO-001: General Site Readiness"]
  },
  "CHLR-01": {
    confidence: "95%",
    reasoning: "Chiller Bank A has passed Pre-Functional (L3). Currently undergoing L4 load step testing. Sensor telemetry indicates nominal vibration.",
    blockers: ["Awaiting BMS Integration"],
    actions: ["Complete 100% Load Test"],
    recommendation: "ON TRACK",
    procedures: ["Cx-MECH-102: Chiller Load Testing"]
  },
  "GEN-03": {
    confidence: "99%",
    reasoning: "Generator Unit 3 is blocked by 2 open NCRs regarding fuel line pressure drops detected during L3 testing. Do not proceed to L4.",
    blockers: ["NCR-441: Fuel Line Pressure", "NCR-442: Exhaust Vibration"],
    actions: ["Remediate Fuel Line", "Schedule Retest"],
    recommendation: "DO NOT PROCEED",
    procedures: ["Cx-ELEC-404: Standby Power Systems"]
  }
};

export const ncrList = [
  {
    id: "NCR-441",
    equipment: "GEN-03",
    severity: "Critical",
    summary: "Fuel line pressure drops by 15% under full load during SAT.",
    team: "Electrical / Vendor",
    aiAction: "Inspect fuel pump seals.",
    closureDate: "Oct 28"
  },
  {
    id: "NCR-445",
    equipment: "CRAC-12",
    severity: "High",
    summary: "Fan motor draws higher amperage than specified rating.",
    team: "Mechanical",
    aiAction: "Verify motor winding resistance.",
    closureDate: "Oct 30"
  },
  {
    id: "NCR-432",
    equipment: "BMS-Net",
    severity: "Medium",
    summary: "Network latency exceeds 50ms during stress test.",
    team: "Controls",
    aiAction: "Check switch configurations.",
    closureDate: "Nov 02"
  }
];

export const punchList = [
  { id: "PL-01", status: "open", task: "Touch up paint on Chiller A skid", owner: "Civil", priority: "Low", eta: "Nov 05" },
  { id: "PL-02", status: "open", task: "Label network drops in Data Hall 1", owner: "IT", priority: "Medium", eta: "Oct 29" },
  { id: "PL-03", status: "completed", task: "Install safety guards on GEN-01", owner: "Mechanical", priority: "High", eta: "Done" }
];

export const timelines = [
  { phase: "L1/L2 FAT & SAT", status: "completed", date: "Sep 30" },
  { phase: "L3 Pre-Functional", status: "current", date: "Oct 31" },
  { phase: "L4 Functional", status: "remaining", date: "Dec 15" },
  { phase: "L5 IST Go-Live", status: "remaining", date: "Feb 14" }
];
