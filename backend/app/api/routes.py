from fastapi import APIRouter

from app.models.case_model import Case
from app.schemas.case_schema import CaseCreate, CaseResponse
from app.services.supabase_client import supabase


router = APIRouter(
    prefix="/api",
    tags=["NYAYAOS"]
)


@router.get("/status")
def status():
    return {
        "system": "NYAYAOS",
        "status": "operational",
        "version": "0.1.0"
    }


@router.post("/cases", response_model=CaseResponse)
def create_case(case_data: CaseCreate):

    case = Case(
        title=case_data.title,
        description=case_data.description,
        jurisdiction_country=case_data.jurisdiction_country,
        jurisdiction_state=case_data.jurisdiction_state,
    )

    data = {
        "case_id": str(case.case_id),
        "title": case.title,
        "description": case.description,
        "jurisdiction_country": case.jurisdiction_country,
        "jurisdiction_state": case.jurisdiction_state,
        "domain": case.domain,
        "status": case.status,
    }

    supabase.table("cases").insert(data).execute()

    return data
@router.get("/cases")
def get_cases():

    response = supabase.table("cases").select("*").order(
        "created_at",
        desc=True
    ).execute()

    return response.data