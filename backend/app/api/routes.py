from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
from uuid import uuid4

from app.models.case_model import Case
from app.schemas.case_schema import CaseCreate, CaseResponse

from app.services.supabase_client import supabase
from app.services.evidence_service import EvidenceStorageService
from app.services.pdf_service import PDFService
from app.services.ocr_service import OCRService
from app.services.ai_extraction_service import AIExtractionService
from app.services.groq_service import GroqService
from app.services.evidence_packet_service import EvidencePacketService

router = APIRouter(
    prefix="/api",
    tags=["NYAYAOS"]
)


# ============================================================
# EVIDENCE FILE CONFIGURATION
# ============================================================

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".txt",
}

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "text/plain",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ============================================================
# SYSTEM STATUS
# ============================================================

@router.get("/status")
def status():
    return {
        "system": "NYAYAOS",
        "status": "operational",
        "version": "0.1.0"
    }


# ============================================================
# CREATE CASE
# ============================================================

@router.post(
    "/cases",
    response_model=CaseResponse
)
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


# ============================================================
# GET ALL CASES
# ============================================================

@router.get("/cases")
def get_cases():

    response = (
        supabase
        .table("cases")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )

    return response.data


# ============================================================
# GET ALL EVIDENCE FOR A CASE
# ============================================================

@router.get("/cases/{case_id}/evidence")
def get_case_evidence(case_id: str):

    # --------------------------------------------------------
    # 1. CHECK CASE EXISTS
    # --------------------------------------------------------

    case_response = (
        supabase
        .table("cases")
        .select("case_id")
        .eq("case_id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    # --------------------------------------------------------
    # 2. GET EVIDENCE RECORDS
    # --------------------------------------------------------

    response = (
        supabase
        .table("evidence")
        .select(
            """
            evidence_id,
            case_id,
            file_name,
            file_type,
            storage_path,
            extraction_status,
            extracted_text,
            created_at
            """
        )
        .eq("case_id", case_id)
        .order("created_at", desc=True)
        .execute()
    )

    # --------------------------------------------------------
    # 3. RETURN EVIDENCE
    # --------------------------------------------------------

    return {
        "case_id": case_id,
        "count": len(response.data),
        "evidence": response.data
    }


# ============================================================
# UPLOAD EVIDENCE
# ============================================================

@router.post("/cases/{case_id}/evidence")
async def upload_evidence(
    case_id: str,
    file: UploadFile = File(...)
):

    # ========================================================
    # 1. CHECK CASE EXISTS
    # ========================================================

    case_response = (
        supabase
        .table("cases")
        .select("case_id")
        .eq("case_id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )


    # ========================================================
    # 2. VALIDATE FILENAME
    # ========================================================

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required"
        )

    # Prevent directory traversal through uploaded filenames.
    original_filename = Path(file.filename).name

    file_extension = Path(
        original_filename
    ).suffix.lower()

    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Allowed formats: PDF, PNG, JPG, JPEG, TXT"
            )
        )


    # ========================================================
    # 3. VALIDATE MIME TYPE
    # ========================================================

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported MIME type: {file.content_type}"
        )


    # ========================================================
    # 4. READ FILE
    # ========================================================

    file_data = await file.read()

    if not file_data:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty"
        )


    # ========================================================
    # 5. VALIDATE FILE SIZE
    # ========================================================

    file_size = len(file_data)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=(
                "File is too large. "
                "Maximum allowed size is 10 MB"
            )
        )


    # ========================================================
    # 6. GENERATE EVIDENCE ID
    # ========================================================

    evidence_id = uuid4()


    # ========================================================
    # 7. GENERATE STORAGE PATH
    # ========================================================

    storage_path = (
        f"{case_id}/"
        f"{evidence_id}_"
        f"{original_filename}"
    )


    # ========================================================
    # 8. EXTRACT TEXT
    # ========================================================

    extracted_text = None
    extraction_status = "not_applicable"


    # --------------------------------------------------------
    # PDF TEXT EXTRACTION
    # --------------------------------------------------------

    if file_extension == ".pdf":

        extraction_status = "processing"

        try:

            extracted_text = PDFService.extract_text(
                file_data
            )

            extraction_status = "completed"

        except Exception as e:

            extraction_status = "failed"

            raise HTTPException(
                status_code=422,
                detail=(
                    "Failed to extract PDF text: "
                    f"{str(e)}"
                )
            )


    # --------------------------------------------------------
    # IMAGE OCR
    # --------------------------------------------------------

    elif file_extension in {
        ".png",
        ".jpg",
        ".jpeg"
    }:

        extraction_status = "processing"

        try:

            extracted_text = OCRService.extract_text(
                file_data
            )

            extraction_status = "completed"

        except Exception as e:

            extraction_status = "failed"

            raise HTTPException(
                status_code=422,
                detail=(
                    "Failed to extract image text using OCR: "
                    f"{str(e)}"
                )
            )


    # --------------------------------------------------------
    # TEXT FILE EXTRACTION
    # --------------------------------------------------------

    elif file_extension == ".txt":

        extraction_status = "processing"

        try:

            extracted_text = file_data.decode(
                "utf-8",
                errors="replace"
            ).strip()

            extraction_status = "completed"

        except Exception as e:

            extraction_status = "failed"

            raise HTTPException(
                status_code=422,
                detail=(
                    "Failed to read text file: "
                    f"{str(e)}"
                )
            )


    # ========================================================
    # 9. UPLOAD ORIGINAL FILE TO SUPABASE STORAGE
    # ========================================================

    try:

        EvidenceStorageService.upload_file(
            file_path=storage_path,
            file_data=file_data,
            content_type=file.content_type
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to upload evidence to storage: "
                f"{str(e)}"
            )
        )


    # ========================================================
    # 10. CREATE DATABASE RECORD
    # ========================================================

    evidence_data = {
        "evidence_id": str(evidence_id),
        "case_id": case_id,
        "file_name": original_filename,
        "file_type": file.content_type,
        "storage_path": storage_path,
        "extraction_status": extraction_status,
        "extracted_text": extracted_text,
    }


    try:

        response = (
            supabase
            .table("evidence")
            .insert(evidence_data)
            .execute()
        )

    except Exception as e:

        # ----------------------------------------------------
        # ROLLBACK STORAGE UPLOAD
        # ----------------------------------------------------

        try:

            EvidenceStorageService.delete_file(
                storage_path
            )

        except Exception:
            pass

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to create evidence database record: "
                f"{str(e)}"
            )
        )


    # ========================================================
    # 11. RETURN SUCCESS RESPONSE
    # ========================================================

    return {
        "message": "Evidence uploaded successfully",
        "evidence_id": str(evidence_id),
        "case_id": case_id,
        "file_name": original_filename,
        "file_type": file.content_type,
        "file_size": file_size,
        "storage_path": storage_path,
        "extraction_status": extraction_status,
        "extracted_text": extracted_text,
        "extracted_characters": (
            len(extracted_text)
            if extracted_text
            else 0
        ),
        "data": response.data
    }


# ============================================================
# GENERATE CASE INTELLIGENCE
# ============================================================

