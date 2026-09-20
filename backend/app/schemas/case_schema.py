from pydantic import BaseModel, Field


class CaseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    jurisdiction_country: str = "IN"
    jurisdiction_state: str | None = None


class CaseResponse(BaseModel):
    case_id: str
    title: str
    description: str
    jurisdiction_country: str
    jurisdiction_state: str | None
    domain: str | None
    status: str