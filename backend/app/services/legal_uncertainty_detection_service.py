import re
from typing import Dict, Any, List


class LegalUncertaintyDetectionService:

    UNCERTAINTY_PATTERNS = [
        r"\bmay\b",
        r"\bmight\b",
        r"\bcould\b",
        r"\bpossibly\b",
        r"\bpotentially\b",
        r"\bunclear\b",
        r"\buncertain\b",
        r"\binsufficient\b",
        r"\bnot enough information\b",
        r"\binsufficient information\b",
        r"\bcannot determine\b",
        r"\bunable to determine\b",
        r"\bcannot conclude\b",
        r"\brequires further verification\b",
        r"\brequires further review\b",
        r"\bfurther information is required\b",
        r"\bfurther evidence is required\b",
        r"\bnot established\b",
        r"\bnot clear\b",
    ]

    @classmethod
    def detect(
        cls,
        rag_result: Dict[str, Any]
    ) -> Dict[str, Any]:

        if not isinstance(rag_result, dict):
            raise ValueError(
                "rag_result must be a dictionary"
            )

        issue_summary = str(
            rag_result.get(
                "issue_summary",
                ""
            )
        )

        legal_analysis = str(
            rag_result.get(
                "legal_analysis",
                ""
            )
        )

        limitations = rag_result.get(
            "limitations",
            []
        )

        if not isinstance(limitations, list):
            limitations = [str(limitations)]

        limitation_text = "\n".join(
            str(item)
            for item in limitations
        )

        combined_text = "\n".join([
            issue_summary,
            legal_analysis,
            limitation_text
        ]).strip()

        detected_phrases: List[str] = []

        for pattern in cls.UNCERTAINTY_PATTERNS:

            matches = re.findall(
                pattern,
                combined_text,
                flags=re.IGNORECASE
            )

            if matches:
                detected_phrases.append(
                    matches[0]
                )

        # Remove duplicates while preserving order.
        detected_phrases = list(
            dict.fromkeys(
                phrase.lower()
                for phrase in detected_phrases
            )
        )

        explicit_human_review = bool(
            rag_result.get(
                "needs_human_review",
                False
            )
        )

        uncertainty_detected = bool(
            detected_phrases
            or explicit_human_review
        )

        reasons = []

        if detected_phrases:
            reasons.append(
                "Uncertainty language was detected "
                "in the generated legal information."
            )

        if explicit_human_review:
            reasons.append(
                "The legal RAG engine explicitly "
                "requested human review."
            )

        return {
            "uncertainty_detected": uncertainty_detected,
            "status": (
                "DETECTED"
                if uncertainty_detected
                else "CLEAR"
            ),
            "detected_phrases": detected_phrases,
            "explicit_human_review": explicit_human_review,
            "reasons": reasons
        }