@router.post("/cases/{case_id}/intelligence")
def generate_case_intelligence(case_id: str):

    # ========================================================
    # 1. CHECK CASE EXISTS
    # ========================================================

    case_response = (
        supabase
        .table("cases")
        .select(
            """
            case_id,
            title,
            description,
            jurisdiction_country,
            jurisdiction_state
            """
        )
        .eq("case_id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    case_data = case_response.data[0]


    # ========================================================
    # 2. GET ALL EVIDENCE FOR CASE
    # ========================================================

    evidence_response = (
        supabase
        .table("evidence")
        .select(
            """
            evidence_id,
            file_name,
            extraction_status,
            extracted_text,
            created_at
            """
        )
        .eq("case_id", case_id)
        .order("created_at", desc=True)
        .execute()
    )

    evidence_records = evidence_response.data or []

    if not evidence_records:
        raise HTTPException(
            status_code=400,
            detail=(
                "No evidence has been uploaded for this case."
            )
        )


    # ========================================================
    # 3. COLLECT EXTRACTED TEXT
    # ========================================================

    evidence_sections = []

    for evidence in evidence_records:

        extracted_text = evidence.get(
            "extracted_text"
        )

        if not extracted_text:
            continue

        file_name = evidence.get(
            "file_name",
            "Unknown evidence"
        )

        evidence_sections.append(
            (
                f"--- EVIDENCE FILE: {file_name} ---\n\n"
                f"{extracted_text}\n"
            )
        )


    # ========================================================
    # 4. CHECK FOR USABLE EVIDENCE
    # ========================================================

    if not evidence_sections:
        raise HTTPException(
            status_code=422,
            detail=(
                "No extracted text is available from the "
                "uploaded evidence. Please upload readable "
                "evidence first."
            )
        )


    # ========================================================
    # 5. COMBINE EVIDENCE
    # ========================================================

    combined_evidence_text = "\n".join(
        evidence_sections
    )


    # ========================================================
    # 6. INITIALIZE GROQ AI SERVICE
    # ========================================================

    try:

        groq_service = GroqService()

        ai_service = AIExtractionService(
            groq_service.get_client()
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to initialize AI service: "
                f"{str(e)}"
            )
        )


    # ========================================================
    # 7. EXTRACT CASE INTELLIGENCE
    # ========================================================

    try:

        case_intelligence = (
            ai_service.extract_case_intelligence(
                combined_evidence_text
            )
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to generate case intelligence: "
                f"{str(e)}"
            )
        )


    # ========================================================
    # 8. GENERATE CASE TIMELINE
    # ========================================================

    try:

        timeline_result = (
            ai_service.generate_timeline(
                case_intelligence
            )
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to generate case timeline: "
                f"{str(e)}"
            )
        )


    # ========================================================
    # 9. RETURN CASE INTELLIGENCE
    # ========================================================

    return {
        "case_id": case_id,

        "case": {
            "title": case_data.get("title"),
            "description": case_data.get("description"),
            "jurisdiction_country": case_data.get(
                "jurisdiction_country"
            ),
            "jurisdiction_state": case_data.get(
                "jurisdiction_state"
            ),
        },

        "evidence_count": len(evidence_records),

        "processed_evidence_count": len(
            evidence_sections
        ),

        "case_intelligence": case_intelligence,

        # AI timeline generation may return either:
        # 1. {"timeline": [...]}
        # 2. [...]
        # Normalize both formats so the API always returns a list.
        "timeline": (
            timeline_result.get("timeline", [])
            if isinstance(timeline_result, dict)
            else timeline_result
            if isinstance(timeline_result, list)
            else []
        ),
    }
# ============================================================
# CREATE PERSON GRAPH NODES
# ============================================================

@router.post("/cases/{case_id}/graph/persons")
def create_person_graph_nodes(case_id: str):

    # 1. Get case
    case_response = (
        supabase
        .table("cases")
        .select("case_id")
        .eq("case_id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    # 2. Get evidence
    evidence_response = (
        supabase
        .table("evidence")
        .select(
            "evidence_id, file_name, extracted_text"
        )
        .eq("case_id", case_id)
        .execute()
    )

    evidence_records = evidence_response.data or []

    usable_evidence = [
        item
        for item in evidence_records
        if item.get("extracted_text")
    ]

    if not usable_evidence:
        raise HTTPException(
            status_code=422,
            detail="No usable extracted evidence found."
        )

    # 3. Combine evidence
    combined_text = "\n\n".join(
        f"--- EVIDENCE FILE: {item['file_name']} ---\n"
        f"{item['extracted_text']}"
        for item in usable_evidence
    )

    # 4. Run existing Case Intelligence
    try:
        groq_service = GroqService()

        ai_service = AIExtractionService(
            groq_service.get_client()
        )

        intelligence = (
            ai_service.extract_case_intelligence(
                combined_text
            )
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate case intelligence: {str(e)}"
        )

    people = intelligence.get("people", [])

    if not people:
        return {
            "case_id": case_id,
            "created_count": 0,
            "people": []
        }

    # 5. Remove existing PERSON nodes for this case
    (
        supabase
        .table("graph_nodes")
        .delete()
        .eq("case_id", case_id)
        .eq("node_type", "PERSON")
        .execute()
    )

    # 6. Create PERSON nodes
    nodes = []

    for person in people:

        name = person.get("name")

        if not name:
            continue

        nodes.append({
            "case_id": case_id,
            "node_type": "PERSON",
            "label": name,
            "properties": {
                "name": name,
                "role": person.get("role", ""),
                "relationship_to_case": (
                    person.get(
                        "relationship_to_case",
                        ""
                    )
                )
            }
        })

    if not nodes:
        return {
            "case_id": case_id,
            "created_count": 0,
            "people": []
        }

    # 7. Insert nodes
    try:
        response = (
            supabase
            .table("graph_nodes")
            .insert(nodes)
            .execute()
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create person graph nodes: {str(e)}"
        )

    return {
        "case_id": case_id,
        "created_count": len(response.data or []),
        "people": response.data or []
    }

# ============================================================
# CREATE ORGANIZATION GRAPH NODES
# ============================================================

@router.post("/cases/{case_id}/graph/organizations")
def create_organization_graph_nodes(case_id: str):

    # ========================================================
    # 1. CHECK CASE EXISTS
    # ========================================================

    case_response = (
        supabase
        .table("cases")
        .select("case_id")
        .eq("case_id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    # ========================================================
    # 2. GET EVIDENCE FOR CASE
    # ========================================================

    evidence_response = (
        supabase
        .table("evidence")
        .select(
            "evidence_id, file_name, extracted_text"
        )
        .eq("case_id", case_id)
        .order("created_at", desc=True)
        .execute()
    )

    evidence_records = evidence_response.data or []

    # ========================================================
    # 3. KEEP ONLY USABLE EVIDENCE
    # ========================================================

    usable_evidence = [
        evidence
        for evidence in evidence_records
        if (
            evidence.get("extracted_text")
            and evidence.get("extracted_text").strip()
        )
    ]

    if not usable_evidence:
        raise HTTPException(
            status_code=422,
            detail=(
                "No usable extracted evidence found. "
                "Upload readable evidence first."
            )
        )

    # ========================================================
    # 4. COMBINE EVIDENCE
    # ========================================================

    evidence_sections = []

    for evidence in usable_evidence:
        evidence_sections.append(
            (
                f"--- EVIDENCE FILE: "
                f"{evidence.get('file_name', 'Unknown')} ---\n\n"
                f"{evidence.get('extracted_text', '').strip()}"
            )
        )

    combined_text = "\n\n".join(evidence_sections)

    # ========================================================
    # 5. INITIALIZE AI SERVICE
    # ========================================================

    try:
        groq_service = GroqService()

        ai_service = AIExtractionService(
            groq_service.get_client()
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to initialize AI service: "
                f"{str(e)}"
            )
        )

    # ========================================================
    # 6. EXTRACT CASE INTELLIGENCE
    # ========================================================

    try:
        intelligence = (
            ai_service.extract_case_intelligence(
                combined_text
            )
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to generate case intelligence: "
                f"{str(e)}"
            )
        )

    # ========================================================
    # 7. GET ORGANIZATIONS
    # ========================================================

    organizations = intelligence.get(
        "organizations",
        []
    )

    if not isinstance(organizations, list):
        organizations = []

    if not organizations:
        return {
            "case_id": case_id,
            "created_count": 0,
            "organizations": []
        }

    # ========================================================
    # 8. REMOVE EXISTING ORGANIZATION NODES
    # ========================================================

    try:
        (
            supabase
            .table("graph_nodes")
            .delete()
            .eq("case_id", case_id)
            .eq("node_type", "ORGANIZATION")
            .execute()
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to clear existing organization "
                f"graph nodes: {str(e)}"
            )
        )

    # ========================================================
    # 9. BUILD ORGANIZATION NODES
    # ========================================================

    nodes = []
    seen_organizations = set()

    for organization in organizations:

        if not isinstance(organization, dict):
            continue

        name = organization.get("name")

        if not name:
            continue

        name = str(name).strip()

        if not name:
            continue

        # Prevent duplicate organization nodes.
        normalized_name = name.casefold()

        if normalized_name in seen_organizations:
            continue

        seen_organizations.add(normalized_name)

        organization_type = organization.get(
            "type",
            ""
        )

        relationship_to_case = organization.get(
            "relationship_to_case",
            ""
        )

        nodes.append({
            "case_id": case_id,
            "node_type": "ORGANIZATION",
            "label": name,
            "properties": {
                "name": name,
                "type": (
                    str(organization_type).strip()
                    if organization_type
                    else ""
                ),
                "relationship_to_case": (
                    str(relationship_to_case).strip()
                    if relationship_to_case
                    else ""
                )
            }
        })

    # ========================================================
    # 10. NO VALID ORGANIZATIONS
    # ========================================================

    if not nodes:
        return {
            "case_id": case_id,
            "created_count": 0,
            "organizations": []
        }

    # ========================================================
    # 11. INSERT ORGANIZATION NODES
    # ========================================================

    try:
        response = (
            supabase
            .table("graph_nodes")
            .insert(nodes)
            .execute()
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to create organization "
                f"graph nodes: {str(e)}"
            )
        )

    # ========================================================
    # 12. RETURN RESULT
    # ========================================================

    created_nodes = response.data or []

    return {
        "case_id": case_id,
        "created_count": len(created_nodes),
        "organizations": created_nodes
    }
