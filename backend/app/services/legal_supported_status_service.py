from typing import Dict, Any


class LegalSupportedStatusService:

    STATUS = "SUPPORTED"

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
                "SUPPORTED status cannot be created "
                "when safety decision is not SUPPORTED."
            )

        checks = safety_decision.get(
            "checks",
            {}
        )

        required_checks = [
            "source_verified",
            "citation_verified",
            "provision_verified",
            "jurisdiction_verified",
            "effective_date_verified",
            "user_evidence_verified",
        ]

        failed_checks = [
            check
            for check in required_checks
            if not checks.get(check, False)
        ]

        if failed_checks:
            raise ValueError(
                "SUPPORTED status requires all mandatory "
                f"checks to pass: {failed_checks}"
            )

        if checks.get("uncertainty_detected"):
            raise ValueError(
                "SUPPORTED status cannot contain "
                "detected uncertainty."
            )

        if checks.get("unsupported_claim_detected"):
            raise ValueError(
                "SUPPORTED status cannot contain "
                "unsupported claims."
            )

        return {
            "status": cls.STATUS,
            "safe_to_present": True,
            "requires_human_review": False,

            "case_id": rag_result.get(
                "case_id"
            ),

            "jurisdiction": rag_result.get(
                "jurisdiction"
            ),

            "legal_domain": rag_result.get(
                "legal_domain"
            ),

            "issue_summary": rag_result.get(
                "issue_summary",
                ""
            ),

            "legal_analysis": rag_result.get(
                "legal_analysis",
                ""
            ),

            "relevant_sections": rag_result.get(
                "relevant_sections",
                []
            ),

            "citations": citations,

            "limitations": rag_result.get(
                "limitations",
                []
            ),

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