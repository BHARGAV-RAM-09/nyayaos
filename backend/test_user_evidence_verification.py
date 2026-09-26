from app.services.user_evidence_verification_service import (
    UserEvidenceVerificationService
)


CASE_ID = "ac592acf-4ba2-4d95-bf6d-65857c22adef"


print("\nUSER-EVIDENCE VERIFICATION TEST")
print("=" * 60)

result = (
    UserEvidenceVerificationService
    .verify_case_evidence(CASE_ID)
)


print("Status:", result["status"])
print("Verified:", result["verified"])

print("\nCounts:")
print("  Total claims:", result["total_claims"])
print("  Supported:", result["supported_count"])
print("  Partial:", result["partial_count"])
print("  Missing:", result["missing_count"])
print("  Coverage:", result["coverage_percentage"], "%")


print("\nSUPPORTED CLAIMS:")

for claim in result["supported_claims"]:
    print(
        f"  Claim: {claim['label']}"
    )
    print(
        f"  Confidence: "
        f"{claim['evidence_confidence']:.4f}"
    )

    for evidence in claim["evidence_links"]:
        print(
            f"  Document: "
            f"{evidence['document_label']}"
        )
        print(
            f"  Evidence ID: "
            f"{evidence['source_evidence_id']}"
        )
        print(
            f"  Link confidence: "
            f"{evidence['confidence']:.4f}"
        )

    print()


print("PARTIAL CLAIMS:")

for claim in result["partial_claims"]:
    print(
        f"  {claim['label']} "
        f"({claim['evidence_confidence']:.4f})"
    )


print("\nMISSING CLAIMS:")

for claim in result["missing_claims"]:
    print(
        f"  {claim['label']} "
        f"({claim['evidence_confidence']:.4f})"
    )


print("\nREASONS:")

if result["reasons"]:
    for reason in result["reasons"]:
        print(" ", reason)
else:
    print("  None")


print("\nEXPECTED RESULT")
print("=" * 60)

if (
    result["verified"]
    and result["status"] == "VERIFIED"
    and result["total_claims"] == 2
    and result["supported_count"] == 2
    and result["partial_count"] == 0
    and result["missing_count"] == 0
    and result["coverage_percentage"] == 100.0
):
    print("PASS: User-evidence verification is working correctly.")
else:
    print("FAIL: Unexpected user-evidence verification result.")