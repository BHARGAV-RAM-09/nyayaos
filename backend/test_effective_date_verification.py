from app.services.legal_effective_date_verification_service import (
    LegalEffectiveDateVerificationService
)


SOURCE_ID = "5a78d6df-b6f9-40f4-8986-f416c80b184d"


print("\nCURRENT IT ACT SOURCE")
print("=" * 60)

result = (
    LegalEffectiveDateVerificationService
    .verify_effective_date(
        SOURCE_ID
    )
)

print("Status:", result["status"])
print("Verified:", result["verified"])
print("Version date:", result["version_date"])

for key, value in result["checks"].items():
    print(f"  {key}: {value}")

for reason in result["reasons"]:
    print(" ", reason)


print("\nINVALID SOURCE TEST")
print("=" * 60)

result = (
    LegalEffectiveDateVerificationService
    .verify_effective_date(
        "00000000-0000-0000-0000-000000000000"
    )
)

print("Status:", result["status"])
print("Verified:", result["verified"])

for reason in result["reasons"]:
    print(" ", reason)