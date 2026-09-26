from app.services.legal_human_review_status_service import (
    LegalHumanReviewStatusService
)


print("=" * 60)
print("HUMAN REVIEW STATUS TEST")
print("=" * 60)


# ----------------------------------------------------------
# BASE DATA
# ----------------------------------------------------------

rag_result = {
    "case_id": "ac592acf-4ba2-4d95-bf6d-65857c22adef",
    "jurisdiction": "MAHARASHTRA",
    "legal_domain": "CYBER_OFFENCE",

    "issue_summary": (
        "The retrieved legal material contains provisions "
        "relevant to the identified issue."
    ),

    "legal_analysis": (
        "The available material provides preliminary "
        "legal information, but additional review is "
        "required."
    ),

    "relevant_sections": [
        {
            "section_number": "66",
            "section_title": "Computer related offences",
            "source_id": (
                "5a78d6df-b6f9-40f4-8986-f416c80b184d"
            ),
            "jurisdiction": "INDIA"
        }
    ],

    "limitations": [
        "Additional review is required."
    ]
}


citations = [
    {
        "section_number": "66",
        "source_id": (
            "5a78d6df-b6f9-40f4-8986-f416c80b184d"
        ),
        "source_title": "Information Technology Act, 2000"
    }
]


# ----------------------------------------------------------
# TEST 1 — UNCERTAINTY
# ----------------------------------------------------------

uncertainty_decision = {
    "status": "HUMAN_REVIEW",

    "checks": {
        "source_verified": True,
        "citation_verified": True,
        "provision_verified": True,
        "jurisdiction_verified": True,
        "effective_date_verified": True,
        "user_evidence_verified": True,
        "uncertainty_detected": True,
        "unsupported_claim_detected": False
    },

    "reasons": [],
    "warnings": []
}


result = LegalHumanReviewStatusService.build(
    safety_decision=uncertainty_decision,
    rag_result=rag_result,
    citations=citations
)


print("\nTEST 1 — UNCERTAINTY")
print("-" * 60)
print("Status:", result["status"])
print(
    "Safe to present:",
    result["safe_to_present"]
)
print(
    "Human review:",
    result["requires_human_review"]
)
print(
    "Review reasons:",
    result["review_reasons"]
)

assert result["status"] == "HUMAN_REVIEW"
assert result["safe_to_present"] is False
assert result["requires_human_review"] is True
assert len(result["review_reasons"]) > 0
assert len(result["relevant_sections"]) == 1
assert len(result["citations"]) == 1


# ----------------------------------------------------------
# TEST 2 — EFFECTIVE DATE UNKNOWN
# ----------------------------------------------------------

date_decision = {
    "status": "HUMAN_REVIEW",

    "checks": {
        "source_verified": True,
        "citation_verified": True,
        "provision_verified": True,
        "jurisdiction_verified": True,
        "effective_date_verified": False,
        "user_evidence_verified": True,
        "uncertainty_detected": False,
        "unsupported_claim_detected": False
    },

    "reasons": [],
    "warnings": []
}


result = LegalHumanReviewStatusService.build(
    safety_decision=date_decision,
    rag_result=rag_result,
    citations=citations
)


print("\nTEST 2 — EFFECTIVE DATE NOT VERIFIED")
print("-" * 60)
print("Status:", result["status"])
print(
    "Review reasons:",
    result["review_reasons"]
)

assert result["status"] == "HUMAN_REVIEW"
assert result["safe_to_present"] is False
assert result["requires_human_review"] is True

assert any(
    "effective date" in reason.lower()
    for reason in result["review_reasons"]
)


# ----------------------------------------------------------
# TEST 3 — SOURCE VERIFICATION
# ----------------------------------------------------------

source_decision = {
    "status": "HUMAN_REVIEW",

    "checks": {
        "source_verified": False,
        "citation_verified": True,
        "provision_verified": True,
        "jurisdiction_verified": True,
        "effective_date_verified": True,
        "user_evidence_verified": True,
        "uncertainty_detected": False,
        "unsupported_claim_detected": False
    },

    "reasons": [],
    "warnings": []
}


result = LegalHumanReviewStatusService.build(
    safety_decision=source_decision,
    rag_result=rag_result,
    citations=citations
)


print("\nTEST 3 — SOURCE VERIFICATION")
print("-" * 60)
print("Status:", result["status"])
print(
    "Review reasons:",
    result["review_reasons"]
)

assert result["status"] == "HUMAN_REVIEW"
assert result["safe_to_present"] is False
assert result["requires_human_review"] is True

assert any(
    "source" in reason.lower()
    for reason in result["review_reasons"]
)


# ----------------------------------------------------------
# TEST 4 — HARD BLOCK REJECTION
# ----------------------------------------------------------

blocked_decision = {
    "status": "HUMAN_REVIEW",

    "checks": {
        "source_verified": True,
        "citation_verified": True,
        "provision_verified": False,
        "jurisdiction_verified": True,
        "effective_date_verified": True,
        "user_evidence_verified": True,
        "uncertainty_detected": False,
        "unsupported_claim_detected": False
    },

    "reasons": [],
    "warnings": []
}


print("\nTEST 4 — HARD BLOCK REJECTION")
print("-" * 60)

try:

    LegalHumanReviewStatusService.build(
        safety_decision=blocked_decision,
        rag_result=rag_result,
        citations=citations
    )

    raise AssertionError(
        "Expected failed provision to be rejected."
    )

except ValueError as exc:

    print(
        "Rejected correctly:",
        str(exc)
    )


# ----------------------------------------------------------
# TEST 5 — UNSUPPORTED CLAIM REJECTION
# ----------------------------------------------------------

unsafe_decision = {
    "status": "HUMAN_REVIEW",

    "checks": {
        "source_verified": True,
        "citation_verified": True,
        "provision_verified": True,
        "jurisdiction_verified": True,
        "effective_date_verified": True,
        "user_evidence_verified": True,
        "uncertainty_detected": True,
        "unsupported_claim_detected": True
    },

    "reasons": [],
    "warnings": []
}


print("\nTEST 5 — UNSUPPORTED CLAIM REJECTION")
print("-" * 60)

try:

    LegalHumanReviewStatusService.build(
        safety_decision=unsafe_decision,
        rag_result=rag_result,
        citations=citations
    )

    raise AssertionError(
        "Expected unsupported claim to be rejected."
    )

except ValueError as exc:

    print(
        "Rejected correctly:",
        str(exc)
    )


print("\n" + "=" * 60)
print("FINAL TEST RESULT")
print("=" * 60)
print(
    "PASS: HUMAN_REVIEW status is working correctly."
)