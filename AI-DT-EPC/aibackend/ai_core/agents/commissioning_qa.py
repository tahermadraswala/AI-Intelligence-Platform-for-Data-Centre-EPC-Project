"""
ai_core.agents.commissioning_qa
-----------------------------------
Commissioning Quality Assurance Copilot.

Takes a list of equipment commissioning-status dicts (see
ai_core/utils/mock_data_gen.py:generate_mock_commissioning_records for the
expected shape, or load real data from a CSV via
`load_commissioning_csv`), reasons about test results and open NCRs
(non-conformance reports) against commissioning-standard expectations, and
asks the LLM for a per-equipment readiness assessment plus an overall
go/no-go recommendation.

Backend usage (api/routes/commissioning.py):

    from ai_core.agents.commissioning_qa import CommissioningQAAgent, load_commissioning_csv

    records = load_commissioning_csv("data/mock_schedules/mock_commissioning.csv")
    agent = CommissioningQAAgent()
    result = agent.assess(records)
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
from ai_core.prompts.system_prompts import COMMISSIONING_QA_SYSTEM_PROMPT

logger = logging.getLogger("ai_core.commissioning_qa")

RESPONSE_SCHEMA_HINT = """Respond with a single JSON object of this exact shape:
{
  "overall_readiness_percentage": <float 0-100, share of equipment assessed READY>,
  "go_no_go_recommendation": "PROCEED" | "PROCEED_WITH_CAUTION" | "DO_NOT_PROCEED",
  "equipment_assessments": [
    {
      "equipment_id": "<equipment_id from the input>",
      "equipment_name": "<name>",
      "readiness_status": "READY" | "TESTING" | "BLOCKED" | "FAILED",
      "confidence": <int 0-100>,
      "reasoning": "<grounded in the specific test results / NCRs provided>",
      "blocking_ncrs": ["<ncr_id>", "..."],
      "recommended_actions": ["<specific next action 1>", "<action 2>"]
    }
  ],
  "critical_blockers": ["<equipment_id / ncr_id combos that most threaten go-live>"],
  "assumptions": ["<any assumption made due to incomplete data>"]
}"""


@dataclass
class CommissioningQAResult:
    overall_readiness_percentage: float
    go_no_go_recommendation: str
    equipment_assessments: list[dict] = field(default_factory=list)
    critical_blockers: list[str] = field(default_factory=list)
    assumptions: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "overall_readiness_percentage": self.overall_readiness_percentage,
            "go_no_go_recommendation": self.go_no_go_recommendation,
            "equipment_assessments": self.equipment_assessments,
            "critical_blockers": self.critical_blockers,
            "assumptions": self.assumptions,
        }


def load_commissioning_csv(path: str | Path) -> list[dict]:
    path = Path(path)
    with path.open(newline="") as f:
        return list(csv.DictReader(f))


class CommissioningQAAgent:
    def __init__(self):
        settings.validate()
        self.client = genai.GenerativeModel(
            model_name=settings.llm_model,
            generation_config=types.GenerationConfig(
                temperature=settings.llm_temperature,
                max_output_tokens=settings.max_tokens,
            ),
        )

    def assess(self, records: list[dict]) -> dict:
        """
        `records` is a list of dicts, each with at minimum:
        equipment_id, equipment_name, discipline,
        commissioning_level_reached, status, last_test_result,
        last_test_date, open_ncrs (list of {ncr_id, severity, summary}).

        Returns a CommissioningQAResult as a dict.
        """
        if not records:
            return CommissioningQAResult(
                overall_readiness_percentage=0.0,
                go_no_go_recommendation="DO_NOT_PROCEED",
                assumptions=["No commissioning/equipment data was provided."],
            ).to_dict()

        records_json = json.dumps(records, indent=2)
        user_prompt = f"""EQUIPMENT COMMISSIONING STATUS & OPEN NCRs:
{records_json}

---

{RESPONSE_SCHEMA_HINT}"""

        messages = [
            {"role": "system", "content": COMMISSIONING_QA_SYSTEM_PROMPT},
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
            logger.warning("Commissioning QA LLM output was not valid JSON; wrapping as fallback.")
            return {
                "overall_readiness_percentage": 0.0,
                "go_no_go_recommendation": "PROCEED_WITH_CAUTION",
                "equipment_assessments": [],
                "critical_blockers": [],
                "assumptions": ["Model response could not be parsed as structured JSON."],
                "raw_output": text,
            }


if __name__ == "__main__":
    # Quick manual smoke test:
    #   python -m ai_core.agents.commissioning_qa
    from ai_core.utils.mock_data_gen import generate_mock_commissioning_records

    agent = CommissioningQAAgent()
    result = agent.assess(generate_mock_commissioning_records())
    print(json.dumps(result, indent=2))
