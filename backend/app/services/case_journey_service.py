from typing import Any, Dict, List

from app.core.config import settings
from supabase import create_client


class CaseJourneyService:

    @staticmethod
    def get_supabase_client():
        return create_client(
            settings.supabase_url,
            settings.supabase_key
        )

    @classmethod
    def get_case(cls, supabase, case_id: str) -> Dict[str, Any]:
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

    @classmethod
    def get_state_history(
        cls,
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

    @classmethod
    def get_routes(
        cls,
        supabase,
        case_id: str
    ) -> List[Dict[str, Any]]:

        response = (
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
                metadata,
                created_at,
                updated_at
                """
            )
            .eq("case_id", case_id)
            .order("created_at")
            .execute()
        )

        return response.data or []

    @classmethod
    def get_route_steps(
        cls,
        supabase,
        route_ids: List[str]
    ) -> List[Dict[str, Any]]:

        if not route_ids:
            return []

        response = (
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
                metadata,
                created_at,
                updated_at
                """
            )
            .in_("route_id", route_ids)
            .order("step_number")
            .execute()
        )

        return response.data or []

    @classmethod
    def get_actions(
        cls,
        supabase,
        case_id: str
    ) -> List[Dict[str, Any]]:

        response = (
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
            .order("created_at")
            .execute()
        )

        return response.data or []

    @classmethod
    def get_evidence(
        cls,
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
                created_at
                """
            )
            .eq("case_id", case_id)
            .order("created_at")
            .execute()
        )

        return response.data or []

    @classmethod
    def build_journey(
        cls,
        case_id: str
    ) -> Dict[str, Any]:

        if not case_id:
            raise ValueError(
                "case_id is required"
            )

        supabase = cls.get_supabase_client()

        case = cls.get_case(
            supabase,
            case_id
        )

        state_history = cls.get_state_history(
            supabase,
            case_id
        )

        routes = cls.get_routes(
            supabase,
            case_id
        )

        route_ids = [
            route["route_id"]
            for route in routes
            if route.get("route_id")
        ]

        route_steps = cls.get_route_steps(
            supabase,
            route_ids
        )

        actions = cls.get_actions(
            supabase,
            case_id
        )

        evidence = cls.get_evidence(
            supabase,
            case_id
        )

        route_objects = []

        for route in routes:

            steps = [
                step
                for step in route_steps
                if step.get("route_id")
                == route.get("route_id")
            ]

            route_objects.append(
                {
                    **route,
                    "steps": steps
                }
            )

        completed_steps = sum(
            1
            for step in route_steps
            if step.get("status") == "COMPLETED"
        )

        in_progress_steps = sum(
            1
            for step in route_steps
            if step.get("status") == "IN_PROGRESS"
        )

        ready_steps = sum(
            1
            for step in route_steps
            if step.get("status") == "READY"
        )

        completed_actions = sum(
            1
            for action in actions
            if action.get("status") == "COMPLETED"
        )

        active_actions = sum(
            1
            for action in actions
            if action.get("status")
            in ["READY", "IN_PROGRESS"]
        )

        human_review_required = (
            case.get("case_state")
            == "HUMAN_REVIEW"
            or any(
                route.get(
                    "requires_human_review"
                )
                for route in routes
            )
            or any(
                action.get(
                    "requires_human_review"
                )
                for action in actions
            )
        )

        current_action = next(
            (
                action
                for action in reversed(actions)
                if action.get("status")
                in ["READY", "IN_PROGRESS"]
            ),
            None
        )

        current_step = None

        if current_action:
            current_step = next(
                (
                    step
                    for step in route_steps
                    if step.get("step_id")
                    == current_action.get("step_id")
                ),
                None
            )

        journey_status = "ACTIVE"

        if case.get("case_state") == "CLOSED":
            journey_status = "CLOSED"

        elif case.get("case_state") == "RESOLVED":
            journey_status = "RESOLVED"

        elif case.get("case_state") == "HUMAN_REVIEW":
            journey_status = "HUMAN_REVIEW"

        elif case.get("case_state") == "AWAITING_RESPONSE":
            journey_status = "AWAITING_RESPONSE"

        return {
            "case_id": case_id,

            "journey_status": journey_status,

            "current_case_state": case.get(
                "case_state"
            ),

            "case": case,

            "timeline": state_history,

            "routes": route_objects,

            "actions": actions,

            "current_action": current_action,

            "current_step": current_step,

            "evidence": evidence,

            "progress": {
                "total_route_steps": len(
                    route_steps
                ),
                "completed_steps": completed_steps,
                "in_progress_steps": in_progress_steps,
                "ready_steps": ready_steps,
                "completed_actions": completed_actions,
                "active_actions": active_actions
            },

            "human_review": {
                "required": human_review_required,
                "active": (
                    case.get("case_state")
                    == "HUMAN_REVIEW"
                )
            },

            "journey_stages": [
                {
                    "number": 1,
                    "stage": "PROBLEM",
                    "status": "COMPLETED"
                },
                {
                    "number": 2,
                    "stage": "EVIDENCE",
                    "status": (
                        "COMPLETED"
                        if evidence
                        else "PENDING"
                    )
                },
                {
                    "number": 3,
                    "stage": "VERIFIED_FACTS",
                    "status": (
                        "COMPLETED"
                        if state_history
                        else "PENDING"
                    )
                },
                {
                    "number": 4,
                    "stage": "JUSTICE_GRAPH",
                    "status": "AVAILABLE"
                },
                {
                    "number": 5,
                    "stage": "RELEVANT_LAW",
                    "status": "AVAILABLE"
                },
                {
                    "number": 6,
                    "stage": "SAFETY_CHECK",
                    "status": (
                        "HUMAN_REVIEW"
                        if human_review_required
                        else "AVAILABLE"
                    )
                },
                {
                    "number": 7,
                    "stage": "JUSTICE_ROUTE",
                    "status": (
                        "ACTIVE"
                        if routes
                        else "PENDING"
                    )
                },
                {
                    "number": 8,
                    "stage": "HUMAN_HANDOFF",
                    "status": (
                        "ACTIVE"
                        if case.get(
                            "case_state"
                        ) == "HUMAN_REVIEW"
                        else "AVAILABLE"
                    )
                },
                {
                    "number": 9,
                    "stage": "EVIDENCE_PACKET",
                    "status": "AVAILABLE"
                },
                {
                    "number": 10,
                    "stage": "CASE_JOURNEY",
                    "status": "ACTIVE"
                }
            ],

            "generated_by": "NYAYAOS"
        }