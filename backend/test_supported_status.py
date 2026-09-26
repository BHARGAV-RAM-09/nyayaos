from app.services.legal_supported_status_service import (
    LegalSupportedStatusService
)


print("=" * 60)
print("SUPPORTED STATUS TEST")
print("=" * 60)


# ----------------------------------------------------------
# VALID SUPPORTED RESULT
# ----------------------------------------------------------

safety_decision = {
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
    "warnings": [],
    "requires_human_review": False
}


rag_result = {
    "case_id": "ac592acf-4ba2-4d95-bf6d-65857c22adef",
    "jurisdiction": "MAHARASHTRA",
    "legal_domain": "CYBER_OFFENCE",

    "issue_summary": (
        "The retrieved legal material contains provisions "
        "relevant to the identified cyber-related issue."
    ),

    "legal_analysis": (
        "The retrieved provisions provide legal information "
        "relevant to the case facts."
    ),

    "relevant_sections": [
        {
            "section_number": "66",
            "section_title": "Computer related offences",
            "source_id": (
                "5a78d6df-b6f9-40f4-8986-f416c80b184d"
            ),
            "jurisdiction": "INDIA",
            "explanation": (
                "The provision is included because it was "
                "retrieved from the verified legal corpus."
            )
        }
    ],

    "limitations": []
}


citations = [
    {
        "section_number": "66",
        "section_title": "Computer related offences",
        "source_id": (
            "5a78d6df-b6f9-40f4-8986-f416c80b184d"
        ),
        "source_title": "Information Technology Act, 2000",
        "citation": "Act No. 21 of 2000",
        "jurisdiction": "INDIA",
        "source_url": (
            "https://www.indiacode.nic.in/"
        )
    }
]


result = LegalSupportedStatusService.build(
    safety_decision=safety_decision,
    rag_result=rag_result,
    citations=citations
)


print("\nTEST 1 — VALID SUPPORTED RESULT")
print("-" * 60)
print("Status:", result["status"])
print("Safe to present:", result["safe_to_present"])
print(
    "Human review:",
    result["requires_human_review"]
)
print(
    "Citation count:",
    len(result["citations"])
)

assert result["status"] == "SUPPORTED"
assert result["safe_to_present"] is True
assert result["requires_human_review"] is False
assert len(result["citations"]) == 1


# ----------------------------------------------------------
# INVALID — FAILED CHECK
# ----------------------------------------------------------

print("\nTEST 2 — FAILED SAFETY CHECK")
print("-" * 60)

invalid_decision = {
    **safety_decision,
    "checks": {
        **safety_decision["checks"],
        "citation_verified": False
    }
}

try:
    LegalSupportedStatusService.build(
        safety_decision=invalid_decision,
        rag_result=rag_result,
        citations=citations
    )

    raise AssertionError(
        "Expected SUPPORTED status creation to fail."
    )

except ValueError as exc:
    print("Rejected correctly:", str(exc))


# ----------------------------------------------------------
# INVALID — UNCERTAINTY
# ----------------------------------------------------------

print("\nTEST 3 — UNCERTAINTY DETECTED")
print("-" * 60)

uncertain_decision = {
    **safety_decision,
    "checks": {
        **safety_decision["checks"],
        "uncertainty_detected": True
    }
}

try:
    LegalSupportedStatusService.build(
        safety_decision=uncertain_decision,
        rag_result=rag_result,
        citations=citations
    )

    raise AssertionError(
        "Expected uncertainty validation to fail."
    )

except ValueError as exc:
    print("Rejected correctly:", str(exc))


# ----------------------------------------------------------
# INVALID — UNSUPPORTED CLAIM
# ----------------------------------------------------------

print("\nTEST 4 — UNSUPPORTED CLAIM")
print("-" * 60)

unsafe_decision = {
    **safety_decision,
    "checks": {
        **safety_decision["checks"],
        "unsupported_claim_detected": True
    }
}

try:
    LegalSupportedStatusService.build(
        safety_decision=unsafe_decision,
        rag_result=rag_result,
        citations=citations
    )

    raise AssertionError(
        "Expected unsupported claim validation to fail."
    )

except ValueError as exc:
    print("Rejected correctly:", str(exc))


print("\n" + "=" * 60)
print("FINAL TEST RESULT")
print("=" * 60)
print(
    "PASS: SUPPORTED status is working correctly."
)