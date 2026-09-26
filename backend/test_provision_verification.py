from app.services.legal_provision_verification_service import (
    LegalProvisionVerificationService
)


SOURCE_ID = "5a78d6df-b6f9-40f4-8986-f416c80b184d"


RETRIEVED_CHUNKS = [
    {
        "source_id": SOURCE_ID,
        "section_number": "66",
        "section_title": "Computer related offences",
        "jurisdiction": "INDIA",
        "legal_domain": "CYBER_OFFENCE",
        "legal_category": "CYBER_OFFENCE",
        "content": (
            "Whoever, dishonestly or fraudulently, "
            "does any act referred to in section 43..."
        )
    }
]


VALID_PROVISION = {
    "section_number": "66",
    "source_id": SOURCE_ID
}


INVALID_PROVISION = {
    "section_number": "999",
    "source_id": SOURCE_ID
}


print("\nVALID PROVISION TEST")
print("=" * 60)

result = LegalProvisionVerificationService.verify_provision(
    VALID_PROVISION,
    RETRIEVED_CHUNKS
)

print("Status:", result["status"])
print("Verified:", result["verified"])

for key, value in result["checks"].items():
    print(f"  {key}: {value}")


print("\nINVALID PROVISION TEST")
print("=" * 60)

result = LegalProvisionVerificationService.verify_provision(
    INVALID_PROVISION,
    RETRIEVED_CHUNKS
)

print("Status:", result["status"])
print("Verified:", result["verified"])

for reason in result["reasons"]:
    print(" ", reason)