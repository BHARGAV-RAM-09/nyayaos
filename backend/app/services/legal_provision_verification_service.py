from typing import List, Dict, Any


class LegalProvisionVerificationService:

    @staticmethod
    def verify_provision(
        provision: Dict[str, Any],
        retrieved_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:

        section_number = str(
            provision.get("section_number", "")
        ).strip()

        source_id = str(
            provision.get("source_id", "")
        ).strip()

        if not section_number:
            return {
                "verified": False,
                "status": "FAILED",
                "reasons": [
                    "Provision is missing section_number."
                ]
            }

        if not source_id:
            return {
                "verified": False,
                "status": "FAILED",
                "reasons": [
                    "Provision is missing source_id."
                ]
            }

        matching_chunks = [
            chunk
            for chunk in retrieved_chunks
            if str(
                chunk.get("section_number", "")
            ).strip() == section_number
            and str(
                chunk.get("source_id", "")
            ).strip() == source_id
        ]

        if not matching_chunks:
            return {
                "verified": False,
                "status": "FAILED",
                "reasons": [
                    "Provision was not found in the "
                    "retrieved legal corpus."
                ]
            }

        chunk = matching_chunks[0]

        section_title = str(
            chunk.get("section_title", "")
        ).strip()

        content = str(
            chunk.get("content", "")
        ).strip()

        checks = {
            "section_exists": True,
            "source_matches": True,
            "section_title_present": bool(
                section_title
            ),
            "legal_text_present": bool(
                content
            )
        }

        reasons = []

        if not checks["section_title_present"]:
            reasons.append(
                "Retrieved provision has no section title."
            )

        if not checks["legal_text_present"]:
            reasons.append(
                "Retrieved provision has no legal text."
            )

        verified = all(checks.values())

        return {
            "verified": verified,
            "status": (
                "VERIFIED"
                if verified
                else "FAILED"
            ),
            "checks": checks,
            "reasons": reasons,
            "provision": {
                "section_number": section_number,
                "section_title": section_title,
                "source_id": source_id,
                "jurisdiction": chunk.get(
                    "jurisdiction"
                ),
                "legal_domain": chunk.get(
                    "legal_domain"
                ),
                "legal_category": chunk.get(
                    "legal_category"
                )
            }
        }

    @classmethod
    def verify_provisions(
        cls,
        provisions: List[Dict[str, Any]],
        retrieved_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:

        if not provisions:
            return {
                "verified": False,
                "status": "FAILED",
                "provisions": [],
                "reasons": [
                    "No provisions were provided."
                ]
            }

        results = []

        for provision in provisions:
            results.append(
                cls.verify_provision(
                    provision,
                    retrieved_chunks
                )
            )

        all_verified = all(
            result["verified"]
            for result in results
        )

        reasons = []

        for result in results:
            reasons.extend(
                result.get("reasons", [])
            )

        return {
            "verified": all_verified,
            "status": (
                "VERIFIED"
                if all_verified
                else "FAILED"
            ),
            "provisions": results,
            "reasons": reasons
        }