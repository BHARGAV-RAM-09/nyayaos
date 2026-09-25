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