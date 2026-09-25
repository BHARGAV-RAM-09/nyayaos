from app.services.groq_service import GroqService
from app.services.ai_extraction_service import (
    AIExtractionService,
)


EVIDENCE_TEXT = """
I am Rahul Sharma, a customer of ABC Bank.
I live in Nagpur, Maharashtra.

On 21 March 2026, I noticed that ₹80,000 was transferred
from my bank account without my authorization.

Rahul Sharma states that he did not authorize the transfer.

ABC Bank's records indicate that the transaction was authorized.

Rahul contacted Priya Mehta from ABC Bank's customer support team
on 22 March 2026.

ABC Bank sent an SMS confirming the transaction on 22 March 2026.

Rahul contacted Maharashtra Police at Andheri Police Station
on 23 March 2026 and reported the incident.

Rahul also spent ₹250 on courier charges while sending
documents related to the complaint.
"""


def main():

    groq_service = GroqService()

    client = groq_service.get_client()

    extraction_service = AIExtractionService(
        client
    )

    result = extraction_service.extract_case_intelligence(
        EVIDENCE_TEXT
    )

    print("\n===== NYAYAOS CASE INTELLIGENCE =====")

    print("\n--- CASE SUMMARY ---")
    print(result.get("case_summary", ""))

    print("\n--- PEOPLE ---")
    print(result["people"])

    print("\n--- ORGANIZATIONS ---")
    print(result["organizations"])

    print("\n--- DATES ---")
    print(result["dates"])

    print("\n--- AMOUNTS ---")
    print(result["amounts"])

    print("\n--- LOCATIONS ---")
    print(result["locations"])

    print("\n--- EVENTS ---")
    print(result["events"])

    print("\n--- CLAIMS ---")
    print(result["claims"])

    print("\n--- POTENTIAL DOMAIN ---")
    print(result["potential_domain"])

    print("\n=====================================")

    summary = extraction_service.generate_case_summary(
        result
    )

    print("\n===== REGENERATED CASE SUMMARY =====")
    print(summary)

    print("\n=====================================")

    timeline = extraction_service.generate_timeline(
        result
    )

    print("\n===== NYAYAOS CASE TIMELINE =====")

    for index, item in enumerate(
        timeline,
        start=1,
    ):
        print(f"\n[{index}]")
        print("Date:", item.get("date", ""))
        print(
            "Date Type:",
            item.get("date_type", ""),
        )
        print(
            "Title:",
            item.get("title", ""),
        )
        print(
            "Description:",
            item.get("description", ""),
        )
        print(
            "Actors:",
            item.get("actors", []),
        )

    print("\n=====================================")


if __name__ == "__main__":
    main()