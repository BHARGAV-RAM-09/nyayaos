from app.services.legal_partial_status_service import (
    LegalPartialStatusService
)


print("=" * 60)
print("PARTIAL STATUS TEST")
print("=" * 60)


# ----------------------------------------------------------
# BASE DATA
# ----------------------------------------------------------

safety_decision = {
    "status": "PARTIAL",

    "checks": {
        "source_verified": True,
        "citation_verified": True,
        "provision_verified": True,
        "jurisdiction_verified": True,
        "effective_date_verified": True,

        # Main reason for PARTIAL
        "user_evidence_verified": False,

        "uncertainty_detected": False,
        "unsupported_claim_detected": False
    },

    "reasons": [
        "User evidence is incomplete."
    ],

    "warnings": [
        "Additional evidence may be required."
    ],

    "requires_human_review": True
}


rag_result = {
    "case_id": "ac592acf-4ba2-4d95-bf6d-65857c22adef",
    "jurisdiction": "MAHARASHTRA",
    "legal_domain": "CYBER_OFFENCE",

    "issue_summary": (
        "The retrieved legal material contains provisions "
        "relevant to the identified issue."
    ),

    "legal_analysis": (
        "The available legal material can be presented as "
        "preliminary legal information, but the evidence "
        "record is incomplete."
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
                "Retrieved from the verified legal corpus."
            )
        }
    ],

    "limitations": [
        "User evidence is incomplete."
    ]
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


# ----------------------------------------------------------
# TEST 1 — VALID PARTIAL
# ----------------------------------------------------------

result = LegalPartialStatusService.build(
    safety_decision=safety_decision,
    rag_result=rag_result,
    citations=citations
)

print("\nTEST 1 — VALID PARTIAL RESULT")
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
    "Incomplete checks:",
    result["incomplete_checks"]
)

assert result["status"] == "PARTIAL"
assert result["safe_to_present"] is False
assert result["requires_human_review"] is True
assert "User-evidence verification" in (
    result["incomplete_checks"]
)


# ----------------------------------------------------------
# TEST 2 — INVALID JURISDICTION
# ----------------------------------------------------------

print("\nTEST 2 — FAILED JURISDICTION")
print("-" * 60)

invalid_jurisdiction = {
    **safety_decision,
    "checks": {
        **safety_decision["checks"],
        "jurisdiction_verified": False
    }
}

try:

    LegalPartialStatusService.build(
        safety_decision=invalid_jurisdiction,
        rag_result=rag_result,
        citations=citations
    )

    raise AssertionError(
        "Expected jurisdiction validation to fail."
    )

except ValueError as exc:

    print(
        "Rejected correctly:",
        str(exc)
    )


# ----------------------------------------------------------
# TEST 3 — INVALID PROVISION
# ----------------------------------------------------------

print("\nTEST 3 — FAILED PROVISION")
print("-" * 60)

invalid_provision = {
    **safety_decision,
    "checks": {
        **safety_decision["checks"],
        "provision_verified": False
    }
}

try:

    LegalPartialStatusService.build(
        safety_decision=invalid_provision,
        rag_result=rag_result,
        citations=citations
    )

    raise AssertionError(
        "Expected provision validation to fail."
    )

except ValueError as exc:

    print(
        "Rejected correctly:",
        str(exc)
    )


# ----------------------------------------------------------
# TEST 4 — UNSUPPORTED CLAIM
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

    LegalPartialStatusService.build(
        safety_decision=unsafe_decision,
        rag_result=rag_result,
        citations=citations
    )

    raise AssertionError(
        "Expected unsupported claim validation to fail."
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
    "PASS: PARTIAL status is working correctly."
)