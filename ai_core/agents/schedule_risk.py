"""
ai_core.agents.schedule_risk
-------------------------------
Predictive Schedule Risk Engine.

Takes a project schedule (list of task dicts — see
ai_core/utils/mock_data_gen.py for the expected shape, or load real data
from a CSV via `load_schedule_csv`), reasons about dependency-chain
propagation, and asks the LLM to identify critical-path risks with
concrete mitigation options weeks in advance.

Backend usage (api/routes/schedule.py):

    from ai_core.agents.schedule_risk import ScheduleRiskAgent, load_schedule_csv

    tasks = load_schedule_csv("data/mock_schedules/mock_schedule.csv")
    agent = ScheduleRiskAgent()
    result = agent.analyze(tasks)
"""

from __future__ import annotations

import csv
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

from ai_core.config import settings
from ai_core.prompts.system_prompts import SCHEDULE_RISK_SYSTEM_PROMPT

logger = logging.getLogger("ai_core.schedule_risk")

RESPONSE_SCHEMA_HINT = """Respond with a single JSON object of this exact shape:
{
  "project_forecast_completion_impact_days": <int, total days the overall project completion is \
projected to slip versus baseline, 0 if none>,
  "risks": [
    {
      "task_id": "<task id from the input>",
      "task_name": "<task name>",
      "is_critical_path": true | false,
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "estimated_schedule_impact_days": <int>,
      "root_cause": "<short explanation of why this task is at risk>",
      "downstream_impact": "<which downstream tasks/milestones are affected and how>",
      "mitigation_options": ["<specific, actionable option 1>", "<option 2>"]
    }
  ],
  "assumptions": ["<any assumption made due to incomplete data>"]
}"""


@dataclass
class ScheduleRiskResult:
    project_forecast_completion_impact_days: int
    risks: list[dict] = field(default_factory=list)
    assumptions: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "project_forecast_completion_impact_days": self.project_forecast_completion_impact_days,
            "risks": self.risks,
            "assumptions": self.assumptions,
        }


def load_schedule_csv(path: str | Path) -> list[dict]:
    path = Path(path)
    with path.open(newline="") as f:
        return list(csv.DictReader(f))


class ScheduleRiskAgent:
    def __init__(self):
        settings.validate()
        self.llm = ChatAnthropic(
            model=settings.llm_model,
            temperature=settings.llm_temperature,
            max_tokens=settings.max_tokens,
            api_key=settings.anthropic_api_key,
        )

    def analyze(self, tasks: list[dict]) -> dict:
        """
        `tasks` is a list of dicts, each with at minimum:
        task_id, task_name, depends_on, planned_start, planned_end,
        forecast_end, delay_days, status.

        Returns a ScheduleRiskResult as a dict.
        """
        if not tasks:
            return ScheduleRiskResult(
                project_forecast_completion_impact_days=0,
                assumptions=["No schedule data was provided."],
            ).to_dict()

        schedule_json = json.dumps(tasks, indent=2)
        user_prompt = f"""PROJECT SCHEDULE (tasks with dependencies, planned vs. forecast dates):
{schedule_json}

---

{RESPONSE_SCHEMA_HINT}"""

        messages = [
            SystemMessage(content=SCHEDULE_RISK_SYSTEM_PROMPT),
            HumanMessage(content=user_prompt),
        ]

        response = self.llm.invoke(messages)
        return self._safe_parse(response.content)

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
            logger.warning("Schedule risk LLM output was not valid JSON; wrapping as fallback.")
            return {
                "project_forecast_completion_impact_days": 0,
                "risks": [],
                "assumptions": ["Model response could not be parsed as structured JSON."],
                "raw_output": text,
            }


if __name__ == "__main__":
    # Quick manual smoke test:
    #   python -m ai_core.agents.schedule_risk
    from ai_core.utils.mock_data_gen import generate_mock_schedule

    agent = ScheduleRiskAgent()
    result = agent.analyze(generate_mock_schedule())
    print(json.dumps(result, indent=2))
