from typing import List, Dict, Any, Optional
import json
import re

from app.services.groq_service import GroqService


class LegalRAGService:

    MODEL = "openai/gpt-oss-20b"

    def __init__(self, groq_client=None):
        if groq_client is None:
            groq_service = GroqService()
            groq_client = groq_service.get_client()

        self.client = groq_client

    @staticmethod
    def _build_legal_context(
        retrieved_chunks: List[Dict[str, Any]]
    ) -> str:

        context_parts = []

        for index, chunk in enumerate(
            retrieved_chunks,
            start=1
        ):
            context_parts.append(
                f"""
--- LEGAL SOURCE {index} ---
Source ID: {chunk.get("source_id", "")}
Section Number: {chunk.get("section_number", "")}
Section Title: {chunk.get("section_title", "")}
Jurisdiction: {chunk.get("jurisdiction", "")}
Legal Domain: {chunk.get("legal_domain", "")}
Legal Category: {chunk.get("legal_category", "")}
Similarity: {chunk.get("similarity", "")}

LEGAL TEXT:
{chunk.get("content", "")}
"""
            )

        return "\n".join(context_parts).strip()

    @staticmethod
    def _validate_result(
        result: Dict[str, Any],
        retrieved_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:

        if not isinstance(result, dict):
            raise RuntimeError(
                "Grounded RAG returned an invalid result."
            )

        if not isinstance(retrieved_chunks, list):
            raise RuntimeError(
                "Retrieved legal chunks must be a list."
            )

        # --------------------------------------------------
        # ALLOWED SECTIONS
        # --------------------------------------------------

        allowed_sections = {
            str(
                chunk.get(
                    "section_number",
                    ""
                )
            ).strip()
            for chunk in retrieved_chunks
        }

        # Remove empty values
        allowed_sections.discard("")

        # --------------------------------------------------
        # ALLOWED SOURCE IDS
        # --------------------------------------------------

        allowed_source_ids = {
            str(
                chunk.get(
                    "source_id",
                    ""
                )
            ).strip()
            for chunk in retrieved_chunks
        }

        # Remove empty values
        allowed_source_ids.discard("")

        # --------------------------------------------------
        # VALIDATE RELEVANT SECTIONS
        # --------------------------------------------------

        relevant_sections = result.get(
            "relevant_sections",
            []
        )

        if not isinstance(
            relevant_sections,
            list
        ):
            raise RuntimeError(
                "Grounded RAG returned invalid "
                "relevant_sections."
            )

        for section in relevant_sections:

            if not isinstance(
                section,
                dict
            ):
                raise RuntimeError(
                    "Grounded RAG returned an invalid "
                    "relevant section object."
                )

            section_number = str(
                section.get(
                    "section_number",
                    ""
                )
            ).strip()

            source_id = str(
                section.get(
                    "source_id",
                    ""
                )
            ).strip()

            if not section_number:
                raise RuntimeError(
                    "Grounding validation failed: "
                    "missing section number."
                )

            if not source_id:
                raise RuntimeError(
                    "Grounding validation failed: "
                    "missing source ID."
                )

            if section_number not in allowed_sections:
                raise RuntimeError(
                    "Grounding validation failed: "
                    f"unsupported section {section_number}"
                )

            if source_id not in allowed_source_ids:
                raise RuntimeError(
                    "Grounding validation failed: "
                    f"unsupported source {source_id}"
                )

        # --------------------------------------------------
        # GENERATED TEXT
        # --------------------------------------------------

        legal_analysis = str(
            result.get(
                "legal_analysis",
                ""
            )
        )

        issue_summary = str(
            result.get(
                "issue_summary",
                ""
            )
        )

        combined_text = (
            legal_analysis
            + "\n"
            + issue_summary
        )

        # --------------------------------------------------
        # FORBIDDEN EXTERNAL LEGAL REFERENCES
        # --------------------------------------------------
        #
        # These references are blocked ONLY when they are
        # introduced by the generated answer.
        #
        # If the exact reference appears inside the
        # retrieved official legal source text, it is
        # considered source-grounded and is allowed.
        # --------------------------------------------------

        forbidden_external_references = [
            "Indian Penal Code",
            "IPC",
            "Bharatiya Nyaya Sanhita",
            "BNS",
            "Code of Criminal Procedure",
            "CrPC",
            "Bharatiya Nagarik Suraksha Sanhita",
            "BNSS",
            "Indian Evidence Act",
            "Bharatiya Sakshya Adhiniyam",
            "BSA",
        ]

        # Build the complete retrieved legal corpus.
        retrieved_source_text = "\n".join(
            str(
                chunk.get(
                    "content",
                    ""
                )
            )
            for chunk in retrieved_chunks
        )

        for reference in forbidden_external_references:

            generated_reference_match = re.search(
                rf"\b{re.escape(reference)}\b",
                combined_text,
                flags=re.IGNORECASE
            )

            if not generated_reference_match:
                continue

            source_reference_match = re.search(
                rf"\b{re.escape(reference)}\b",
                retrieved_source_text,
                flags=re.IGNORECASE
            )

            # Reference exists in the supplied legal corpus.
            # Therefore it is source-grounded.
            if source_reference_match:
                continue

            # Reference exists only in generated output.
            # Therefore it is unsupported.
            raise RuntimeError(
                "Grounding validation failed: "
                f"unsupported legal source reference: "
                f"{reference}"
            )

        # --------------------------------------------------
        # RETURN VALIDATED RESULT
        # --------------------------------------------------

        return result

    def generate(
        self,
        case_id: str,
        jurisdiction: str,
        legal_domain: Optional[str],
        case_summary: str,
        case_facts: Optional[Dict[str, Any]],
        retrieved_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:

        if not case_id:
            raise ValueError(
                "case_id is required"
            )

        if not jurisdiction:
            raise ValueError(
                "jurisdiction is required"
            )

        if not retrieved_chunks:

            return {
                "case_id": case_id,
                "jurisdiction": jurisdiction,
                "legal_domain": legal_domain,
                "issue_summary": "",
                "legal_analysis": "",
                "relevant_sections": [],
                "limitations": [
                    "No relevant legal material was retrieved."
                ],
                "needs_human_review": True
            }

        # --------------------------------------------------
        # BUILD LEGAL CONTEXT
        # --------------------------------------------------

        legal_context = (
            self._build_legal_context(
                retrieved_chunks
            )
        )

        # --------------------------------------------------
        # GROUNDED RAG PROMPT
        # --------------------------------------------------

        prompt = f"""
You are the Grounded Legal RAG engine for NYAYAOS.

You must ONLY explain the legal material explicitly
supplied below.

CRITICAL GROUNDING REQUIREMENT:

The supplied LEGAL SOURCE MATERIAL is the complete legal
authority available to you for this response.

You MUST NOT introduce:
- another statute
- another Act
- another code
- another regulation
- another legal section
- another legal authority
- outside legal knowledge

If a legal point is not supported by the supplied material,
state that the retrieved material is insufficient.

CASE ID:
{case_id}

JURISDICTION:
{jurisdiction}

LEGAL DOMAIN:
{legal_domain or "Not specified"}

CASE SUMMARY:
{case_summary or "Not provided"}

CASE FACTS:
{json.dumps(
    case_facts or {},
    ensure_ascii=False,
    indent=2
)}

LEGAL SOURCE MATERIAL:
{legal_context}

STRICT RULES:

1. Use ONLY the supplied legal source material.

2. Do NOT introduce another statute, Act, code,
   regulation, section, or legal authority.

3. Do NOT mention IPC, BNS, CrPC, BNSS, Evidence Act,
   BSA, or any other statute unless that reference
   appears explicitly in the supplied legal source material.

4. Do NOT invent section numbers.

5. Do NOT invent source names.

6. Do NOT invent citations.

7. Do NOT invent URLs.

8. Do NOT assume that similarity means legal applicability.

9. Do NOT state that a person definitely committed
   an offence.

10. Do NOT guarantee a legal outcome.

11. Clearly distinguish facts from legal provisions.

12. Preserve uncertainty.

13. If the retrieved material is insufficient,
    explicitly say so.

14. Every relevant section must come from the
    supplied legal material.

15. Every relevant section must use the exact
    section number and source_id supplied in the context.

16. Do not use outside legal knowledge to complete
    missing information.

17. Use neutral legal-information language.

18. A legal reference appearing inside the supplied
    source text may be mentioned only as part of
    explaining that source material. Do not treat
    that reference as an independently retrieved
    legal authority.

Return ONLY valid JSON:

{{
  "issue_summary": "",
  "legal_analysis": "",
  "relevant_sections": [
    {{
      "section_number": "",
      "section_title": "",
      "source_id": "",
      "jurisdiction": "",
      "explanation": ""
    }}
  ],
  "limitations": [],
  "needs_human_review": false
}}

Set needs_human_review to true if:
- important facts are missing,
- retrieved legal material is insufficient,
- interpretation goes beyond the supplied material,
- or there is a risk of an unsupported legal conclusion.
"""

        # --------------------------------------------------
        # GROQ REQUEST
        # --------------------------------------------------

        response = self.client.chat.completions.create(
            model=self.MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a strictly grounded legal "
                        "information engine. "
                        "Use only the legal source material "
                        "provided in the user message."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0,
            max_completion_tokens=4000,
            reasoning_effort="low",
            response_format={
                "type": "json_object"
            }
        )

        # --------------------------------------------------
        # RESPONSE CONTENT
        # --------------------------------------------------

        content = response.choices[0].message.content

        if not content:
            raise RuntimeError(
                "Groq returned an empty legal RAG response."
            )

        # --------------------------------------------------
        # JSON VALIDATION
        # --------------------------------------------------

        try:

            result = json.loads(
                content
            )

        except json.JSONDecodeError as exc:

            raise RuntimeError(
                "Groq returned invalid JSON."
            ) from exc

        # --------------------------------------------------
        # GROUNDING VALIDATION
        # --------------------------------------------------

        result = self._validate_result(
            result,
            retrieved_chunks
        )

        # --------------------------------------------------
        # FINAL NORMALIZED RESULT
        # --------------------------------------------------

        return {
            "case_id": case_id,

            "jurisdiction": jurisdiction,

            "legal_domain": legal_domain,

            "issue_summary": result.get(
                "issue_summary",
                ""
            ),

            "legal_analysis": result.get(
                "legal_analysis",
                ""
            ),

            "relevant_sections": result.get(
                "relevant_sections",
                []
            ),

            "limitations": result.get(
                "limitations",
                []
            ),

            "needs_human_review": bool(
                result.get(
                    "needs_human_review",
                    False
                )
            )
        }