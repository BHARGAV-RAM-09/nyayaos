from datetime import datetime
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class Case(BaseModel):
    case_id: UUID = Field(default_factory=uuid4)

    title: str
    description: str

    jurisdiction_country: str = "IN"
    jurisdiction_state: str | None = None

    domain: str | None = None

    status: str = "intake"

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)