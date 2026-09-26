from typing import List, Dict, Any

from app.core.config import settings
from supabase import create_client


class LegalSourceVerificationService:

    @staticmethod
    def get_supabase_client():
        return create_client(
            settings.supabase_url,
            settings.supabase_key
        )

    @classmethod
    def get_source(
        cls,
        source_id: str
    ) -> Dict[str, Any]:

        if not source_id:
            raise ValueError("source_id is required")

        response = (
            cls.get_supabase_client()
            .table("legal_sources")
            .select(
                """
                source_id,
                title,
                source_type,
                jurisdiction,
                authority,
                citation,
                source_url,
                version_date,
                status,
                metadata
                """
            )
            .eq("source_id", source_id)
            .execute()
        )

        if not response.data:
            raise ValueError(
                f"Legal source not found: {source_id}"
            )

        return response.data[0]

    @classmethod
    def verify_source(
        cls,
        source_id: str
    ) -> Dict[str, Any]:

        try:
            source = cls.get_source(source_id)

        except ValueError as exc:
            return {
                "source_id": source_id,
                "verified": False,
                "status": "FAILED",
                "reasons": [str(exc)]
            }

        metadata = source.get("metadata") or {}

        checks = {
            "source_exists": True,
            "active": source.get("status") == "ACTIVE",
            "verified_source": (
                metadata.get("verified_source") is True
            ),
            "title_present": bool(
                source.get("title")
            ),
            "authority_present": bool(
                source.get("authority")
            ),
            "source_url_present": bool(
                source.get("source_url")
            ),
        }

        reasons = []

        if not checks["active"]:
            reasons.append(
                "Legal source is not ACTIVE."
            )

        if not checks["verified_source"]:
            reasons.append(
                "Source is not marked as verified."
            )

        if not checks["title_present"]:
            reasons.append(
                "Source title is missing."
            )

        if not checks["authority_present"]:
            reasons.append(
                "Source authority is missing."
            )

        if not checks["source_url_present"]:
            reasons.append(
                "Official source URL is missing."
            )

        verified = all(checks.values())

        return {
            "source_id": source_id,
            "verified": verified,
            "status": (
                "VERIFIED"
                if verified
                else "FAILED"
            ),
            "checks": checks,
            "reasons": reasons,
            "source": {
                "title": source.get("title"),
                "source_type": source.get(
                    "source_type"
                ),
                "jurisdiction": source.get(
                    "jurisdiction"
                ),
                "authority": source.get(
                    "authority"
                ),
                "citation": source.get(
                    "citation"
                ),
                "source_url": source.get(
                    "source_url"
                ),
                "version_date": source.get(
                    "version_date"
                ),
                "status": source.get(
                    "status"
                )
            }
        }

    @classmethod
    def verify_sources(
        cls,
        retrieved_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:

        if not retrieved_chunks:
            return {
                "verified": False,
                "status": "FAILED",
                "sources": [],
                "reasons": [
                    "No retrieved legal sources."
                ]
            }

        source_ids = []

        for chunk in retrieved_chunks:

            source_id = str(
                chunk.get("source_id", "")
            ).strip()

            if source_id and source_id not in source_ids:
                source_ids.append(source_id)

        if not source_ids:
            return {
                "verified": False,
                "status": "FAILED",
                "sources": [],
                "reasons": [
                    "Retrieved chunks contain no source IDs."
                ]
            }

        verification_results = []

        for source_id in source_ids:

            verification_results.append(
                cls.verify_source(source_id)
            )

        all_verified = all(
            result["verified"]
            for result in verification_results
        )

        reasons = []

        for result in verification_results:
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
            "sources": verification_results,
            "reasons": reasons
        }