# ============================================================
# CREATE EVENT GRAPH NODES
# ============================================================

@router.post("/cases/{case_id}/graph/events")
def create_event_graph_nodes(case_id: str):

    # 1. Get evidence
    evidence_response = (
        supabase
        .table("evidence")
        .select("file_name, extracted_text")
        .eq("case_id", case_id)
        .execute()
    )

    evidence = [
        item
        for item in (evidence_response.data or [])
        if item.get("extracted_text")
    ]

    if not evidence:
        raise HTTPException(
            status_code=422,
            detail="No usable evidence found."
        )

    # 2. Combine evidence
    combined_text = "\n\n".join(
        f"--- {item['file_name']} ---\n"
        f"{item['extracted_text']}"
        for item in evidence
    )

    # 3. Extract case intelligence
    try:
        ai_service = AIExtractionService(
            GroqService().get_client()
        )

        intelligence = (
            ai_service.extract_case_intelligence(
                combined_text
            )
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI extraction failed: {str(e)}"
        )

    events = intelligence.get("events", [])

    # 4. Remove existing EVENT nodes
    (
        supabase
        .table("graph_nodes")
        .delete()
        .eq("case_id", case_id)
        .eq("node_type", "EVENT")
        .execute()
    )

    # 5. Build event nodes
    nodes = []

    for event in events:

        if not isinstance(event, dict):
            continue

        description = str(
            event.get("description", "")
        ).strip()

        if not description:
            continue

        nodes.append({
            "case_id": case_id,
            "node_type": "EVENT",
            "label": description,
            "properties": {
                "description": description,
                "date": event.get("date", ""),
                "type": event.get("type", "")
            }
        })

    # 6. Insert nodes
    if nodes:
        result = (
            supabase
            .table("graph_nodes")
            .insert(nodes)
            .execute()
        )

        created = result.data or []

    else:
        created = []

    # 7. Return result
    return {
        "case_id": case_id,
        "created_count": len(created),
        "events": created
    }
# ============================================================
# CREATE CLAIM GRAPH NODES
# ============================================================

@router.post("/cases/{case_id}/graph/claims")
def create_claim_graph_nodes(case_id: str):

    # ========================================================
    # 1. GET EVIDENCE
    # ========================================================

    response = (
        supabase
        .table("evidence")
        .select(
            "file_name, extracted_text"
        )
        .eq("case_id", case_id)
        .execute()
    )

    evidence = [
        item
        for item in (response.data or [])
        if (
            item.get("extracted_text")
            and item.get("extracted_text").strip()
        )
    ]

    if not evidence:
        raise HTTPException(
            status_code=422,
            detail="No usable evidence found."
        )

    # ========================================================
    # 2. COMBINE EVIDENCE
    # ========================================================

    combined_text = "\n\n".join(
        (
            f"--- {item['file_name']} ---\n"
            f"{item['extracted_text']}"
        )
        for item in evidence
    )

    # ========================================================
    # 3. INITIALIZE AI SERVICE
    # ========================================================

    try:

        ai_service = AIExtractionService(
            GroqService().get_client()
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to initialize AI service: "
                f"{str(e)}"
            )
        )

    # ========================================================
    # 4. EXTRACT CASE INTELLIGENCE
    # ========================================================

    try:

        intelligence = (
            ai_service.extract_case_intelligence(
                combined_text
            )
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "AI extraction failed: "
                f"{str(e)}"
            )
        )

    # ========================================================
    # 5. GET CLAIMS
    # ========================================================

    claims = intelligence.get(
        "claims",
        []
    )

    if not isinstance(claims, list):
        claims = []

    # ========================================================
    # 6. REMOVE EXISTING CLAIM NODES
    # ========================================================

    try:

        (
            supabase
            .table("graph_nodes")
            .delete()
            .eq("case_id", case_id)
            .eq("node_type", "CLAIM")
            .execute()
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to remove existing claim nodes: "
                f"{str(e)}"
            )
        )

    # ========================================================
    # 7. BUILD CLAIM NODES
    # ========================================================

    nodes = []

    for claim in claims:

        if not isinstance(claim, dict):
            continue

        claim_text = str(
            claim.get("claim", "")
        ).strip()

        if not claim_text:
            continue

        claimant = str(
            claim.get("claimant", "")
        ).strip()

        claim_type = str(
            claim.get("claim_type", "")
        ).strip()

        description = str(
            claim.get("description", "")
        ).strip()

        nodes.append({
            "case_id": case_id,
            "node_type": "CLAIM",
            "label": claim_text,
            "properties": {
                "claim": claim_text,
                "claimant": claimant,
                "claim_type": claim_type,
                "description": description
            }
        })

    # ========================================================
    # 8. NO CLAIMS FOUND
    # ========================================================

    if not nodes:

        return {
            "case_id": case_id,
            "created_count": 0,
            "claims": []
        }

    # ========================================================
    # 9. INSERT CLAIM NODES
    # ========================================================

    try:

        result = (
            supabase
            .table("graph_nodes")
            .insert(nodes)
            .execute()
        )

        created = result.data or []

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to create claim graph nodes: "
                f"{str(e)}"
            )
        )

    # ========================================================
    # 10. RETURN RESULT
    # ========================================================

    return {
        "case_id": case_id,
        "created_count": len(created),
        "claims": created
    }
# ============================================================
# CREATE ISSUE GRAPH NODES
# ============================================================

@router.post("/cases/{case_id}/graph/issues")
def create_issue_graph_nodes(case_id: str):

    # ========================================================
    # 1. GET CASE
    # ========================================================

    case_response = (
        supabase
        .table("cases")
        .select(
            "case_id, title, description, domain"
        )
        .eq("case_id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail="Case not found."
        )

    case_data = case_response.data[0]

    # ========================================================
    # 2. GET EVIDENCE
    # ========================================================

    evidence_response = (
        supabase
        .table("evidence")
        .select(
            "file_name, extracted_text"
        )
        .eq("case_id", case_id)
        .execute()
    )

    evidence = [
        item
        for item in (evidence_response.data or [])
        if (
            item.get("extracted_text")
            and item.get("extracted_text").strip()
        )
    ]

    if not evidence:
        raise HTTPException(
            status_code=422,
            detail="No usable evidence found."
        )

    # ========================================================
    # 3. COMBINE CASE + EVIDENCE
    # ========================================================

    combined_text = (
        f"CASE TITLE: {case_data.get('title', '')}\n"
        f"CASE DESCRIPTION: {case_data.get('description', '')}\n"
        f"DOMAIN: {case_data.get('domain', '')}\n\n"
        +
        "\n\n".join(
            (
                f"--- {item['file_name']} ---\n"
                f"{item['extracted_text']}"
            )
            for item in evidence
        )
    )

    # ========================================================
    # 4. AI EXTRACTION
    # ========================================================

    try:

        ai_service = AIExtractionService(
            GroqService().get_client()
        )

        intelligence = (
            ai_service.extract_case_intelligence(
                combined_text
            )
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "AI extraction failed: "
                f"{str(e)}"
            )
        )

    # ========================================================
    # 5. EXTRACT POTENTIAL ISSUES
    # ========================================================

    issues = intelligence.get(
        "issues",
        []
    )

    if not isinstance(issues, list):
        issues = []

    # ========================================================
    # 6. REMOVE EXISTING ISSUE NODES
    # ========================================================

    (
        supabase
        .table("graph_nodes")
        .delete()
        .eq("case_id", case_id)
        .eq("node_type", "ISSUE")
        .execute()
    )

    # ========================================================
    # 7. BUILD ISSUE NODES
    # ========================================================

    nodes = []

    for issue in issues:

        if not isinstance(issue, dict):
            continue

        issue_text = str(
            issue.get("issue", "")
        ).strip()

        if not issue_text:
            continue

        nodes.append({
            "case_id": case_id,
            "node_type": "ISSUE",
            "label": issue_text,
            "properties": {
                "issue": issue_text,
                "issue_type": str(
                    issue.get(
                        "issue_type",
                        ""
                    )
                ).strip(),
                "description": str(
                    issue.get(
                        "description",
                        ""
                    )
                ).strip()
            }
        })

    # ========================================================
    # 8. NO ISSUES FOUND
    # ========================================================

    if not nodes:

        return {
            "case_id": case_id,
            "created_count": 0,
            "issues": []
        }

    # ========================================================
    # 9. INSERT ISSUE NODES
    # ========================================================

    try:

        result = (
            supabase
            .table("graph_nodes")
            .insert(nodes)
            .execute()
        )

        created = result.data or []

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to create issue graph nodes: "
                f"{str(e)}"
            )
        )

    # ========================================================
    # 10. RETURN RESULT
    # ========================================================

    return {
        "case_id": case_id,
        "created_count": len(created),
        "issues": created
    }
