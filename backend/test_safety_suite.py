from copy import deepcopy

from app.services.legal_source_verification_service import (
    LegalSourceVerificationService
)
from app.services.legal_citation_verification_service import (
    LegalCitationVerificationService
)
from app.services.legal_provision_verification_service import (
    LegalProvisionVerificationService
)
from app.services.legal_jurisdiction_verification_service import (
    LegalJurisdictionVerificationService
)
from app.services.legal_effective_date_verification_service import (
    LegalEffectiveDateVerificationService
)
from app.services.user_evidence_verification_service import (
    UserEvidenceVerificationService
)
from app.services.legal_uncertainty_detection_service import (
    LegalUncertaintyDetectionService
)
from app.services.legal_unsupported_claim_detection_service import (
    LegalUnsupportedClaimDetectionService
)
from app.services.legal_safety_decision_service import (
    LegalSafetyDecisionService
)
from app.services.legal_supported_status_service import (
    LegalSupportedStatusService
)
from app.services.legal_partial_status_service import (
    LegalPartialStatusService
)
from app.services.legal_blocked_status_service import (
    LegalBlockedStatusService
)
from app.services.legal_human_review_status_service import (
    LegalHumanReviewStatusService
)
from app.services.legal_safety_explanation_service import (
    LegalSafetyExplanationService
)
from app.services.legal_rag_service import (
    LegalRAGService
)


CASE_ID = "ac592acf-4ba2-4d95-bf6d-65857c22adef"

SOURCE_ID = "5a78d6df-b6f9-40f4-8986-f416c80b184d"


RETRIEVED_CHUNKS = [
    {
        "chunk_id": "test-chunk-66",
        "source_id": SOURCE_ID,
        "section_number": "66",
        "section_title": "Computer related offences",
        "jurisdiction": "INDIA",
        "legal_domain": "CYBER_OFFENCE",
        "legal_category": "CYBER_OFFENCE",
        "similarity": 0.91,
        "content": (
            "Computer related offences are addressed by this "
            "provision of the Information Technology Act, 2000."
        )
    },
    {
        "chunk_id": "test-chunk-66c",
        "source_id": SOURCE_ID,
        "section_number": "66C",
        "section_title": "Punishment for identity theft",
        "jurisdiction": "INDIA",
        "legal_domain": "CYBER_OFFENCE",
        "legal_category": "CYBER_OFFENCE",
        "similarity": 0.87,
        "content": (
            "Punishment for identity theft is provided under "
            "this provision of the Information Technology Act, 2000."
        )
    }
]


RAG_RESULT = {
    "case_id": CASE_ID,
    "jurisdiction": "MAHARASHTRA",
    "legal_domain": "CYBER_OFFENCE",
    "issue_summary": (
        "The retrieved material contains provisions relevant "
        "to computer related offences."
    ),
    "legal_analysis": (
        "The supplied legal material should be reviewed "
        "against the case facts."
    ),
    "relevant_sections": [
        {
            "section_number": "66",
            "section_title": "Computer related offences",
            "source_id": SOURCE_ID,
            "jurisdiction": "INDIA",
            "explanation": (
                "This section is present in the retrieved "
                "legal material."
            )
        }
    ],
    "limitations": [
        "The retrieved material is limited."
    ],
    "needs_human_review": True
}


def make_verified_source():
    return {
        "verified": True,
        "source_id": SOURCE_ID
    }


def make_verified_citation():
    return {
        "verified": True,
        "citations": [
            {
                "source_id": SOURCE_ID,
                "section_number": "66"
            }
        ]
    }


def make_verified_provision():
    return {
        "verified": True,
        "provisions": [
            {
                "source_id": SOURCE_ID,
                "section_number": "66"
            }
        ]
    }


def make_verified_jurisdiction():
    return {
        "verified": True,
        "jurisdiction": "MAHARASHTRA"
    }


def make_verified_effective_date():
    return {
        "verified": True,
        "status": "VERIFIED",
        "source_id": SOURCE_ID,
        "version_date": "2026-01-01"
    }


def make_verified_user_evidence():
    return {
        "verified": True,
        "status": "VERIFIED",
        "case_id": CASE_ID,
        "total_claims": 2,
        "supported_count": 2,
        "partial_count": 0,
        "missing_count": 0,
        "coverage_percentage": 100.0
    }


def make_no_uncertainty():
    return {
        "uncertainty_detected": False,
        "uncertainties": []
    }


def make_no_unsupported_claim():
    return {
        "unsupported_claim_detected": False,
        "unsupported_claims": []
    }


