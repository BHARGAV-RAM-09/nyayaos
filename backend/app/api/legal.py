from fastapi import APIRouter, HTTPException

from app.services.case_legal_retrieval_service import (
    CaseLegalRetrievalService
)
from app.services.legal_citation_service import (
    LegalCitationService
)

router = APIRouter(
    prefix="/api/legal",
    tags=["Legal Information"]
)


@router.get("/case/{case_id}")
def get_case_legal_information(case_id: str):

    try:
        retrieval = (
            CaseLegalRetrievalService
            .retrieve_for_case(
                case_id=case_id,
                match_count=5
            )
        )

        enriched_results = (
            LegalCitationService
            .enrich_chunks(
                retrieval["results"]
            )
        )

        return {
            "case_id": retrieval["case_id"],
            "jurisdiction": retrieval["jurisdiction"],
            "legal_domain": retrieval["legal_domain"],
            "query": retrieval["query"],
            "result_count": len(enriched_results),
            "results": enriched_results
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc)
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc)
        )