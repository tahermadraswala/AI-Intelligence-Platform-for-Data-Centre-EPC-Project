"""
ai_core.utils.mock_data_gen
------------------------------
Generates synthetic demo data so the whole pipeline (ingestion -> agents
-> frontend) can be demoed without real project data:

  1. A mock project schedule (CSV) with realistic data-centre EPC tasks,
     dependencies, and a couple of deliberately-injected delays so the
     Schedule Risk Engine has something interesting to catch.
  2. A mock vendor submittal (plain text, easy to wrap as a "PDF-like"
     document for the spec compliance demo) with a couple of deliberate
     deviations from a baseline spec.

CLI usage:
    python -m ai_core.utils.mock_data_gen --out data/mock_schedules
"""

from __future__ import annotations

import argparse
import csv
import random
from datetime import date, timedelta
from pathlib import Path

from faker import Faker

fake = Faker()
Faker.seed(42)
random.seed(42)

# Simplified but realistic dependency chain for a hyperscale DC build.
TASKS = [
    # (task_id, name, duration_days, depends_on_task_id, category)
    ("T01", "Site mobilisation & earthworks", 20, None, "civil"),
    ("T02", "Foundation & structural slab", 35, "T01", "civil"),
    ("T03", "Building envelope / shell erection", 45, "T02", "civil"),
    ("T04", "Switchgear procurement (long-lead)", 90, None, "procurement"),
    ("T05", "Generator procurement (long-lead)", 100, None, "procurement"),
    ("T06", "UPS system procurement", 75, None, "procurement"),
    ("T07", "Electrical rough-in", 30, "T03", "electrical"),
    ("T08", "Switchgear installation", 15, "T04", "electrical"),
    ("T09", "Generator installation", 12, "T05", "electrical"),
    ("T10", "UPS installation", 10, "T06", "electrical"),
    ("T11", "Cooling plant (CRAH/chiller) installation", 25, "T03", "mechanical"),
    ("T12", "BMS/EPMS integration", 20, "T08", "controls"),
    ("T13", "IT white space fit-out (racks, PDUs)", 18, "T07", "fitout"),
    ("T14", "Level 1 commissioning (component)", 15, "T12", "commissioning"),
    ("T15", "Level 2 commissioning (integrated systems)", 20, "T14", "commissioning"),
    ("T16", "Level 3 commissioning (integrated systems test / IST)", 25, "T15", "commissioning"),
    ("T17", "Tier certification walkthrough", 10, "T16", "commissioning"),
]


def generate_mock_schedule(project_start: date | None = None) -> list[dict]:
    """
    Builds a task list with planned_start/planned_end computed from the
    dependency chain, plus a current_status and actual/forecast dates
    where a handful of tasks are deliberately delayed to give the
    Schedule Risk Engine something to detect.
    """
    project_start = project_start or date(2026, 1, 5)
    computed: dict[str, dict] = {}

    # Tasks that will be injected with a deliberate delay for the demo,
    # and how many days late they are.
    injected_delays = {"T04": 18, "T06": 9}  # switchgear + UPS procurement running late

    for task_id, name, duration, depends_on, category in TASKS:
        if depends_on is None:
            planned_start = project_start
        else:
            planned_start = computed[depends_on]["planned_end_date"] + timedelta(days=1)

        planned_end = planned_start + timedelta(days=duration)

        delay_days = injected_delays.get(task_id, 0)
        forecast_end = planned_end + timedelta(days=delay_days)
        status = "AT_RISK" if delay_days > 0 else random.choice(
            ["NOT_STARTED", "IN_PROGRESS", "IN_PROGRESS", "COMPLETE"]
        )

        computed[task_id] = {
            "task_id": task_id,
            "task_name": name,
            "category": category,
            "depends_on": depends_on or "",
            "duration_days": duration,
            "planned_start": planned_start.isoformat(),
            "planned_end": planned_end.isoformat(),
            "planned_end_date": planned_end,  # kept internally for downstream date math, stripped below
            "forecast_end": forecast_end.isoformat(),
            "delay_days": delay_days,
            "status": status,
            "responsible_party": fake.company(),
        }

    # Strip the internal date-typed helper field before returning —
    # callers (CSV writer, JSON serialization) expect plain strings/ints only.
    return [{k: v for k, v in row.items() if k != "planned_end_date"} for row in computed.values()]