def build_supported_decision():
    return LegalSafetyDecisionService.decide(
        source_verification=make_verified_source(),
        citation_verification=make_verified_citation(),
        provision_verification=make_verified_provision(),
        jurisdiction_verification=make_verified_jurisdiction(),
        effective_date_verification=make_verified_effective_date(),
        user_evidence_verification=make_verified_user_evidence(),
        uncertainty_detection=make_no_uncertainty(),
        unsupported_claim_detection=make_no_unsupported_claim()
    )


def build_partial_decision():
    partial_evidence = make_verified_user_evidence()

    partial_evidence["verified"] = False
    partial_evidence["status"] = "PARTIAL"
    partial_evidence["supported_count"] = 1
    partial_evidence["partial_count"] = 1
    partial_evidence["coverage_percentage"] = 50.0

    return LegalSafetyDecisionService.decide(
        source_verification=make_verified_source(),
        citation_verification=make_verified_citation(),
        provision_verification=make_verified_provision(),
        jurisdiction_verification=make_verified_jurisdiction(),
        effective_date_verification=make_verified_effective_date(),
        user_evidence_verification=partial_evidence,
        uncertainty_detection=make_no_uncertainty(),
        unsupported_claim_detection=make_no_unsupported_claim()
    )


def build_human_review_decision():
    uncertainty = {
        "uncertainty_detected": True,
        "uncertainties": [
            "Important facts remain uncertain."
        ]
    }

    return LegalSafetyDecisionService.decide(
        source_verification=make_verified_source(),
        citation_verification=make_verified_citation(),
        provision_verification=make_verified_provision(),
        jurisdiction_verification=make_verified_jurisdiction(),
        effective_date_verification={
            "verified": False,
            "status": "UNKNOWN",
            "source_id": SOURCE_ID
        },
        user_evidence_verification=make_verified_user_evidence(),
        uncertainty_detection=uncertainty,
        unsupported_claim_detection=make_no_unsupported_claim()
    )


def build_blocked_decision():
    unsupported_claim = {
        "unsupported_claim_detected": True,
        "unsupported_claims": [
            "Unsupported legal conclusion."
        ]
    }

    invalid_provision = {
        "verified": False,
        "provisions": []
    }

    return LegalSafetyDecisionService.decide(
        source_verification=make_verified_source(),
        citation_verification=make_verified_citation(),
        provision_verification=invalid_provision,
        jurisdiction_verification=make_verified_jurisdiction(),
        effective_date_verification=make_verified_effective_date(),
        user_evidence_verification=make_verified_user_evidence(),
        uncertainty_detection=make_no_uncertainty(),
        unsupported_claim_detection=unsupported_claim
    )


def test_source_verification():
    print("\n[1] SOURCE VERIFICATION")

    result = LegalSourceVerificationService.verify_source(
        SOURCE_ID
    )

    assert isinstance(result, dict)
    assert result.get("verified") is True

    print("PASS")


def test_citation_verification():
    print("\n[2] CITATION VERIFICATION")

    citation = {
        "source_id": SOURCE_ID,
        "section_number": "66",
        "section_title": "Computer related offences"
    }

    result = LegalCitationVerificationService.verify_citation(
        citation,
        RETRIEVED_CHUNKS
    )

    assert isinstance(result, dict)
    assert result.get("verified") is True

    print("PASS")


def test_provision_verification():
    print("\n[3] PROVISION VERIFICATION")

    provision = {
        "source_id": SOURCE_ID,
        "section_number": "66",
        "section_title": "Computer related offences"
    }

    result = LegalProvisionVerificationService.verify_provision(
        provision,
        RETRIEVED_CHUNKS
    )

    assert isinstance(result, dict)
    assert result.get("verified") is True

    print("PASS")


def test_jurisdiction_verification():
    print("\n[4] JURISDICTION VERIFICATION")

    result = LegalJurisdictionVerificationService.verify_jurisdiction(
        "MAHARASHTRA",
        RETRIEVED_CHUNKS
    )

    assert isinstance(result, dict)
    assert result.get("verified") is True

    print("PASS")


def test_effective_date_verification():
    print("\n[5] EFFECTIVE-DATE VERIFICATION")

    result = (
        LegalEffectiveDateVerificationService
        .verify_effective_date(SOURCE_ID)
    )

    assert isinstance(result, dict)

    assert result.get("verified") is False
    assert result.get("status") == "UNKNOWN"

    checks = result.get("checks", {})

    assert checks.get("source_exists") is True
    assert checks.get("version_date_present") is False
    assert checks.get("temporal_check") is False

    reasons = result.get("reasons", [])

    assert any(
        "version_date" in reason
        for reason in reasons
    )

    print(
        "PASS — Effective date correctly marked UNKNOWN "
        "because version_date is unavailable"
    )


