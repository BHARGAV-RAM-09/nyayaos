from app.services.legal_source_verification_service import (
    LegalSourceVerificationService
)


SOURCE_ID = "5a78d6df-b6f9-40f4-8986-f416c80b184d"


result = (
    LegalSourceVerificationService
    .verify_source(SOURCE_ID)
)

print("\nSOURCE VERIFICATION RESULT")
print("=" * 60)

print("Source ID:", result["source_id"])
print("Status:", result["status"])
print("Verified:", result["verified"])

print("\nChecks:")

for key, value in result["checks"].items():
    print(f"  {key}: {value}")

print("\nSource:")

for key, value in result["source"].items():
    print(f"  {key}: {value}")

print("\nReasons:")

for reason in result["reasons"]:
    print(" ", reason)