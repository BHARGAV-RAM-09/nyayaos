from datetime import date
from typing import Dict, Any, Optional

from app.core.config import settings
from supabase import create_client


class LegalEffectiveDateVerificationService:

    @staticmethod
    def get_supabase_client():
        return create_client(
            settings.supabase_url,
            settings.supabase_key
        )

    @classmethod
    def get_source(
        cls,
        source_id: str
    ) -> Dict[str, Any]:

        if not source_id:
            raise ValueError("source_id is required")

        response = (
            cls.get_supabase_client()
            .table("legal_sources")
            .select(
                """
                source_id,
                title,
                version_date,
                status
                """
            )
            .eq("source_id", source_id)
            .execute()
        )

        if not response.data:
            raise ValueError(
                f"Legal source not found: {source_id}"
            )

        return response.data[0]

    @staticmethod
    def _parse_date(
        value: Any
    ) -> Optional[date]:

        if value is None:
            return None

        if isinstance(value, date):
            return value

        value = str(value).strip()

        if not value:
            return None

        try:
            return date.fromisoformat(value)
        except ValueError:
            return None

    @classmethod
    def verify_effective_date(
        cls,
        source_id: str,
        reference_date: Optional[str] = None
    ) -> Dict[str, Any]:

        try:
            source = cls.get_source(source_id)

        except ValueError as exc:
            return {
                "verified": False,
                "status": "FAILED",
                "reasons": [str(exc)]
            }

        version_date = cls._parse_date(
            source.get("version_date")
        )

        if version_date is None:
            return {
                "verified": False,
                "status": "UNKNOWN",
                "checks": {
                    "source_exists": True,
                    "version_date_present": False,
                    "reference_date_valid": (
                        reference_date is None
                        or cls._parse_date(
                            reference_date
                        ) is not None
                    ),
                    "temporal_check": False
                },
                "source_id": source_id,
                "version_date": None,
                "reference_date": reference_date,
                "reasons": [
                    "No version_date is available "
                    "for this legal source."
                ]
            }

        checks = {
            "source_exists": True,
            "version_date_present": True,
            "reference_date_valid": True,
            "temporal_check": True
        }

        if reference_date:

            parsed_reference_date = cls._parse_date(
                reference_date
            )

            if parsed_reference_date is None:

                checks["reference_date_valid"] = False
                checks["temporal_check"] = False

                return {
                    "verified": False,
                    "status": "FAILED",
                    "checks": checks,
                    "source_id": source_id,
                    "version_date": (
                        version_date.isoformat()
                    ),
                    "reference_date": reference_date,
                    "reasons": [
                        "Invalid reference date."
                    ]
                }

            if version_date > parsed_reference_date:

                checks["temporal_check"] = False

                return {
                    "verified": False,
                    "status": "FAILED",
                    "checks": checks,
                    "source_id": source_id,
                    "version_date": (
                        version_date.isoformat()
                    ),
                    "reference_date": (
                        parsed_reference_date.isoformat()
                    ),
                    "reasons": [
                        "Source version date is later "
                        "than the reference date."
                    ]
                }

        return {
            "verified": True,
            "status": "VERIFIED",
            "checks": checks,
            "source_id": source_id,
            "version_date": version_date.isoformat(),
            "reference_date": reference_date,
            "reasons": []
        }