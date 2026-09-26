from typing import Dict, Any


class LegalSafetyDecisionService:

    STATUS_SUPPORTED = "SUPPORTED"
    STATUS_PARTIAL = "PARTIAL"
    STATUS_BLOCKED = "BLOCKED"
    STATUS_HUMAN_REVIEW = "HUMAN_REVIEW"

    @classmethod
    def decide(
        cls,
        source_verification: Dict[str, Any],
        citation_verification: Dict[str, Any],
        provision_verification: Dict[str, Any],
        jurisdiction_verification: Dict[str, Any],
        effective_date_verification: Dict[str, Any],
        user_evidence_verification: Dict[str, Any],
        uncertainty_detection: Dict[str, Any],
        unsupported_claim_detection: Dict[str, Any],
    ) -> Dict[str, Any]:

        checks = {
            "source_verified": bool(
                source_verification.get("verified", False)
            ),
            "citation_verified": bool(
                citation_verification.get("verified", False)
            ),
            "provision_verified": bool(
                provision_verification.get("verified", False)
            ),
            "jurisdiction_verified": bool(
                jurisdiction_verification.get("verified", False)
            ),
            "effective_date_verified": bool(
                effective_date_verification.get("verified", False)
            ),
            "user_evidence_verified": bool(
                user_evidence_verification.get("verified", False)
            ),
            "uncertainty_detected": bool(
                uncertainty_detection.get(
                    "uncertainty_detected",
                    False
                )
            ),
            "unsupported_claim_detected": bool(
                unsupported_claim_detection.get(
                    "unsupported_claim_detected",
                    False
                )
            ),
        }

        reasons = []
        warnings = []

        # --------------------------------------------------
        # HARD BLOCK CONDITIONS
        # --------------------------------------------------

        if checks["unsupported_claim_detected"]:
            reasons.append(
                "Unsupported or high-risk legal conclusion detected."
            )

        if not checks["jurisdiction_verified"]:
            reasons.append(
                "Legal jurisdiction could not be verified."
            )

        if not checks["provision_verified"]:
            reasons.append(
                "One or more legal provisions could not be verified."
            )

        # --------------------------------------------------
        # HUMAN REVIEW CONDITIONS
        # --------------------------------------------------

        if checks["uncertainty_detected"]:
            warnings.append(
                "Uncertainty was detected in the legal analysis."
            )

        if not checks["user_evidence_verified"]:
            warnings.append(
                "User-provided evidence is incomplete or "
                "not fully verified."
            )

        if not checks["effective_date_verified"]:
            warnings.append(
                "The effective date of one or more legal sources "
                "could not be fully verified."
            )

        if not checks["citation_verified"]:
            warnings.append(
                "One or more legal citations could not be verified."
            )

        if not checks["source_verified"]:
            warnings.append(
                "One or more legal sources could not be verified."
            )

        # --------------------------------------------------
        # DECISION PRIORITY
        # --------------------------------------------------

        # 1. BLOCKED
        # Unsafe legal output must never proceed.
        if (
            checks["unsupported_claim_detected"]
            or not checks["jurisdiction_verified"]
            or not checks["provision_verified"]
        ):
            status = cls.STATUS_BLOCKED
            requires_human_review = True

        # 2. HUMAN REVIEW
        # Important verification uncertainty exists.
        elif (
            checks["uncertainty_detected"]
            or not checks["source_verified"]
            or not checks["citation_verified"]
            or not checks["effective_date_verified"]
        ):
            status = cls.STATUS_HUMAN_REVIEW
            requires_human_review = True

        # 3. PARTIAL
        # Legal grounding is present but user evidence
        # is incomplete.
        elif not checks["user_evidence_verified"]:
            status = cls.STATUS_PARTIAL
            requires_human_review = True

        # 4. SUPPORTED
        # All required deterministic checks passed.
        else:
            status = cls.STATUS_SUPPORTED
            requires_human_review = False

        return {
            "status": status,
            "checks": checks,
            "reasons": reasons,
            "warnings": warnings,
            "requires_human_review": requires_human_review
        }