# ============================================================
# CREATE DOCUMENT GRAPH NODES
# ============================================================

@router.post("/cases/{case_id}/graph/documents")
def create_document_graph_nodes(case_id: str):

    # ========================================================
    # 1. CHECK CASE EXISTS
    # ========================================================

    case_response = (
        supabase
        .table("cases")
        .select("case_id")
        .eq("case_id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    # ========================================================
    # 2. GET EVIDENCE DOCUMENTS
    # ========================================================

    evidence_response = (
        supabase
        .table("evidence")
        .select(
            """
            evidence_id,
            file_name,
            file_type,
            extraction_status,
            extracted_text,
            created_at
            """
        )
        .eq("case_id", case_id)
        .order("created_at", desc=True)
        .execute()
    )

    evidence_records = evidence_response.data or []

    if not evidence_records:
        raise HTTPException(
            status_code=422,
            detail="No evidence documents found."
        )

    # ========================================================
    # 3. REMOVE EXISTING DOCUMENT NODES
    # ========================================================

    try:

        (
            supabase
            .table("graph_nodes")
            .delete()
            .eq("case_id", case_id)
            .eq("node_type", "DOCUMENT")
            .execute()
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to remove existing document nodes: "
                f"{str(e)}"
            )
        )

    # ========================================================
    # 4. BUILD DOCUMENT NODES
    # ========================================================

    nodes = []

    for evidence in evidence_records:

        evidence_id = evidence.get(
            "evidence_id"
        )

        file_name = str(
            evidence.get(
                "file_name",
                "Unknown Document"
            )
        ).strip()

        if not evidence_id or not file_name:
            continue

        nodes.append({
            "case_id": case_id,
            "node_type": "DOCUMENT",
            "label": file_name,
            "source_evidence_id": evidence_id,
            "properties": {
                "file_name": file_name,
                "file_type": evidence.get(
                    "file_type",
                    ""
                ),
                "extraction_status": evidence.get(
                    "extraction_status",
                    ""
                ),
                "has_extracted_text": bool(
                    evidence.get(
                        "extracted_text"
                    )
                ),
                "created_at": evidence.get(
                    "created_at",
                    ""
                )
            }
        })

    # ========================================================
    # 5. NO DOCUMENTS FOUND
    # ========================================================

    if not nodes:

        return {
            "case_id": case_id,
            "created_count": 0,
            "documents": []
        }

    # ========================================================
    # 6. INSERT DOCUMENT NODES
    # ========================================================

    try:

        result = (
            supabase
            .table("graph_nodes")
            .insert(nodes)
            .execute()
        )

        created = result.data or []

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to create document graph nodes: "
                f"{str(e)}"
            )
        )

    # ========================================================
    # 7. RETURN RESULT
    # ========================================================

    return {
        "case_id": case_id,
        "created_count": len(created),
        "documents": created
    }
# ============================================================
# CREATE EVIDENCE RELATIONSHIPS
# ============================================================

@router.post("/cases/{case_id}/graph/relationships")
def create_evidence_relationships(case_id: str):

    # ========================================================
    # 1. GET CASE
    # ========================================================

    case_response = (
        supabase
        .table("cases")
        .select(
            """
            case_id,
            title,
            description,
            domain
            """
        )
        .eq("case_id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    case_data = case_response.data[0]

    # ========================================================
    # 2. GET ALL GRAPH NODES
    # ========================================================

    nodes_response = (
        supabase
        .table("graph_nodes")
        .select(
            """
            node_id,
            case_id,
            node_type,
            label,
            properties,
            source_evidence_id
            """
        )
        .eq("case_id", case_id)
        .execute()
    )

    nodes = nodes_response.data or []

    # ========================================================
    # 3. FIND EXISTING CASE NODE
    # ========================================================

    case_nodes = [
        node
        for node in nodes
        if node.get("node_type") == "CASE"
    ]

    # ========================================================
    # 4. CREATE CASE NODE IF MISSING
    # ========================================================

    if not case_nodes:

        try:

            case_node_response = (
                supabase
                .table("graph_nodes")
                .insert({
                    "case_id": case_id,
                    "node_type": "CASE",
                    "label": case_data.get(
                        "title",
                        "NYAYAOS Case"
                    ),
                    "properties": {
                        "title": case_data.get(
                            "title",
                            ""
                        ),
                        "description": case_data.get(
                            "description",
                            ""
                        ),
                        "domain": case_data.get(
                            "domain",
                            ""
                        )
                    }
                })
                .execute()
            )

            case_nodes = case_node_response.data or []

        except Exception as e:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Failed to create CASE graph node: "
                    f"{str(e)}"
                )
            )

    if not case_nodes:

        raise HTTPException(
            status_code=500,
            detail="Unable to create CASE graph node."
        )

    case_node = case_nodes[0]

    # ========================================================
    # 5. REFRESH GRAPH NODES
    # ========================================================

    nodes_response = (
        supabase
        .table("graph_nodes")
        .select(
            """
            node_id,
            case_id,
            node_type,
            label,
            properties,
            source_evidence_id
            """
        )
        .eq("case_id", case_id)
        .execute()
    )

    nodes = nodes_response.data or []

    # ========================================================
    # 6. INDEX NODES BY TYPE
    # ========================================================

    nodes_by_type = {}

    for node in nodes:

        node_type = node.get("node_type")

        if node_type not in nodes_by_type:
            nodes_by_type[node_type] = []

        nodes_by_type[node_type].append(node)

    # ========================================================
    # 7. REMOVE EXISTING RELATIONSHIPS
    # ========================================================

    try:

        (
            supabase
            .table("graph_edges")
            .delete()
            .eq("case_id", case_id)
            .execute()
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to remove existing graph "
                "relationships: "
                f"{str(e)}"
            )
        )

    # ========================================================
    # 8. CASE → NODE RELATIONSHIPS
    # ========================================================

    relationship_map = {
        "PERSON": "HAS_PERSON",
        "ORGANIZATION": "HAS_ORGANIZATION",
        "DATE": "HAS_DATE",
        "AMOUNT": "HAS_AMOUNT",
        "LOCATION": "HAS_LOCATION",
        "EVENT": "HAS_EVENT",
        "CLAIM": "HAS_CLAIM",
        "ISSUE": "HAS_ISSUE",
        "DOCUMENT": "HAS_DOCUMENT",
        "EVIDENCE": "HAS_DOCUMENT",
    }

    edges = []

    for node_type, relationship_type in (
        relationship_map.items()
    ):

        for node in nodes_by_type.get(
            node_type,
            []
        ):

            # Prevent self relationship
            if node["node_id"] == case_node["node_id"]:
                continue

            edges.append({
                "case_id": case_id,
                "source_node_id": case_node["node_id"],
                "target_node_id": node["node_id"],
                "relationship_type": relationship_type,
                "confidence": 1.0,
                "properties": {
                    "generated_by": "NYAYAOS_GRAPH_ENGINE"
                }
            })

    # ========================================================
    # 9. DOCUMENT → EVIDENCE RELATIONSHIPS
    # ========================================================

    document_nodes = nodes_by_type.get(
        "DOCUMENT",
        []
    )

    evidence_nodes = nodes_by_type.get(
        "EVIDENCE",
        []
    )

    for document in document_nodes:

        source_evidence_id = document.get(
            "source_evidence_id"
        )

        if not source_evidence_id:
            continue

        for evidence_node in evidence_nodes:

            if (
                evidence_node.get("node_id")
                == source_evidence_id
            ):

                edges.append({
                    "case_id": case_id,
                    "source_node_id": document["node_id"],
                    "target_node_id": evidence_node["node_id"],
                    "relationship_type": "RELATES_TO",
                    "confidence": 1.0,
                    "properties": {
                        "generated_by":
                            "NYAYAOS_GRAPH_ENGINE"
                    }
                })

    # ========================================================
    # 10. REMOVE DUPLICATE EDGES
    # ========================================================

    unique_edges = []

    seen = set()

    for edge in edges:

        edge_key = (
            edge["source_node_id"],
            edge["target_node_id"],
            edge["relationship_type"]
        )

        if edge_key in seen:
            continue

        seen.add(edge_key)

        unique_edges.append(edge)

    # ========================================================
    # 11. NO RELATIONSHIPS
    # ========================================================

    if not unique_edges:

        return {
            "case_id": case_id,
            "created_count": 0,
            "relationships": []
        }

    # ========================================================
    # 12. INSERT RELATIONSHIPS
    # ========================================================

    try:

        result = (
            supabase
            .table("graph_edges")
            .insert(unique_edges)
            .execute()
        )

        created = result.data or []

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to create graph relationships: "
                f"{str(e)}"
            )
        )

    # ========================================================
    # 13. RETURN RESULT
    # ========================================================

    return {
        "case_id": case_id,
        "case_node_id": case_node["node_id"],
        "created_count": len(created),
        "relationships": created
    }