def write_schedule_csv(out_path: str | Path) -> Path:
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    rows = generate_mock_schedule()
    fieldnames = list(rows[0].keys())
    with out_path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return out_path


MOCK_SUBMITTAL_TEXT = """VENDOR SUBMITTAL — UNINTERRUPTIBLE POWER SUPPLY (UPS) SYSTEM
Submittal No: SUB-EL-0142
Vendor: {vendor}
Equipment: Modular UPS, 500kVA per module

1. System Configuration
   - Redundancy: N+1 (single UPS module redundancy per pod)
   - Battery autonomy: 7 minutes at full rated load
   - Paralleling architecture: Centralized static bypass

2. Environmental Ratings
   - Operating temperature range: 0°C to 40°C
   - Enclosure protection rating: IP20

3. Monitoring & Integration
   - BMS protocol: Modbus TCP
   - Remote monitoring: Web-based, no SNMP trap support included

4. Testing & Certification
   - Factory witness test: Not scheduled (vendor standard test report only)
   - UL/CE certification: CE only, UL certification pending
"""

# Baseline spec this submittal should be checked against (for demo purposes
# this doubles as the seed text you'd embed into `specs_and_standards`).
MOCK_BASELINE_SPEC_TEXT = """PROJECT ELECTRICAL SPECIFICATION — SECTION 26 33 53: UPS SYSTEMS
(Reference: TIA-942 Tier III requirements, Client Design Basis Rev C)

26 33 53 - 2.1 Redundancy
   UPS system configuration shall be 2N or N+1 with minimum two independent
   UPS modules per critical pod. Concurrent maintainability is mandatory per
   Tier III requirements.

26 33 53 - 2.2 Battery Autonomy
   Minimum battery autonomy shall be 10 minutes at full rated critical load
   to bridge generator start and transfer sequence.

26 33 53 - 2.5 Monitoring & Integration
   All UPS units shall support SNMP v3 trap notifications in addition to
   Modbus TCP, integrated into the central BMS/EPMS for real-time alarm
   escalation.

26 33 53 - 2.7 Testing & Certification
   All UPS units shall undergo a factory witness test attended by
   Owner's Engineer prior to shipment. Units shall carry both UL and CE
   certification at time of delivery; "certification pending" is not
   an acceptable delivery condition.
"""


def write_mock_submittal(out_path: str | Path) -> Path:
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(MOCK_SUBMITTAL_TEXT.format(vendor=fake.company()))
    return out_path


def write_mock_spec(out_path: str | Path) -> Path:
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(MOCK_BASELINE_SPEC_TEXT)
    return out_path


# ---------------------------------------------------------------------------
# Supply Chain: mock procurement/shipment tracking data
# ---------------------------------------------------------------------------

# (po_id, item, vendor, category, value_usd, duration_days_to_ros)
SHIPMENTS = [
    ("PO-7742", "CRAC Units (x45)", "Vertiv", "cooling", 4_200_000, 95),
    ("PO-8011", "HV Transformers (x4)", "ABB", "electrical", 11_500_000, 140),
    ("PO-9921", "MV Switchgear", "Schneider Electric", "electrical", 8_900_000, 110),
    ("PO-6650", "Standby Generators (x6)", "Caterpillar", "electrical", 9_750_000, 130),
    ("PO-5501", "UPS Modules (x12)", "Eaton", "electrical", 6_300_000, 100),
    ("PO-4420", "Fiber Optic Cable & Patch Panels", "CommScope", "it_infra", 1_150_000, 60),
    ("PO-3315", "Structural Steel Package", "ArcelorMittal", "civil", 3_800_000, 80),
    ("PO-2290", "Fire Suppression System (FM-200)", "Johnson Controls", "life_safety", 1_950_000, 70),
]

