from app.services.legal_safety_decision_service import (
    LegalSafetyDecisionService
)


def verification(
    verified=True
):
    return {
        "verified": verified
    }


def uncertainty(
    detected=False
):
    return {
        "uncertainty_detected": detected
    }


def unsupported(
    detected=False
):
    return {
        "unsupported_claim_detected": detected
    }


print("=" * 60)
print("SAFETY DECISION ENGINE TEST")
print("=" * 60)


# ----------------------------------------------------------
# TEST 1 — FULLY SUPPORTED
# ----------------------------------------------------------

result = LegalSafetyDecisionService.decide(
    source_verification=verification(True),
    citation_verification=verification(True),
    provision_verification=verification(True),
    jurisdiction_verification=verification(True),
    effective_date_verification=verification(True),
    user_evidence_verification=verification(True),
    uncertainty_detection=uncertainty(False),
    unsupported_claim_detection=unsupported(False),
)

print("\nTEST 1 — FULLY SUPPORTED")
print("-" * 60)
print("Status:", result["status"])
print("Human review:", result["requires_human_review"])

assert result["status"] == "SUPPORTED"
assert result["requires_human_review"] is False


# ----------------------------------------------------------
# TEST 2 — PARTIAL EVIDENCE
# ----------------------------------------------------------

result = LegalSafetyDecisionService.decide(
    source_verification=verification(True),
    citation_verification=verification(True),
    provision_verification=verification(True),
    jurisdiction_verification=verification(True),
    effective_date_verification=verification(True),
    user_evidence_verification=verification(False),
    uncertainty_detection=uncertainty(False),
    unsupported_claim_detection=unsupported(False),
)

print("\nTEST 2 — PARTIAL USER EVIDENCE")
print("-" * 60)
print("Status:", result["status"])
print("Human review:", result["requires_human_review"])

assert result["status"] == "PARTIAL"
assert result["requires_human_review"] is True


# ----------------------------------------------------------
# TEST 3 — UNCERTAINTY
# ----------------------------------------------------------

result = LegalSafetyDecisionService.decide(
    source_verification=verification(True),
    citation_verification=verification(True),
    provision_verification=verification(True),
    jurisdiction_verification=verification(True),
    effective_date_verification=verification(True),
    user_evidence_verification=verification(True),
    uncertainty_detection=uncertainty(True),
    unsupported_claim_detection=unsupported(False),
)

print("\nTEST 3 — UNCERTAINTY DETECTED")
print("-" * 60)
print("Status:", result["status"])
print("Human review:", result["requires_human_review"])

assert result["status"] == "HUMAN_REVIEW"
assert result["requires_human_review"] is True


# ----------------------------------------------------------
# TEST 4 — INVALID JURISDICTION
# ----------------------------------------------------------

result = LegalSafetyDecisionService.decide(
    source_verification=verification(True),
    citation_verification=verification(True),
    provision_verification=verification(True),
    jurisdiction_verification=verification(False),
    effective_date_verification=verification(True),
    user_evidence_verification=verification(True),
    uncertainty_detection=uncertainty(False),
    unsupported_claim_detection=unsupported(False),
)

print("\nTEST 4 — INVALID JURISDICTION")
print("-" * 60)
print("Status:", result["status"])
print("Human review:", result["requires_human_review"])

assert result["status"] == "BLOCKED"
assert result["requires_human_review"] is True


# ----------------------------------------------------------
# TEST 5 — UNSUPPORTED CLAIM
# ----------------------------------------------------------

result = LegalSafetyDecisionService.decide(
    source_verification=verification(True),
    citation_verification=verification(True),
    provision_verification=verification(True),
    jurisdiction_verification=verification(True),
    effective_date_verification=verification(True),
    user_evidence_verification=verification(True),
    uncertainty_detection=uncertainty(False),
    unsupported_claim_detection=unsupported(True),
)

print("\nTEST 5 — UNSUPPORTED CLAIM")
print("-" * 60)
print("Status:", result["status"])
print("Human review:", result["requires_human_review"])

assert result["status"] == "BLOCKED"
assert result["requires_human_review"] is True


# ----------------------------------------------------------
# TEST 6 — INVALID PROVISION
# ----------------------------------------------------------

result = LegalSafetyDecisionService.decide(
    source_verification=verification(True),
    citation_verification=verification(True),
    provision_verification=verification(False),
    jurisdiction_verification=verification(True),
    effective_date_verification=verification(True),
    user_evidence_verification=verification(True),
    uncertainty_detection=uncertainty(False),
    unsupported_claim_detection=unsupported(False),
)

print("\nTEST 6 — INVALID PROVISION")
print("-" * 60)
print("Status:", result["status"])
print("Human review:", result["requires_human_review"])

assert result["status"] == "BLOCKED"
assert result["requires_human_review"] is True


# ----------------------------------------------------------
# FINAL
# ----------------------------------------------------------

print("\n" + "=" * 60)
print("FINAL TEST RESULT")
print("=" * 60)
print("PASS: Safety Decision Engine is working correctly.")