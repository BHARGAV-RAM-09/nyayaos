from typing import Dict, Any


class LegalPartialStatusService:

    STATUS = "PARTIAL"

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
                "PARTIAL status cannot be created when "
                "safety decision is not PARTIAL."
            )

        checks = safety_decision.get(
            "checks",
            {}
        )

        # --------------------------------------------------
        # Conditions that make PARTIAL invalid
        # --------------------------------------------------

        blocking_checks = [
            "jurisdiction_verified",
            "provision_verified",
        ]

        failed_blocking_checks = [
            check
            for check in blocking_checks
            if not checks.get(check, False)
        ]

        if failed_blocking_checks:
            raise ValueError(
                "PARTIAL status cannot contain failed "
                f"blocking checks: {failed_blocking_checks}"
            )

        if checks.get(
            "unsupported_claim_detected",
            False
        ):
            raise ValueError(
                "PARTIAL status cannot contain "
                "unsupported claims."
            )

        # --------------------------------------------------
        # Determine what remains incomplete
        # --------------------------------------------------

        incomplete_checks = []

        check_labels = {
            "source_verified": "Legal source verification",
            "citation_verified": "Citation verification",
            "effective_date_verified": "Effective-date verification",
            "user_evidence_verified": "User-evidence verification",
        }

        for check, label in check_labels.items():

            if not checks.get(check, False):
                incomplete_checks.append(label)

        reasons = list(
            safety_decision.get(
                "reasons",
                []
            )
        )

        warnings = list(
            safety_decision.get(
                "warnings",
                []
            )
        )

        if not incomplete_checks:
            incomplete_checks.append(
                "The legal/evidence assessment requires "
                "additional review."
            )

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

            "incomplete_checks": incomplete_checks,

            "safety_checks": checks,

            "reasons": reasons,

            "warnings": warnings,
        }