# ============================================================
# MAP CLAIMS TO SUPPORTING DOCUMENTS
# ============================================================

@router.post("/cases/{case_id}/graph/claim-evidence")
def map_claims_to_evidence(case_id: str):

    # ========================================================
    # 1. CHECK CASE EXISTS
    # ========================================================

    case_response = (
        supabase
        .table("cases")
        .select("case_id")
        .eq("case_id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    # ========================================================
    # 2. GET CLAIM NODES
    # ========================================================

    claims_response = (
        supabase
        .table("graph_nodes")
        .select(
            """
            node_id,
            case_id,
            node_type,
            label,
            properties
            """
        )
        .eq("case_id", case_id)
        .eq("node_type", "CLAIM")
        .execute()
    )

    claims = claims_response.data or []

    if not claims:
        raise HTTPException(
            status_code=422,
            detail="No CLAIM nodes found for this case."
        )

    # ========================================================
    # 3. GET DOCUMENT NODES
    # ========================================================

    documents_response = (
        supabase
        .table("graph_nodes")
        .select(
            """
            node_id,
            case_id,
            node_type,
            label,
            properties,
            source_evidence_id
            """
        )
        .eq("case_id", case_id)
        .eq("node_type", "DOCUMENT")
        .execute()
    )

    documents = documents_response.data or []

    if not documents:
        raise HTTPException(
            status_code=422,
            detail="No DOCUMENT nodes found for this case."
        )

    # ========================================================
    # 4. GET EVIDENCE RECORDS
    # ========================================================

    evidence_response = (
        supabase
        .table("evidence")
        .select(
            """
            evidence_id,
            file_name,
            extracted_text
            """
        )
        .eq("case_id", case_id)
        .execute()
    )

    evidence_records = evidence_response.data or []

    if not evidence_records:
        raise HTTPException(
            status_code=422,
            detail="No evidence records found for this case."
        )

    # ========================================================
    # 5. INDEX EVIDENCE BY ID
    # ========================================================

    evidence_by_id = {}

    for evidence in evidence_records:

        evidence_id = evidence.get(
            "evidence_id"
        )

        if evidence_id:
            evidence_by_id[evidence_id] = evidence

    # ========================================================
    # 6. REMOVE EXISTING CLAIM → EVIDENCE SUPPORT EDGES
    # ========================================================

    try:

        (
            supabase
            .table("graph_edges")
            .delete()
            .eq("case_id", case_id)
            .eq("relationship_type", "SUPPORTS")
            .execute()
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to remove existing SUPPORTS "
                f"relationships: {str(e)}"
            )
        )

    # ========================================================
    # 7. BUILD CLAIM → DOCUMENT RELATIONSHIPS
    # ========================================================

    edges = []

    for claim in claims:

        claim_node_id = claim.get(
            "node_id"
        )

        claim_text = str(
            claim.get(
                "label",
                ""
            )
        ).strip()

        properties = claim.get(
            "properties",
            {}
        ) or {}

        claimant = str(
            properties.get(
                "claimant",
                ""
            )
        ).strip()

        description = str(
            properties.get(
                "description",
                ""
            )
        ).strip()

        if not claim_node_id or not claim_text:
            continue

        # ====================================================
        # CREATE SEARCH TERMS
        # ====================================================

        claim_content = (
            f"{claim_text} "
            f"{claimant} "
            f"{description}"
        ).lower()

        # Remove punctuation
        normalized_claim = "".join(
            char if char.isalnum() or char.isspace()
            else " "
            for char in claim_content
        )

        claim_words = {
            word
            for word in normalized_claim.split()
            if len(word) >= 4
        }

        if not claim_words:
            continue

        # ====================================================
        # COMPARE AGAINST DOCUMENT EVIDENCE
        # ====================================================

        for document in documents:

            document_node_id = document.get(
                "node_id"
            )

            evidence_id = document.get(
                "source_evidence_id"
            )

            if not document_node_id or not evidence_id:
                continue

            evidence = evidence_by_id.get(
                evidence_id
            )

            if not evidence:
                continue

            extracted_text = str(
                evidence.get(
                    "extracted_text",
                    ""
                )
            ).strip()

            if not extracted_text:
                continue

            normalized_evidence = "".join(
                char if char.isalnum() or char.isspace()
                else " "
                for char in extracted_text.lower()
            )

            evidence_words = set(
                word
                for word in normalized_evidence.split()
                if len(word) >= 4
            )

            if not evidence_words:
                continue

            # =================================================
            # CALCULATE FACTUAL TERM OVERLAP
            # =================================================

            matched_words = (
                claim_words
                & evidence_words
            )

            overlap_ratio = (
                len(matched_words)
                / len(claim_words)
            )

            # =================================================
            # SUPPORT THRESHOLD
            # =================================================

            if overlap_ratio < 0.30:
                continue

            confidence = min(
                1.0,
                round(
                    0.50 + (
                        overlap_ratio * 0.50
                    ),
                    4
                )
            )

            edges.append({
                "case_id": case_id,
                "source_node_id": document_node_id,
                "target_node_id": claim_node_id,
                "relationship_type": "SUPPORTS",
                "source_evidence_id": evidence_id,
                "confidence": confidence,
                "properties": {
                    "mapping_method": (
                        "factual_term_overlap"
                    ),
                    "overlap_ratio": round(
                        overlap_ratio,
                        4
                    ),
                    "matched_terms": sorted(
                        list(matched_words)
                    )
                }
            })

    # ========================================================
    # 8. REMOVE DUPLICATES
    # ========================================================

    unique_edges = []

    seen = set()

    for edge in edges:

        edge_key = (
            edge["source_node_id"],
            edge["target_node_id"],
            edge["relationship_type"]
        )

        if edge_key in seen:
            continue

        seen.add(edge_key)
        unique_edges.append(edge)

    # ========================================================
    # 9. NO SUPPORTING RELATIONSHIPS
    # ========================================================

    if not unique_edges:

        return {
            "case_id": case_id,
            "created_count": 0,
            "relationships": []
        }

    # ========================================================
    # 10. INSERT SUPPORT RELATIONSHIPS
    # ========================================================

    try:

        result = (
            supabase
            .table("graph_edges")
            .insert(unique_edges)
            .execute()
        )

        created = result.data or []

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to create claim-evidence "
                f"relationships: {str(e)}"
            )
        )

    # ========================================================
    # 11. RETURN RESULT
    # ========================================================

    return {
        "case_id": case_id,
        "created_count": len(created),
        "relationships": created
    }
# ============================================================
# CLASSIFY SUPPORTED EVIDENCE
# ============================================================

