from app.services.legal_safety_explanation_service import (
    LegalSafetyExplanationService
)


print("=" * 60)
print("SAFETY EXPLANATION TEST")
print("=" * 60)


# ----------------------------------------------------------
# TEST DATA
# ----------------------------------------------------------

safety_decision = {
    "status": "HUMAN_REVIEW",

    "safe_to_present": False,

    "requires_human_review": True,

    "checks": {
        "source_verified": True,
        "citation_verified": True,
        "provision_verified": True,
        "jurisdiction_verified": True,
        "effective_date_verified": False,
        "user_evidence_verified": True,
        "uncertainty_detected": True,
        "unsupported_claim_detected": False
    },

    "reasons": [],

    "warnings": [
        "Effective date could not be fully verified."
    ]
}


user_evidence_verification = {
    "total_claims": 2,
    "supported_count": 2,
    "partial_count": 0,
    "missing_count": 0,
    "coverage_percentage": 100.0,

    "supported_claims": [
        {
            "claim_id": "claim-1",
            "label": (
                "The ₹80,000.00 debit was unauthorized "
                "and not initiated by Ananya Rao"
            ),
            "evidence_status": "SUPPORTED",
            "evidence_confidence": 0.8125,
            "evidence_links": [
                {
                    "document_label":
                        "Unauthorized Transaction Evidence Dossier.pdf",
                    "confidence": 0.8125
                }
            ]
        }
    ],

    "partial_claims": [],

    "missing_claims": []
}


rag_result = {
    "case_id": (
        "ac592acf-4ba2-4d95-bf6d-65857c22adef"
    ),
    "jurisdiction": "MAHARASHTRA",
    "legal_domain": "CYBER_OFFENCE"
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
# TEST 1 — EXPLANATION GENERATION
# ----------------------------------------------------------

result = LegalSafetyExplanationService.build(
    safety_decision=safety_decision,
    user_evidence_verification=user_evidence_verification,
    rag_result=rag_result,
    citations=citations
)


print("\nTEST 1 — EXPLANATION GENERATION")
print("-" * 60)

print("Title:", result["title"])
print("Status:", result["status"])
print(
    "Safe to present:",
    result["safe_to_present"]
)
print(
    "Human review:",
    result["requires_human_review"]
)

assert result["title"] == (
    "Why Did NYAYAOS Say This?"
)

assert result["status"] == "HUMAN_REVIEW"

assert result["safe_to_present"] is False

assert result["requires_human_review"] is True


# ----------------------------------------------------------
# TEST 2 — VERIFICATION CHECKS
# ----------------------------------------------------------

print("\nTEST 2 — VERIFICATION CHECKS")
print("-" * 60)

for check in result["verification_checks"]:

    print(
        f'{check["label"]}: '
        f'{check["status"]}'
    )

assert len(
    result["verification_checks"]
) == 6

assert any(
    check["key"] == "source_verified"
    and check["status"] == "VERIFIED"
    for check in result["verification_checks"]
)

assert any(
    check["key"] == "effective_date_verified"
    and check["status"] == "NOT VERIFIED"
    for check in result["verification_checks"]
)


# ----------------------------------------------------------
# TEST 3 — SAFETY SIGNALS
# ----------------------------------------------------------

print("\nTEST 3 — SAFETY SIGNALS")
print("-" * 60)

for signal in result["safety_signals"]:

    print(
        f'{signal["label"]}: '
        f'{signal["detected"]}'
    )

assert any(
    signal["key"] == "uncertainty_detected"
    and signal["detected"] is True
    for signal in result["safety_signals"]
)

assert any(
    signal["key"] == "unsupported_claim_detected"
    and signal["detected"] is False
    for signal in result["safety_signals"]
)


# ----------------------------------------------------------
# TEST 4 — EVIDENCE TRACE
# ----------------------------------------------------------

print("\nTEST 4 — EVIDENCE TRACE")
print("-" * 60)

print(
    "Total claims:",
    result["evidence_summary"]["total_claims"]
)

print(
    "Coverage:",
    result["evidence_summary"]["coverage_percentage"],
    "%"
)

print(
    "Claim traces:",
    len(result["claim_evidence_trace"])
)

assert result["evidence_summary"][
    "total_claims"
] == 2

assert result["evidence_summary"][
    "coverage_percentage"
] == 100.0

assert len(
    result["claim_evidence_trace"]
) == 1


# ----------------------------------------------------------
# TEST 5 — LEGAL SOURCE TRACE
# ----------------------------------------------------------

print("\nTEST 5 — LEGAL SOURCE TRACE")
print("-" * 60)

print(
    "Legal sources:",
    len(result["legal_source_trace"])
)

source = result["legal_source_trace"][0]

print(
    "Section:",
    source["section_number"]
)

print(
    "Source:",
    source["source_title"]
)

print(
    "Citation:",
    source["citation"]
)

assert len(
    result["legal_source_trace"]
) == 1

assert source["section_number"] == "66"

assert source["source_title"] == (
    "Information Technology Act, 2000"
)


# ----------------------------------------------------------
# TEST 6 — CASE CONTEXT
# ----------------------------------------------------------

print("\nTEST 6 — CASE CONTEXT")
print("-" * 60)

print(
    "Case ID:",
    result["case_id"]
)

print(
    "Jurisdiction:",
    result["jurisdiction"]
)

print(
    "Legal domain:",
    result["legal_domain"]
)

assert result["jurisdiction"] == "MAHARASHTRA"

assert result["legal_domain"] == "CYBER_OFFENCE"


print("\n" + "=" * 60)
print("FINAL TEST RESULT")
print("=" * 60)

print(
    "PASS: Safety explanation is working correctly."
)