from typing import Any, Dict, List

from app.core.config import settings
from supabase import create_client


class EvidencePacketService:

    PACKET_TITLE = "NYAYAOS Evidence Packet"

    @staticmethod
    def get_supabase_client():
        return create_client(
            settings.supabase_url,
            settings.supabase_key
        )

    @staticmethod
    def _require_case(
        supabase,
        case_id: str
    ) -> Dict[str, Any]:

        response = (
            supabase
            .table("cases")
            .select("*")
            .eq("case_id", case_id)
            .execute()
        )

        if not response.data:
            raise ValueError(
                f"Case not found: {case_id}"
            )

        return response.data[0]

    @staticmethod
    def _get_evidence(
        supabase,
        case_id: str
    ) -> List[Dict[str, Any]]:

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

        return response.data or []

    @staticmethod
    def _get_graph_nodes(
        supabase,
        case_id: str
    ) -> List[Dict[str, Any]]:

        response = (
            supabase
            .table("graph_nodes")
            .select("*")
            .eq("case_id", case_id)
            .order("created_at")
            .execute()
        )

        return response.data or []

    @staticmethod
    def _get_graph_edges(
        supabase,
        case_id: str
    ) -> List[Dict[str, Any]]:

        response = (
            supabase
            .table("graph_edges")
            .select("*")
            .eq("case_id", case_id)
            .order("created_at")
            .execute()
        )

        return response.data or []

    @staticmethod
    def _get_latest_routes(
        supabase,
        case_id: str
    ) -> List[Dict[str, Any]]:

        response = (
            supabase
            .table("justice_routes")
            .select("*")
            .eq("case_id", case_id)
            .order("created_at", desc=True)
            .execute()
        )

        return response.data or []

    @staticmethod
    def _get_route_steps(
        supabase,
        route_ids: List[str]
    ) -> List[Dict[str, Any]]:

        if not route_ids:
            return []

        response = (
            supabase
            .table("justice_route_steps")
            .select("*")
            .in_("route_id", route_ids)
            .order("step_number")
            .execute()
        )

        return response.data or []

    @staticmethod
    def _get_actions(
        supabase,
        case_id: str
    ) -> List[Dict[str, Any]]:

        response = (
            supabase
            .table("actions")
            .select("*")
            .eq("case_id", case_id)
            .order("created_at", desc=True)
            .execute()
        )

        return response.data or []

    @staticmethod
    def _get_state_history(
        supabase,
        case_id: str
    ) -> List[Dict[str, Any]]:

        response = (
            supabase
            .table("case_state_history")
            .select("*")
            .eq("case_id", case_id)
            .order("created_at")
            .execute()
        )

        return response.data or []

    @staticmethod
    def _get_claim_coverage(
        graph_nodes: List[Dict[str, Any]]
    ) -> Dict[str, Any]:

        claims = [
            node
            for node in graph_nodes
            if node.get("node_type") == "CLAIM"
        ]

        supported = 0
        partial = 0
        missing = 0

        for claim in claims:

            properties = claim.get("properties") or {}

            status = str(
                properties.get("evidence_status")
                or properties.get("status")
                or ""
            ).upper()

            if status == "SUPPORTED":
                supported += 1

            elif status == "PARTIAL":
                partial += 1

            elif status == "MISSING":
                missing += 1

        total = len(claims)

        if total == 0:

            coverage = 0.0

        else:

            weighted_score = (
                supported
                + (partial * 0.5)
            )

            coverage = (
                weighted_score / total
            ) * 100

        return {
            "total_claims": total,
            "supported_claims": supported,
            "partial_claims": partial,
            "missing_claims": missing,
            "coverage_percentage": round(
                coverage,
                2
            )
        }

    @classmethod
    def build_packet(
        cls,
        case_id: str
    ) -> Dict[str, Any]:

        if not case_id:
            raise ValueError(
                "case_id is required"
            )

        supabase = cls.get_supabase_client()

        case = cls._require_case(
            supabase,
            case_id
        )

        evidence = cls._get_evidence(
            supabase,
            case_id
        )

        graph_nodes = cls._get_graph_nodes(
            supabase,
            case_id
        )

        graph_edges = cls._get_graph_edges(
            supabase,
            case_id
        )

        routes = cls._get_latest_routes(
            supabase,
            case_id
        )

        route_ids = [
            route["route_id"]
            for route in routes
            if route.get("route_id")
        ]

        route_steps = cls._get_route_steps(
            supabase,
            route_ids
        )

        actions = cls._get_actions(
            supabase,
            case_id
        )

        state_history = cls._get_state_history(
            supabase,
            case_id
        )

        coverage = cls._get_claim_coverage(
            graph_nodes
        )

        human_review_required = (
            case.get("case_state") == "HUMAN_REVIEW"
            or any(
                bool(route.get("requires_human_review"))
                for route in routes
            )
            or any(
                bool(action.get("requires_human_review"))
                for action in actions
            )
        )

        limitations = []

        if not evidence:
            limitations.append(
                "No evidence records are available."
            )

        if not graph_nodes:
            limitations.append(
                "Justice Graph nodes are not available."
            )

        if not graph_edges:
            limitations.append(
                "Justice Graph relationships are not available."
            )

        if coverage["coverage_percentage"] < 100:
            limitations.append(
                "Not all claims have fully supported evidence."
            )

        if human_review_required:
            limitations.append(
                "Qualified human review is required before "
                "the case can safely continue."
            )

        packet = {
            "case": case,

            "case_facts": {
                "title": case.get("title"),
                "description": case.get("description"),
                "jurisdiction_country": case.get(
                    "jurisdiction_country"
                ),
                "jurisdiction_state": case.get(
                    "jurisdiction_state"
                ),
                "case_state": case.get(
                    "case_state"
                )
            },

            "evidence": evidence,

            "justice_graph": {
                "nodes": graph_nodes,
                "edges": graph_edges
            },

            "evidence_coverage": coverage,

            "justice_routes": [
                {
                    **route,
                    "steps": [
                        step
                        for step in route_steps
                        if step.get("route_id")
                        == route.get("route_id")
                    ]
                }
                for route in routes
            ],

            "actions": actions,

            "case_state_history": state_history,

            "human_review": {
                "required": human_review_required,
                "case_state": case.get(
                    "case_state"
                )
            },

            "legal_sources": [],

            "citations": [],

            "limitations": limitations,

            "generated_by": "NYAYAOS"
        }

        return packet

    @classmethod
    def _build_storage_payload(
        cls,
        packet: Dict[str, Any],
        case_id: str
    ) -> Dict[str, Any]:

        coverage = packet[
            "evidence_coverage"
        ]

        return {
            "case_id": case_id,

            "packet_status": "DRAFT",

            # Existing database schema requires this.
            "packet_title": cls.PACKET_TITLE,

            "title": cls.PACKET_TITLE,

            "summary": (
                "Traceable evidence packet generated "
                "from the current NYAYAOS case state."
            ),

            "case_facts": packet[
                "case_facts"
            ],

            "evidence_items": packet[
                "evidence"
            ],

            "legal_sources": packet[
                "legal_sources"
            ],

            "citations": packet[
                "citations"
            ],

            "limitations": packet[
                "limitations"
            ],

            "route_information": {
                "routes": packet[
                    "justice_routes"
                ],
                "actions": packet[
                    "actions"
                ]
            },

            "human_review_information": packet[
                "human_review"
            ],

            "evidence_coverage_percentage": coverage[
                "coverage_percentage"
            ],

            "requires_human_review": packet[
                "human_review"
            ]["required"],

            "generated_by": "NYAYAOS"
        }

    @classmethod
    def create_packet(
        cls,
        case_id: str
    ) -> Dict[str, Any]:

        if not case_id:
            raise ValueError(
                "case_id is required"
            )

        supabase = cls.get_supabase_client()

        packet = cls.build_packet(
            case_id
        )

        packet_data = cls._build_storage_payload(
            packet=packet,
            case_id=case_id
        )

        existing = (
            supabase
            .table("evidence_packets")
            .select(
                "packet_id"
            )
            .eq(
                "case_id",
                case_id
            )
            .eq(
                "packet_status",
                "DRAFT"
            )
            .order(
                "created_at",
                desc=True
            )
            .limit(1)
            .execute()
        )

        if existing.data:

            packet_id = existing.data[0][
                "packet_id"
            ]

            response = (
                supabase
                .table("evidence_packets")
                .update(packet_data)
                .eq(
                    "packet_id",
                    packet_id
                )
                .execute()
            )

        else:

            response = (
                supabase
                .table("evidence_packets")
                .insert(packet_data)
                .execute()
            )

        if not response.data:
            raise RuntimeError(
                "Failed to create evidence packet."
            )

        stored_packet = response.data[0]

        return {
            "packet_id": stored_packet[
                "packet_id"
            ],
            "packet": packet,
            "stored_packet": stored_packet
        }

    @classmethod
    def get_packet(
        cls,
        packet_id: str
    ) -> Dict[str, Any]:

        if not packet_id:
            raise ValueError(
                "packet_id is required"
            )

        supabase = cls.get_supabase_client()

        response = (
            supabase
            .table("evidence_packets")
            .select("*")
            .eq(
                "packet_id",
                packet_id
            )
            .execute()
        )

        if not response.data:
            raise ValueError(
                f"Evidence packet not found: {packet_id}"
            )

        return response.data[0]