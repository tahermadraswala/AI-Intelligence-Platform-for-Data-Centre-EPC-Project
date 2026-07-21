"""
ai_core.agents.supply_chain_risk
-----------------------------------
Supply Chain Visibility & Risk Agent.

Takes a list of procurement/shipment dicts (see
ai_core/utils/mock_data_gen.py:generate_mock_shipments for the expected
shape, or load real data from a CSV via `load_shipments_csv`), reasons
about manufacturing/transit/customs progress against required-on-site
dates and field notes (port disruptions, sensor alerts), and asks the LLM
to flag at-risk shipments with concrete mitigation options.

Backend usage (api/routes/supply_chain.py):

    from ai_core.agents.supply_chain_risk import SupplyChainRiskAgent, load_shipments_csv

    shipments = load_shipments_csv("data/mock_schedules/mock_shipments.csv")
    agent = SupplyChainRiskAgent()
    result = agent.analyze(shipments)
"""

from __future__ import annotations

import csv
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path

from google import genai
from google.genai import types

from ai_core.config import settings
from ai_core.prompts.system_prompts import SUPPLY_CHAIN_RISK_SYSTEM_PROMPT

logger = logging.getLogger("ai_core.supply_chain_risk")

RESPONSE_SCHEMA_HINT = """Respond with a single JSON object of this exact shape:
{
  "overall_on_time_percentage": <float 0-100, share of shipments predicted to land on or before their \
required-on-site date>,
  "total_value_at_risk_usd": <int, sum of value_usd for shipments you flag MEDIUM severity or above>,
  "shipment_risks": [
    {
      "po_id": "<po_id from the input>",
      "item": "<item name>",
      "vendor": "<vendor>",
      "risk_type": "port_congestion" | "customs_hold" | "quality_excursion" | "manufacturing_delay" | \
"route_disruption" | "other",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "description": "<what's happening and why, grounded in the field_note/progress data>",
      "predicted_delay_days": <int, vs. required_on_site_date, 0 if on time>,
      "downstream_impact": "<what this shipment being late/damaged affects on site>",
      "recommended_action": "<specific, actionable mitigation>"
    }
  ],
  "assumptions": ["<any assumption made due to incomplete data>"]
}"""


@dataclass
class SupplyChainRiskResult:
    overall_on_time_percentage: float
    total_value_at_risk_usd: int
    shipment_risks: list[dict] = field(default_factory=list)
    assumptions: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "overall_on_time_percentage": self.overall_on_time_percentage,
            "total_value_at_risk_usd": self.total_value_at_risk_usd,
            "shipment_risks": self.shipment_risks,
            "assumptions": self.assumptions,
        }


def load_shipments_csv(path: str | Path) -> list[dict]:
    path = Path(path)
    with path.open(newline="") as f:
        return list(csv.DictReader(f))


class SupplyChainRiskAgent:
    def __init__(self):
        settings.validate()
        self.client = genai.GenerativeModel(
            model_name=settings.llm_model,
            generation_config=types.GenerationConfig(
                temperature=settings.llm_temperature,
                max_output_tokens=settings.max_tokens,
            ),
        )

    def analyze(self, shipments: list[dict]) -> dict:
        """
        `shipments` is a list of dicts, each with at minimum:
        po_id, item, vendor, category, value_usd, current_phase,
        manufacturing_pct, transit_pct, customs_pct,
        required_on_site_date, predicted_delivery_date, delay_days,
        field_note.

        Returns a SupplyChainRiskResult as a dict.
        """
        if not shipments:
            return SupplyChainRiskResult(
                overall_on_time_percentage=100.0,
                total_value_at_risk_usd=0,
                assumptions=["No shipment/procurement data was provided."],
            ).to_dict()

        shipments_json = json.dumps(shipments, indent=2)
        user_prompt = f"""PROCUREMENT & SHIPMENT TRACKING DATA (manufacturing/transit/customs progress, ROS \
vs. predicted dates, field notes):
{shipments_json}

---

{RESPONSE_SCHEMA_HINT}"""

        messages = [
            {"role": "system", "content": SUPPLY_CHAIN_RISK_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        try:
            chat_completion = self.client.chat.completions.create(
                messages=messages,
                model=settings.llm_model,
                temperature=settings.llm_temperature,
                max_tokens=settings.max_tokens,
            )
            response_content = chat_completion.choices[0].message.content
        except Exception as exc:
            logger.error(f"Gemini API call failed: {exc}")
            raise RuntimeError(f"Gemini API call failed: {exc}") from exc

        return self._safe_parse(response_content)

    @staticmethod
    def _safe_parse(raw_content) -> dict:
        text = raw_content if isinstance(raw_content, str) else "".join(
            block.get("text", "") for block in raw_content if isinstance(block, dict)
        )
        text = text.strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:]
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            logger.warning("Supply chain risk LLM output was not valid JSON; wrapping as fallback.")
            return {
                "overall_on_time_percentage": 0.0,
                "total_value_at_risk_usd": 0,
                "shipment_risks": [],
                "assumptions": ["Model response could not be parsed as structured JSON."],
                "raw_output": text,
            }


if __name__ == "__main__":
    # Quick manual smoke test:
    #   python -m ai_core.agents.supply_chain_risk
    from ai_core.utils.mock_data_gen import generate_mock_shipments

    agent = SupplyChainRiskAgent()
    result = agent.analyze(generate_mock_shipments())
    print(json.dumps(result, indent=2))
