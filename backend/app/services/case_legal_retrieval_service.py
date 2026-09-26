from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.services.legal_vector_service import LegalVectorService
from supabase import create_client


class CaseLegalRetrievalService:

    DOMAIN_TO_LEGAL_DOMAIN = {
        "Cyber / Financial Fraud": "CYBER_OFFENCE",
        "Privacy / Data Protection": "DATA_PRIVACY",
        "Government Services": "E_GOVERNANCE",
        "Electronic Records": "ELECTRONIC_RECORDS",
        "Digital Identity": "DIGITAL_IDENTITY",
        "Certifying Authority": "CERTIFYING_AUTHORITY",
        "Legal Procedure": "LEGAL_PROCEDURE",
        "Investigation / Enforcement": "INVESTIGATION_ENFORCEMENT",
    }

    @staticmethod
    def get_supabase_client():
        return create_client(
            settings.supabase_url,
            settings.supabase_key
        )

    @classmethod
    def get_case(cls, case_id: str) -> Dict[str, Any]:

        if not case_id:
            raise ValueError("case_id is required")

        supabase = cls.get_supabase_client()

        response = (
            supabase
            .table("cases")
            .select(
                """
                case_id,
                title,
                description,
                domain,
                jurisdiction_country,
                jurisdiction_state
                """
            )
            .eq("case_id", case_id)
            .execute()
        )

        if not response.data:
            raise ValueError(
                f"Case not found: {case_id}"
            )

        return response.data[0]

    @classmethod
    def get_legal_domain(
        cls,
        case_intelligence: Optional[Dict[str, Any]] = None,
        case_domain: Optional[str] = None
    ) -> Optional[str]:

        # --------------------------------------------------------
        # 1. Prefer case intelligence when available
        # --------------------------------------------------------

        if case_intelligence:

            potential_domain = case_intelligence.get(
                "potential_domain",
                {}
            )

            if isinstance(potential_domain, dict):

                primary_domain = potential_domain.get(
                    "primary"
                )

                mapped_domain = cls.DOMAIN_TO_LEGAL_DOMAIN.get(
                    primary_domain
                )

                if mapped_domain:
                    return mapped_domain

        # --------------------------------------------------------
        # 2. Fall back to the stored case domain
        # --------------------------------------------------------

        if case_domain:

            normalized_domain = str(
                case_domain
            ).strip()

            mapped_domain = cls.DOMAIN_TO_LEGAL_DOMAIN.get(
                normalized_domain
            )

            if mapped_domain:
                return mapped_domain

        return None

    @staticmethod
    def build_query(
        case_data: Dict[str, Any],
        case_intelligence: Optional[Dict[str, Any]]
    ) -> str:

        query_parts = []

        title = case_data.get("title")
        description = case_data.get("description")
        domain = case_data.get("domain")

        if title:
            query_parts.append(
                f"Case title: {title}"
            )

        if description:
            query_parts.append(
                f"Case description: {description}"
            )

        if domain:
            query_parts.append(
                f"Case domain: {domain}"
            )

        if case_intelligence:

            summary = case_intelligence.get(
                "case_summary"
            )

            if summary:
                query_parts.append(
                    f"Case summary: {summary}"
                )

            claims = case_intelligence.get(
                "claims",
                []
            )

            for claim in claims[:5]:

                if isinstance(claim, dict):

                    claim_text = claim.get(
                        "claim"
                    )

                    if claim_text:
                        query_parts.append(
                            f"Claim: {claim_text}"
                        )

            events = case_intelligence.get(
                "events",
                []
            )

            for event in events[:5]:

                if isinstance(event, dict):

                    event_text = event.get(
                        "event"
                    )

                    if event_text:
                        query_parts.append(
                            f"Event: {event_text}"
                        )

        query = "\n".join(
            query_parts
        ).strip()

        if not query:
            raise ValueError(
                "Insufficient case information "
                "for legal retrieval"
            )

        return query

    @classmethod
    def retrieve_for_case(
        cls,
        case_id: str,
        case_intelligence: Optional[Dict[str, Any]] = None,
        match_count: int = 5
    ) -> Dict[str, Any]:

        if match_count < 1:
            raise ValueError(
                "match_count must be at least 1"
            )

        case_data = cls.get_case(
            case_id
        )

        # --------------------------------------------------------
        # JURISDICTION
        # --------------------------------------------------------

        jurisdiction_state = case_data.get(
            "jurisdiction_state"
        )

        jurisdiction = "INDIA"

        if jurisdiction_state:

            normalized_state = (
                jurisdiction_state
                .strip()
                .upper()
            )

            if normalized_state == "MAHARASHTRA":
                jurisdiction = "MAHARASHTRA"

        # --------------------------------------------------------
        # LEGAL DOMAIN
        # --------------------------------------------------------

        legal_domain = cls.get_legal_domain(
            case_intelligence=case_intelligence,
            case_domain=case_data.get("domain")
        )

        # --------------------------------------------------------
        # BUILD LEGAL QUERY
        # --------------------------------------------------------

        query = cls.build_query(
            case_data,
            case_intelligence
        )

        # --------------------------------------------------------
        # VECTOR RETRIEVAL
        # --------------------------------------------------------

        results = (
            LegalVectorService
            .search_by_jurisdiction(
                query=query,
                jurisdiction=jurisdiction,
                match_count=match_count,
                legal_domain=legal_domain
            )
        )

        return {
            "case_id": case_id,
            "jurisdiction": jurisdiction,
            "legal_domain": legal_domain,
            "query": query,
            "results": results,
            "result_count": len(results)
        }