@router.post("/cases/{case_id}/graph/supported-evidence")
def classify_supported_evidence(case_id: str):

    # ========================================================
    # 1. CHECK CASE EXISTS
    # ========================================================

    case_response = (
        supabase
        .table("cases")
        .select("case_id")
        .eq("case_id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    # ========================================================
    # 2. GET SUPPORT RELATIONSHIPS
    # ========================================================

    edges_response = (
        supabase
        .table("graph_edges")
        .select(
            """
            edge_id,
            case_id,
            source_node_id,
            target_node_id,
            relationship_type,
            source_evidence_id,
            confidence,
            properties
            """
        )
        .eq("case_id", case_id)
        .eq("relationship_type", "SUPPORTS")
        .execute()
    )

    support_edges = edges_response.data or []

    # ========================================================
    # 3. NO SUPPORTING EVIDENCE
    # ========================================================

    if not support_edges:

        return {
            "case_id": case_id,
            "supported_count": 0,
            "supported_evidence": []
        }

    # ========================================================
    # 4. UPDATE SUPPORT EDGES
    # ========================================================

    supported = []

    for edge in support_edges:

        confidence = edge.get(
            "confidence"
        )

        if confidence is None:
            confidence = 0.0

        confidence = float(
            confidence
        )

        # ====================================================
        # SUPPORTED THRESHOLD
        # ====================================================

        if confidence < 0.70:
            continue

        properties = edge.get(
            "properties",
            {}
        ) or {}

        properties["evidence_status"] = (
            "SUPPORTED"
        )

        properties["classification_method"] = (
            "confidence_threshold"
        )

        properties["classification_threshold"] = 0.70

        try:

            update_response = (
                supabase
                .table("graph_edges")
                .update({
                    "properties": properties
                })
                .eq(
                    "edge_id",
                    edge["edge_id"]
                )
                .execute()
            )

            updated = (
                update_response.data or []
            )

            if updated:
                supported.extend(
                    updated
                )

        except Exception as e:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Failed to classify supported "
                    f"evidence: {str(e)}"
                )
            )

    # ========================================================
    # 5. RETURN RESULT
    # ========================================================

    return {
        "case_id": case_id,
        "supported_count": len(supported),
        "supported_evidence": supported
    }
# ============================================================
# CLASSIFY PARTIAL EVIDENCE
# ============================================================

@router.post("/cases/{case_id}/graph/partial-evidence")
def classify_partial_evidence(case_id: str):

    # ========================================================
    # 1. CHECK CASE EXISTS
    # ========================================================

    case_response = (
        supabase
        .table("cases")
        .select("case_id")
        .eq("case_id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    # ========================================================
    # 2. GET SUPPORT RELATIONSHIPS
    # ========================================================

    edges_response = (
        supabase
        .table("graph_edges")
        .select(
            """
            edge_id,
            case_id,
            source_node_id,
            target_node_id,
            relationship_type,
            source_evidence_id,
            confidence,
            properties
            """
        )
        .eq("case_id", case_id)
        .eq("relationship_type", "SUPPORTS")
        .execute()
    )

    support_edges = edges_response.data or []

    # ========================================================
    # 3. CLASSIFY PARTIAL EVIDENCE
    # ========================================================

    partial = []

    for edge in support_edges:

        confidence = edge.get(
            "confidence"
        )

        if confidence is None:
            confidence = 0.0

        confidence = float(
            confidence
        )

        # ====================================================
        # PARTIAL RANGE
        # ====================================================

        if confidence < 0.40 or confidence >= 0.70:
            continue

        properties = edge.get(
            "properties",
            {}
        ) or {}

        properties["evidence_status"] = (
            "PARTIAL"
        )

        properties["classification_method"] = (
            "confidence_threshold"
        )

        properties["partial_lower_threshold"] = 0.40
        properties["supported_lower_threshold"] = 0.70

        try:

            update_response = (
                supabase
                .table("graph_edges")
                .update({
                    "properties": properties
                })
                .eq(
                    "edge_id",
                    edge["edge_id"]
                )
                .execute()
            )

            updated = (
                update_response.data or []
            )

            if updated:
                partial.extend(
                    updated
                )

        except Exception as e:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Failed to classify partial "
                    f"evidence: {str(e)}"
                )
            )

    # ========================================================
    # 4. RETURN RESULT
    # ========================================================

    return {
        "case_id": case_id,
        "partial_count": len(partial),
        "partial_evidence": partial
    }
# ============================================================
# CLASSIFY MISSING EVIDENCE
# ============================================================

