import urllib.request
from typing import Dict, Any

from app.services.pdf_service import PDFService
from app.core.config import settings
from supabase import create_client


class LegalIngestionService:

    @staticmethod
    def get_supabase_client():
        return create_client(
            settings.supabase_url,
            settings.supabase_key
        )

    @staticmethod
    def get_source(source_id: str) -> Dict[str, Any]:
        """
        Retrieve a registered legal source from Supabase.
        """

        supabase = LegalIngestionService.get_supabase_client()

        response = (
            supabase
            .table("legal_sources")
            .select("*")
            .eq("source_id", source_id)
            .single()
            .execute()
        )

        if not response.data:
            raise ValueError(
                f"Legal source not found: {source_id}"
            )

        return response.data

    @staticmethod
    def download_document(source_url: str) -> bytes:
        """
        Download a legal document from its registered official source URL.
        """

        request = urllib.request.Request(
            source_url,
            headers={
                "User-Agent": "NYAYAOS-Legal-Ingestion/1.0"
            }
        )

        with urllib.request.urlopen(
            request,
            timeout=180
        ) as response:
            return response.read()

    @staticmethod
    def ingest_pdf(source_url: str) -> Dict[str, Any]:
        """
        Download and extract text from a legal PDF.

        Chunking, embeddings, and database insertion are handled
        by later Phase 5 components.
        """

        if not source_url:
            raise ValueError("source_url is required")

        file_data = LegalIngestionService.download_document(
            source_url
        )

        if not file_data:
            raise ValueError(
                "Downloaded document is empty"
            )

        extracted_text = PDFService.extract_text(
            file_data
        )

        if not extracted_text:
            raise ValueError(
                "No text could be extracted from the legal document"
            )

        return {
            "source_url": source_url,
            "file_size_bytes": len(file_data),
            "text_length": len(extracted_text),
            "page_text_available": True,
            "extracted_text": extracted_text
        }

    @staticmethod
    def ingest_source(source_id: str) -> Dict[str, Any]:
        """
        Retrieve a registered legal source from Supabase,
        download its official document, and extract its text.
        """

        source = LegalIngestionService.get_source(
            source_id
        )

        if not source.get("source_url"):
            raise ValueError(
                "Legal source does not have a source_url"
            )

        result = LegalIngestionService.ingest_pdf(
            source["source_url"]
        )

        return {
            "source_id": source["source_id"],
            "title": source["title"],
            "source_type": source["source_type"],
            "jurisdiction": source["jurisdiction"],
            "authority": source["authority"],
            "citation": source["citation"],
            **result
        }