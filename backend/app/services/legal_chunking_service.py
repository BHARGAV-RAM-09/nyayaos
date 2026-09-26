import re
from typing import List, Dict, Any

from app.core.config import settings
from supabase import create_client


class LegalChunkingService:

    # Normal section headings:
    # 1. Short title...
    # 43. Penalty...
    # 66. Computer related offences...
    # 66D. Punishment...

    SECTION_PATTERN = re.compile(
        r"(?m)^[ \t]*(\d+[A-Z]?)\.\s+(.+?)\s*$"
    )

    # PDF sometimes represents amended section headings as:
    #
    # 6[66. Computer related offences...
    # 1[66A. Punishment...
    #
    # This removes only the editorial footnote marker.
    FOOTNOTE_SECTION_MARKER_PATTERN = re.compile(
        r"(?m)^([ \t]*)\d+\[(\d+[A-Z]?)\.\s+"
    )

    ACT_START_MARKER = "THE INFORMATION TECHNOLOGY ACT, 2000"

    @staticmethod
    def get_supabase_client():
        return create_client(
            settings.supabase_url,
            settings.supabase_key
        )

    @staticmethod
    def normalize_text(text: str) -> str:
        """
        Normalize PDF-extracted text while preserving
        line boundaries.
        """

        text = text.replace("\r\n", "\n")
        text = text.replace("\r", "\n")

        # Normalize horizontal whitespace.
        text = re.sub(r"[ \t]+", " ", text)

        # Remove excessive blank lines.
        text = re.sub(r"\n{3,}", "\n\n", text)

        return text.strip()

    @staticmethod
    def extract_act_body(text: str) -> str:
        """
        Remove the Table of Contents.

        The PDF contains the Act title multiple times.
        The final occurrence is the actual Act body.
        """

        text = LegalChunkingService.normalize_text(text)

        matches = list(
            re.finditer(
                re.escape(
                    LegalChunkingService.ACT_START_MARKER
                ),
                text
            )
        )

        if not matches:
            raise ValueError(
                "Could not locate the beginning of the Information Technology Act"
            )

        return text[matches[-1].start():]

    @staticmethod
    def normalize_section_markers(text: str) -> str:
        """
        Convert PDF section markers such as:

            6[66. Computer related offences...
            1[66A. Punishment...

        into:

            66. Computer related offences...
            66A. Punishment...

        This is necessary because the PDF extraction preserves
        amendment footnote markers immediately before some
        section numbers.
        """

        return re.sub(
            LegalChunkingService.FOOTNOTE_SECTION_MARKER_PATTERN,
            r"\1\2. ",
            text
        )

    @staticmethod
    def is_real_section_start(match: re.Match) -> bool:
        """
        Reject amendment footnotes and keep actual Act sections.
        """

        section_number = match.group(1).strip()
        heading = match.group(2).strip()

        if not heading:
            return False

        # These are common amendment/editorial footnote beginnings.
        rejected_prefixes = (
            "Subs. by",
            "Ins. by",
            "Omitted by",
            "The word",
            "Certain words",
            "Clause",
            "ibid.",
        )

        for prefix in rejected_prefixes:
            if heading.startswith(prefix):
                return False

        # Amendment footnote.
        if "w.e.f." in heading:
            return False

        # Validate numeric part.
        number_match = re.match(
            r"\d+",
            section_number
        )

        if not number_match:
            return False

        number = int(number_match.group())

        # IT Act sections run within this range.
        if number < 1 or number > 94:
            return False

        return True

    @staticmethod
    def chunk_by_sections(
        text: str,
        jurisdiction: str = "INDIA"
    ) -> List[Dict[str, Any]]:

        if not text or not text.strip():
            raise ValueError(
                "Legal document text is empty"
            )

        # Step 1:
        # Extract actual Act body.
        act_body = LegalChunkingService.extract_act_body(
            text
        )

        # Step 2:
        # Fix PDF-specific section markers such as 6[66.
        act_body = LegalChunkingService.normalize_section_markers(
            act_body
        )

        # Step 3:
        # Detect section headings.
        candidates = list(
            LegalChunkingService.SECTION_PATTERN.finditer(
                act_body
            )
        )

        # Step 4:
        # Remove amendment footnotes.
        matches = [
            match
            for match in candidates
            if LegalChunkingService.is_real_section_start(match)
        ]

        if not matches:
            raise ValueError(
                "No legal sections could be detected"
            )

        chunks = []

        # Step 5:
        # Create one chunk per legal section.
        for index, match in enumerate(matches):

            section_number = match.group(1).strip()
            section_heading = match.group(2).strip()

            content_start = match.start()

            if index + 1 < len(matches):
                content_end = matches[index + 1].start()
            else:
                content_end = len(act_body)

            section_content = act_body[
                content_start:content_end
            ].strip()

            if not section_content:
                continue

            chunks.append({
                "section_number": section_number,
                "section_title": section_heading,
                "content": section_content,
                "jurisdiction": jurisdiction,
                "legal_topic": None,
                "keywords": [],
                "metadata": {
                    "chunking_method": "act_section_boundary",
                    "source_format": "PDF"
                }
            })

        # Step 6:
        # Remove duplicate section numbers.
        unique_chunks = {}

        for chunk in chunks:

            section_number = chunk["section_number"]

            if section_number not in unique_chunks:
                unique_chunks[section_number] = chunk

        return list(unique_chunks.values())

    @staticmethod
    def save_chunks(
        source_id: str,
        chunks: List[Dict[str, Any]]
    ) -> int:

        if not source_id:
            raise ValueError(
                "source_id is required"
            )

        if not chunks:
            raise ValueError(
                "No legal chunks provided"
            )

        supabase = (
            LegalChunkingService
            .get_supabase_client()
        )

        # Replace existing chunks for this source.
        (
            supabase
            .table("legal_chunks")
            .delete()
            .eq("source_id", source_id)
            .execute()
        )

        rows = []

        for chunk in chunks:

            rows.append({
                "source_id": source_id,
                "section_number": chunk[
                    "section_number"
                ],
                "section_title": chunk[
                    "section_title"
                ],
                "content": chunk["content"],
                "jurisdiction": chunk[
                    "jurisdiction"
                ],
                "legal_topic": chunk.get(
                    "legal_topic"
                ),
                "keywords": chunk.get(
                    "keywords",
                    []
                ),
                "metadata": chunk.get(
                    "metadata",
                    {}
                )
            })

        (
            supabase
            .table("legal_chunks")
            .insert(rows)
            .execute()
        )

        return len(rows)