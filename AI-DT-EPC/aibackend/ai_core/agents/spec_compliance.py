"""
ai_core.agents.spec_compliance
--------------------------------
Specification & Quality Compliance Agent.

Given a vendor submittal / shop drawing text, retrieves the relevant
governing spec clauses from the `specs_and_standards` vector collection
and asks the LLM to identify deviations, citing clause references and
assigning severity — output as structured JSON ready to log into the
quality-audit trail.

Backend usage (api/routes/agents.py):

    from ai_core.agents.spec_compliance import SpecComplianceAgent

    agent = SpecComplianceAgent()
    result = agent.check_submittal(submittal_text, equipment_type="UPS system")
    # result["deviations"] -> list of dicts, persist via services/ CRUD
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from google import genai
from google.genai import types


from ai_core.config import settings
from ai_core.prompts.system_prompts import SPEC_COMPLIANCE_SYSTEM_PROMPT
from ai_core.tools.vector_search import VectorStore, format_docs_for_prompt

logger = logging.getLogger("ai_core.spec_compliance")

RESPONSE_SCHEMA_HINT = """Respond with a single JSON object of this exact shape:
{
  "overall_status": "COMPLIANT" | "NON_COMPLIANT" | "PARTIALLY_COMPLIANT" | "INSUFFICIENT_SPEC_CONTEXT",
  "summary": "<one or two sentence summary for a human reviewer>",
  "deviations": [
    {
      "clause_reference": "<spec section/clause cited>",
      "description": "<what deviates and why it matters>",
      "severity": "CRITICAL" | "MAJOR" | "MINOR" | "INFORMATIONAL",
      "submittal_excerpt": "<short excerpt from the submittal that triggered this>"
    }
  ]
}"""


@dataclass
class SpecComplianceResult:
    overall_status: str
    summary: str
    deviations: list[dict] = field(default_factory=list)
    retrieved_context_sources: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "overall_status": self.overall_status,
            "summary": self.summary,
            "deviations": self.deviations,
            "retrieved_context_sources": self.retrieved_context_sources,
        }


class SpecComplianceAgent:
    def __init__(self, k_context_chunks: int = 6):
        settings.validate()
        self.client = genai.GenerativeModel(
            model_name=settings.llm_model,
            generation_config=types.GenerationConfig(
                temperature=settings.llm_temperature,
                max_output_tokens=settings.max_tokens,
            )
        )
        self.spec_store = VectorStore(collection_name=settings.collection_specs)
        self.k = k_context_chunks

    def check_submittal(self, submittal_text: str, equipment_type: str = "") -> dict:
        """
        Compares `submittal_text` against retrieved spec context and
        returns a SpecComplianceResult as a dict.

        `equipment_type` (e.g. "UPS system", "generator", "cooling tower")
        is used purely to focus the retrieval query — it is not required.
        """
        if self.spec_store.count() == 0:
            return SpecComplianceResult(
                overall_status="INSUFFICIENT_SPEC_CONTEXT",
                summary=(
                    "No specification documents have been ingested yet. "
                    "Run ai_core/utils/pdf_parser.py to ingest specs into the "
                    "'specs_and_standards' collection before running compliance checks."
                ),
            ).to_dict()

        retrieval_query = f"{equipment_type} specification requirements" if equipment_type else submittal_text[:300]
        context_docs = self.spec_store.similarity_search(retrieval_query, k=self.k)
        context_block = format_docs_for_prompt(context_docs)
        sources = sorted({d.metadata.get("source", "unknown") for d in context_docs})

        user_prompt = f"""GOVERNING SPECIFICATION CONTEXT (retrieved):
{context_block}

---

VENDOR SUBMITTAL TO CHECK:
{submittal_text}

---

{RESPONSE_SCHEMA_HINT}"""

        messages = [
            {"role": "system", "content": SPEC_COMPLIANCE_SYSTEM_PROMPT},
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

        parsed = self._safe_parse(response_content)
        parsed["retrieved_context_sources"] = sources
        return parsed

    @staticmethod
    def _safe_parse(raw_content) -> dict:
        # Gemini can return a string.
        text = raw_content if isinstance(raw_content, str) else "".join(
            block.get("text", "") for block in raw_content if isinstance(block, dict)
        )
        text = text.strip()
        # Strip markdown code fences if the model wrapped the JSON anyway.
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:]
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            logger.warning("Spec compliance LLM output was not valid JSON; wrapping as fallback.")
            return {
                "overall_status": "PARTIALLY_COMPLIANT",
                "summary": "Model response could not be parsed as structured JSON. Raw output attached.",
                "deviations": [],
                "raw_output": text,
            }


if __name__ == "__main__":
    # Quick manual smoke test:
    #   python -m ai_core.agents.spec_compliance
    from ai_core.utils.mock_data_gen import MOCK_SUBMITTAL_TEXT

    agent = SpecComplianceAgent()
    result = agent.check_submittal(MOCK_SUBMITTAL_TEXT.format(vendor="Acme Power Systems"), equipment_type="UPS system")
    print(json.dumps(result, indent=2))
