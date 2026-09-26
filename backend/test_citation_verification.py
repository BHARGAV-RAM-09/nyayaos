from app.services.legal_citation_verification_service import (
    LegalCitationVerificationService
)


SOURCE_ID = "5a78d6df-b6f9-40f4-8986-f416c80b184d"

RETRIEVED_CHUNKS = [
    {
        "source_id": SOURCE_ID,
        "section_number": "66",
        "section_title": "Computer related offences",
        "jurisdiction": "INDIA"
    }
]


VALID_CITATION = {
    "section_number": "66",
    "section_title": "Computer related offences",
    "source_id": SOURCE_ID,
    "source_title": "Information Technology Act, 2000",
    "citation": "Act No. 21 of 2000",
    "jurisdiction": "INDIA",
    "source_url": (
        "https://www.indiacode.nic.in/bitstream/"
        "123456789/13116/1/it_act_2000_updated.pdf"
    )
}


result = LegalCitationVerificationService.verify_citation(
    VALID_CITATION,
    RETRIEVED_CHUNKS
)

print("\nCITATION VERIFICATION RESULT")
print("=" * 60)

print("Status:", result["status"])
print("Verified:", result["verified"])

print("\nChecks:")

for key, value in result["checks"].items():
    print(f"  {key}: {value}")

print("\nReasons:")

for reason in result["reasons"]:
    print(" ", reason)

print("\nVerified Citation:")

for key, value in result["citation"].items():
    print(f"  {key}: {value}")