from app.services.legal_unsupported_claim_detection_service import (
    LegalUnsupportedClaimDetectionService
)


RETRIEVED_CHUNKS = [
    {
        "source_id": "5a78d6df-b6f9-40f4-8986-f416c80b184d",
        "section_number": "66",
        "section_title": "Computer related offences",
        "jurisdiction": "INDIA",
        "content": (
            "Retrieved legal text for Section 66."
        )
    }
]


print("\nUNSUPPORTED CLAIM DETECTION TEST")
print("=" * 60)


# --------------------------------------------------
# TEST 1 — Unsupported conclusion
# --------------------------------------------------

unsafe_result = {
    "issue_summary": (
        "The accused committed an offence."
    ),
    "legal_analysis": (
        "The bank will definitely refund "
        "the entire amount."
    ),
    "relevant_sections": [
        {
            "section_number": "66",
            "source_id": (
                "5a78d6df-b6f9-40f4-8986-f416c80b184d"
            )
        }
    ]
}


result = (
    LegalUnsupportedClaimDetectionService.detect(
        unsafe_result,
        RETRIEVED_CHUNKS
    )
)

print("\nTEST 1 — UNSUPPORTED CLAIM")
print("-" * 60)

print(
    "Status:",
    result["status"]
)

print(
    "Unsupported claim detected:",
    result["unsupported_claim_detected"]
)

print(
    "Detected claims:",
    result["detected_claims"]
)


# --------------------------------------------------
# TEST 2 — Unsupported section
# --------------------------------------------------

invalid_section_result = {
    "issue_summary": (
        "The retrieved material is relevant."
    ),
    "legal_analysis": (
        "The available provision should be "
        "reviewed in context."
    ),
    "relevant_sections": [
        {
            "section_number": "999",
            "source_id": (
                "5a78d6df-b6f9-40f4-8986-f416c80b184d"
            )
        }
    ]
}


result = (
    LegalUnsupportedClaimDetectionService.detect(
        invalid_section_result,
        RETRIEVED_CHUNKS
    )
)

print("\nTEST 2 — INVALID SECTION")
print("-" * 60)

print(
    "Status:",
    result["status"]
)

print(
    "Unsupported claim detected:",
    result["unsupported_claim_detected"]
)

print(
    "Invalid sections:",
    result["invalid_sections"]
)


# --------------------------------------------------
# TEST 3 — Safe grounded output
# --------------------------------------------------

safe_result = {
    "issue_summary": (
        "The retrieved material concerns "
        "computer related offences."
    ),
    "legal_analysis": (
        "Section 66 is present in the "
        "retrieved legal corpus."
    ),
    "relevant_sections": [
        {
            "section_number": "66",
            "source_id": (
                "5a78d6df-b6f9-40f4-8986-f416c80b184d"
            )
        }
    ]
}


result = (
    LegalUnsupportedClaimDetectionService.detect(
        safe_result,
        RETRIEVED_CHUNKS
    )
)

print("\nTEST 3 — SAFE OUTPUT")
print("-" * 60)

print(
    "Status:",
    result["status"]
)

print(
    "Unsupported claim detected:",
    result["unsupported_claim_detected"]
)

print(
    "Detected claims:",
    result["detected_claims"]
)


# --------------------------------------------------
# FINAL RESULT
# --------------------------------------------------

test_1_passed = (
    LegalUnsupportedClaimDetectionService.detect(
        unsafe_result,
        RETRIEVED_CHUNKS
    )["unsupported_claim_detected"]
    is True
)

test_2_passed = (
    LegalUnsupportedClaimDetectionService.detect(
        invalid_section_result,
        RETRIEVED_CHUNKS
    )["unsupported_claim_detected"]
    is True
)

test_3_passed = (
    LegalUnsupportedClaimDetectionService.detect(
        safe_result,
        RETRIEVED_CHUNKS
    )["unsupported_claim_detected"]
    is False
)


print("\nFINAL TEST RESULT")
print("=" * 60)

if (
    test_1_passed
    and test_2_passed
    and test_3_passed
):
    print(
        "PASS: Unsupported claim detection "
        "is working correctly."
    )
else:
    print(
        "FAIL: Unexpected detection result."
    )