# Deliberately-injected disruptions so the Supply Chain Risk Agent has
# something interesting to catch (mirrors the schedule-risk injected delays).
SHIPMENT_EVENTS = {
    "PO-9921": {
        "current_phase": "CUSTOMS_HOLD",
        "manufacturing_pct": 100,
        "transit_pct": 100,
        "customs_pct": 20,
        "delay_days": 12,
        "note": (
            "Vessel carrying the MV switchgear is held at Rotterdam port pending a threatened "
            "dockworkers' union strike; customs clearance paperwork also incomplete."
        ),
    },
    "PO-8011": {
        "current_phase": "MANUFACTURING",
        "manufacturing_pct": 75,
        "transit_pct": 0,
        "customs_pct": 0,
        "delay_days": 7,
        "note": "Factory acceptance test (FAT) for the HV transformers slipped due to a core-steel supplier delay.",
    },
    "PO-4420": {
        "current_phase": "IN_TRANSIT",
        "manufacturing_pct": 100,
        "transit_pct": 55,
        "customs_pct": 0,
        "delay_days": 0,
        "note": "Container sensors reported a temperature excursion above 45°C for ~3 hours in transit; QA inspection recommended on arrival.",
    },
}


def generate_mock_shipments(project_start: date | None = None) -> list[dict]:
    """
    Builds a procurement/shipment list with phase progress, required-on-site
    (ROS) dates, and a couple of deliberately-injected disruptions for the
    Supply Chain Visibility & Risk Agent to detect.
    """
    project_start = project_start or date(2026, 1, 5)
    rows: list[dict] = []

    for po_id, item, vendor, category, value_usd, duration in SHIPMENTS:
        ros_date = project_start + timedelta(days=duration)
        event = SHIPMENT_EVENTS.get(po_id)

        if event:
            predicted_date = ros_date + timedelta(days=event["delay_days"])
            phase = event["current_phase"]
            manufacturing_pct = event["manufacturing_pct"]
            transit_pct = event["transit_pct"]
            customs_pct = event["customs_pct"]
            note = event["note"]
        else:
            predicted_date = ros_date - timedelta(days=random.choice([0, 1, 2]))
            phase = random.choice(["MANUFACTURING", "IN_TRANSIT", "DELIVERED"])
            manufacturing_pct = 100 if phase != "MANUFACTURING" else random.choice([60, 80, 90])
            transit_pct = 100 if phase == "DELIVERED" else (random.choice([20, 45, 70]) if phase == "IN_TRANSIT" else 0)
            customs_pct = 100 if phase == "DELIVERED" else 0
            note = ""

        rows.append(
            {
                "po_id": po_id,
                "item": item,
                "vendor": vendor,
                "category": category,
                "value_usd": value_usd,
                "current_phase": phase,
                "manufacturing_pct": manufacturing_pct,
                "transit_pct": transit_pct,
                "customs_pct": customs_pct,
                "required_on_site_date": ros_date.isoformat(),
                "predicted_delivery_date": predicted_date.isoformat(),
                "delay_days": (predicted_date - ros_date).days,
                "field_note": note,
            }
        )

    return rows


def write_shipments_csv(out_path: str | Path) -> Path:
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    rows = generate_mock_shipments()
    fieldnames = list(rows[0].keys())
    with out_path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return out_path


# ---------------------------------------------------------------------------
# Commissioning: mock equipment test records & NCRs
# ---------------------------------------------------------------------------

