from typing import List, Dict, Any

from app.services.legal_source_verification_service import (
    LegalSourceVerificationService
)


class LegalCitationVerificationService:

    @staticmethod
    def _find_chunk(
        section_number: str,
        source_id: str,
        retrieved_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any] | None:

        for chunk in retrieved_chunks:

            chunk_section = str(
                chunk.get("section_number", "")
            ).strip()

            chunk_source = str(
                chunk.get("source_id", "")
            ).strip()

            if (
                chunk_section == section_number
                and chunk_source == source_id
            ):
                return chunk

        return None

    @classmethod
    def verify_citation(
        cls,
        citation: Dict[str, Any],
        retrieved_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:

        section_number = str(
            citation.get("section_number", "")
        ).strip()

        source_id = str(
            citation.get("source_id", "")
        ).strip()

        if not section_number:
            return {
                "verified": False,
                "status": "FAILED",
                "reasons": [
                    "Citation is missing section_number."
                ]
            }

        if not source_id:
            return {
                "verified": False,
                "status": "FAILED",
                "reasons": [
                    "Citation is missing source_id."
                ]
            }

        chunk = cls._find_chunk(
            section_number,
            source_id,
            retrieved_chunks
        )

        if chunk is None:
            return {
                "verified": False,
                "status": "FAILED",
                "reasons": [
                    "Citation does not match a retrieved "
                    "legal chunk."
                ]
            }

        source_result = (
            LegalSourceVerificationService
            .verify_source(source_id)
        )

        if not source_result["verified"]:
            return {
                "verified": False,
                "status": "FAILED",
                "reasons": (
                    ["Source verification failed."]
                    + source_result.get("reasons", [])
                )
            }

        source = source_result["source"]

        expected_section_title = str(
            chunk.get("section_title", "")
        ).strip()

        expected_jurisdiction = str(
            chunk.get("jurisdiction", "")
        ).strip()

        checks = {
            "section_verified": (
                section_number
                == str(
                    chunk.get("section_number", "")
                ).strip()
            ),
            "source_verified": (
                source_id
                == str(
                    chunk.get("source_id", "")
                ).strip()
            ),
            "source_title_verified": (
                citation.get("source_title")
                in (None, "", source.get("title"))
            ),
            "citation_verified": (
                citation.get("citation")
                in (None, "", source.get("citation"))
            ),
            "jurisdiction_verified": (
                citation.get("jurisdiction")
                in (
                    None,
                    "",
                    expected_jurisdiction
                )
            ),
            "source_url_verified": (
                citation.get("source_url")
                in (
                    None,
                    "",
                    source.get("source_url")
                )
            ),
        }

        reasons = []

        if not checks["section_verified"]:
            reasons.append(
                "Citation section does not match "
                "the retrieved chunk."
            )

        if not checks["source_verified"]:
            reasons.append(
                "Citation source does not match "
                "the retrieved chunk."
            )

        if not checks["source_title_verified"]:
            reasons.append(
                "Citation source title does not match "
                "the authoritative source."
            )

        if not checks["citation_verified"]:
            reasons.append(
                "Citation value does not match "
                "the authoritative source."
            )

        if not checks["jurisdiction_verified"]:
            reasons.append(
                "Citation jurisdiction does not match "
                "the retrieved chunk."
            )

        if not checks["source_url_verified"]:
            reasons.append(
                "Citation URL does not match "
                "the authoritative source."
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
            "citation": {
                "section_number": section_number,
                "section_title": expected_section_title,
                "source_id": source_id,
                "source_title": source.get("title"),
                "citation": source.get("citation"),
                "jurisdiction": expected_jurisdiction,
                "source_url": source.get("source_url"),
            }
        }

    @classmethod
    def verify_citations(
        cls,
        citations: List[Dict[str, Any]],
        retrieved_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:

        if not citations:
            return {
                "verified": False,
                "status": "FAILED",
                "citations": [],
                "reasons": [
                    "No citations were provided."
                ]
            }

        results = []

        for citation in citations:

            result = cls.verify_citation(
                citation,
                retrieved_chunks
            )

            results.append(result)

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
            "citations": results,
            "reasons": reasons
        }