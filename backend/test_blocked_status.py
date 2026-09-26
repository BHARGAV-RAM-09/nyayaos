from app.services.legal_blocked_status_service import (
    LegalBlockedStatusService
)


print("=" * 60)
print("BLOCKED STATUS TEST")
print("=" * 60)


# ----------------------------------------------------------
# BASE DATA
# ----------------------------------------------------------

rag_result = {
    "case_id": "ac592acf-4ba2-4d95-bf6d-65857c22adef",
    "jurisdiction": "MAHARASHTRA",
    "legal_domain": "CYBER_OFFENCE",

    "issue_summary": (
        "Potentially relevant legal information."
    ),

    "legal_analysis": (
        "This analysis must not be presented "
        "because a safety condition failed."
    ),

    "relevant_sections": [
        {
            "section_number": "66",
            "section_title": "Computer related offences",
            "source_id": (
                "5a78d6df-b6f9-40f4-8986-f416c80b184d"
            )
        }
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
# TEST 1 — UNSUPPORTED CLAIM
# ----------------------------------------------------------

unsupported_claim_decision = {
    "status": "BLOCKED",

    "checks": {
        "source_verified": True,
        "citation_verified": True,
        "provision_verified": True,
        "jurisdiction_verified": True,
        "effective_date_verified": True,
        "user_evidence_verified": True,
        "uncertainty_detected": False,
        "unsupported_claim_detected": True
    },

    "reasons": [
        "Unsupported legal conclusion detected."
    ],

    "warnings": []
}


result = LegalBlockedStatusService.build(
    safety_decision=unsupported_claim_decision,
    rag_result=rag_result,
    citations=citations
)


print("\nTEST 1 — UNSUPPORTED CLAIM")
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
    "Blocking reasons:",
    result["blocking_reasons"]
)

assert result["status"] == "BLOCKED"
assert result["safe_to_present"] is False
assert result["requires_human_review"] is True
assert result["legal_analysis"] == ""
assert result["relevant_sections"] == []
assert result["citations"] == []


# ----------------------------------------------------------
# TEST 2 — INVALID JURISDICTION
# ----------------------------------------------------------

invalid_jurisdiction_decision = {
    "status": "BLOCKED",

    "checks": {
        "source_verified": True,
        "citation_verified": True,
        "provision_verified": True,
        "jurisdiction_verified": False,
        "effective_date_verified": True,
        "user_evidence_verified": True,
        "uncertainty_detected": False,
        "unsupported_claim_detected": False
    },

    "reasons": [
        "Unsupported case jurisdiction."
    ],

    "warnings": []
}


result = LegalBlockedStatusService.build(
    safety_decision=invalid_jurisdiction_decision,
    rag_result=rag_result,
    citations=citations
)


print("\nTEST 2 — INVALID JURISDICTION")
print("-" * 60)
print("Status:", result["status"])
print(
    "Safe to present:",
    result["safe_to_present"]
)
print(
    "Blocking reasons:",
    result["blocking_reasons"]
)

assert result["status"] == "BLOCKED"
assert result["safe_to_present"] is False
assert result["requires_human_review"] is True
assert result["legal_analysis"] == ""


# ----------------------------------------------------------
# TEST 3 — INVALID PROVISION
# ----------------------------------------------------------

invalid_provision_decision = {
    "status": "BLOCKED",

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

    "reasons": [
        "Retrieved provision could not be verified."
    ],

    "warnings": []
}


result = LegalBlockedStatusService.build(
    safety_decision=invalid_provision_decision,
    rag_result=rag_result,
    citations=citations
)


print("\nTEST 3 — INVALID PROVISION")
print("-" * 60)
print("Status:", result["status"])
print(
    "Safe to present:",
    result["safe_to_present"]
)
print(
    "Blocking reasons:",
    result["blocking_reasons"]
)

assert result["status"] == "BLOCKED"
assert result["safe_to_present"] is False
assert result["requires_human_review"] is True
assert result["legal_analysis"] == ""


# ----------------------------------------------------------
# TEST 4 — PREVENT FALSE BLOCK
# ----------------------------------------------------------

print("\nTEST 4 — FALSE BLOCK PREVENTION")
print("-" * 60)

safe_decision = {
    "status": "SUPPORTED",

    "checks": {
        "source_verified": True,
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


try:

    LegalBlockedStatusService.build(
        safety_decision=safe_decision,
        rag_result=rag_result,
        citations=citations
    )

    raise AssertionError(
        "Expected non-BLOCKED decision to be rejected."
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
    "PASS: BLOCKED status is working correctly."
)