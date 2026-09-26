from typing import Dict, Any, List

from app.core.config import settings
from supabase import create_client


class UserEvidenceVerificationService:

    SUPPORTED_THRESHOLD = 0.70
    PARTIAL_THRESHOLD = 0.40

    @staticmethod
    def get_supabase_client():
        return create_client(
            settings.supabase_url,
            settings.supabase_key
        )

    @classmethod
    def verify_case_evidence(
        cls,
        case_id: str
    ) -> Dict[str, Any]:

        if not case_id:
            raise ValueError("case_id is required")

        supabase = cls.get_supabase_client()

        # --------------------------------------------------
        # 1. Verify case exists
        # --------------------------------------------------

        case_response = (
            supabase
            .table("cases")
            .select("case_id")
            .eq("case_id", case_id)
            .execute()
        )

        if not case_response.data:
            return {
                "verified": False,
                "status": "FAILED",
                "case_id": case_id,
                "reasons": [
                    "Case not found."
                ]
            }

        # --------------------------------------------------
        # 2. Get all CLAIM nodes for this case
        # --------------------------------------------------

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

        if not claims:
            return {
                "verified": False,
                "status": "FAILED",
                "case_id": case_id,
                "total_claims": 0,
                "reasons": [
                    "No claim nodes were found for the case."
                ]
            }

        # --------------------------------------------------
        # 3. Get SUPPORTS edges
        # --------------------------------------------------

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

        # --------------------------------------------------
        # 4. Get nodes participating in SUPPORTS edges
        # --------------------------------------------------

        node_ids = set()

        for edge in support_edges:
            source_node_id = edge.get(
                "source_node_id"
            )

            target_node_id = edge.get(
                "target_node_id"
            )

            if source_node_id:
                node_ids.add(source_node_id)

            if target_node_id:
                node_ids.add(target_node_id)

        evidence_nodes = {}

        if node_ids:

            node_response = (
                supabase
                .table("graph_nodes")
                .select(
                    """
                    node_id,
                    node_type,
                    label,
                    source_evidence_id
                    """
                )
                .in_(
                    "node_id",
                    list(node_ids)
                )
                .execute()
            )

            for node in node_response.data or []:
                evidence_nodes[
                    node["node_id"]
                ] = node

        # --------------------------------------------------
        # 5. Verify each claim
        # --------------------------------------------------

        supported_claims = []
        partial_claims = []
        missing_claims = []

        for claim in claims:

            claim_id = claim["node_id"]

            matching_edges = []

            for edge in support_edges:

                # SUPPORTS must point TO the claim
                if edge.get(
                    "target_node_id"
                ) != claim_id:
                    continue

                source_node = evidence_nodes.get(
                    edge.get("source_node_id")
                )

                # Evidence must originate from a DOCUMENT
                if not source_node:
                    continue

                if source_node.get(
                    "node_type"
                ) != "DOCUMENT":
                    continue

                # Evidence link must identify the
                # submitted evidence document.
                if not edge.get(
                    "source_evidence_id"
                ):
                    continue

                matching_edges.append(
                    edge
                )

            if not matching_edges:

                missing_claims.append({
                    "claim_id": claim_id,
                    "label": claim.get("label"),
                    "evidence_status": "MISSING",
                    "evidence_confidence": 0.0,
                    "evidence_links": []
                })

                continue

            confidence_values = []

            evidence_links = []

            for edge in matching_edges:

                confidence = float(
                    edge.get("confidence") or 0
                )

                confidence_values.append(
                    confidence
                )

                source_node = evidence_nodes.get(
                    edge.get("source_node_id")
                )

                evidence_links.append({
                    "edge_id": edge.get(
                        "edge_id"
                    ),
                    "document_node_id": edge.get(
                        "source_node_id"
                    ),
                    "document_label": (
                        source_node.get("label")
                        if source_node
                        else None
                    ),
                    "source_evidence_id": edge.get(
                        "source_evidence_id"
                    ),
                    "confidence": confidence
                })

            max_confidence = max(
                confidence_values
            )

            claim_result = {
                "claim_id": claim_id,
                "label": claim.get("label"),
                "evidence_confidence": max_confidence,
                "evidence_links": evidence_links
            }

            if max_confidence >= cls.SUPPORTED_THRESHOLD:

                claim_result[
                    "evidence_status"
                ] = "SUPPORTED"

                supported_claims.append(
                    claim_result
                )

            elif max_confidence >= cls.PARTIAL_THRESHOLD:

                claim_result[
                    "evidence_status"
                ] = "PARTIAL"

                partial_claims.append(
                    claim_result
                )

            else:

                claim_result[
                    "evidence_status"
                ] = "MISSING"

                missing_claims.append(
                    claim_result
                )

        # --------------------------------------------------
        # 6. Calculate coverage
        # --------------------------------------------------

        total_claims = len(claims)

        supported_count = len(
            supported_claims
        )

        partial_count = len(
            partial_claims
        )

        missing_count = len(
            missing_claims
        )

        coverage_percentage = (
            (
                supported_count
                + (partial_count * 0.5)
            )
            / total_claims
        ) * 100

        all_supported = (
            total_claims > 0
            and supported_count == total_claims
        )

        reasons = []

        if partial_count > 0:
            reasons.append(
                f"{partial_count} claim(s) have "
                "partial evidence support."
            )

        if missing_count > 0:
            reasons.append(
                f"{missing_count} claim(s) have "
                "missing or insufficient evidence."
            )

        return {
            "verified": all_supported,
            "status": (
                "VERIFIED"
                if all_supported
                else "PARTIAL"
            ),
            "case_id": case_id,
            "total_claims": total_claims,
            "supported_count": supported_count,
            "partial_count": partial_count,
            "missing_count": missing_count,
            "coverage_percentage": round(
                coverage_percentage,
                2
            ),
            "supported_claims": supported_claims,
            "partial_claims": partial_claims,
            "missing_claims": missing_claims,
            "reasons": reasons
        }