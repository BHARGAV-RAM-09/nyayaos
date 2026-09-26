import re
from typing import Dict, Any, List


class LegalUnsupportedClaimDetectionService:

    HIGH_RISK_PATTERNS = [
        r"\bdefinitely\b",
        r"\bguaranteed\b",
        r"\bguarantees\b",
        r"\bwill win\b",
        r"\bwill definitely win\b",
        r"\bwill be convicted\b",
        r"\bis guilty\b",
        r"\bcommitted the offence\b",
        r"\bcommitted an offence\b",
        r"\bmust refund\b",
        r"\bmust compensate\b",
        r"\bguaranteed compensation\b",
        r"\bwill receive compensation\b",
        r"\bwill receive a refund\b",
        r"\bthe court will\b",
        r"\bthe bank will\b",
        r"\bthe authority will\b",
    ]

    @classmethod
    def detect(
        cls,
        rag_result: Dict[str, Any],
        retrieved_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:

        if not isinstance(rag_result, dict):
            raise ValueError(
                "rag_result must be a dictionary"
            )

        if not isinstance(retrieved_chunks, list):
            raise ValueError(
                "retrieved_chunks must be a list"
            )

        legal_analysis = str(
            rag_result.get(
                "legal_analysis",
                ""
            )
        )

        issue_summary = str(
            rag_result.get(
                "issue_summary",
                ""
            )
        )

        combined_text = (
            issue_summary
            + "\n"
            + legal_analysis
        ).strip()

        detected_claims: List[str] = []

        for pattern in cls.HIGH_RISK_PATTERNS:

            matches = re.findall(
                pattern,
                combined_text,
                flags=re.IGNORECASE
            )

            for match in matches:
                detected_claims.append(match)

        detected_claims = list(
            dict.fromkeys(
                claim.lower()
                for claim in detected_claims
            )
        )

        # Verify that referenced sections actually exist
        # in the retrieved legal material.
        allowed_sections = {
            str(
                chunk.get("section_number", "")
            ).strip()
            for chunk in retrieved_chunks
        }

        invalid_sections = []

        for section in rag_result.get(
            "relevant_sections",
            []
        ):

            if not isinstance(section, dict):
                continue

            section_number = str(
                section.get(
                    "section_number",
                    ""
                )
            ).strip()

            if (
                section_number
                and section_number not in allowed_sections
            ):
                invalid_sections.append(
                    section_number
                )

        unsupported_claim_detected = bool(
            detected_claims
            or invalid_sections
        )

        reasons = []

        if detected_claims:
            reasons.append(
                "High-risk unsupported legal "
                "conclusion language was detected."
            )

        if invalid_sections:
            reasons.append(
                "The RAG output references legal "
                "provisions that were not retrieved."
            )

        return {
            "unsupported_claim_detected": (
                unsupported_claim_detected
            ),
            "status": (
                "DETECTED"
                if unsupported_claim_detected
                else "CLEAR"
            ),
            "detected_claims": detected_claims,
            "invalid_sections": invalid_sections,
            "reasons": reasons
        }