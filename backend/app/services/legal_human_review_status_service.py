from typing import Dict, Any


class LegalHumanReviewStatusService:

    STATUS = "HUMAN_REVIEW"

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
                "HUMAN_REVIEW status cannot be created when "
                "safety decision is not HUMAN_REVIEW."
            )

        checks = safety_decision.get(
            "checks",
            {}
        )

        # --------------------------------------------------
        # HUMAN REVIEW must not contain hard-block failures
        # --------------------------------------------------

        hard_block_checks = [
            "jurisdiction_verified",
            "provision_verified",
        ]

        failed_hard_blocks = [
            check
            for check in hard_block_checks
            if not checks.get(check, False)
        ]

        if failed_hard_blocks:
            raise ValueError(
                "HUMAN_REVIEW cannot contain failed "
                f"hard-block checks: {failed_hard_blocks}"
            )

        if checks.get(
            "unsupported_claim_detected",
            False
        ):
            raise ValueError(
                "HUMAN_REVIEW cannot contain "
                "unsupported claims."
            )

        # --------------------------------------------------
        # Identify why review is required
        # --------------------------------------------------

        review_reasons = []

        if checks.get(
            "uncertainty_detected",
            False
        ):
            review_reasons.append(
                "Uncertainty was detected in the "
                "legal analysis."
            )

        if not checks.get(
            "source_verified",
            False
        ):
            review_reasons.append(
                "One or more legal sources require "
                "verification."
            )

        if not checks.get(
            "citation_verified",
            False
        ):
            review_reasons.append(
                "One or more legal citations require "
                "verification."
            )

        if not checks.get(
            "effective_date_verified",
            False
        ):
            review_reasons.append(
                "The effective date of one or more "
                "legal sources could not be verified."
            )

        if not review_reasons:
            review_reasons.extend(
                safety_decision.get(
                    "warnings",
                    []
                )
            )

        if not review_reasons:
            review_reasons.append(
                "Additional human review is required "
                "before relying on this information."
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

            "review_reasons": review_reasons,

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