from typing import List, Dict, Any

from app.core.config import settings
from supabase import create_client


class LegalCitationService:

    @staticmethod
    def get_supabase_client():
        return create_client(
            settings.supabase_url,
            settings.supabase_key
        )

    @classmethod
    def enrich_chunks(
        cls,
        retrieved_chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:

        if not retrieved_chunks:
            return []

        supabase = cls.get_supabase_client()

        source_ids = list({
            chunk["source_id"]
            for chunk in retrieved_chunks
            if chunk.get("source_id")
        })

        if not source_ids:
            return []

        response = (
            supabase
            .table("legal_sources")
            .select(
                "source_id, title, citation, jurisdiction, "
                "source_url, authority, version_date, status, metadata"
            )
            .in_("source_id", source_ids)
            .execute()
        )

        sources = response.data or []

        source_map = {
            source["source_id"]: source
            for source in sources
        }

        enriched = []

        for chunk in retrieved_chunks:

            source_id = chunk.get("source_id")
            source = source_map.get(source_id)

            if not source:
                enriched.append({
                    **chunk,
                    "citation": None,
                    "provenance": None,
                    "citation_status": "UNRESOLVED"
                })
                continue

            metadata = source.get("metadata") or {}

            verified_source = bool(
                metadata.get("verified_source", False)
            )

            source_url = source.get("source_url")
            citation = source.get("citation")

            citation_verified = bool(
                citation and source_url
            )

            provenance = {
                "source_id": source.get("source_id"),
                "source_title": source.get("title"),
                "authority": source.get("authority"),
                "citation": citation,
                "jurisdiction": source.get("jurisdiction"),
                "source_url": source_url,
                "version_date": source.get("version_date"),
                "status": source.get("status"),
                "verification": {
                    "verified_source": verified_source,
                    "citation_verified": citation_verified,
                    "url_present": bool(source_url)
                }
            }

            citation_object = {
                "section_number": chunk.get(
                    "section_number"
                ),
                "section_title": chunk.get(
                    "section_title"
                ),
                "source_id": source.get(
                    "source_id"
                ),
                "source_title": source.get(
                    "title"
                ),
                "citation": citation,
                "jurisdiction": source.get(
                    "jurisdiction"
                ),
                "source_url": source_url
            }

            status = "VERIFIED"

            if not verified_source:
                status = "SOURCE_NOT_VERIFIED"
            elif not citation_verified:
                status = "INCOMPLETE_CITATION"

            enriched.append({
                **chunk,
                "citation": citation_object,
                "provenance": provenance,
                "citation_status": status
            })

        return enriched