def test_user_evidence_verification():
    print("\n[6] USER-EVIDENCE VERIFICATION")

    result = UserEvidenceVerificationService.verify_case_evidence(
        CASE_ID
    )

    assert isinstance(result, dict)
    assert result.get("verified") is True
    assert result.get("status") == "VERIFIED"

    assert result.get("total_claims") == 2
    assert result.get("supported_count") == 2
    assert result.get("partial_count") == 0
    assert result.get("missing_count") == 0
    assert result.get("coverage_percentage") == 100.0

    print(
        "PASS — 2/2 claims supported, "
        "100% evidence coverage"
    )


def test_uncertainty_detection():
    print("\n[7] UNCERTAINTY DETECTION")

    uncertain_rag = deepcopy(RAG_RESULT)

    uncertain_rag["legal_analysis"] = (
        "The available information may be insufficient. "
        "Further facts may be required."
    )

    result = LegalUncertaintyDetectionService.detect(
        uncertain_rag
    )

    assert isinstance(result, dict)
    assert result.get("uncertainty_detected") is True

    print("PASS")


def test_unsupported_claim_detection():
    print("\n[8] UNSUPPORTED-CLAIM DETECTION")

    unsupported_rag = deepcopy(RAG_RESULT)

    unsupported_rag["legal_analysis"] = (
        "The supplied material proves that the accused "
        "definitely committed an offence."
    )

    result = LegalUnsupportedClaimDetectionService.detect(
        unsupported_rag,
        RETRIEVED_CHUNKS
    )

    assert isinstance(result, dict)
    assert result.get("unsupported_claim_detected") is True

    print("PASS")


def test_safety_decision_supported():
    print("\n[9] SAFETY DECISION — SUPPORTED")

    result = build_supported_decision()

    assert isinstance(result, dict)
    assert result.get("status") == "SUPPORTED"
    assert result.get("requires_human_review") is False

    checks = result.get("checks", {})

    assert all(
        checks.get(check) is True
        for check in [
            "source_verified",
            "citation_verified",
            "provision_verified",
            "jurisdiction_verified",
            "effective_date_verified",
            "user_evidence_verified"
        ]
    )

    print("PASS")


def test_safety_decision_partial():
    print("\n[10] SAFETY DECISION — PARTIAL")

    result = build_partial_decision()

    assert isinstance(result, dict)
    assert result.get("status") == "PARTIAL"
    assert result.get("requires_human_review") is True

    checks = result.get("checks", {})

    assert checks.get("user_evidence_verified") is False
    assert checks.get("jurisdiction_verified") is True
    assert checks.get("provision_verified") is True

    print("PASS")


def test_safety_decision_human_review():
    print("\n[11] SAFETY DECISION — HUMAN REVIEW")

    result = build_human_review_decision()

    assert isinstance(result, dict)
    assert result.get("status") == "HUMAN_REVIEW"
    assert result.get("requires_human_review") is True

    checks = result.get("checks", {})

    assert checks.get("effective_date_verified") is False
    assert checks.get("uncertainty_detected") is True

    print("PASS")


def test_safety_decision_blocked():
    print("\n[12] SAFETY DECISION — BLOCKED")

    result = build_blocked_decision()

    assert isinstance(result, dict)
    assert result.get("status") == "BLOCKED"
    assert result.get("requires_human_review") is True

    checks = result.get("checks", {})

    assert checks.get("provision_verified") is False
    assert checks.get("unsupported_claim_detected") is True

    print("PASS")


def test_supported_status():
    print("\n[13] SUPPORTED STATUS")

    decision = build_supported_decision()

    result = LegalSupportedStatusService.build(
        decision,
        RAG_RESULT,
        []
    )

    assert isinstance(result, dict)
    assert result.get("status") == "SUPPORTED"
    assert result.get("safe_to_present") is True
    assert result.get("requires_human_review") is False

    assert result.get("case_id") == CASE_ID
    assert result.get("legal_domain") == "CYBER_OFFENCE"

    print("PASS")


def test_partial_status():
    print("\n[14] PARTIAL STATUS")

    decision = build_partial_decision()

    result = LegalPartialStatusService.build(
        decision,
        RAG_RESULT,
        []
    )

    assert isinstance(result, dict)
    assert result.get("status") == "PARTIAL"
    assert result.get("safe_to_present") is False
    assert result.get("requires_human_review") is True

    assert isinstance(
        result.get("incomplete_checks"),
        list
    )

    assert len(
        result.get("incomplete_checks")
    ) > 0

    print("PASS")


