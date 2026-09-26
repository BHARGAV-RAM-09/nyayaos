from typing import Dict, Any, List


class LegalSafetyExplanationService:

    @staticmethod
    def _check_status(
        value: bool
    ) -> str:

        return "VERIFIED" if value else "NOT VERIFIED"

    @classmethod
    def build(
        cls,
        safety_decision: Dict[str, Any],
        user_evidence_verification: Dict[str, Any],
        rag_result: Dict[str, Any],
        citations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:

        if not isinstance(safety_decision, dict):
            raise ValueError(
                "safety_decision must be a dictionary"
            )

        if not isinstance(
            user_evidence_verification,
            dict
        ):
            raise ValueError(
                "user_evidence_verification must be a dictionary"
            )

        if not isinstance(rag_result, dict):
            raise ValueError(
                "rag_result must be a dictionary"
            )

        if not isinstance(citations, list):
            raise ValueError(
                "citations must be a list"
            )

        checks = safety_decision.get(
            "checks",
            {}
        )

        # --------------------------------------------------
        # VERIFICATION CHECKS
        # --------------------------------------------------

        verification_checks = [
            {
                "key": "source_verified",
                "label": "Legal source",
                "status": cls._check_status(
                    checks.get(
                        "source_verified",
                        False
                    )
                )
            },
            {
                "key": "citation_verified",
                "label": "Citation",
                "status": cls._check_status(
                    checks.get(
                        "citation_verified",
                        False
                    )
                )
            },
            {
                "key": "provision_verified",
                "label": "Legal provision",
                "status": cls._check_status(
                    checks.get(
                        "provision_verified",
                        False
                    )
                )
            },
            {
                "key": "jurisdiction_verified",
                "label": "Jurisdiction",
                "status": cls._check_status(
                    checks.get(
                        "jurisdiction_verified",
                        False
                    )
                )
            },
            {
                "key": "effective_date_verified",
                "label": "Effective date",
                "status": cls._check_status(
                    checks.get(
                        "effective_date_verified",
                        False
                    )
                )
            },
            {
                "key": "user_evidence_verified",
                "label": "User evidence",
                "status": cls._check_status(
                    checks.get(
                        "user_evidence_verified",
                        False
                    )
                )
            }
        ]

        # --------------------------------------------------
        # SAFETY SIGNALS
        # --------------------------------------------------

        safety_signals = [
            {
                "key": "uncertainty_detected",
                "label": "Uncertainty detection",
                "detected": bool(
                    checks.get(
                        "uncertainty_detected",
                        False
                    )
                )
            },
            {
                "key": "unsupported_claim_detected",
                "label": "Unsupported claim detection",
                "detected": bool(
                    checks.get(
                        "unsupported_claim_detected",
                        False
                    )
                )
            }
        ]

        # --------------------------------------------------
        # EVIDENCE SUMMARY
        # --------------------------------------------------

        evidence_summary = {
            "total_claims": user_evidence_verification.get(
                "total_claims",
                0
            ),
            "supported_claims": user_evidence_verification.get(
                "supported_count",
                0
            ),
            "partial_claims": user_evidence_verification.get(
                "partial_count",
                0
            ),
            "missing_claims": user_evidence_verification.get(
                "missing_count",
                0
            ),
            "coverage_percentage": user_evidence_verification.get(
                "coverage_percentage",
                0
            )
        }

        # --------------------------------------------------
        # CLAIM → EVIDENCE TRACEABILITY
        # --------------------------------------------------

        evidence_links = []

        for claim in (
            user_evidence_verification.get(
                "supported_claims",
                []
            )
            + user_evidence_verification.get(
                "partial_claims",
                []
            )
            + user_evidence_verification.get(
                "missing_claims",
                []
            )
        ):

            evidence_links.append({
                "claim_id": claim.get(
                    "claim_id"
                ),
                "claim": claim.get(
                    "label"
                ),
                "evidence_status": claim.get(
                    "evidence_status"
                ),
                "evidence_confidence": claim.get(
                    "evidence_confidence",
                    0
                ),
                "evidence_links": claim.get(
                    "evidence_links",
                    []
                )
            })

        # --------------------------------------------------
        # LEGAL SOURCE TRACEABILITY
        # --------------------------------------------------

        legal_sources = []

        for citation in citations:

            legal_sources.append({
                "section_number": citation.get(
                    "section_number"
                ),
                "section_title": citation.get(
                    "section_title"
                ),
                "source_id": citation.get(
                    "source_id"
                ),
                "source_title": citation.get(
                    "source_title"
                ),
                "citation": citation.get(
                    "citation"
                ),
                "jurisdiction": citation.get(
                    "jurisdiction"
                ),
                "source_url": citation.get(
                    "source_url"
                )
            })

        # --------------------------------------------------
        # WHY
        # --------------------------------------------------

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

        status = safety_decision.get(
            "status"
        )

        if status == "SUPPORTED":
            explanation = (
                "NYAYAOS found sufficient verified "
                "legal and evidence grounding to present "
                "this information."
            )

        elif status == "PARTIAL":
            explanation = (
                "NYAYAOS found relevant verified "
                "information, but the evidence or "
                "verification is incomplete."
            )

        elif status == "BLOCKED":
            explanation = (
                "NYAYAOS could not safely verify the "
                "legal information required for this response."
            )

        elif status == "HUMAN_REVIEW":
            explanation = (
                "NYAYAOS found potentially relevant "
                "information, but additional human "
                "review is required."
            )

        else:
            explanation = (
                "NYAYAOS could not determine a valid "
                "safety status."
            )

        return {
            "title": "Why Did NYAYAOS Say This?",

            "status": status,

            "safe_to_present": bool(
                safety_decision.get(
                    "safe_to_present",
                    False
                )
            ),

            "requires_human_review": bool(
                safety_decision.get(
                    "requires_human_review",
                    False
                )
            ),

            "explanation": explanation,

            "verification_checks": verification_checks,

            "safety_signals": safety_signals,

            "evidence_summary": evidence_summary,

            "claim_evidence_trace": evidence_links,

            "legal_source_trace": legal_sources,

            "reasons": reasons,

            "warnings": warnings,

            "case_id": rag_result.get(
                "case_id"
            ),

            "jurisdiction": rag_result.get(
                "jurisdiction"
            ),

            "legal_domain": rag_result.get(
                "legal_domain"
            )
        }