# (equipment_id, name, discipline, commissioning_level_reached)
EQUIPMENT = [
    ("CHLR-01", "Primary Chiller Bank A", "mechanical", "L3"),
    ("GEN-03", "Backup Generator Unit 3", "electrical", "L3"),
    ("UPS-01", "Uninterruptible Power Supply A", "electrical", "L4"),
    ("CRAC-12", "Data Hall Cooling Unit 12", "mechanical", "L4"),
    ("FAS-01", "Fire Alarm Control Panel", "life_safety", "L4"),
    ("BMS-NET", "BMS/EPMS Network Backbone", "controls", "L3"),
]

# Deliberately-injected test failures / open NCRs so the Commissioning QA
# Copilot has something concrete to reason about (mirrors the schedule and
# supply-chain injected disruptions).
EQUIPMENT_EVENTS = {
    "GEN-03": {
        "status": "BLOCKED",
        "open_ncrs": [
            {
                "ncr_id": "NCR-441",
                "severity": "CRITICAL",
                "summary": "Fuel line pressure drops by 15% under full load during SAT.",
            },
            {
                "ncr_id": "NCR-442",
                "severity": "HIGH",
                "summary": "Exhaust vibration exceeds vendor tolerance at rated load.",
            },
        ],
        "last_test_result": "FAIL",
    },
    "CRAC-12": {
        "status": "FAILED",
        "open_ncrs": [
            {
                "ncr_id": "NCR-445",
                "severity": "HIGH",
                "summary": "Fan motor draws higher amperage than nameplate rating during load step test.",
            }
        ],
        "last_test_result": "FAIL",
    },
    "BMS-NET": {
        "status": "TESTING",
        "open_ncrs": [
            {
                "ncr_id": "NCR-432",
                "severity": "MEDIUM",
                "summary": "Network latency exceeds 50ms threshold during stress test.",
            }
        ],
        "last_test_result": "RETEST",
    },
}


def generate_mock_commissioning_records(project_start: date | None = None) -> list[dict]:
    """
    Builds an equipment commissioning-status list (test level reached, open
    NCRs, last test result) for the Commissioning QA Copilot to assess
    go/no-go readiness against.
    """
    project_start = project_start or date(2026, 1, 5)
    rows: list[dict] = []

    for idx, (equipment_id, name, discipline, level) in enumerate(EQUIPMENT):
        event = EQUIPMENT_EVENTS.get(equipment_id)
        last_test_date = project_start + timedelta(days=280 + idx * 2)

        if event:
            status = event["status"]
            open_ncrs = event["open_ncrs"]
            last_test_result = event["last_test_result"]
        else:
            status = "READY"
            open_ncrs = []
            last_test_result = "PASS"

        rows.append(
            {
                "equipment_id": equipment_id,
                "equipment_name": name,
                "discipline": discipline,
                "commissioning_level_reached": level,
                "status": status,
                "last_test_result": last_test_result,
                "last_test_date": last_test_date.isoformat(),
                "open_ncrs": open_ncrs,
                "responsible_engineer": fake.name(),
            }
        )

    return rows


def _cli() -> None:
    parser = argparse.ArgumentParser(description="Generate mock EPC demo data.")
    parser.add_argument("--out", default="data/mock_schedules", help="Output directory for the schedule CSV")
    parser.add_argument(
        "--docs-out", default="data/raw_documents", help="Output directory for mock submittal/spec text"
    )
    args = parser.parse_args()

    schedule_path = write_schedule_csv(Path(args.out) / "mock_schedule.csv")
    submittal_path = write_mock_submittal(Path(args.docs_out) / "mock_ups_submittal.txt")
    spec_path = write_mock_spec(Path(args.docs_out) / "mock_ups_spec.txt")

    print(f"Wrote schedule:  {schedule_path}")
    print(f"Wrote submittal: {submittal_path}")
    print(f"Wrote spec:      {spec_path}")


if __name__ == "__main__":
    _cli()