def test_blocked_status():
    print("\n[15] BLOCKED STATUS")

    decision = build_blocked_decision()

    result = LegalBlockedStatusService.build(
        decision,
        RAG_RESULT,
        []
    )

    assert isinstance(result, dict)
    assert result.get("status") == "BLOCKED"
    assert result.get("safe_to_present") is False
    assert result.get("requires_human_review") is True

    assert result.get("issue_summary") == ""
    assert result.get("legal_analysis") == ""
    assert result.get("relevant_sections") == []
    assert result.get("citations") == []

    assert isinstance(
        result.get("blocking_reasons"),
        list
    )

    assert len(
        result.get("blocking_reasons")
    ) > 0

    print("PASS")


def test_human_review_status():
    print("\n[16] HUMAN REVIEW STATUS")

    decision = build_human_review_decision()

    result = LegalHumanReviewStatusService.build(
        decision,
        RAG_RESULT,
        []
    )

    assert isinstance(result, dict)
    assert result.get("status") == "HUMAN_REVIEW"
    assert result.get("safe_to_present") is False
    assert result.get("requires_human_review") is True

    assert isinstance(
        result.get("review_reasons"),
        list
    )

    assert len(
        result.get("review_reasons")
    ) > 0

    print("PASS")


def test_safety_explanation():
    print("\n[17] SAFETY EXPLANATION")

    decision = build_human_review_decision()

    user_evidence = (
        UserEvidenceVerificationService
        .verify_case_evidence(CASE_ID)
    )

    citations = [
        {
            "source_id": SOURCE_ID,
            "section_number": "66",
            "section_title": "Computer related offences"
        }
    ]

    result = LegalSafetyExplanationService.build(
        decision,
        user_evidence,
        RAG_RESULT,
        citations
    )

    assert isinstance(result, dict)

    assert (
        result.get("title")
        == "Why Did NYAYAOS Say This?"
    )

    print("PASS")


def test_grounding_hallucination_protection():
    print("\n[18] GROUNDING / HALLUCINATION PROTECTION")

    hallucinated_result = {
        "issue_summary": (
            "The matter may also be governed by the "
            "Bharatiya Nyaya Sanhita."
        ),
        "legal_analysis": (
            "The supplied evidence is incomplete."
        ),
        "relevant_sections": [
            {
                "section_number": "66",
                "section_title": "Computer related offences",
                "source_id": SOURCE_ID,
                "jurisdiction": "INDIA",
                "explanation": "Grounded section."
            }
        ],
        "limitations": [],
        "needs_human_review": True
    }

    blocked = False

    try:
        LegalRAGService._validate_result(
            hallucinated_result,
            RETRIEVED_CHUNKS
        )
    except RuntimeError:
        blocked = True

    assert blocked is True

    print(
        "PASS — Hallucinated legal reference blocked"
    )


def test_grounding_valid_output():
    print("\n[19] GROUNDED OUTPUT VALIDATION")

    result = LegalRAGService._validate_result(
        RAG_RESULT,
        RETRIEVED_CHUNKS
    )

    assert isinstance(result, dict)

    assert (
        result["relevant_sections"][0]["section_number"]
        == "66"
    )

    print("PASS")


def run_suite():

    tests = [
        test_source_verification,
        test_citation_verification,
        test_provision_verification,
        test_jurisdiction_verification,
        test_effective_date_verification,
        test_user_evidence_verification,
        test_uncertainty_detection,
        test_unsupported_claim_detection,
        test_safety_decision_supported,
        test_safety_decision_partial,
        test_safety_decision_human_review,
        test_safety_decision_blocked,
        test_supported_status,
        test_partial_status,
        test_blocked_status,
        test_human_review_status,
        test_safety_explanation,
        test_grounding_hallucination_protection,
        test_grounding_valid_output
    ]

    print("=" * 70)
    print("NYAYAOS — PHASE 6.17 SAFETY TEST SUITE")
    print("=" * 70)

    passed = 0

    for test in tests:
        test()
        passed += 1

    print("\n" + "=" * 70)
    print("FINAL SAFETY TEST RESULT")
    print("=" * 70)

    print(
        f"PASSED: {passed}/{len(tests)}"
    )

    print(
        "PASS: Phase 6 Safety Guardian regression suite passed."
    )

    print("=" * 70)


if __name__ == "__main__":
    run_suite()