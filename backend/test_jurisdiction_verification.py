from app.services.legal_jurisdiction_verification_service import (
    LegalJurisdictionVerificationService
)


SOURCE_ID = "5a78d6df-b6f9-40f4-8986-f416c80b184d"


RETRIEVED_CHUNKS = [
    {
        "source_id": SOURCE_ID,
        "section_number": "66",
        "jurisdiction": "INDIA"
    },
    {
        "source_id": SOURCE_ID,
        "section_number": "66C",
        "jurisdiction": "INDIA"
    }
]


print("\nMAHARASHTRA CASE TEST")
print("=" * 60)

result = (
    LegalJurisdictionVerificationService
    .verify_jurisdiction(
        "MAHARASHTRA",
        RETRIEVED_CHUNKS
    )
)

print("Status:", result["status"])
print("Verified:", result["verified"])

for item in result["results"]:
    print(
        f"  Section {item['section_number']}: "
        f"{item['legal_jurisdiction']} → "
        f"{item['compatible']}"
    )


print("\nKARNATAKA CASE TEST")
print("=" * 60)

result = (
    LegalJurisdictionVerificationService
    .verify_jurisdiction(
        "KARNATAKA",
        RETRIEVED_CHUNKS
    )
)

print("Status:", result["status"])
print("Verified:", result["verified"])

for reason in result["reasons"]:
    print(" ", reason)


print("\nMAHARASHTRA STATE LAW TEST")
print("=" * 60)

state_chunks = [
    {
        "source_id": "state-source",
        "section_number": "24",
        "jurisdiction": "MAHARASHTRA"
    }
]

result = (
    LegalJurisdictionVerificationService
    .verify_jurisdiction(
        "MAHARASHTRA",
        state_chunks
    )
)

print("Status:", result["status"])
print("Verified:", result["verified"])