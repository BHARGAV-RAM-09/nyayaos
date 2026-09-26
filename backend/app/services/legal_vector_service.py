from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.services.legal_embedding_service import LegalEmbeddingService
from supabase import create_client


class LegalVectorService:

    SUPPORTED_JURISDICTIONS = {
        "INDIA": ["INDIA"],
        "MAHARASHTRA": ["MAHARASHTRA", "INDIA"],
    }

    @staticmethod
    def get_supabase_client():
        return create_client(
            settings.supabase_url,
            settings.supabase_key
        )

    @staticmethod
    def search(
        query: str,
        match_count: int = 5,
        jurisdiction: Optional[str] = None,
        legal_domain: Optional[str] = None,
        legal_category: Optional[str] = None
    ) -> List[Dict[str, Any]]:

        if not query or not query.strip():
            raise ValueError("Search query is required")

        if match_count < 1:
            raise ValueError("match_count must be at least 1")

        query_embedding = (
            LegalEmbeddingService.generate_embedding(query)
        )

        supabase = LegalVectorService.get_supabase_client()

        response = supabase.rpc(
            "match_legal_chunks",
            {
                "query_embedding": query_embedding,
                "match_count": match_count,
                "filter_jurisdiction": jurisdiction,
                "filter_domain": legal_domain,
                "filter_category": legal_category
            }
        ).execute()

        return response.data or []

    @classmethod
    def get_search_jurisdictions(
        cls,
        jurisdiction: str
    ) -> List[str]:

        if not jurisdiction:
            raise ValueError("Jurisdiction is required")

        normalized = jurisdiction.strip().upper()

        if normalized not in cls.SUPPORTED_JURISDICTIONS:
            raise ValueError(
                f"Unsupported jurisdiction: {jurisdiction}"
            )

        return cls.SUPPORTED_JURISDICTIONS[normalized]

    @classmethod
    def search_by_jurisdiction(
        cls,
        query: str,
        jurisdiction: str,
        match_count: int = 5,
        legal_domain: Optional[str] = None,
        legal_category: Optional[str] = None
    ) -> List[Dict[str, Any]]:

        search_jurisdictions = cls.get_search_jurisdictions(
            jurisdiction
        )

        results_by_chunk = {}

        per_jurisdiction_count = max(
            match_count,
            match_count * 2
        )

        for search_jurisdiction in search_jurisdictions:

            results = cls.search(
                query=query,
                match_count=per_jurisdiction_count,
                jurisdiction=search_jurisdiction,
                legal_domain=legal_domain,
                legal_category=legal_category
            )

            for result in results:

                chunk_id = result["chunk_id"]

                existing = results_by_chunk.get(chunk_id)

                if (
                    existing is None
                    or result["similarity"] > existing["similarity"]
                ):
                    results_by_chunk[chunk_id] = result

        combined_results = list(results_by_chunk.values())

        combined_results.sort(
            key=lambda item: item["similarity"],
            reverse=True
        )

        return combined_results[:match_count]