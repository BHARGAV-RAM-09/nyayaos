from app.services.legal_uncertainty_detection_service import (
    LegalUncertaintyDetectionService
)


print("\nUNCERTAINTY DETECTION TEST")
print("=" * 60)


# --------------------------------------------------
# TEST 1 — Uncertainty present
# --------------------------------------------------

uncertain_result = {
    "issue_summary": (
        "The available information may be relevant "
        "to the reported transaction."
    ),
    "legal_analysis": (
        "The retrieved provisions could apply, "
        "but the available evidence is insufficient "
        "to determine the complete legal position."
    ),
    "limitations": [
        "Further information is required."
    ],
    "needs_human_review": True
}


result = LegalUncertaintyDetectionService.detect(
    uncertain_result
)

print("\nTEST 1 — UNCERTAINTY PRESENT")
print("-" * 60)

print(
    "Status:",
    result["status"]
)

print(
    "Uncertainty detected:",
    result["uncertainty_detected"]
)

print(
    "Detected phrases:",
    result["detected_phrases"]
)

print(
    "Human review:",
    result["explicit_human_review"]
)

for reason in result["reasons"]:
    print(" ", reason)


# --------------------------------------------------
# TEST 2 — Clear output
# --------------------------------------------------

clear_result = {
    "issue_summary": (
        "The retrieved material concerns "
        "computer related offences."
    ),
    "legal_analysis": (
        "Section 66 is present in the retrieved "
        "legal corpus."
    ),
    "limitations": [],
    "needs_human_review": False
}


result = LegalUncertaintyDetectionService.detect(
    clear_result
)

print("\nTEST 2 — CLEAR OUTPUT")
print("-" * 60)

print(
    "Status:",
    result["status"]
)

print(
    "Uncertainty detected:",
    result["uncertainty_detected"]
)

print(
    "Detected phrases:",
    result["detected_phrases"]
)


# --------------------------------------------------
# FINAL ASSERTIONS
# --------------------------------------------------

print("\nFINAL TEST RESULT")
print("=" * 60)

test_1_passed = (
    uncertain_result is not None
    and LegalUncertaintyDetectionService.detect(
        uncertain_result
    )["uncertainty_detected"] is True
)

test_2_passed = (
    LegalUncertaintyDetectionService.detect(
        clear_result
    )["uncertainty_detected"] is False
)

if test_1_passed and test_2_passed:
    print(
        "PASS: Uncertainty detection is working correctly."
    )
else:
    print(
        "FAIL: Unexpected uncertainty detection result."
    )