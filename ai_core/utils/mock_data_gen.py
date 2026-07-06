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
