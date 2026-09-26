from typing import Dict, Any


class LegalBlockedStatusService:

    STATUS = "BLOCKED"

    @classmethod
    def build(
        cls,
        safety_decision: Dict[str, Any],
        rag_result: Dict[str, Any],
        citations: list
    ) -> Dict[str, Any]:

        if not isinstance(safety_decision, dict):
            raise ValueError(
                "safety_decision must be a dictionary"
            )

        if not isinstance(rag_result, dict):
            raise ValueError(
                "rag_result must be a dictionary"
            )

        if not isinstance(citations, list):
            raise ValueError(
                "citations must be a list"
            )

        if safety_decision.get("status") != cls.STATUS:
            raise ValueError(
                "BLOCKED status cannot be created when "
                "safety decision is not BLOCKED."
            )

        checks = safety_decision.get(
            "checks",
            {}
        )

        blocking_reasons = []

        if checks.get(
            "unsupported_claim_detected",
            False
        ):
            blocking_reasons.append(
                "Unsupported legal claim detected."
            )

        if not checks.get(
            "jurisdiction_verified",
            False
        ):
            blocking_reasons.append(
                "Legal jurisdiction could not be verified."
            )

        if not checks.get(
            "provision_verified",
            False
        ):
            blocking_reasons.append(
                "Legal provision could not be verified."
            )

        if not blocking_reasons:
            raise ValueError(
                "BLOCKED status requires at least one "
                "blocking safety condition."
            )

        # A blocked result must never expose the generated
        # legal analysis as safe/actionable information.
        return {
            "status": cls.STATUS,

            "safe_to_present": False,

            "requires_human_review": True,

            "case_id": rag_result.get(
                "case_id"
            ),

            "jurisdiction": rag_result.get(
                "jurisdiction"
            ),

            "legal_domain": rag_result.get(
                "legal_domain"
            ),

            "issue_summary": "",

            "legal_analysis": "",

            "relevant_sections": [],

            "citations": [],

            "limitations": [
                "NYAYAOS could not safely verify "
                "the legal information required "
                "for this response."
            ],

            "blocking_reasons": blocking_reasons,

            "safety_checks": checks,

            "reasons": safety_decision.get(
                "reasons",
                []
            ),

            "warnings": safety_decision.get(
                "warnings",
                []
            ),
        }