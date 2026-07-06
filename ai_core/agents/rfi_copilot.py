"""
ai_core.agents.rfi_copilot
-----------------------------
Project Knowledge & RFI Intelligence Agent (RAG).

Answers technical/contractual questions over the full ingested project
document corpus (specs, submittals, RFIs, meeting minutes, change
orders — all expected to live in the `project_docs_rfi` collection,
though you can point it at any collection). Cites sources and flags
likely-duplicate RFIs.

Backend usage (api/routes/agents.py, /chat endpoint):

    from ai_core.agents.rfi_copilot import RFICopilotAgent

    agent = RFICopilotAgent()
    result = agent.answer("What's the required UPS battery autonomy?")
    # result["answer"], result["citations"], result["possible_duplicate_rfis"]
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

from ai_core.config import settings
from ai_core.prompts.system_prompts import RFI_COPILOT_SYSTEM_PROMPT
from ai_core.tools.vector_search import VectorStore, format_docs_for_prompt

logger = logging.getLogger("ai_core.rfi_copilot")

RESPONSE_SCHEMA_HINT = """Respond with a single JSON object of this exact shape:
{
  "answer": "<direct, field-usable answer>",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "citations": [
    {"source": "<document filename>", "section": "<section/page if known>", "excerpt": "<short supporting excerpt>"}
  ],
  "possible_duplicate_rfis": ["<short description of any prior RFI in the context that resolves the same question, else empty list>"],
  "context_sufficient": true | false
}"""


@dataclass
class RFIAnswer:
    answer: str
    confidence: str
    citations: list[dict] = field(default_factory=list)
    possible_duplicate_rfis: list[str] = field(default_factory=list)
    context_sufficient: bool = True

    def to_dict(self) -> dict:
        return {
            "answer": self.answer,
            "confidence": self.confidence,
            "citations": self.citations,
            "possible_duplicate_rfis": self.possible_duplicate_rfis,
            "context_sufficient": self.context_sufficient,
        }


class RFICopilotAgent:
    def __init__(self, collection: str | None = None, k_context_chunks: int = 8):
        settings.validate()
        self.llm = ChatAnthropic(
            model=settings.llm_model,
            temperature=settings.llm_temperature,
            max_tokens=settings.max_tokens,
            api_key=settings.anthropic_api_key,
        )
        self.collection_name = collection or settings.collection_project_docs
        self.store = VectorStore(collection_name=self.collection_name)
        self.k = k_context_chunks

    def answer(self, question: str, chat_history: list[dict] | None = None) -> dict:
        """
        `chat_history` (optional) is a list of {"role": "user"|"assistant",
        "content": str} dicts for multi-turn conversations — passed through
        to the LLM for follow-up question context.
        """
        if self.store.count() == 0:
            return RFIAnswer(
                answer=(
                    "No project documents have been ingested yet. Run "
                    "ai_core/utils/pdf_parser.py to ingest documents into the "
                    f"'{self.collection_name}' collection first."
                ),
                confidence="LOW",
                context_sufficient=False,
            ).to_dict()

        docs = self.store.similarity_search(question, k=self.k)
        context_block = format_docs_for_prompt(docs)

        user_prompt = f"""RETRIEVED PROJECT DOCUMENT CONTEXT:
{context_block}

---

QUESTION: {question}

---

{RESPONSE_SCHEMA_HINT}"""

        messages: list = [SystemMessage(content=RFI_COPILOT_SYSTEM_PROMPT)]
        for turn in chat_history or []:
            role = turn.get("role")
            content = turn.get("content", "")
            if role == "assistant":
                messages.append(HumanMessage(content=f"[Prior assistant answer]: {content}"))
            else:
                messages.append(HumanMessage(content=f"[Prior user question]: {content}"))
        messages.append(HumanMessage(content=user_prompt))

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
            logger.warning("RFI copilot LLM output was not valid JSON; falling back to raw text answer.")
            return {
                "answer": text,
                "confidence": "LOW",
                "citations": [],
                "possible_duplicate_rfis": [],
                "context_sufficient": True,
            }


if __name__ == "__main__":
    # Quick manual smoke test:
    #   python -m ai_core.agents.rfi_copilot
    agent = RFICopilotAgent()
    result = agent.answer("What is the required UPS battery autonomy per spec?")
    print(json.dumps(result, indent=2))