@router.post("/cases/{case_id}/graph/missing-evidence")
def classify_missing_evidence(case_id: str):

    # ========================================================
    # 1. CHECK CASE EXISTS
    # ========================================================

    case_response = (
        supabase
        .table("cases")
        .select("case_id")
        .eq("case_id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    # ========================================================
    # 2. GET ALL CLAIM NODES
    # ========================================================

    claims_response = (
        supabase
        .table("graph_nodes")
        .select(
            """
            node_id,
            case_id,
            node_type,
            label,
            properties,
            source_evidence_id
            """
        )
        .eq("case_id", case_id)
        .eq("node_type", "CLAIM")
        .execute()
    )

    claims = claims_response.data or []

    # ========================================================
    # 3. GET ALL CLAIM → EVIDENCE SUPPORT RELATIONSHIPS
    # ========================================================

    edges_response = (
        supabase
        .table("graph_edges")
        .select(
            """
            edge_id,
            source_node_id,
            target_node_id,
            relationship_type,
            confidence,
            properties
            """
        )
        .eq("case_id", case_id)
        .eq("relationship_type", "SUPPORTS")
        .execute()
    )

    support_edges = edges_response.data or []

    # ========================================================
    # 4. FIND CLAIMS THAT HAVE NO SUPPORTING EVIDENCE
    # ========================================================

    supported_claim_ids = {
        edge.get("target_node_id")
        for edge in support_edges
        if edge.get("target_node_id")
    }

    missing = []

    for claim in claims:

        claim_id = claim.get("node_id")

        # Claim already has supporting evidence
        if claim_id in supported_claim_ids:
            continue

        properties = (
            claim.get("properties", {})
            or {}
        )

        properties["evidence_status"] = "MISSING"
        properties["classification_method"] = (
            "absence_of_support_relationship"
        )

        # ====================================================
        # UPDATE CLAIM NODE
        # ====================================================

        update_response = (
            supabase
            .table("graph_nodes")
            .update({
                "properties": properties
            })
            .eq(
                "node_id",
                claim_id
            )
            .execute()
        )

        updated = (
            update_response.data or []
        )

        if updated:
            missing.extend(updated)

    # ========================================================
    # 5. RETURN RESULT
    # ========================================================

    return {
        "case_id": case_id,
        "missing_count": len(missing),
        "missing_evidence_claims": missing
    }
# ============================================================
# CALCULATE EVIDENCE COVERAGE
# ============================================================

@router.post("/cases/{case_id}/graph/evidence-coverage")
def calculate_evidence_coverage(case_id: str):

    # ========================================================
    # 1. CHECK CASE EXISTS
    # ========================================================

    case_response = (
        supabase
        .table("cases")
        .select("case_id")
        .eq("case_id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    # ========================================================
    # 2. GET ALL CLAIM NODES
    # ========================================================

    claims_response = (
        supabase
        .table("graph_nodes")
        .select(
            "node_id, label, properties"
        )
        .eq("case_id", case_id)
        .eq("node_type", "CLAIM")
        .execute()
    )

    claims = claims_response.data or []

    total_claims = len(claims)

    # ========================================================
    # 3. GET SUPPORT RELATIONSHIPS
    # ========================================================

    edges_response = (
        supabase
        .table("graph_edges")
        .select(
            """
            edge_id,
            target_node_id,
            confidence,
            properties
            """
        )
        .eq("case_id", case_id)
        .eq("relationship_type", "SUPPORTS")
        .execute()
    )

    support_edges = edges_response.data or []

    # ========================================================
    # 4. CLASSIFY CLAIMS
    # ========================================================

    supported_claims = []
    partial_claims = []
    missing_claims = []

    for claim in claims:

        claim_id = claim["node_id"]

        claim_edges = [
            edge
            for edge in support_edges
            if edge.get("target_node_id") == claim_id
        ]

        # No evidence relationship
        if not claim_edges:
            missing_claims.append(claim)
            continue

        # Use strongest supporting relationship
        confidence_values = [
            float(edge.get("confidence") or 0)
            for edge in claim_edges
        ]

        max_confidence = max(
            confidence_values
        )

        if max_confidence >= 0.70:

            supported_claims.append({
                **claim,
                "evidence_confidence": max_confidence
            })

        elif max_confidence >= 0.40:

            partial_claims.append({
                **claim,
                "evidence_confidence": max_confidence
            })

        else:

            missing_claims.append({
                **claim,
                "evidence_confidence": max_confidence
            })

    # ========================================================
    # 5. CALCULATE COVERAGE
    # ========================================================

    supported_count = len(
        supported_claims
    )

    partial_count = len(
        partial_claims
    )

    missing_count = len(
        missing_claims
    )

    if total_claims == 0:

        coverage_percentage = 0.0

    else:

        # Full support = 100%
        # Partial support = 50%
        # Missing = 0%

        coverage_percentage = (
            (
                supported_count
                + (partial_count * 0.5)
            )
            / total_claims
        ) * 100

    # ========================================================
    # 6. RETURN COVERAGE
    # ========================================================

    return {
        "case_id": case_id,
        "total_claims": total_claims,
        "supported_count": supported_count,
        "partial_count": partial_count,
        "missing_count": missing_count,
        "coverage_percentage": round(
            coverage_percentage,
            2
        ),
        "coverage_method": {
            "supported_weight": 1.0,
            "partial_weight": 0.5,
            "missing_weight": 0.0
        },
        "supported_claims": supported_claims,
        "partial_claims": partial_claims,
        "missing_claims": missing_claims
    }
# ============================================================
# GET JUSTICE GRAPH
# ============================================================

@router.get("/cases/{case_id}/graph")
def get_justice_graph(case_id: str):

    # ========================================================
    # 1. CHECK CASE EXISTS
    # ========================================================

    case_response = (
        supabase
        .table("cases")
        .select(
            "case_id, title, description, "
            "jurisdiction_country, jurisdiction_state, "
            "domain, status"
        )
        .eq("case_id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    case = case_response.data[0]

    # ========================================================
    # 2. GET GRAPH NODES
    # ========================================================

    nodes_response = (
        supabase
        .table("graph_nodes")
        .select(
            """
            node_id,
            case_id,
            node_type,
            label,
            properties,
            source_evidence_id,
            created_at
            """
        )
        .eq("case_id", case_id)
        .order("created_at")
        .execute()
    )

    nodes = nodes_response.data or []

    # ========================================================
    # 3. GET GRAPH EDGES
    # ========================================================

    edges_response = (
        supabase
        .table("graph_edges")
        .select(
            """
            edge_id,
            case_id,
            source_node_id,
            target_node_id,
            relationship_type,
            source_evidence_id,
            confidence,
            properties,
            created_at
            """
        )
        .eq("case_id", case_id)
        .order("created_at")
        .execute()
    )

    edges = edges_response.data or []

    # ========================================================
    # 4. NODE COUNTS
    # ========================================================

    node_counts = {}

    for node in nodes:

        node_type = node.get(
            "node_type"
        )

        node_counts[node_type] = (
            node_counts.get(node_type, 0) + 1
        )

    # ========================================================
    # 5. EDGE COUNTS
    # ========================================================

    edge_counts = {}

    for edge in edges:

        relationship = edge.get(
            "relationship_type"
        )

        edge_counts[relationship] = (
            edge_counts.get(
                relationship,
                0
            ) + 1
        )

    # ========================================================
    # 6. RETURN GRAPH
    # ========================================================

    return {
        "case": case,
        "nodes": nodes,
        "edges": edges,
        "summary": {
            "node_count": len(nodes),
            "edge_count": len(edges),
            "node_counts": node_counts,
            "edge_counts": edge_counts
        }
    }


# ============================================================
# HUMAN HANDOFF
# ============================================================

@router.post("/cases/{case_id}/human-handoff")
def initiate_human_handoff(case_id: str):
    """
    Connect the Safety/Route layer to the existing HUMAN_REVIEW
    pathway.

    This endpoint:
    1. Verifies the case exists.
    2. Finds the latest HUMAN_REVIEW route.
    3. Activates the route.
    4. Ensures a corresponding action exists.
    5. Moves the action into IN_PROGRESS.
    6. Moves the case into HUMAN_REVIEW using the existing
       database state-machine trigger.
    7. Marks the active route step as IN_PROGRESS.
    8. Persists a handoff record in action metadata.
    """

    # --------------------------------------------------------
    # 1. GET CASE
    # --------------------------------------------------------

    case_response = (
        supabase
        .table("cases")
        .select(
            "case_id, title, description, "
            "jurisdiction_country, jurisdiction_state, "
            "domain, status, case_state"
        )
        .eq("case_id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    case = case_response.data[0]
    current_case_state = case.get("case_state") or "NEW"

    # --------------------------------------------------------
    # 2. FIND HUMAN REVIEW ROUTE
    # --------------------------------------------------------

    route_response = (
        supabase
        .table("justice_routes")
        .select(
            """
            route_id,
            case_id,
            route_type,
            route_status,
            title,
            description,
            jurisdiction,
            priority,
            current_step_number,
            total_steps,
            requires_human_review,
            metadata
            """
        )
        .eq("case_id", case_id)
        .eq("route_type", "HUMAN_REVIEW")
        .in_("route_status", ["READY", "ACTIVE"])
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not route_response.data:
        raise HTTPException(
            status_code=404,
            detail=(
                "No READY or ACTIVE HUMAN_REVIEW route exists "
                "for this case."
            )
        )

    route = route_response.data[0]
    route_id = route["route_id"]

    # --------------------------------------------------------
    # 3. GET HUMAN REVIEW ROUTE STEPS
    # --------------------------------------------------------

    steps_response = (
        supabase
        .table("justice_route_steps")
        .select(
            """
            step_id,
            route_id,
            step_number,
            step_type,
            title,
            description,
            action_text,
            destination_name,
            destination_type,
            destination_url,
            status,
            is_required,
            requires_human_review,
            completed_at,
            metadata
            """
        )
        .eq("route_id", route_id)
        .order("step_number")
        .execute()
    )

    steps = steps_response.data or []

    if not steps:
        raise HTTPException(
            status_code=422,
            detail="Human review route has no steps."
        )

    # --------------------------------------------------------
    # 4. FIND ACTIVE/READY ACTION
    # --------------------------------------------------------

    action_response = (
        supabase
        .table("actions")
        .select(
            """
            action_id,
            case_id,
            route_id,
            step_id,
            action_type,
            title,
            description,
            action_text,
            destination_name,
            destination_type,
            destination_url,
            status,
            priority,
            requires_human_review,
            generated_by,
            metadata,
            created_at,
            updated_at
            """
        )
        .eq("case_id", case_id)
        .eq("route_id", route_id)
        .in_("status", ["READY", "IN_PROGRESS"])
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    actions = action_response.data or []

    # --------------------------------------------------------
    # 5. GENERATE ACTION IF NEEDED
    # --------------------------------------------------------

    if not actions:

        try:
            generated_response = supabase.rpc(
                "generate_next_action",
                {
                    "p_case_id": case_id
                }
            ).execute()

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Failed to generate human-review action: "
                    f"{str(e)}"
                )
            )

        generated_data = generated_response.data

        if isinstance(generated_data, list):
            generated_action_id = (
                generated_data[0]
                if generated_data
                else None
            )
        else:
            generated_action_id = generated_data

        if not generated_action_id:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Unable to generate an action for the "
                    "human-review route."
                )
            )

        action_response = (
            supabase
            .table("actions")
            .select(
                """
                action_id,
                case_id,
                route_id,
                step_id,
                action_type,
                title,
                description,
                action_text,
                destination_name,
                destination_type,
                destination_url,
                status,
                priority,
                requires_human_review,
                generated_by,
                metadata,
                created_at,
                updated_at
                """
            )
            .eq("action_id", str(generated_action_id))
            .execute()
        )

        actions = action_response.data or []

    if not actions:
        raise HTTPException(
            status_code=500,
            detail="Human-review action could not be loaded."
        )

    action = actions[0]
    action_id = action["action_id"]

    # --------------------------------------------------------
    # 6. ACTIVATE HUMAN REVIEW ROUTE
    # --------------------------------------------------------

    route_metadata = route.get("metadata") or {}

    if not isinstance(route_metadata, dict):
        route_metadata = {}

    route_metadata.update({
        "human_handoff": True,
        "handoff_status": "ACTIVE",
        "handoff_initiated_by": "NYAYAOS",
    })

    try:
        route_update = (
            supabase
            .table("justice_routes")
            .update({
                "route_status": "ACTIVE",
                "requires_human_review": True,
                "metadata": route_metadata,
            })
            .eq("route_id", route_id)
            .execute()
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to activate human-review route: "
                f"{str(e)}"
            )
        )

    updated_route = (
        route_update.data[0]
        if route_update.data
        else route
    )

    # --------------------------------------------------------
    # 7. MOVE ACTION TO IN_PROGRESS
    # --------------------------------------------------------

    if action.get("status") == "READY":

        try:
            transition_response = supabase.rpc(
                "transition_action_status",
                {
                    "p_action_id": action_id,
                    "p_new_status": "IN_PROGRESS",
                    "p_reason": "Human handoff initiated",
                    "p_changed_by": "NYAYAOS",
                }
            ).execute()

            if transition_response.data:
                action_refresh = (
                    supabase
                    .table("actions")
                    .select(
                        """
                        action_id,
                        case_id,
                        route_id,
                        step_id,
                        action_type,
                        title,
                        description,
                        action_text,
                        destination_name,
                        destination_type,
                        destination_url,
                        status,
                        priority,
                        requires_human_review,
                        generated_by,
                        metadata,
                        created_at,
                        updated_at
                        """
                    )
                    .eq("action_id", action_id)
                    .execute()
                )

                if action_refresh.data:
                    action = action_refresh.data[0]

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Failed to transition human-review action "
                    f"to IN_PROGRESS: {str(e)}"
                )
            )

    # --------------------------------------------------------
    # 8. MARK THE ACTIVE HUMAN-REVIEW STEP
    # --------------------------------------------------------

    step_id = action.get("step_id")

    if not step_id:
        ready_steps = [
            step
            for step in steps
            if step.get("status") == "READY"
        ]

        if ready_steps:
            step_id = ready_steps[0]["step_id"]

    if step_id:

        try:
            step_update = (
                supabase
                .table("justice_route_steps")
                .update({
                    "status": "IN_PROGRESS",
                })
                .eq("step_id", step_id)
                .in_("status", ["READY", "PENDING"])
                .execute()
            )

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Failed to activate human-review step: "
                    f"{str(e)}"
                )
            )

    # --------------------------------------------------------
    # 9. MOVE CASE TO HUMAN_REVIEW
    # --------------------------------------------------------

    if current_case_state != "HUMAN_REVIEW":

        try:
            case_update = (
                supabase
                .table("cases")
                .update({
                    "case_state": "HUMAN_REVIEW",
                })
                .eq("case_id", case_id)
                .execute()
            )

        except Exception as e:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Human handoff could not move the case into "
                    "HUMAN_REVIEW. The existing case state machine "
                    f"rejected the transition: {str(e)}"
                )
            )

    # --------------------------------------------------------
    # 10. PERSIST HANDOFF METADATA ON ACTION
    # --------------------------------------------------------

    action_metadata = action.get("metadata") or {}

    if not isinstance(action_metadata, dict):
        action_metadata = {}

    action_metadata.update({
        "human_handoff": True,
        "handoff_status": "ACTIVE",
        "handoff_initiated_by": "NYAYAOS",
        "handoff_case_state": "HUMAN_REVIEW",
        "handoff_route_id": route_id,
        "handoff_step_id": step_id,
    })

    try:
        action_update = (
            supabase
            .table("actions")
            .update({
                "requires_human_review": True,
                "metadata": action_metadata,
            })
            .eq("action_id", action_id)
            .execute()
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to persist human-handoff metadata: "
                f"{str(e)}"
            )
        )

    updated_action = (
        action_update.data[0]
        if action_update.data
        else action
    )

    # --------------------------------------------------------
    # 11. RETURN HUMAN HANDOFF
    # --------------------------------------------------------

    return {
        "case_id": case_id,
        "case_state": "HUMAN_REVIEW",
        "handoff_status": "ACTIVE",
        "handoff_type": "HUMAN_REVIEW",
        "message": (
            "Case successfully handed off for human review."
        ),
        "route": updated_route,
        "action": updated_action,
        "step_id": step_id,
        "human_review_required": True,
    }


