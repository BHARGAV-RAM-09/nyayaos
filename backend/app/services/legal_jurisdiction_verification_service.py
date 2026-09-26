from typing import List, Dict, Any


class LegalJurisdictionVerificationService:

    JURISDICTION_HIERARCHY = {
        "MAHARASHTRA": ["MAHARASHTRA", "INDIA"],
        "INDIA": ["INDIA"],
    }

    @classmethod
    def normalize(cls, jurisdiction: str) -> str:
        if not jurisdiction:
            return ""

        return jurisdiction.strip().upper()

    @classmethod
    def is_compatible(
        cls,
        case_jurisdiction: str,
        legal_jurisdiction: str
    ) -> bool:

        case_jurisdiction = cls.normalize(
            case_jurisdiction
        )

        legal_jurisdiction = cls.normalize(
            legal_jurisdiction
        )

        allowed = cls.JURISDICTION_HIERARCHY.get(
            case_jurisdiction,
            []
        )

        return legal_jurisdiction in allowed

    @classmethod
    def verify_jurisdiction(
        cls,
        case_jurisdiction: str,
        retrieved_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:

        if not case_jurisdiction:
            return {
                "verified": False,
                "status": "FAILED",
                "reasons": [
                    "Case jurisdiction is missing."
                ]
            }

        normalized_case = cls.normalize(
            case_jurisdiction
        )

        if normalized_case not in cls.JURISDICTION_HIERARCHY:
            return {
                "verified": False,
                "status": "FAILED",
                "reasons": [
                    f"Unsupported case jurisdiction: "
                    f"{case_jurisdiction}"
                ]
            }

        if not retrieved_chunks:
            return {
                "verified": False,
                "status": "FAILED",
                "reasons": [
                    "No legal provisions were retrieved."
                ]
            }

        results = []

        for chunk in retrieved_chunks:

            legal_jurisdiction = cls.normalize(
                chunk.get("jurisdiction", "")
            )

            compatible = cls.is_compatible(
                normalized_case,
                legal_jurisdiction
            )

            results.append({
                "section_number": chunk.get(
                    "section_number"
                ),
                "source_id": chunk.get(
                    "source_id"
                ),
                "case_jurisdiction": normalized_case,
                "legal_jurisdiction": legal_jurisdiction,
                "compatible": compatible
            })

        all_verified = all(
            result["compatible"]
            for result in results
        )

        reasons = []

        for result in results:

            if not result["compatible"]:
                reasons.append(
                    "Jurisdiction mismatch: "
                    f"case={result['case_jurisdiction']}, "
                    f"legal_source={result['legal_jurisdiction']}, "
                    f"section={result['section_number']}"
                )

        return {
            "verified": all_verified,
            "status": (
                "VERIFIED"
                if all_verified
                else "FAILED"
            ),
            "case_jurisdiction": normalized_case,
            "results": results,
            "reasons": reasons
        }