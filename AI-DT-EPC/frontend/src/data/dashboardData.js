export const kpiData = [
  {
    title: "Project Health",
    value: "92%",
    status: "good",
    trend: "+2% this week",
    icon: "Activity",
  },
  {
    title: "Schedule Variance",
    value: "-4 Days",
    status: "warning",
    trend: "Critical path delayed",
    icon: "Clock",
  },
  {
    title: "Cost Variance",
    value: "-$1.2M",
    status: "good",
    trend: "Under budget",
    icon: "DollarSign",
  },
  {
    title: "Active Risks",
    value: "14",
    status: "critical",
    trend: "3 High Severity",
    icon: "AlertTriangle",
  },
  {
    title: "AI Confidence",
    value: "98.5%",
    status: "good",
    trend: "Based on 1.2M docs",
    icon: "Brain",
  },
  {
    title: "Eng. Hours Saved",
    value: "2,450h",
    status: "good",
    trend: "+$450k ROI",
    icon: "Zap",
  },
];

export const timelineData = [
  {
    phase: "Civil & Structural",
    progress: 100,
    status: "Complete",
    baselineEnd: "Oct 15",
    actualEnd: "Oct 12",
  },
  {
    phase: "Core & Shell Enclosure",
    progress: 85,
    status: "In Progress",
    baselineEnd: "Dec 01",
    actualEnd: "Dec 05",
  },
  {
    phase: "MEP Rough-in",
    progress: 30,
    status: "In Progress",
    baselineEnd: "Jan 15",
    actualEnd: "Jan 15",
  },
  {
    phase: "Chiller Plant Comm.",
    progress: 0,
    status: "Upcoming",
    baselineEnd: "Mar 10",
    actualEnd: "TBD",
  },
  {
    phase: "Data Hall Fit-out",
    progress: 0,
    status: "Upcoming",
    baselineEnd: "May 20",
    actualEnd: "TBD",
  },
];

export const criticalRisks = [
  {
    id: "RSK-092",
    severity: "High",
    category: "Clash",
    description: "HVAC Duct vs Cable Tray clash in Generator Room B.",
    aiConfidence: "99%",
    action: "Review Model",
  },
  {
    id: "RSK-104",
    severity: "High",
    category: "Supply Chain",
    description: "Switchgear Submittal (SUB-045) delayed by 14 days.",
    aiConfidence: "95%",
    action: "Expedite Vendor",
  },
  {
    id: "RSK-105",
    severity: "Medium",
    category: "Compliance",
    description: "Fire protection spec deviation found in Zone 4.",
    aiConfidence: "88%",
    action: "Check Specs",
  }
];

export const supplyChainStatus = [
  { item: "CRAC Units (x45)", vendor: "Vertiv", status: "In Transit", eta: "Nov 22", risk: "Low" },
  { item: "HV Transformers", vendor: "ABB", status: "FAT Testing", eta: "Dec 05", risk: "Medium" },
  { item: "Backup Generators", vendor: "CAT", status: "Manufacturing", eta: "Jan 15", risk: "Low" },
  { item: "Switchgear (MV)", vendor: "Schneider", status: "Delayed", eta: "Feb 02", risk: "High" },
];

export const activityFeed = [
  { time: "10m ago", user: "AI Engine", action: "Detected compliance risk in SUB-089 (Fire safety)." },
  { time: "1h ago", user: "John Doe", action: "Approved RFI-112 regarding Chiller piping." },
  { time: "3h ago", user: "AI Engine", action: "Indexed 1,400 new vendor submittal pages." },
  { time: "5h ago", user: "Sarah Smith", action: "Updated Schedule Baseline v4." },
];