# ============================================================
# GET HUMAN HANDOFF STATUS
# ============================================================

@router.get("/cases/{case_id}/human-handoff")
def get_human_handoff(case_id: str):
    """
    Return the persisted human-handoff state for a case.
    """

    case_response = (
        supabase
        .table("cases")
        .select(
            "case_id, title, case_state"
        )
        .eq("case_id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    case = case_response.data[0]

    route_response = (
        supabase
        .table("justice_routes")
        .select(
            """
            route_id,
            case_id,
            route_type,
            route_status,
            title,
            description,
            jurisdiction,
            priority,
            current_step_number,
            total_steps,
            requires_human_review,
            metadata
            """
        )
        .eq("case_id", case_id)
        .eq("route_type", "HUMAN_REVIEW")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    route = (
        route_response.data[0]
        if route_response.data
        else None
    )

    action = None

    if route:
        action_response = (
            supabase
            .table("actions")
            .select(
                """
                action_id,
                case_id,
                route_id,
                step_id,
                action_type,
                title,
                description,
                action_text,
                destination_name,
                destination_type,
                destination_url,
                status,
                priority,
                requires_human_review,
                generated_by,
                metadata,
                created_at,
                updated_at
                """
            )
            .eq("case_id", case_id)
            .eq("route_id", route["route_id"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        if action_response.data:
            action = action_response.data[0]

    return {
        "case_id": case_id,
        "case_state": case.get("case_state"),
        "handoff_active": (
            case.get("case_state") == "HUMAN_REVIEW"
            and bool(route)
            and route.get("route_status") in ["READY", "ACTIVE"]
        ),
        "route": route,
        "action": action,
    }
# ============================================================
# CREATE EVIDENCE PACKET
# ============================================================

@router.post("/cases/{case_id}/evidence-packet")
def create_evidence_packet(case_id: str):
    """
    Generate and persist a traceable Evidence Packet
    for the specified case.
    """

    try:
        result = EvidencePacketService.create_packet(
            case_id=case_id
        )

        return {
            "case_id": case_id,
            "message": "Evidence Packet generated successfully.",
            **result,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc)
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate Evidence Packet: {exc}"
        )


# ============================================================
# GET EVIDENCE PACKET
# ============================================================

@router.get("/evidence-packets/{packet_id}")
def get_evidence_packet(packet_id: str):
    """
    Return a persisted Evidence Packet.
    """

    try:
        packet = EvidencePacketService.get_packet(
            packet_id=packet_id
        )

        return packet

    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc)
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve Evidence Packet: {exc}"
        )
# ============================================================
# GET CASE JOURNEY
# ============================================================

@router.get("/cases/{case_id}/journey")
def get_case_journey(case_id: str):
    """
    Return the complete persisted justice journey for a case.
    """

    case_response = (
        supabase
        .table("cases")
        .select(
            """
            case_id,
            title,
            description,
            jurisdiction_country,
            jurisdiction_state,
            case_state,
            created_at
            """
        )
        .eq("case_id", case_id)
        .execute()
    )

    if not case_response.data:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    case = case_response.data[0]

    state_response = (
        supabase
        .table("case_state_history")
        .select("*")
        .eq("case_id", case_id)
        .order("created_at")
        .execute()
    )

    state_history = state_response.data or []

    route_response = (
        supabase
        .table("justice_routes")
        .select("*")
        .eq("case_id", case_id)
        .order("created_at", desc=True)
        .execute()
    )

    routes = route_response.data or []

    route_ids = [
        route["route_id"]
        for route in routes
        if route.get("route_id")
    ]

    steps = []

    if route_ids:
        step_response = (
            supabase
            .table("justice_route_steps")
            .select("*")
            .in_("route_id", route_ids)
            .order("step_number")
            .execute()
        )

        steps = step_response.data or []

    action_response = (
        supabase
        .table("actions")
        .select("*")
        .eq("case_id", case_id)
        .order("created_at")
        .execute()
    )

    actions = action_response.data or []

    journey_routes = []

    for route in routes:
        route_steps = [
            step
            for step in steps
            if step.get("route_id") == route.get("route_id")
        ]

        route_actions = [
            action
            for action in actions
            if action.get("route_id") == route.get("route_id")
        ]

        journey_routes.append({
            **route,
            "steps": route_steps,
            "actions": route_actions
        })

    completed_steps = sum(
        1
        for step in steps
        if step.get("status") == "COMPLETED"
    )

    total_steps = len(steps)

    journey_progress = (
        round(
            (completed_steps / total_steps) * 100,
            2
        )
        if total_steps
        else 0.0
    )

    active_actions = [
        action
        for action in actions
        if action.get("status") in [
            "READY",
            "IN_PROGRESS"
        ]
    ]

    completed_actions = [
        action
        for action in actions
        if action.get("status") == "COMPLETED"
    ]

    human_review_required = (
        case.get("case_state") == "HUMAN_REVIEW"
        or any(
            route.get("requires_human_review")
            for route in routes
        )
        or any(
            action.get("requires_human_review")
            for action in actions
        )
    )

    return {
        "case": case,
        "current_state": case.get("case_state"),
        "state_history": state_history,
        "routes": journey_routes,
        "actions": actions,
        "journey_summary": {
            "total_routes": len(routes),
            "total_steps": total_steps,
            "completed_steps": completed_steps,
            "journey_progress_percentage": journey_progress,
            "total_actions": len(actions),
            "completed_actions": len(completed_actions),
            "active_actions": len(active_actions),
            "human_review_required": human_review_required
        },
        "human_review": {
            "required": human_review_required,
            "active": (
                case.get("case_state")
                == "HUMAN_REVIEW"
            )
        }
    }