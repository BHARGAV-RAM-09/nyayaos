"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// Local development API
// Keep this explicit while running NYAYAOS locally so the frontend
// always talks to the FastAPI server on port 8000.
const API_URL = "http://127.0.0.1:8000";

const DEMO_CASE = {
  case_id: "ac592acf-4ba2-4d95-bf6d-65857c22adef",
  title: "Unauthorized Bank Transaction",
  description:
    "A user reports an unauthorized ₹80,000 IMPS/NetBanking transaction to an unknown beneficiary. The case contains transaction evidence and requires a traceable justice workflow with safety checks and human review where required.",
  country: "IN",
  state: "Maharashtra",
};

const ACCESSIBILITY_STORAGE_KEY = "nyayaos-accessibility-v1";

// ============================================================
// TYPES
// ============================================================

type Evidence = {
  evidence_id: string;
  case_id: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  extraction_status: string;
  extracted_text: string | null;
  created_at: string;
};

type CaseResult = {
  case_id: string;
  title: string;
  description: string;
  jurisdiction_country: string;
  jurisdiction_state: string;
  status: string;
  case_state?: string;
};

type IntelligenceResult = {
  case_id: string;
  case?: {
    title?: string;
    description?: string;
    jurisdiction_country?: string;
    jurisdiction_state?: string;
  };
  evidence_count?: number;
  processed_evidence_count?: number;
  case_intelligence?: {
    case_summary?: string;
    potential_domain?: unknown;
    people?: unknown[];
    organizations?: unknown[];
    dates?: unknown[];
    amounts?: unknown[];
    locations?: unknown[];
    events?: unknown[];
    factual_claims?: unknown[];

    [key: string]: unknown;
  };
  timeline?: unknown[];
};

type GraphNode = {
  node_id: string;
  case_id: string;
  node_type: string;
  label: string;
  properties: Record<string, unknown>;
  source_evidence_id?: string | null;
  created_at: string;
};

type GraphEdge = {
  edge_id: string;
  case_id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: string;
  source_evidence_id?: string | null;
  confidence?: number | null;
  properties: Record<string, unknown>;
  created_at: string;
};

type GraphResult = {
  case: CaseResult;
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: {
    node_count: number;
    edge_count: number;
    node_counts: Record<string, number>;
    edge_counts: Record<string, number>;
  };
};

// ============================================================
// LEGAL INFORMATION TYPES
// ============================================================

type LegalCitation = {
  section_number?: string;
  section_title?: string;
  source_id?: string;
  source_title?: string;
  citation?: string;
  jurisdiction?: string;
  source_url?: string;
};

type LegalProvenance = {
  source_id?: string;
  source_title?: string;
  authority?: string;
  citation?: string;
  source_url?: string;
  version_date?: string | null;
  status?: string;
  verification?: {
    verified_source?: boolean;
    citation_verified?: boolean;
    url_present?: boolean;
  };
};

type LegalResult = {
  chunk_id?: string;
  source_id?: string;
  section_number?: string;
  section_title?: string;
  content?: string;
  jurisdiction?: string;
  legal_domain?: string | null;
  legal_category?: string | null;
  similarity?: number;
  citation?: LegalCitation;
  provenance?: LegalProvenance;
  citation_status?: string;
};

type LegalInformation = {
  case_id: string;
  jurisdiction?: string;
  legal_domain?: string | null;
  query?: string;
  result_count?: number;
  results?: LegalResult[];
  issue_summary?: string;
  legal_analysis?: string;
  relevant_sections?: Array<{
    section_number?: string;
    section_title?: string;
    source_id?: string;
    jurisdiction?: string;
    explanation?: string;
  }>;
  limitations?: string[];
  needs_human_review?: boolean;
};

// ============================================================
// PHASE 8.7 — JUSTICE ROUTE UI
// ============================================================

type JusticeRouteStep = {
  step_id: string;
  step_number: number;
  step_type: string;
  title: string;
  description: string;
  action_text: string;
  destination_name: string;
  destination_type: string;
  destination_url?: string | null;
  status: "PENDING" | "READY" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "SKIPPED";
  is_required: boolean;
  requires_human_review: boolean;
};

type JusticeRoute = {
  route_id: string;
  case_id: string;
  route_type: "INITIAL_RESOLUTION" | "FORMAL_GRIEVANCE" | "ESCALATION" | "LEGAL_AID" | "HUMAN_REVIEW";
  route_status: "DRAFT" | "READY" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  title: string;
  description: string;
  jurisdiction: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  current_step_number: number;
  total_steps: number;
  requires_human_review: boolean;
  steps: JusticeRouteStep[];
};

const PHASE_7_JUSTICE_ROUTES: JusticeRoute[] = [
  {
    route_id: "85a42828-1f59-4c14-a2ac-2b643ac9c434",
    case_id: "ac592acf-4ba2-4d95-bf6d-65857c22adef",
    route_type: "INITIAL_RESOLUTION",
    route_status: "READY",
    title: "Initial Resolution — Unauthorized Bank Transaction",
    description: "Preserve evidence, notify the bank, report the cyber-financial fraud, and track the response.",
    jurisdiction: "MAHARASHTRA, INDIA",
    priority: "HIGH",
    current_step_number: 1,
    total_steps: 4,
    requires_human_review: false,
    steps: [
      { step_id: "initial-1", step_number: 1, step_type: "COLLECT_EVIDENCE", title: "Preserve Transaction Evidence", description: "Keep the bank statement, transaction alerts, complaint acknowledgement, and related records together.", action_text: "Preserve the transaction evidence in the case record.", destination_name: "NYAYAOS Evidence Vault", destination_type: "OTHER", destination_url: null, status: "READY", is_required: true, requires_human_review: false },
      { step_id: "initial-2", step_number: 2, step_type: "CONTACT_AUTHORITY", title: "Notify the Bank", description: "Notify the bank through its fraud or customer grievance channel and retain the acknowledgement.", action_text: "Contact the victim bank and record the complaint reference.", destination_name: "Victim Bank", destination_type: "BANK", destination_url: null, status: "PENDING", is_required: true, requires_human_review: false },
      { step_id: "initial-3", step_number: 3, step_type: "FILE_COMPLAINT", title: "Report Cyber-Financial Fraud", description: "Submit the cyber-financial fraud report through the official National Cyber Crime Reporting Portal.", action_text: "Submit the complaint and preserve the acknowledgement number.", destination_name: "National Cyber Crime Reporting Portal", destination_type: "POLICE", destination_url: "https://www.cybercrime.gov.in/", status: "PENDING", is_required: true, requires_human_review: false },
      { step_id: "initial-4", step_number: 4, step_type: "FOLLOW_UP", title: "Track Complaint and Bank Response", description: "Track the bank and complaint responses and retain all reference numbers and communications.", action_text: "Record responses and follow up on unresolved actions.", destination_name: "Case Follow-up", destination_type: "OTHER", destination_url: null, status: "PENDING", is_required: true, requires_human_review: false },
    ],
  },
  {
    route_id: "4b66365d-4b1d-4a5f-a5a0-ca9a3dc8737c",
    case_id: "ac592acf-4ba2-4d95-bf6d-65857c22adef",
    route_type: "FORMAL_GRIEVANCE",
    route_status: "READY",
    title: "Formal Grievance — Unauthorized Bank Transaction",
    description: "Move from the bank grievance channel to regulatory escalation if the grievance remains unresolved.",
    jurisdiction: "MAHARASHTRA, INDIA",
    priority: "HIGH",
    current_step_number: 1,
    total_steps: 4,
    requires_human_review: false,
    steps: [
      { step_id: "grievance-1", step_number: 1, step_type: "FILE_GRIEVANCE", title: "File Formal Bank Grievance", description: "Submit a formal grievance through the bank's grievance redressal channel.", action_text: "File the formal grievance and retain its reference number.", destination_name: "Victim Bank — Grievance Redressal", destination_type: "BANK", destination_url: null, status: "READY", is_required: true, requires_human_review: false },
      { step_id: "grievance-2", step_number: 2, step_type: "FOLLOW_UP", title: "Track Bank Grievance", description: "Track the grievance response and preserve correspondence.", action_text: "Record the bank response and response date.", destination_name: "Bank Grievance Desk", destination_type: "BANK", destination_url: null, status: "PENDING", is_required: true, requires_human_review: false },
      { step_id: "grievance-3", step_number: 3, step_type: "ESCALATE", title: "Escalate Unresolved Grievance", description: "If the applicable conditions for escalation are met, use the RBI Complaint Management System.", action_text: "Submit the escalation with the bank grievance record attached.", destination_name: "RBI Complaint Management System", destination_type: "GOVERNMENT_AUTHORITY", destination_url: "https://cms.rbi.org.in/", status: "PENDING", is_required: true, requires_human_review: false },
      { step_id: "grievance-4", step_number: 4, step_type: "FOLLOW_UP", title: "Track Escalated Complaint", description: "Track the escalated complaint and retain its acknowledgement and communications.", action_text: "Record the escalation reference and subsequent response.", destination_name: "RBI Complaint Management System", destination_type: "GOVERNMENT_AUTHORITY", destination_url: "https://cms.rbi.org.in/", status: "PENDING", is_required: true, requires_human_review: false },
    ],
  },
  {
    route_id: "1c7f104a-42d5-4eda-841f-b4b5945a9b5a",
    case_id: "ac592acf-4ba2-4d95-bf6d-65857c22adef",
    route_type: "ESCALATION",
    route_status: "READY",
    title: "Escalation — Unresolved Justice Complaint",
    description: "Use a human-reviewed escalation path when the matter remains unresolved or requires qualified review.",
    jurisdiction: "MAHARASHTRA, INDIA",
    priority: "HIGH",
    current_step_number: 1,
    total_steps: 4,
    requires_human_review: true,
    steps: [
      { step_id: "escalation-1", step_number: 1, step_type: "VERIFY_FACTS", title: "Verify Escalation Conditions", description: "Confirm the relevant facts, previous complaint records, and conditions before escalation.", action_text: "Review the case record with a qualified human reviewer.", destination_name: "NYAYAOS Case Review", destination_type: "HUMAN_REVIEW", destination_url: null, status: "READY", is_required: true, requires_human_review: true },
      { step_id: "escalation-2", step_number: 2, step_type: "ESCALATE", title: "Submit Escalated Complaint", description: "Submit the escalation to the applicable regulatory grievance authority after human review.", action_text: "Submit the reviewed escalation record.", destination_name: "Applicable Regulatory Grievance Authority", destination_type: "GOVERNMENT_AUTHORITY", destination_url: null, status: "PENDING", is_required: true, requires_human_review: true },
      { step_id: "escalation-3", step_number: 3, step_type: "FOLLOW_UP", title: "Monitor Escalated Complaint", description: "Track the authority response and preserve communications.", action_text: "Record the escalation response and follow-up dates.", destination_name: "Escalation Authority", destination_type: "GOVERNMENT_AUTHORITY", destination_url: null, status: "PENDING", is_required: true, requires_human_review: true },
      { step_id: "escalation-4", step_number: 4, step_type: "HUMAN_REVIEW", title: "Human Legal Review", description: "Obtain qualified human review before taking further legal action.", action_text: "Hand the verified case record to a qualified legal professional or legal-aid provider.", destination_name: "Legal Aid / Qualified Legal Professional", destination_type: "LEGAL_AID", destination_url: null, status: "PENDING", is_required: true, requires_human_review: true },
    ],
  },
  {
    route_id: "c0320cfd-3fdd-4ea9-ad7a-c94d87f6caee",
    case_id: "ac592acf-4ba2-4d95-bf6d-65857c22adef",
    route_type: "LEGAL_AID",
    route_status: "READY",
    title: "Legal Aid — Case Assistance",
    description: "Prepare the case for qualified legal assistance and track the human review process.",
    jurisdiction: "MAHARASHTRA, INDIA",
    priority: "HIGH",
    current_step_number: 1,
    total_steps: 4,
    requires_human_review: true,
    steps: [
      { step_id: "legal-aid-1", step_number: 1, step_type: "VERIFY_FACTS", title: "Prepare Case for Legal Aid", description: "Prepare the verified facts, evidence relationships, legal sources, and limitations for human review.", action_text: "Review the case record before legal-aid handoff.", destination_name: "NYAYAOS Case Review", destination_type: "HUMAN_REVIEW", destination_url: null, status: "READY", is_required: true, requires_human_review: true },
      { step_id: "legal-aid-2", step_number: 2, step_type: "SEEK_LEGAL_AID", title: "Find Appropriate Legal Aid", description: "Identify an appropriate qualified legal-aid or legal professional destination.", action_text: "Contact an appropriate legal-aid provider or qualified legal professional.", destination_name: "Legal Aid / Qualified Legal Professional", destination_type: "LEGAL_AID", destination_url: null, status: "PENDING", is_required: true, requires_human_review: true },
      { step_id: "legal-aid-3", step_number: 3, step_type: "HUMAN_REVIEW", title: "Human Legal Review", description: "Have the case reviewed by a qualified human before relying on legal conclusions or taking consequential action.", action_text: "Provide the evidence packet and legal retrieval record for review.", destination_name: "Qualified Legal Reviewer", destination_type: "HUMAN_REVIEW", destination_url: null, status: "PENDING", is_required: true, requires_human_review: true },
      { step_id: "legal-aid-4", step_number: 4, step_type: "FOLLOW_UP", title: "Track Legal Assistance", description: "Record the human review outcome and any next action recommended by the qualified reviewer.", action_text: "Record the legal assistance outcome in the case journey.", destination_name: "Legal Aid Follow-up", destination_type: "LEGAL_AID", destination_url: null, status: "PENDING", is_required: true, requires_human_review: true },
    ],
  },
  {
    route_id: "bbe7c631-5624-46f2-bb2b-351d2b5adff1",
    case_id: "ac592acf-4ba2-4d95-bf6d-65857c22adef",
    route_type: "HUMAN_REVIEW",
    route_status: "READY",
    title: "Human Review — Safety and Next Action",
    description: "Review the safety decision, validate facts and evidence, and determine the next justice action.",
    jurisdiction: "MAHARASHTRA, INDIA",
    priority: "HIGH",
    current_step_number: 1,
    total_steps: 4,
    requires_human_review: true,
    steps: [
      { step_id: "human-1", step_number: 1, step_type: "HUMAN_REVIEW", title: "Review NYAYAOS Safety Decision", description: "Review the safety checks and reasons before treating the legal information as actionable.", action_text: "Review the safety outcome and supporting records.", destination_name: "NYAYAOS Human Review", destination_type: "HUMAN_REVIEW", destination_url: null, status: "READY", is_required: true, requires_human_review: true },
      { step_id: "human-2", step_number: 2, step_type: "VERIFY_FACTS", title: "Validate Case Facts and Evidence", description: "Validate the material facts and evidence coverage used by the system.", action_text: "Confirm the facts and evidence relationships.", destination_name: "NYAYAOS Evidence Review", destination_type: "HUMAN_REVIEW", destination_url: null, status: "PENDING", is_required: true, requires_human_review: true },
      { step_id: "human-3", step_number: 3, step_type: "HUMAN_REVIEW", title: "Determine Next Justice Action", description: "A qualified human reviewer determines the appropriate next step.", action_text: "Record the qualified reviewer's next-action decision.", destination_name: "Qualified Human Reviewer", destination_type: "HUMAN_REVIEW", destination_url: null, status: "PENDING", is_required: true, requires_human_review: true },
      { step_id: "human-4", step_number: 4, step_type: "FOLLOW_UP", title: "Record Human Review Outcome", description: "Record the outcome and any resulting route or action in the case record.", action_text: "Record the human review outcome and next route.", destination_name: "NYAYAOS Case Record", destination_type: "HUMAN_REVIEW", destination_url: null, status: "PENDING", is_required: true, requires_human_review: true },
    ],
  },
];

// ============================================================
// NYAYAOS JUSTICE JOURNEY
// ============================================================

type JourneyStage = {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  description: string;
  sectionId?: string;
};

const JOURNEY_STAGES: JourneyStage[] = [
  {
    id: "problem",
    number: 1,
    title: "Problem",
    shortTitle: "Problem",
    description: "Describe what happened and where it happened.",
    sectionId: "case-intake",
  },
  {
    id: "evidence",
    number: 2,
    title: "Evidence",
    shortTitle: "Evidence",
    description: "Upload documents, screenshots, statements, and other evidence.",
    sectionId: "evidence",
  },
  {
    id: "facts",
    number: 3,
    title: "Verified Facts",
    shortTitle: "Facts",
    description: "Convert evidence into structured facts, entities, events, and claims.",
    sectionId: "case-intelligence",
  },
  {
    id: "graph",
    number: 4,
    title: "Justice Graph",
    shortTitle: "Graph",
    description: "Connect people, organizations, events, issues, claims, and documents.",
    sectionId: "justice-graph",
  },
  {
    id: "law",
    number: 5,
    title: "Relevant Law",
    shortTitle: "Law",
    description: "Retrieve jurisdiction-aware legal material with source provenance.",
    sectionId: "legal-information",
  },
  {
    id: "safety",
    number: 6,
    title: "Safety Check",
    shortTitle: "Safety",
    description: "Verify sources, provisions, jurisdiction, evidence, and uncertainty.",
    sectionId: "safety-stage",
  },
  {
    id: "route",
    number: 7,
    title: "Justice Route",
    shortTitle: "Route",
    description: "Turn verified information into an actionable justice pathway.",
    sectionId: "route-stage",
  },
  {
    id: "human",
    number: 8,
    title: "Human Handoff",
    shortTitle: "Human",
    description: "Escalate cases that require qualified human review.",
    sectionId: "human-stage",
  },
  {
    id: "packet",
    number: 9,
    title: "Evidence Packet",
    shortTitle: "Packet",
    description: "Skipped in the current hackathon scope; the product continues directly to Case Journey.",
  },
  {
    id: "journey",
    number: 10,
    title: "Case Journey",
    shortTitle: "Journey",
    description: "Track actions, responses, escalation, and resolution.",
    sectionId: "journey-stage",
  },
];

function getJourneyCompletedCount({
  result,
  evidence,
  intelligence,
  graph,
  legalInfo,
}: {
  result: CaseResult | null;
  evidence: Evidence[];
  intelligence: IntelligenceResult | null;
  graph: GraphResult | null;
  legalInfo: LegalInformation | null;
}) {
  let completed = 0;

  if (result) completed = 1;
  if (result && evidence.length > 0) completed = 2;
  if (result && intelligence) completed = 3;
  if (result && graph) completed = 4;
  if (result && legalInfo) completed = 5;

  return completed;
}

function scrollToJourneyStage(stage: JourneyStage) {
  if (!stage.sectionId) return;

  document.getElementById(stage.sectionId)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

// ============================================================
// GENERIC HELPERS
// ============================================================

function isObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => formatValue(item))
      .join(", ");
  }

  if (isObject(value)) {
    return Object.entries(value)
      .map(
        ([key, item]) =>
          `${formatLabel(key)}: ${formatValue(item)}`
      )
      .join(" • ");
  }

  return String(value);
}

function buildSafetyPresentation(
  legalInfo: LegalInformation | null,
  graph: GraphResult | null
) {
  if (!legalInfo) {
    return {
      status: "PENDING",
      safeToPresent: false,
      requiresHumanReview: true,
      checks: [],
      reasons: [
        "Legal retrieval has not been completed for this case.",
      ],
    };
  }

  const results = legalInfo.results || [];
  const sourceVerified =
    results.length > 0 &&
    results.every(
      (item) =>
        item.provenance?.verification?.verified_source === true
    );

  const citationVerified =
    results.length > 0 &&
    results.every(
      (item) =>
        item.provenance?.verification?.citation_verified === true
    );

  const provisionVerified =
    results.length > 0 &&
    results.every(
      (item) => Boolean(item.section_number)
    );

  const caseJurisdiction =
    (legalInfo.jurisdiction || "").toUpperCase();

  const jurisdictionVerified =
    results.length > 0 &&
    results.every((item) => {
      const sourceJurisdiction =
        (item.jurisdiction ||
          item.provenance?.citation ||
          "").toUpperCase();

      if (!sourceJurisdiction) return false;
      if (caseJurisdiction === "MAHARASHTRA") {
        return (
          sourceJurisdiction.includes("MAHARASHTRA") ||
          sourceJurisdiction.includes("INDIA")
        );
      }
      if (caseJurisdiction === "INDIA") {
        return sourceJurisdiction.includes("INDIA");
      }
      return sourceJurisdiction.includes(caseJurisdiction);
    });

  const effectiveDateVerified =
    results.length > 0 &&
    results.every(
      (item) => Boolean(item.provenance?.version_date)
    );

  const claimNodes =
    graph?.nodes.filter(
      (node) => node.node_type === "CLAIM"
    ) || [];

  const supportedClaimIds = new Set(
    (graph?.edges || [])
      .filter(
        (edge) =>
          edge.relationship_type === "SUPPORTS" &&
          typeof edge.confidence === "number" &&
          edge.confidence >= 0.7
      )
      .map((edge) => edge.target_node_id)
  );

  const userEvidenceVerified =
    claimNodes.length > 0 &&
    claimNodes.every((node) =>
      supportedClaimIds.has(node.node_id)
    );

  const evidencePartial =
    claimNodes.length > 0 &&
    !userEvidenceVerified &&
    (graph?.edges || []).some(
      (edge) =>
        edge.relationship_type === "SUPPORTS" &&
        typeof edge.confidence === "number" &&
        edge.confidence >= 0.4
    );

  const checks = [
    {
      label: "Source authority",
      verified: sourceVerified,
      detail: sourceVerified
        ? "Retrieved sources report verified provenance."
        : "One or more retrieved sources require verification.",
    },
    {
      label: "Citation",
      verified: citationVerified,
      detail: citationVerified
        ? "Retrieved citations are marked verified."
        : "One or more citations require verification.",
    },
    {
      label: "Provision",
      verified: provisionVerified,
      detail: provisionVerified
        ? "Retrieved results contain section references."
        : "A retrieved result is missing a section reference.",
    },
    {
      label: "Jurisdiction",
      verified: jurisdictionVerified,
      detail: jurisdictionVerified
        ? `Sources are compatible with ${legalInfo.jurisdiction || "the case jurisdiction"}.`
        : "Source jurisdiction could not be fully verified.",
    },
    {
      label: "Effective date",
      verified: effectiveDateVerified,
      detail: effectiveDateVerified
        ? "Version-date metadata is available for all retrieved sources."
        : "Version-date metadata is unavailable for one or more sources.",
    },
    {
      label: "User evidence",
      verified: userEvidenceVerified,
      partial: evidencePartial,
      detail: userEvidenceVerified
        ? "All graph claims have supporting evidence above the supported threshold."
        : evidencePartial
          ? "Some evidence support exists, but coverage is incomplete."
          : "User-evidence support is not yet fully verified.",
    },
  ];

  const hardFailure =
    !jurisdictionVerified || !provisionVerified;
  const verificationGap =
    !sourceVerified ||
    !citationVerified ||
    !effectiveDateVerified;

  let status = "SUPPORTED";
  let safeToPresent = true;
  let requiresHumanReview = false;

  if (hardFailure) {
    status = "BLOCKED";
    safeToPresent = false;
    requiresHumanReview = true;
  } else if (legalInfo.needs_human_review || verificationGap) {
    status = "HUMAN REVIEW";
    safeToPresent = false;
    requiresHumanReview = true;
  } else if (!userEvidenceVerified) {
    status = "PARTIAL";
    safeToPresent = false;
    requiresHumanReview = true;
  }

  const reasons: string[] = [];

  if (status === "BLOCKED") {
    if (!jurisdictionVerified) {
      reasons.push("Legal jurisdiction could not be fully verified.");
    }
    if (!provisionVerified) {
      reasons.push("A legal provision reference could not be fully verified.");
    }
  }

  if (!sourceVerified) {
    reasons.push("One or more legal sources require verification.");
  }
  if (!citationVerified) {
    reasons.push("One or more legal citations require verification.");
  }
  if (!effectiveDateVerified) {
    reasons.push("Effective-date metadata is unavailable for one or more sources.");
  }
  if (!userEvidenceVerified && status === "PARTIAL") {
    reasons.push("User evidence does not fully support every graph claim.");
  }

  if (reasons.length === 0 && legalInfo.limitations?.length) {
    reasons.push(...legalInfo.limitations);
  }

  return {
    status,
    safeToPresent,
    requiresHumanReview,
    checks,
    reasons,
  };
}

function getDisplayTitle(
  item: unknown,
  index: number
): string {
  if (typeof item === "string") {
    return item;
  }

  if (isObject(item)) {
    const possibleKeys = [
      "name",
      "title",
      "claim",
      "event",
      "description",
      "location",
      "amount",
      "date",
      "value",
    ];

    for (const key of possibleKeys) {
      const value = item[key];

      if (
        typeof value === "string" &&
        value.trim()
      ) {
        return value;
      }
    }
  }

  return `Item ${index + 1}`;
}

// ============================================================
// GENERIC INTELLIGENCE LIST
// ============================================================

function IntelligenceList({
  items,
}: {
  items?: unknown[];
}) {
  if (!items || items.length === 0) {
    return (
      <p
        style={{
          color: "#777",
          margin: 0,
        }}
      >
        No information extracted.
      </p>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {items.map((item, index) => (
        <div
          key={index}
          style={{
            border: "1px solid #292929",
            background: "#090909",
            borderRadius: "8px",
            padding: "16px",
          }}
        >
          <div
            style={{
              fontWeight: "600",
              marginBottom: "8px",
              color: "#fff",
            }}
          >
            {getDisplayTitle(item, index)}
          </div>

          {typeof item === "string" ? (
            <p
              style={{
                margin: 0,
                color: "#bbb",
                lineHeight: "1.6",
              }}
            >
              {item}
            </p>
          ) : isObject(item) ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "7px",
              }}
            >
              {Object.entries(item).map(
                ([key, value]) => (
                  <div
                    key={key}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "150px 1fr",
                      gap: "12px",
                      fontSize: "14px",
                    }}
                  >
                    <span
                      style={{
                        color: "#777",
                        fontWeight: "600",
                      }}
                    >
                      {formatLabel(key)}
                    </span>

                    <span
                      style={{
                        color: "#ccc",
                        lineHeight: "1.5",
                      }}
                    >
                      {formatValue(value)}
                    </span>
                  </div>
                )
              )}
            </div>
          ) : (
            <p
              style={{
                margin: 0,
                color: "#bbb",
              }}
            >
              {formatValue(item)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// INTELLIGENCE SECTION
// ============================================================

function IntelligenceSection({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items?: unknown[];
}) {
  return (
    <section
      style={{
        border: "1px solid #333",
        borderRadius: "10px",
        padding: "25px",
        marginBottom: "20px",
        background: "#070707",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom: "6px",
        }}
      >
        {title}
      </h3>

      {description && (
        <p
          style={{
            color: "#777",
            fontSize: "14px",
            marginTop: 0,
            marginBottom: "18px",
          }}
        >
          {description}
        </p>
      )}

      <IntelligenceList items={items} />
    </section>
  );
}

// ============================================================
// PHASE 8.8 — LOADING STATE COMPONENTS
// ============================================================

function LoadingSpinner({
  size = 18,
  label,
}: {
  size?: number;
  label?: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "9px",
      }}
      role={label ? "status" : undefined}
      aria-live={label ? "polite" : undefined}
      aria-label={label}
    >
      <span
        aria-hidden="true"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          border: "2px solid #333",
          borderTopColor: "#60a5fa",
          borderRadius: "50%",
          display: "inline-block",
          animation: "nyayaos-spin 0.8s linear infinite",
          flexShrink: 0,
        }}
      />
      {label && (
        <span style={{ color: "#aaa" }}>{label}</span>
      )}
    </span>
  );
}

function LoadingSkeleton({
  width = "100%",
  height = "14px",
}: {
  width?: string;
  height?: string;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: "6px",
        background:
          "linear-gradient(90deg, #111 25%, #1b1b1b 50%, #111 75%)",
        backgroundSize: "200% 100%",
        animation: "nyayaos-shimmer 1.4s ease-in-out infinite",
      }}
    />
  );
}

function LoadingPanel({
  title,
  description,
  lines = 3,
  compact = false,
}: {
  title: string;
  description?: string;
  lines?: number;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        padding: compact ? "16px" : "24px",
        border: "1px solid #292929",
        borderRadius: "9px",
        background: "#0b0b0b",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: description || lines > 0 ? "16px" : 0,
          color: "#ddd",
          fontWeight: "600",
        }}
      >
        <LoadingSpinner size={16} />
        <span>{title}</span>
      </div>

      {description && (
        <p
          style={{
            margin: "0 0 16px 0",
            color: "#777",
            fontSize: "13px",
            lineHeight: "1.5",
          }}
        >
          {description}
        </p>
      )}

      {lines > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "9px",
          }}
        >
          {Array.from({ length: lines }).map((_, index) => (
            <LoadingSkeleton
              key={index}
              width={index === lines - 1 ? "62%" : "100%"}
              height="12px"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingButtonContent({
  loading,
  loadingLabel,
  idleLabel,
}: {
  loading: boolean;
  loadingLabel: string;
  idleLabel: string;
}) {
  if (!loading) {
    return <>{idleLabel}</>;
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "9px",
      }}
    >
      <LoadingSpinner size={15} />
      <span>{loadingLabel}</span>
    </span>
  );
}

// ============================================================
// PHASE 8.9 — ERROR STATE COMPONENTS
// ============================================================

type ErrorStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

function ErrorState({
  title,
  message,
  actionLabel,
  onAction,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        padding: compact ? "14px" : "20px",
        border: "1px solid #5a2a2a",
        borderRadius: "9px",
        background: "#160909",
        color: "#f2d4d4",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            border: "1px solid #e57373",
            color: "#e57373",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: "12px",
            fontWeight: "800",
          }}
        >
          !
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              color: "#f0d0d0",
              fontWeight: "700",
              fontSize: "13px",
              marginBottom: "5px",
            }}
          >
            {title}
          </div>

          <div
            style={{
              color: "#b99595",
              fontSize: "12px",
              lineHeight: "1.55",
              wordBreak: "break-word",
            }}
          >
            {message}
          </div>

          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              style={{
                marginTop: "12px",
                padding: "8px 12px",
                border: "1px solid #6b3b3b",
                borderRadius: "7px",
                background: "#1d0d0d",
                color: "#e6baba",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "700",
              }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PHASE 8.11 — EMPTY STATE COMPONENTS
// ============================================================

type EmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  icon?: string;
};

function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  compact = false,
  icon = "—",
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: compact ? "18px" : "28px",
        border: "1px dashed #3a3a3a",
        borderRadius: "10px",
        background: "#090909",
        textAlign: "center",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: compact ? "34px" : "42px",
          height: compact ? "34px" : "42px",
          margin: "0 auto 12px",
          borderRadius: "50%",
          border: "1px solid #3b3b3b",
          background: "#101010",
          color: "#777",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: compact ? "13px" : "15px",
          fontWeight: "700",
        }}
      >
        {icon}
      </div>

      <div
        style={{
          color: "#ddd",
          fontWeight: "700",
          fontSize: compact ? "13px" : "15px",
          marginBottom: "7px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          maxWidth: "620px",
          margin: "0 auto",
          color: "#777",
          fontSize: compact ? "12px" : "13px",
          lineHeight: "1.6",
        }}
      >
        {message}
      </div>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            marginTop: "14px",
            padding: "9px 13px",
            border: "1px solid #3b4f66",
            borderRadius: "7px",
            background: "#0a1422",
            color: "#9ecbff",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: "700",
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Home() {
  // ==========================================================
  // CASE STATE
  // ==========================================================

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("IN");
  const [state, setState] = useState("Maharashtra");

  const [result, setResult] =
    useState<CaseResult | null>(null);

  const [loading, setLoading] = useState(false);

  // ==========================================================
  // PHASE 8.9 — ERROR STATE
  // ==========================================================

  const [createError, setCreateError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [evidenceError, setEvidenceError] = useState("");
  const [existingCaseError, setExistingCaseError] = useState("");

  // ==========================================================
  // EVIDENCE STATE
  // ==========================================================

  const [selectedFiles, setSelectedFiles] =
    useState<File[]>([]);

  const [evidence, setEvidence] =
    useState<Evidence[]>([]);

  const [uploading, setUploading] =
    useState(false);

  const [evidenceLoading, setEvidenceLoading] =
    useState(false);

  // ==========================================================
  // CASE INTELLIGENCE STATE
  // ==========================================================

  const [
    intelligence,
    setIntelligence,
  ] = useState<IntelligenceResult | null>(
    null
  );

  const [
    intelligenceLoading,
    setIntelligenceLoading,
  ] = useState(false);

  const [
    intelligenceError,
    setIntelligenceError,
  ] = useState("");

  // ==========================================================
  // JUSTICE GRAPH STATE
  // ==========================================================

  const [graph, setGraph] =
    useState<GraphResult | null>(null);

  const [graphLoading, setGraphLoading] =
    useState(false);

  const [graphError, setGraphError] =
    useState("");

  const [selectedGraphNode, setSelectedGraphNode] =
    useState<GraphNode | null>(null);

  const [existingCaseId, setExistingCaseId] =
    useState("ac592acf-4ba2-4d95-bf6d-65857c22adef");

  const [existingCaseLoading, setExistingCaseLoading] =
    useState(false);

  // ==========================================================
  // LEGAL INFORMATION STATE
  // ==========================================================

  const [legalInfo, setLegalInfo] =
    useState<LegalInformation | null>(null);

  const [legalLoading, setLegalLoading] =
    useState(false);

  const [legalError, setLegalError] =
    useState("");

  // ==========================================================
  // JUSTICE ROUTE UI STATE — PHASE 8.7
  // ==========================================================

  const [selectedRouteType, setSelectedRouteType] =
    useState<JusticeRoute["route_type"]>("INITIAL_RESOLUTION");

  const [routeStepStatuses, setRouteStepStatuses] =
    useState<Record<string, JusticeRouteStep["status"]>>({});

  const [routeActionMessage, setRouteActionMessage] =
    useState("");

  // ==========================================================
  // PHASE 8.13–8.17 PRODUCT POLISH STATE
  // ==========================================================

  const [accessibilityOpen, setAccessibilityOpen] =
    useState(false);
  const [reducedMotion, setReducedMotion] =
    useState(false);
  const [largeText, setLargeText] =
    useState(false);
  const [highContrast, setHighContrast] =
    useState(false);
  const [focusMode, setFocusMode] =
    useState(false);
  const [walkthroughOpen, setWalkthroughOpen] =
    useState(false);
  const [demoMode, setDemoMode] =
    useState(false);
  const [notice, setNotice] =
    useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(
        ACCESSIBILITY_STORAGE_KEY
      );

      if (!stored) return;

      const preferences = JSON.parse(stored) as Record<string, unknown>;

      setReducedMotion(preferences.reducedMotion === true);
      setLargeText(preferences.largeText === true);
      setHighContrast(preferences.highContrast === true);
      setFocusMode(preferences.focusMode === true);
    } catch {
      // Accessibility preferences are optional; ignore malformed local state.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        ACCESSIBILITY_STORAGE_KEY,
        JSON.stringify({
          reducedMotion,
          largeText,
          highContrast,
          focusMode,
        })
      );
    } catch {
      // Local persistence can fail in privacy-restricted browser contexts.
    }
  }, [reducedMotion, largeText, highContrast, focusMode]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice("");
    }, 3600);

    return () => window.clearTimeout(timer);
  }, [notice]);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
  }, []);

  // ==========================================================
  // JUSTICE ROUTE UI HELPERS — PHASE 8.7
  // ==========================================================

  function getJusticeRoutesForCase(): JusticeRoute[] {
    if (!result?.case_id) return [];
    return PHASE_7_JUSTICE_ROUTES.filter(
      (route) => route.case_id === result.case_id
    );
  }

  function getSelectedJusticeRoute(): JusticeRoute | null {
    const routes = getJusticeRoutesForCase();
    return (
      routes.find((route) => route.route_type === selectedRouteType) ||
      routes[0] ||
      null
    );
  }

  function getRouteStepStatus(step: JusticeRouteStep): JusticeRouteStep["status"] {
    return routeStepStatuses[step.step_id] || step.status;
  }

  function getRouteCompletedCount(route: JusticeRoute): number {
    return route.steps.filter(
      (step) => getRouteStepStatus(step) === "COMPLETED"
    ).length;
  }

  function handleRouteStepAction(step: JusticeRouteStep) {
    const currentStatus = getRouteStepStatus(step);
    if (currentStatus === "BLOCKED" || currentStatus === "SKIPPED" || currentStatus === "COMPLETED") return;

    if (currentStatus === "READY" || currentStatus === "PENDING") {
      setRouteStepStatuses((previous) => ({
        ...previous,
        [step.step_id]: "IN_PROGRESS",
      }));
      setRouteActionMessage(`Step ${step.step_number} is now in progress: ${step.title}`);
      return;
    }

    setRouteStepStatuses((previous) => ({
      ...previous,
      [step.step_id]: "COMPLETED",
    }));
    setRouteActionMessage(`Step ${step.step_number} marked complete: ${step.title}`);
  }

  function resetJusticeRouteSession() {
    setRouteStepStatuses({});
    setRouteActionMessage("");
  }

  const caseRoutes = useMemo(
    () =>
      result?.case_id
        ? PHASE_7_JUSTICE_ROUTES.filter(
          (route) => route.case_id === result.case_id
        )
        : [],
    [result?.case_id]
  );

  const selectedJusticeRoute = useMemo(
    () =>
      caseRoutes.find(
        (route) => route.route_type === selectedRouteType
      ) || caseRoutes[0] || null,
    [caseRoutes, selectedRouteType]
  );

  // ==========================================================
  // CASE JOURNEY — LIVE PRODUCT STATE
  // ==========================================================

  const caseJourney = useMemo(() => {
    const route = selectedJusticeRoute;
    const steps = route?.steps || [];
    const resolvedSteps = steps.map((step) => ({
      ...step,
      status: getRouteStepStatus(step),
    }));

    const activeStep =
      resolvedSteps.find((step) => step.status === "IN_PROGRESS") ||
      resolvedSteps.find((step) => step.status === "READY") ||
      resolvedSteps.find((step) => step.status === "PENDING") ||
      null;

    const completedSteps = resolvedSteps.filter(
      (step) => step.status === "COMPLETED"
    );

    const waitingForExternalResponse = completedSteps.some((step) =>
      ["CONTACT_AUTHORITY", "FILE_COMPLAINT", "FILE_GRIEVANCE", "ESCALATE"].includes(
        step.step_type
      )
    );

    const humanReviewRequired = Boolean(
      route?.requires_human_review ||
      route?.steps.some((step) => step.requires_human_review) ||
      legalInfo?.needs_human_review
    );

    const routeComplete = Boolean(
      route &&
      resolvedSteps.length > 0 &&
      resolvedSteps.every((step) =>
        ["COMPLETED", "SKIPPED"].includes(step.status)
      )
    );

    const derivedState = !result
      ? "NEW"
      : humanReviewRequired &&
        (result.status === "HUMAN_REVIEW" || legalInfo?.needs_human_review)
        ? "HUMAN_REVIEW"
        : activeStep?.status === "IN_PROGRESS"
          ? "ACTION_IN_PROGRESS"
          : routeComplete
            ? "AWAITING_RESPONSE"
            : route
              ? "ROUTE_READY"
              : legalInfo
                ? "SAFETY_CHECK"
                : graph
                  ? "LEGAL_ANALYSIS"
                  : intelligence
                    ? "VERIFIED"
                    : evidence.length > 0
                      ? "VERIFIED"
                      : "NEW";

    const timeline = [
      {
        id: "case",
        title: "Case loaded",
        detail: result
          ? result.title
          : "No case is currently loaded.",
        status: result ? "COMPLETE" : "PENDING",
        accent: "#60a5fa",
      },
      {
        id: "evidence",
        title: "Evidence record",
        detail: evidence.length
          ? `${evidence.length} evidence item${evidence.length === 1 ? "" : "s"} available.`
          : "Supporting evidence has not been loaded.",
        status: evidence.length ? "COMPLETE" : "PENDING",
        accent: "#4ade80",
      },
      {
        id: "facts",
        title: "Verified facts",
        detail: intelligence
          ? "Case Intelligence is available for this case."
          : "Case Intelligence has not been generated.",
        status: intelligence ? "COMPLETE" : "PENDING",
        accent: "#c084fc",
      },
      {
        id: "graph",
        title: "Justice Graph",
        detail: graph
          ? `${graph.summary.node_count} nodes and ${graph.summary.edge_count} relationships loaded.`
          : "Justice Graph has not been loaded.",
        status: graph ? "COMPLETE" : "PENDING",
        accent: "#22d3ee",
      },
      {
        id: "law",
        title: "Relevant law",
        detail: legalInfo
          ? `${legalInfo.result_count || legalInfo.results?.length || 0} retrieved legal result${(legalInfo.result_count || legalInfo.results?.length || 0) === 1 ? "" : "s"}.`
          : "Legal retrieval has not been completed.",
        status: legalInfo ? "COMPLETE" : "PENDING",
        accent: "#fbbf24",
      },
      {
        id: "safety",
        title: "Safety check",
        detail: legalInfo
          ? legalInfo.needs_human_review
            ? "Human review is required before relying on the legal output."
            : "Safety review data is available."
          : "Safety check is waiting for legal retrieval.",
        status: legalInfo
          ? legalInfo.needs_human_review
            ? "HUMAN REVIEW"
            : "READY"
          : "PENDING",
        accent: "#f59e0b",
      },
      {
        id: "route",
        title: "Justice route",
        detail: route
          ? `${route.title} — ${completedSteps.length}/${resolvedSteps.length} steps completed.`
          : "No justice route is available for the loaded case.",
        status: route
          ? routeComplete
            ? "COMPLETE"
            : "ACTIVE"
          : "PENDING",
        accent: "#60a5fa",
      },
      {
        id: "action",
        title: "Current action",
        detail: activeStep
          ? `${activeStep.title} — ${activeStep.action_text}`
          : "No active route action.",
        status: activeStep
          ? activeStep.status
          : "PENDING",
        accent: "#38bdf8",
      },
      {
        id: "response",
        title: "External response",
        detail: waitingForExternalResponse
          ? "An external authority, bank, or grievance channel may still need to respond. NYAYAOS does not invent a response."
          : "No external response is currently recorded in the frontend session.",
        status: waitingForExternalResponse ? "AWAITING RESPONSE" : "NOT RECORDED",
        accent: "#a3a3a3",
      },
      {
        id: "human",
        title: "Human handoff",
        detail: humanReviewRequired
          ? "Qualified human review is required or available on this path."
          : "No human handoff is currently required by the loaded route.",
        status: humanReviewRequired ? "REQUIRED" : "NOT REQUIRED",
        accent: "#c084fc",
      },
    ];

    return {
      derivedState,
      route,
      resolvedSteps,
      activeStep,
      completedSteps,
      waitingForExternalResponse,
      humanReviewRequired,
      routeComplete,
      timeline,
    };
  }, [
    selectedJusticeRoute,
    routeStepStatuses,
    result,
    evidence,
    intelligence,
    graph,
    legalInfo,
  ]);

  const journeyCompletedCount = useMemo(
    () =>
      getJourneyCompletedCount({
        result,
        evidence,
        intelligence,
        graph,
        legalInfo,
      }),
    [result, evidence, intelligence, graph, legalInfo]
  );

  const walkthroughStatuses = useMemo(
    () => {
      const safetyReady = Boolean(legalInfo);
      const routeReady = Boolean(selectedJusticeRoute);
      const humanReady =
        result?.status === "HUMAN_REVIEW" ||
        Boolean(legalInfo?.needs_human_review);

      return [
        Boolean(result),
        Boolean(result && evidence.length > 0),
        Boolean(intelligence),
        Boolean(graph),
        Boolean(legalInfo),
        safetyReady,
        routeReady,
        humanReady,
        false,
        Boolean(result && selectedJusticeRoute),
      ];
    },
    [
      result,
      evidence.length,
      intelligence,
      graph,
      legalInfo,
      selectedJusticeRoute,
    ]
  );

  const walkthroughCompletedCount = walkthroughStatuses.filter(Boolean).length;

  // ==========================================================
  // CREATE CASE
  // ==========================================================

  async function createCase() {
    if (!title || !description) {
      setCreateError("Please enter the title and description before creating the case.");
      return;
    }

    setLoading(true);
    setCreateError("");

    setResult(null);
    setEvidence([]);
    setSelectedFiles([]);
    setUploadError("");
    setEvidenceError("");
    setExistingCaseError("");

    setIntelligence(null);
    setIntelligenceError("");
    setGraph(null);
    setGraphError("");
    setSelectedGraphNode(null);
    setLegalInfo(null);
    setLegalError("");

    try {
      const response = await fetch(
        `${API_URL}/api/cases`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            description,
            jurisdiction_country: country,
            jurisdiction_state: state,
          }),
        }
      );

      if (!response.ok) {
        const errorData =
          await response.json().catch(
            () => null
          );

        throw new Error(
          errorData?.detail ||
          "Case creation failed."
        );
      }

      const data: CaseResult =
        await response.json();

      setResult(data);
    } catch (error) {
      console.error(error);

      setCreateError(
        error instanceof Error
          ? error.message
          : "Could not create the case."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // SELECT EVIDENCE FILES
  // ==========================================================

  function handleFileSelection(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    if (!event.target.files) {
      return;
    }

    const files = Array.from(
      event.target.files
    );

    setSelectedFiles(files);
  }

  // ==========================================================
  // UPLOAD EVIDENCE
  // ==========================================================

  async function uploadEvidence() {
    if (!result?.case_id) {
      setUploadError("Create a case before uploading evidence.");
      return;
    }

    if (selectedFiles.length === 0) {
      setUploadError("Select at least one evidence file before uploading.");
      return;
    }

    setUploadError("");
    setUploading(true);

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();

        formData.append("file", file);

        const response = await fetch(
          `${API_URL}/api/cases/${result.case_id}/evidence`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData =
            await response.json().catch(
              () => null
            );

          throw new Error(
            errorData?.detail ||
            `Failed to upload ${file.name}`
          );
        }
      }

      setSelectedFiles([]);
      setUploadError("");

      // Existing intelligence becomes stale
      // after new evidence is uploaded.
      setIntelligence(null);
      setIntelligenceError("");
      setGraph(null);
      setGraphError("");
      setSelectedGraphNode(null);
      setLegalInfo(null);
      setLegalError("");

      await loadEvidence(
        result.case_id
      );

      showNotice("Evidence uploaded successfully.");
    } catch (error) {
      console.error(error);

      setUploadError(
        error instanceof Error
          ? error.message
          : "Evidence upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  // ==========================================================
  // LOAD CASE EVIDENCE
  // ==========================================================

  async function loadEvidence(
    caseId: string
  ) {
    setEvidenceError("");
    setEvidenceLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/cases/${caseId}/evidence`
      );

      if (!response.ok) {
        const errorData =
          await response.json().catch(
            () => null
          );

        throw new Error(
          errorData?.detail ||
          "Failed to retrieve evidence."
        );
      }

      const data =
        await response.json();

      setEvidence(
        data.evidence || []
      );
      setEvidenceError("");
    } catch (error) {
      console.error(error);

      setEvidenceError(
        error instanceof Error
          ? error.message
          : "Could not load case evidence."
      );
    } finally {
      setEvidenceLoading(false);
    }
  }

  // ==========================================================
  // GENERATE CASE INTELLIGENCE
  // ==========================================================

  async function generateCaseIntelligence() {
    if (!result?.case_id) {
      setIntelligenceError("Create a case before generating case intelligence.");
      return;
    }

    if (evidence.length === 0) {
      setIntelligenceError("Upload at least one evidence file before generating case intelligence.");
      return;
    }

    setIntelligenceLoading(true);
    setIntelligenceError("");
    setIntelligence(null);

    try {
      const endpoint =
        `${API_URL}/api/cases/${result.case_id}/intelligence`;

      console.log("NYAYAOS Case Intelligence request:", endpoint);

      let response: Response;

      try {
        response = await fetch(endpoint, {
          method: "POST",
          mode: "cors",
          credentials: "omit",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });
      } catch (networkError) {
        console.error(
          "NYAYAOS network error:",
          networkError
        );

        throw new Error(
          `Cannot connect to the NYAYAOS backend at ${API_URL}. ` +
          `Make sure FastAPI is running with "uvicorn main:app --reload".`
        );
      }

      const data =
        await response.json().catch(
          () => null
        );

      if (!response.ok) {
        throw new Error(
          data?.detail ||
          "Failed to generate case intelligence."
        );
      }

      setIntelligence(data);
    } catch (error) {
      console.error(
        "Case intelligence error:",
        error
      );

      setIntelligenceError(
        error instanceof Error
          ? error.message
          : "Failed to generate case intelligence."
      );
    } finally {
      setIntelligenceLoading(false);
    }
  }


  // ==========================================================
  // LOAD JUSTICE GRAPH
  // ==========================================================

  async function loadJusticeGraph(
    caseId: string
  ) {
    setGraphLoading(true);
    setGraphError("");

    try {
      const response = await fetch(
        `${API_URL}/api/cases/${caseId}/graph`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data =
        await response.json().catch(
          () => null
        );

      if (!response.ok) {
        throw new Error(
          data?.detail ||
          "Failed to load the Justice Graph."
        );
      }

      setGraph(data);
    } catch (error) {
      console.error(
        "Justice Graph error:",
        error
      );

      setGraphError(
        error instanceof Error
          ? error.message
          : "Failed to load the Justice Graph."
      );
    } finally {
      setGraphLoading(false);
    }
  }


  // ==========================================================
  // LOAD LEGAL INFORMATION
  // ==========================================================

  async function loadLegalInformation(
    caseId: string
  ) {
    if (!caseId) {
      return;
    }

    setLegalLoading(true);
    setLegalError("");
    setLegalInfo(null);

    try {
      const response = await fetch(
        `${API_URL}/api/legal/case/${caseId}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data =
        await response.json().catch(
          () => null
        );

      if (!response.ok) {
        throw new Error(
          data?.detail ||
          "Failed to retrieve legal information."
        );
      }

      setLegalInfo(data);
    } catch (error) {
      console.error(
        "Legal information error:",
        error
      );

      setLegalError(
        error instanceof Error
          ? error.message
          : "Failed to retrieve legal information."
      );
    } finally {
      setLegalLoading(false);
    }
  }


  // ==========================================================
  // LOAD EXISTING CASE / DEMO CASE
  // ==========================================================

  async function loadExistingCaseById(caseId: string) {
    const normalizedCaseId = caseId.trim();

    if (!normalizedCaseId) {
      setExistingCaseError("Enter a Case ID before loading an existing case.");
      return;
    }

    setExistingCaseError("");
    setExistingCaseLoading(true);
    setGraph(null);
    setGraphError("");
    setSelectedGraphNode(null);
    setIntelligence(null);
    setIntelligenceError("");
    setLegalInfo(null);
    setLegalError("");
    setRouteStepStatuses({});
    setRouteActionMessage("");

    try {
      const casesResponse = await fetch(
        `${API_URL}/api/cases`,
        {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        }
      );

      const casesData = await casesResponse.json().catch(() => null);

      if (!casesResponse.ok) {
        throw new Error(
          casesData?.detail ||
          "Cases could not be loaded."
        );
      }

      const caseList = Array.isArray(casesData)
        ? casesData
        : Array.isArray(casesData?.cases)
          ? casesData.cases
          : [];

      const caseData = caseList.find(
        (item: { case_id?: string }) =>
          item.case_id === normalizedCaseId
      );

      if (!caseData) {
        throw new Error("Case not found. Check the Case ID.");
      }

      const graphResponse = await fetch(
        `${API_URL}/api/cases/${normalizedCaseId}/graph`,
        {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        }
      );

      const graphData = await graphResponse.json().catch(() => null);

      if (!graphResponse.ok) {
        throw new Error(
          graphData?.detail ||
          "Justice Graph could not be loaded."
        );
      }

      setResult(caseData);
      setExistingCaseId(normalizedCaseId);
      setExistingCaseError("");
      setGraph(graphData);

      await Promise.all([
        loadEvidence(normalizedCaseId),
        loadLegalInformation(normalizedCaseId),
      ]);

      showNotice("Case loaded. NYAYAOS is ready for the next verified workflow step.");
    } catch (error) {
      console.error("Existing case loading error:", error);

      setExistingCaseError(
        error instanceof Error
          ? error.message
          : "Failed to load existing case."
      );
    } finally {
      setExistingCaseLoading(false);
    }
  }

  async function loadExistingCase() {
    await loadExistingCaseById(existingCaseId);
  }

  async function loadDemoCase() {
    setDemoMode(true);
    setTitle(DEMO_CASE.title);
    setDescription(DEMO_CASE.description);
    setCountry(DEMO_CASE.country);
    setState(DEMO_CASE.state);
    setExistingCaseId(DEMO_CASE.case_id);
    await loadExistingCaseById(DEMO_CASE.case_id);
  }

  // ==========================================================
  // GRAPH NODE STYLE
  // ==========================================================

  function getGraphNodeStyle(
    nodeType: string
  ) {
    const styles: Record<
      string,
      {
        border: string;
        background: string;
        accent: string;
      }
    > = {
      CASE: {
        border: "#ffffff",
        background: "#151515",
        accent: "#ffffff",
      },
      PERSON: {
        border: "#4ade80",
        background: "#0b1710",
        accent: "#4ade80",
      },
      ORGANIZATION: {
        border: "#60a5fa",
        background: "#0b111b",
        accent: "#60a5fa",
      },
      EVENT: {
        border: "#fbbf24",
        background: "#171307",
        accent: "#fbbf24",
      },
      CLAIM: {
        border: "#c084fc",
        background: "#150c1c",
        accent: "#c084fc",
      },
      ISSUE: {
        border: "#fb7185",
        background: "#1a0b10",
        accent: "#fb7185",
      },
      DOCUMENT: {
        border: "#22d3ee",
        background: "#07161a",
        accent: "#22d3ee",
      },
    };

    return (
      styles[nodeType] || {
        border: "#666",
        background: "#101010",
        accent: "#aaa",
      }
    );
  }

  // ==========================================================
  // GRAPH NODE POSITION
  // ==========================================================

  function getGraphPosition(
    node: GraphNode,
    nodes: GraphNode[]
  ) {
    const order = [
      "CASE",
      "PERSON",
      "ORGANIZATION",
      "EVENT",
      "ISSUE",
      "CLAIM",
      "DOCUMENT",
    ];

    const groups: Record<
      string,
      GraphNode[]
    > = {};

    for (const item of nodes) {
      if (!groups[item.node_type]) {
        groups[item.node_type] = [];
      }

      groups[item.node_type].push(item);
    }

    const column =
      order.indexOf(node.node_type) >= 0
        ? order.indexOf(node.node_type)
        : order.length;

    const row = (
      groups[node.node_type] || []
    ).findIndex(
      (item) =>
        item.node_id === node.node_id
    );

    return {
      x: 50 + column * 230,
      y: 55 + Math.max(row, 0) * 135,
    };
  }

  // ==========================================================
  // GRAPH EDGE STATUS
  // ==========================================================

  function getGraphEdgeStatus(
    edge: GraphEdge
  ) {
    const confidence =
      Number(edge.confidence || 0);

    const status =
      isObject(edge.properties)
        ? edge.properties.evidence_status
        : undefined;

    if (
      edge.relationship_type ===
      "SUPPORTS"
    ) {
      if (status === "SUPPORTED") {
        return {
          stroke: "#4ade80",
          width: 3,
          label: `SUPPORTED ${Math.round(
            confidence * 100
          )}%`,
        };
      }

      if (status === "PARTIAL") {
        return {
          stroke: "#fbbf24",
          width: 2,
          label: `PARTIAL ${Math.round(
            confidence * 100
          )}%`,
        };
      }

      return {
        stroke: "#888",
        width: 2,
        label: `SUPPORTS ${Math.round(
          confidence * 100
        )}%`,
      };
    }

    return {
      stroke: "#555",
      width: 1.5,
      label: formatLabel(
        edge.relationship_type
      ),
    };
  }

  // ==========================================================
  // EVIDENCE COVERAGE
  // ==========================================================

  function getEvidenceCoverage() {
    if (!graph) {
      return null;
    }

    const claims = graph.nodes.filter(
      (node) =>
        node.node_type === "CLAIM"
    );

    let supported = 0;
    let partial = 0;
    let missing = 0;

    for (const claim of claims) {
      const relationships =
        graph.edges.filter(
          (edge) =>
            edge.relationship_type ===
            "SUPPORTS" &&
            edge.target_node_id ===
            claim.node_id
        );

      if (relationships.length === 0) {
        missing++;
        continue;
      }

      const confidence = Math.max(
        ...relationships.map(
          (edge) =>
            Number(edge.confidence || 0)
        )
      );

      if (confidence >= 0.7) {
        supported++;
      } else if (confidence >= 0.4) {
        partial++;
      } else {
        missing++;
      }
    }

    const percentage =
      claims.length === 0
        ? 0
        : Math.round(
          (
            (supported +
              partial * 0.5) /
            claims.length
          ) *
          100
        );

    return {
      total: claims.length,
      supported,
      partial,
      missing,
      percentage,
    };
  }


  // ==========================================================
  // EVIDENCE GRAPH DATA
  // ==========================================================

  function getEvidenceGraphData() {
    if (!graph) {
      return {
        documents: [],
        claims: [],
        relationships: [],
      };
    }

    const documents = graph.nodes.filter(
      (node) =>
        node.node_type === "DOCUMENT" ||
        node.node_type === "EVIDENCE"
    );

    const claims = graph.nodes.filter(
      (node) =>
        node.node_type === "CLAIM"
    );

    const relationships = graph.edges.filter(
      (edge) =>
        edge.relationship_type === "SUPPORTS" &&
        documents.some(
          (document) =>
            document.node_id ===
            edge.source_node_id
        ) &&
        claims.some(
          (claim) =>
            claim.node_id ===
            edge.target_node_id
        )
    );

    return {
      documents,
      claims,
      relationships,
    };
  }

  // ==========================================================
  // FORMAT FILE TYPE
  // ==========================================================

  function getFileTypeLabel(
    fileType: string
  ) {
    if (fileType === "application/pdf") {
      return "PDF";
    }

    if (fileType === "image/png") {
      return "PNG IMAGE";
    }

    if (fileType === "image/jpeg") {
      return "JPEG IMAGE";
    }

    if (fileType === "text/plain") {
      return "TEXT";
    }

    return fileType;
  }

  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  function formatDate(date: string) {
    return new Date(date).toLocaleString();
  }

  // ==========================================================
  // MAIN UI
  // ==========================================================

  const caseIntelligence =
    intelligence?.case_intelligence;

  const activeLoadingOperations = [
    loading && "Creating case",
    uploading && "Uploading evidence",
    evidenceLoading && "Loading evidence",
    intelligenceLoading && "Analyzing case intelligence",
    graphLoading && "Loading Justice Graph",
    existingCaseLoading && "Loading existing case",
    legalLoading && "Retrieving legal information",
  ].filter(Boolean) as string[];

  const isAnyLoading =
    activeLoadingOperations.length > 0;

  const activeLoadingLabel =
    activeLoadingOperations[0] || "";

  return (
    <main
      id="main-content"
      aria-busy={isAnyLoading}
      className={[
        reducedMotion ? "nyayaos-reduced-motion" : "",
        largeText ? "nyayaos-large-text" : "",
        highContrast ? "nyayaos-high-contrast" : "",
        focusMode ? "nyayaos-focus-mode" : "",
      ].filter(Boolean).join(" ")}
      style={{
        minHeight: "100vh",
        padding: "44px 20px 80px",
        fontFamily:
          "Arial, sans-serif",
        background: "#050505",
        color: "white",
      }}
    >
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        <style>{`
          @keyframes nyayaos-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes nyayaos-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }

          @keyframes nyayaos-loading-bar {
            0% { transform: translateX(-130%); }
            100% { transform: translateX(330%); }
          }

          :root {
            color-scheme: dark;
          }

          html {
            scroll-behavior: smooth;
          }

          * {
            box-sizing: border-box;
          }

          button, input, textarea, select, a {
            font: inherit;
          }

          button:not(:disabled), a {
            transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, opacity 140ms ease, box-shadow 140ms ease;
          }

          button:not(:disabled):hover {
            transform: translateY(-1px);
            border-color: #4b5563 !important;
          }

          button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible {
            outline: 3px solid #60a5fa;
            outline-offset: 3px;
          }

          input, textarea, select {
            border-radius: 8px;
            border-color: #333 !important;
            background: #080808 !important;
            color: #f3f4f6 !important;
          }

          input::placeholder, textarea::placeholder {
            color: #666;
          }

          .nyayaos-skip-link {
            position: fixed;
            left: 12px;
            top: 12px;
            z-index: 1000;
            transform: translateY(-180%);
            padding: 10px 14px;
            border: 1px solid #60a5fa;
            border-radius: 8px;
            background: #08111c;
            color: #dbeafe;
            text-decoration: none;
            font-size: 12px;
            font-weight: 700;
          }

          .nyayaos-skip-link:focus {
            transform: translateY(0);
          }

          .nyayaos-large-text {
            font-size: 106%;
          }

          .nyayaos-large-text input, .nyayaos-large-text textarea, .nyayaos-large-text button {
            font-size: 105%;
          }

          .nyayaos-high-contrast {
            --nyayaos-muted: #b8b8b8;
          }

          .nyayaos-high-contrast section, .nyayaos-high-contrast article, .nyayaos-high-contrast aside {
            border-color: #555 !important;
          }

          .nyayaos-high-contrast p, .nyayaos-high-contrast span, .nyayaos-high-contrast div {
            --nyayaos-muted: #c9c9c9;
          }

          .nyayaos-focus-mode section:not(#case-dashboard):not(#case-intake):not(#evidence):not(#case-intelligence):not(#justice-graph):not(#evidence-graph):not(#legal-information):not(#safety-stage):not(#route-stage):not(#human-stage):not(#packet-stage):not(#journey-stage) {
            opacity: 0.72;
          }

          .nyayaos-reduced-motion *, .nyayaos-reduced-motion *::before, .nyayaos-reduced-motion *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
            scroll-behavior: auto !important;
          }

          .nyayaos-glass {
            background: rgba(10, 10, 10, 0.84);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
          }

          @media (max-width: 720px) {
            main {
              padding: 32px 14px !important;
            }

            h1 {
              font-size: 36px !important;
            }

            nav {
              top: 0 !important;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              scroll-behavior: auto !important;
              animation-duration: 0.001ms !important;
              transition-duration: 0.001ms !important;
            }
          }
        `}</style>

        <a className="nyayaos-skip-link" href="#main-content">Skip to main content</a>

        <div role="region" aria-label="NYAYAOS accessibility and demo controls" style={{ position: "fixed", right: "18px", bottom: "18px", zIndex: 80, display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap", maxWidth: "calc(100vw - 36px)", justifyContent: "flex-end" }}>
          {notice && (
            <div role="status" aria-live="polite" style={{ maxWidth: "360px", padding: "10px 13px", border: "1px solid #28523a", borderRadius: "9px", background: "rgba(7, 18, 12, 0.96)", color: "#9be7b2", fontSize: "11px", lineHeight: "1.45", boxShadow: "0 12px 30px rgba(0,0,0,.35)" }}>
              {notice}
            </div>
          )}
          <button type="button" onClick={() => setWalkthroughOpen((value) => !value)} aria-expanded={walkthroughOpen} aria-controls="walkthrough-panel" style={{ padding: "9px 12px", border: "1px solid #35465a", borderRadius: "999px", background: "#09111b", color: "#b8d8ff", cursor: "pointer", fontSize: "11px", fontWeight: "700" }}>
            Product Walkthrough
          </button>
          <button type="button" onClick={() => setAccessibilityOpen((value) => !value)} aria-expanded={accessibilityOpen} aria-controls="accessibility-panel" style={{ padding: "9px 12px", border: "1px solid #444", borderRadius: "999px", background: "#0c0c0c", color: "#ddd", cursor: "pointer", fontSize: "11px", fontWeight: "700" }}>
            Accessibility
          </button>
          <button type="button" onClick={loadDemoCase} disabled={existingCaseLoading} aria-label="Load the NYAYAOS demo case" style={{ padding: "9px 12px", border: "1px solid #3b5b45", borderRadius: "999px", background: "#09130d", color: "#9be7b2", cursor: existingCaseLoading ? "wait" : "pointer", fontSize: "11px", fontWeight: "700" }}>
            {demoMode ? "Demo Case Loaded" : "Load Demo Case"}
          </button>
        </div>

        {accessibilityOpen && (
          <section id="accessibility-panel" aria-label="Accessibility settings" style={{ position: "fixed", right: "18px", bottom: "70px", zIndex: 79, width: "min(340px, calc(100vw - 36px))", padding: "16px", border: "1px solid #333", borderRadius: "12px", background: "rgba(8,8,8,.98)", boxShadow: "0 18px 50px rgba(0,0,0,.45)" }}>
            <div style={{ color: "#eee", fontWeight: "800", fontSize: "13px" }}>Accessibility</div>
            <p style={{ margin: "6px 0 13px", color: "#777", fontSize: "11px", lineHeight: "1.5" }}>Preferences are stored locally in this browser and do not change NYAYAOS legal or safety decisions.</p>
            {[
              ["Reduced motion", reducedMotion, setReducedMotion],
              ["Large text", largeText, setLargeText],
              ["Higher contrast", highContrast, setHighContrast],
              ["Focus mode", focusMode, setFocusMode],
            ].map(([label, value, setter]) => (
              <label key={String(label)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "9px 0", borderTop: "1px solid #1f1f1f", color: "#bbb", fontSize: "12px", cursor: "pointer" }}>
                <span>{String(label)}</span>
                <input type="checkbox" checked={Boolean(value)} onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)} aria-label={String(label)} style={{ width: "18px", height: "18px", accentColor: "#60a5fa" }} />
              </label>
            ))}
          </section>
        )}

        {walkthroughOpen && (
          <section id="walkthrough-panel" aria-label="Full product walkthrough" className="nyayaos-glass" style={{ position: "fixed", inset: "74px 18px auto auto", zIndex: 78, width: "min(520px, calc(100vw - 36px))", maxHeight: "calc(100vh - 110px)", overflowY: "auto", padding: "18px", border: "1px solid #333", borderRadius: "14px", boxShadow: "0 22px 70px rgba(0,0,0,.55)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
              <div>
                <div style={{ color: "#22d3ee", fontSize: "10px", fontWeight: "800", letterSpacing: "1.2px", textTransform: "uppercase" }}>Full Product Walkthrough</div>
                <h2 style={{ margin: "6px 0 5px", fontSize: "20px" }}>NYAYAOS Justice Journey</h2>
                <p style={{ margin: 0, color: "#777", fontSize: "11px", lineHeight: "1.5" }}>Guided navigation through the ten product stages. A stage is not presented as complete unless its underlying data is available.</p>
              </div>
              <button type="button" onClick={() => setWalkthroughOpen(false)} aria-label="Close product walkthrough" style={{ padding: "7px 10px", border: "1px solid #333", borderRadius: "7px", background: "#111", color: "#aaa", cursor: "pointer" }}>Close</button>
            </div>
            <div style={{ marginTop: "16px", padding: "10px 12px", border: "1px solid #222", borderRadius: "8px", background: "#0b0b0b" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", color: "#999", fontSize: "10px", marginBottom: "7px" }}><span>{walkthroughCompletedCount}/10 stages available</span><span>{Math.round((walkthroughCompletedCount / 10) * 100)}%</span></div>
              <div role="progressbar" aria-label="Product walkthrough availability" aria-valuemin={0} aria-valuemax={10} aria-valuenow={walkthroughCompletedCount} style={{ height: "5px", borderRadius: "999px", background: "#1d1d1d", overflow: "hidden" }}><div style={{ width: `${(walkthroughCompletedCount / 10) * 100}%`, height: "100%", background: "#22d3ee", borderRadius: "999px" }} /></div>
            </div>
            <div style={{ marginTop: "12px", display: "grid", gap: "7px" }}>
              {JOURNEY_STAGES.map((stage, index) => {
                const available = walkthroughStatuses[index];
                return (
                  <button key={stage.id} type="button" onClick={() => { setWalkthroughOpen(false); scrollToJourneyStage(stage); }} style={{ display: "grid", gridTemplateColumns: "36px minmax(0, 1fr) auto", gap: "10px", alignItems: "center", width: "100%", padding: "10px", border: available ? "1px solid #294a36" : "1px solid #252525", borderRadius: "9px", background: available ? "#09130d" : "#0a0a0a", color: "#ddd", cursor: "pointer", textAlign: "left" }}>
                    <span style={{ width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: available ? "#102319" : "#121212", color: available ? "#6ee7a0" : "#777", fontSize: "10px", fontWeight: "800" }}>{available ? "✓" : String(stage.number).padStart(2, "0")}</span>
                    <span><strong style={{ display: "block", fontSize: "12px" }}>{stage.title}</strong><span style={{ display: "block", marginTop: "3px", color: "#666", fontSize: "10px" }}>{stage.description}</span></span>
                    <span style={{ color: available ? "#6ee7a0" : "#666", fontSize: "9px", fontWeight: "800" }}>{available ? "AVAILABLE" : "UP NEXT"}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}


        {isAnyLoading && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: "sticky",
              top: "0",
              zIndex: 40,
              marginBottom: "14px",
              padding: "10px 14px",
              border: "1px solid #24344a",
              borderRadius: "9px",
              background: "rgba(8, 13, 20, 0.96)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 8px 25px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
                flexWrap: "wrap",
              }}
            >
              <LoadingSpinner
                size={16}
                label={activeLoadingLabel}
              />
              <span
                style={{
                  color: "#666",
                  fontSize: "11px",
                }}
              >
                {activeLoadingOperations.length > 1
                  ? `${activeLoadingOperations.length} operations in progress`
                  : "Please wait"}
              </span>
            </div>
            <div
              aria-hidden="true"
              style={{
                height: "2px",
                marginTop: "9px",
                overflow: "hidden",
                borderRadius: "999px",
                background: "#172131",
              }}
            >
              <div
                style={{
                  width: "42%",
                  height: "100%",
                  borderRadius: "999px",
                  background: "#60a5fa",
                  animation: "nyayaos-loading-bar 1.2s ease-in-out infinite",
                }}
              />
            </div>
          </div>
        )}

        {/* ==================================================
            HEADER
        ================================================== */}

        <h1
          style={{
            fontSize: "48px",
            marginBottom: "10px",
          }}
        >
          NYAYAOS
        </h1>

        <p
          style={{
            fontSize: "20px",
            marginBottom: "12px",
            color: "#aaa",
          }}
        >
          AI-Powered Justice Operating System
        </p>

        <div
          aria-live="polite"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "28px",
            color: "#666",
            fontSize: "11px",
          }}
        >
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: demoMode ? "#4ade80" : "#555" }} aria-hidden="true" />
          {demoMode ? "Demo case loaded" : "Production workflow"}
          <span aria-hidden="true">·</span>
          Accessibility-ready interface
          <span aria-hidden="true">·</span>
          Traceable workflow presentation
        </div>

        {/* ==================================================
            PRIMARY NAVIGATION — PHASE 8.2
        ================================================== */}

        <nav
          aria-label="NYAYAOS primary navigation"
          style={{
            position: "sticky",
            top: "0",
            zIndex: 30,
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            padding: "10px 0 12px",
            marginBottom: "18px",
            background: "#050505",
            scrollbarWidth: "none",
          }}
        >
          {[
            ["case-dashboard", "Dashboard"],
            ["case-intake", "Intake"],
            ["evidence", "Evidence"],
            ["case-intelligence", "Facts"],
            ["justice-graph", "Justice Graph"],
            ["evidence-graph", "Evidence Graph"],
            ["legal-information", "Legal"],
            ["safety-stage", "Safety"],
            ["route-stage", "Route"],
            ["human-stage", "Human"],
            ["journey-stage", "Journey"],
          ].map(([target, label]) => (
            <a
              key={target}
              href={`#${target}`}
              onClick={(event) => {
                event.preventDefault();
                const element = document.getElementById(target);
                if (element) {
                  element.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }
              }}
              style={{
                flex: "0 0 auto",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "34px",
                padding: "7px 12px",
                border: "1px solid #333",
                borderRadius: "999px",
                color: "#bbb",
                background: "#0a0a0a",
                fontSize: "12px",
                fontWeight: "600",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* ==================================================
            CASE DASHBOARD — PHASE 8.3
        ================================================== */}

        {(() => {
          const coverage = getEvidenceCoverage();
          const completedCount = journeyCompletedCount;
          const progressPercent = Math.round(
            (completedCount / JOURNEY_STAGES.length) * 100
          );

          const currentStage =
            JOURNEY_STAGES[Math.min(
              completedCount,
              JOURNEY_STAGES.length - 1
            )];

          let nextAction = "Describe your problem to create or load a case.";
          if (result && evidence.length === 0) {
            nextAction = "Add supporting evidence to strengthen the case record.";
          } else if (result && !intelligence) {
            nextAction = "Generate Case Intelligence from the verified case evidence.";
          } else if (result && !graph) {
            nextAction = "Build the Justice Graph from the structured case facts.";
          } else if (result && !legalInfo) {
            nextAction = "Retrieve jurisdiction-aware legal information for the case.";
          } else if (legalInfo) {
            nextAction = legalInfo.needs_human_review
              ? "Review the safety outcome before presenting legal information as actionable."
              : "Review the legal sources and continue to the Justice Route.";
          }

          const statusLabel = result?.status || "CASE NOT LOADED";
          const jurisdiction = result
            ? `${result.jurisdiction_state || "State not set"}, ${result.jurisdiction_country || "Country not set"}`
            : "—";
          const factCount = intelligence
            ? (
              (intelligence.case_intelligence?.people?.length || 0) +
              (intelligence.case_intelligence?.organizations?.length || 0) +
              (intelligence.case_intelligence?.events?.length || 0) +
              (intelligence.case_intelligence?.factual_claims?.length || 0)
            )
            : 0;
          const legalResultCount = legalInfo?.result_count || 0;
          const safetyLabel = !legalInfo
            ? "PENDING"
            : legalInfo.needs_human_review
              ? "HUMAN REVIEW"
              : "REVIEW READY";

          const metricCards = [
            {
              label: "Case status",
              value: statusLabel,
              detail: result ? "Loaded case" : "No case loaded",
              accent: "#60a5fa",
            },
            {
              label: "Evidence",
              value: String(evidence.length),
              detail: coverage
                ? `${coverage.percentage}% claim coverage`
                : "No graph coverage yet",
              accent: "#4ade80",
            },
            {
              label: "Verified facts",
              value: String(factCount),
              detail: intelligence ? "Structured intelligence" : "Not generated",
              accent: "#c084fc",
            },
            {
              label: "Graph",
              value: graph ? String(graph.summary.node_count) : "0",
              detail: graph
                ? `${graph.summary.edge_count} relationships`
                : "Not loaded",
              accent: "#22d3ee",
            },
            {
              label: "Legal sources",
              value: String(legalResultCount),
              detail: legalInfo ? "Retrieved legal results" : "Not retrieved",
              accent: "#fbbf24",
            },
            {
              label: "Safety",
              value: safetyLabel,
              detail: legalInfo
                ? "Safety outcome available"
                : "Awaiting legal review",
              accent: legalInfo?.needs_human_review ? "#f97316" : "#fbbf24",
            },
          ];

          return (
            <section
              id="case-dashboard"
              aria-label="NYAYAOS case dashboard"
              style={{
                marginBottom: "30px",
                padding: "22px",
                border: "1px solid #333",
                borderRadius: "14px",
                background: "#080808",
                scrollMarginTop: "90px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "20px",
                  flexWrap: "wrap",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#777",
                      fontSize: "11px",
                      fontWeight: "700",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      marginBottom: "7px",
                    }}
                  >
                    NYAYAOS Case Dashboard
                  </div>
                  <h2 style={{ margin: 0, fontSize: "24px" }}>
                    Case Command Center
                  </h2>
                  <p
                    style={{
                      margin: "7px 0 0 0",
                      color: "#888",
                      lineHeight: "1.5",
                      maxWidth: "720px",
                    }}
                  >
                    One view of the current case state, evidence strength,
                    structured facts, legal retrieval, safety status, and next action.
                  </p>
                </div>

                <div
                  style={{
                    minWidth: "220px",
                    padding: "12px 14px",
                    border: "1px solid #292929",
                    borderRadius: "10px",
                    background: "#0b0b0b",
                  }}
                >
                  <div style={{ color: "#777", fontSize: "11px", marginBottom: "6px" }}>
                    CURRENT JOURNEY STAGE
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "700" }}>
                    {currentStage.title}
                  </div>
                  <div style={{ color: "#4ade80", fontSize: "12px", marginTop: "5px" }}>
                    {progressPercent}% complete
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: "10px",
                  marginBottom: "18px",
                }}
              >
                {metricCards.map((metric) => (
                  <div
                    key={metric.label}
                    style={{
                      padding: "14px",
                      border: "1px solid #292929",
                      borderRadius: "10px",
                      background: "#0b0b0b",
                      minHeight: "86px",
                    }}
                  >
                    <div
                      style={{
                        color: metric.accent,
                        fontSize: "10px",
                        fontWeight: "700",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        marginBottom: "8px",
                      }}
                    >
                      {metric.label}
                    </div>
                    <div
                      style={{
                        color: "#eee",
                        fontSize: "18px",
                        fontWeight: "700",
                        wordBreak: "break-word",
                      }}
                    >
                      {metric.value}
                    </div>
                    <div style={{ color: "#777", fontSize: "11px", marginTop: "5px" }}>
                      {metric.detail}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(240px, 0.55fr)",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    padding: "16px",
                    border: "1px solid #292929",
                    borderRadius: "10px",
                    background: "#0b0b0b",
                  }}
                >
                  <div style={{ color: "#777", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "7px" }}>
                    NEXT ACTION
                  </div>
                  <div style={{ color: "#eee", fontSize: "14px", lineHeight: "1.55" }}>
                    {nextAction}
                  </div>
                </div>

                <div
                  style={{
                    padding: "16px",
                    border: "1px solid #292929",
                    borderRadius: "10px",
                    background: "#0b0b0b",
                  }}
                >
                  <div style={{ color: "#777", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", marginBottom: "7px" }}>
                    JURISDICTION
                  </div>
                  <div style={{ color: "#eee", fontSize: "14px", fontWeight: "600" }}>
                    {jurisdiction}
                  </div>
                  <div style={{ color: "#666", fontSize: "11px", marginTop: "5px" }}>
                    Derived from the loaded case record.
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* ==================================================
            COMPLETE JUSTICE JOURNEY — PHASE 8.1
        ================================================== */}

        {(() => {
          const completedCount = journeyCompletedCount;

          const currentIndex = Math.min(
            completedCount,
            JOURNEY_STAGES.length - 1
          );

          const progressPercent = Math.round(
            (completedCount / JOURNEY_STAGES.length) * 100
          );

          return (
            <section
              aria-label="NYAYAOS Justice Journey"
              style={{
                position: "sticky",
                top: "12px",
                zIndex: 20,
                marginBottom: "30px",
                padding: "20px",
                border: "1px solid #333",
                borderRadius: "14px",
                background:
                  "rgba(8, 8, 8, 0.96)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 12px 35px rgba(0,0,0,0.35)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "20px",
                  flexWrap: "wrap",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "#777",
                      fontSize: "11px",
                      fontWeight: "700",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    NYAYAOS Justice Journey
                  </div>

                  <h2
                    style={{
                      margin: 0,
                      fontSize: "22px",
                    }}
                  >
                    From Problem to Verified Justice Path
                  </h2>

                  <p
                    style={{
                      margin: "7px 0 0 0",
                      color: "#888",
                      fontSize: "13px",
                      lineHeight: "1.5",
                    }}
                  >
                    {completedCount} of {JOURNEY_STAGES.length} core stages
                    currently available in this case.
                  </p>
                </div>

                <div
                  style={{
                    minWidth: "170px",
                    textAlign: "right",
                  }}
                >
                  <div
                    style={{
                      color: "#aaa",
                      fontSize: "12px",
                      marginBottom: "7px",
                    }}
                  >
                    Journey progress
                  </div>

                  <div
                    style={{
                      height: "7px",
                      background: "#222",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${progressPercent}%`,
                        height: "100%",
                        background: "#4ade80",
                        borderRadius: "999px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: "6px",
                      color: "#4ade80",
                      fontSize: "12px",
                      fontWeight: "700",
                    }}
                  >
                    {progressPercent}%
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(10, minmax(82px, 1fr))",
                  gap: "7px",
                  overflowX: "auto",
                  paddingBottom: "3px",
                }}
              >
                {JOURNEY_STAGES.map((stage, index) => {
                  const isComplete = index < completedCount;
                  const isCurrent = index === currentIndex;
                  const isAvailable = Boolean(stage.sectionId);

                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => scrollToJourneyStage(stage)}
                      disabled={!isAvailable}
                      title={stage.description}
                      style={{
                        minWidth: "82px",
                        padding: "10px 7px",
                        borderRadius: "9px",
                        border: isComplete
                          ? "1px solid #4ade80"
                          : isCurrent
                            ? "1px solid #60a5fa"
                            : "1px solid #292929",
                        background: isComplete
                          ? "#0b1710"
                          : isCurrent
                            ? "#0b111b"
                            : "#0b0b0b",
                        color: isComplete
                          ? "#4ade80"
                          : isCurrent
                            ? "#60a5fa"
                            : "#777",
                        cursor: isAvailable
                          ? "pointer"
                          : "default",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: "700",
                          marginBottom: "4px",
                        }}
                      >
                        {String(stage.number).padStart(2, "0")}
                      </div>

                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          lineHeight: "1.25",
                        }}
                      >
                        {stage.shortTitle}
                      </div>

                      <div
                        style={{
                          marginTop: "5px",
                          fontSize: "9px",
                          color: isComplete
                            ? "#6ee7a0"
                            : "#666",
                        }}
                      >
                        {isComplete
                          ? "COMPLETE"
                          : isCurrent
                            ? "CURRENT"
                            : "UP NEXT"}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: "15px",
                  paddingTop: "13px",
                  borderTop: "1px solid #1f1f1f",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    color: "#888",
                    fontSize: "12px",
                  }}
                >
                  <strong style={{ color: "#ccc" }}>
                    Current stage:
                  </strong>{" "}
                  {JOURNEY_STAGES[currentIndex].title}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    scrollToJourneyStage(
                      JOURNEY_STAGES[
                      Math.min(
                        completedCount,
                        JOURNEY_STAGES.length - 1
                      )
                      ]
                    )
                  }
                  style={{
                    padding: "8px 13px",
                    borderRadius: "7px",
                    border: "1px solid #444",
                    background: "#111",
                    color: "#ddd",
                    fontSize: "11px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Go to Current Stage →
                </button>
              </div>
            </section>
          );
        })()}

        {/* ==================================================
            EXISTING CASE LOADER
        ================================================== */}

        <section
          style={{
            border: "1px solid #333",
            padding: "24px",
            borderRadius: "10px",
            marginBottom: "24px",
            background: "#090909",
          }}
        >
          <p
            style={{
              color: "#777",
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "1px",
              margin: "0 0 8px 0",
            }}
          >
            Phase 4.15 Testing
          </p>

          <h2
            style={{
              margin: "0 0 8px 0",
            }}
          >
            Load Existing Case
          </h2>

          <p
            style={{
              color: "#888",
              marginTop: 0,
              lineHeight: "1.5",
            }}
          >
            Load an already-created case directly
            so the verified Justice Graph can be
            tested without creating duplicate data.
          </p>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              value={existingCaseId}
              onChange={(e) =>
                setExistingCaseId(
                  e.target.value
                )
              }
              placeholder="Case ID"
              style={{
                flex: "1 1 500px",
                padding: "13px",
                fontSize: "14px",
                background: "#050505",
                color: "#eee",
                border: "1px solid #444",
                borderRadius: "6px",
                boxSizing: "border-box",
              }}
            />

            <button
              onClick={loadExistingCase}
              disabled={existingCaseLoading}
              style={{
                padding: "13px 20px",
                fontSize: "14px",
                fontWeight: "600",
                cursor:
                  existingCaseLoading
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              <LoadingButtonContent
                loading={existingCaseLoading}
                loadingLabel="Loading Case..."
                idleLabel="Load Existing Case"
              />
            </button>
          </div>

          {existingCaseLoading && (
            <div style={{ marginTop: "16px" }}>
              <LoadingPanel
                title="Loading Existing Case"
                description="Retrieving the selected case and preparing its evidence, graph, and legal information views."
                lines={3}
                compact
              />
            </div>
          )}

          {existingCaseError && !existingCaseLoading && (
            <div style={{ marginTop: "16px" }}>
              <ErrorState
                title="Existing case could not be loaded"
                message={existingCaseError}
                actionLabel="Try Again"
                onAction={loadExistingCase}
                compact
              />
            </div>
          )}

          <p
            style={{
              color: "#666",
              fontSize: "12px",
              marginBottom: 0,
              marginTop: "10px",
            }}
          >
            Test case:
            {" "}
            ac592acf-4ba2-4d95-bf6d-65857c22adef
          </p>
        </section>

        {/* ==================================================
            CASE INTAKE
        ================================================== */}

        <section
          style={{
            border: "1px solid #333",
            padding: "30px",
            borderRadius: "10px",
            marginBottom: "30px",
          }}
        >
          <h2 id="case-intake">What happened?</h2>

          <p
            style={{
              color: "#aaa",
            }}
          >
            Describe your problem in your
            own words.
          </p>

          <input
            type="text"
            placeholder="Case title"
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            style={{
              width: "100%",
              padding: "14px",
              marginTop: "20px",
              marginBottom: "15px",
              fontSize: "16px",
              boxSizing: "border-box",
            }}
          />

          <textarea
            placeholder="Explain what happened..."
            value={description}
            onChange={(e) =>
              setDescription(
                e.target.value
              )
            }
            rows={7}
            style={{
              width: "100%",
              padding: "14px",
              fontSize: "16px",
              marginBottom: "15px",
              boxSizing: "border-box",
            }}
          />

          <input
            type="text"
            value={country}
            onChange={(e) =>
              setCountry(e.target.value)
            }
            placeholder="Country"
            style={{
              width: "100%",
              padding: "14px",
              marginBottom: "15px",
              fontSize: "16px",
              boxSizing: "border-box",
            }}
          />

          <input
            type="text"
            value={state}
            onChange={(e) =>
              setState(e.target.value)
            }
            placeholder="State"
            style={{
              width: "100%",
              padding: "14px",
              marginBottom: "20px",
              fontSize: "16px",
              boxSizing: "border-box",
            }}
          />

          <button
            onClick={createCase}
            disabled={loading}
            style={{
              padding: "14px 28px",
              fontSize: "16px",
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            <LoadingButtonContent
              loading={loading}
              loadingLabel="Creating Case..."
              idleLabel="Create Case"
            />
          </button>

          {createError && !loading && (
            <div style={{ marginTop: "16px" }}>
              <ErrorState
                title="Case creation failed"
                message={createError}
                actionLabel="Try Again"
                onAction={createCase}
              />
            </div>
          )}
        </section>

        {/* ==================================================
            CASE CREATED
        ================================================== */}

        {result && (
          <>
            <section
              style={{
                marginBottom: "30px",
                padding: "25px",
                border: "1px solid #444",
                borderRadius: "10px",
              }}
            >
              <h2>Case Created</h2>

              <p>
                <strong>
                  Case ID:
                </strong>{" "}
                {result.case_id}
              </p>

              <p>
                <strong>
                  Status:
                </strong>{" "}
                {result.status}
              </p>

              <p>
                <strong>
                  Title:
                </strong>{" "}
                {result.title}
              </p>

              <p>
                <strong>
                  Jurisdiction:
                </strong>{" "}
                {result.jurisdiction_country}{" "}
                /{" "}
                {result.jurisdiction_state}
              </p>

              <p>
                <strong>
                  Description:
                </strong>{" "}
                {result.description}
              </p>
            </section>

            {/* ==================================================
                EVIDENCE UPLOAD
            ================================================== */}

            <section
              style={{
                padding: "30px",
                border: "1px solid #333",
                borderRadius: "10px",
                marginBottom: "30px",
              }}
            >
              <h2 id="evidence">Evidence</h2>

              <p
                style={{
                  color: "#aaa",
                }}
              >
                Upload documents, screenshots,
                receipts, statements, or other
                supporting evidence.
              </p>

              <input
                id="evidence-upload-input"
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.txt"
                onChange={
                  handleFileSelection
                }
                style={{
                  marginTop: "20px",
                  marginBottom: "20px",
                  fontSize: "16px",
                }}
              />

              {selectedFiles.length > 0 && (
                <div
                  style={{
                    marginBottom: "20px",
                    padding: "15px",
                    background: "#111",
                    borderRadius: "8px",
                  }}
                >
                  <strong>
                    Selected files
                  </strong>

                  {selectedFiles.map(
                    (file) => (
                      <div
                        key={`${file.name}-${file.size}`}
                        style={{
                          padding:
                            "8px 0",
                          color: "#ccc",
                        }}
                      >
                        {file.name}
                      </div>
                    )
                  )}
                </div>
              )}

              <button
                onClick={uploadEvidence}
                disabled={
                  uploading ||
                  selectedFiles.length ===
                  0
                }
                style={{
                  padding:
                    "14px 28px",
                  fontSize: "16px",
                  cursor:
                    uploading ||
                      selectedFiles.length ===
                      0
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                <LoadingButtonContent
                  loading={uploading}
                  loadingLabel="Uploading Evidence..."
                  idleLabel="Upload Evidence"
                />
              </button>

              {uploadError && !uploading && (
                <div style={{ marginTop: "16px" }}>
                  <ErrorState
                    title="Evidence upload failed"
                    message={uploadError}
                    actionLabel={selectedFiles.length > 0 ? "Try Again" : undefined}
                    onAction={selectedFiles.length > 0 ? uploadEvidence : undefined}
                    compact
                  />
                </div>
              )}
            </section>

            {/* ==================================================
                EVIDENCE PREVIEW
            ================================================== */}

            <section
              style={{
                padding: "30px",
                border: "1px solid #333",
                borderRadius: "10px",
                marginBottom: "30px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                  gap: "15px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2
                    style={{
                      marginBottom: "5px",
                    }}
                  >
                    Evidence Preview
                  </h2>

                  <p
                    style={{
                      color: "#888",
                      margin: 0,
                    }}
                  >
                    {evidence.length}{" "}
                    evidence item
                    {evidence.length !== 1
                      ? "s"
                      : ""}
                  </p>
                </div>

                <button
                  onClick={() =>
                    loadEvidence(
                      result.case_id
                    )
                  }
                  disabled={
                    evidenceLoading
                  }
                  style={{
                    padding:
                      "10px 18px",
                    cursor:
                      evidenceLoading
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  <LoadingButtonContent
                    loading={evidenceLoading}
                    loadingLabel="Loading..."
                    idleLabel="Refresh"
                  />
                </button>
              </div>

              {/* ==================================================
                  EMPTY STATE
              ================================================== */}

              {evidenceLoading && (
                <div style={{ marginBottom: "18px" }}>
                  <LoadingPanel
                    title="Loading Evidence"
                    description="Retrieving uploaded evidence and extraction status for this case."
                    lines={3}
                    compact
                  />
                </div>
              )}

              {evidenceError && !evidenceLoading && (
                <div style={{ marginBottom: "18px" }}>
                  <ErrorState
                    title="Evidence could not be loaded"
                    message={evidenceError}
                    actionLabel="Retry"
                    onAction={() => loadEvidence(result.case_id)}
                    compact
                  />
                </div>
              )}

              {!evidenceLoading &&
                !evidenceError &&
                evidence.length ===
                0 && (
                  <div
                    style={{
                      padding: "30px",
                      textAlign:
                        "center",
                      border:
                        "1px dashed #444",
                      borderRadius: "8px",
                      color: "#888",
                    }}
                  >
                    No evidence uploaded
                    yet.
                  </div>
                )}

              {/* ==================================================
                  EVIDENCE LIST
              ================================================== */}

              <div
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: "15px",
                }}
              >
                {evidence.map(
                  (item) => (
                    <div
                      key={
                        item.evidence_id
                      }
                      style={{
                        border:
                          "1px solid #333",
                        borderRadius:
                          "8px",
                        padding:
                          "20px",
                        background:
                          "#0b0b0b",
                      }}
                    >
                      {/* FILE HEADER */}

                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          alignItems:
                            "flex-start",
                          gap: "20px",
                        }}
                      >
                        <div>
                          <h3
                            style={{
                              margin:
                                "0 0 8px 0",
                            }}
                          >
                            {item.file_name}
                          </h3>

                          <p
                            style={{
                              margin: 0,
                              color:
                                "#999",
                            }}
                          >
                            {getFileTypeLabel(
                              item.file_type
                            )}{" "}
                            • Uploaded{" "}
                            {formatDate(
                              item.created_at
                            )}
                          </p>
                        </div>

                        {/* EXTRACTION STATUS */}

                        <span
                          style={{
                            padding:
                              "6px 10px",
                            borderRadius:
                              "20px",
                            fontSize:
                              "12px",
                            border:
                              "1px solid #444",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {
                            item.extraction_status
                          }
                        </span>
                      </div>

                      {/* EXTRACTED TEXT */}

                      <div
                        style={{
                          marginTop:
                            "20px",
                          padding:
                            "15px",
                          background:
                            "#050505",
                          borderRadius:
                            "6px",
                          border:
                            "1px solid #222",
                        }}
                      >
                        <p
                          style={{
                            marginTop: 0,
                            color:
                              "#aaa",
                            fontSize:
                              "13px",
                          }}
                        >
                          Extracted Text
                        </p>

                        {item.extracted_text ? (
                          <pre
                            style={{
                              whiteSpace:
                                "pre-wrap",
                              wordBreak:
                                "break-word",
                              color:
                                "#ddd",
                              fontFamily:
                                "Arial, sans-serif",
                              fontSize:
                                "14px",
                              lineHeight:
                                "1.6",
                              maxHeight:
                                "300px",
                              overflowY:
                                "auto",
                              margin: 0,
                            }}
                          >
                            {
                              item.extracted_text
                            }
                          </pre>
                        ) : (
                          <p
                            style={{
                              color:
                                "#666",
                              margin: 0,
                            }}
                          >
                            No extracted
                            text available.
                          </p>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>

            {/* ==================================================
                EVIDENCE VISUALIZATION — PHASE 8.5
            ================================================== */}

            <section
              id="evidence-visualization"
              aria-label="Evidence visualization"
              style={{
                padding: "30px",
                border: "1px solid #333",
                borderRadius: "10px",
                marginBottom: "30px",
                background: "#080808",
              }}
            >
              {(() => {
                const coverage = getEvidenceCoverage();
                const evidenceGraph = getEvidenceGraphData();
                const supportedPercent = coverage?.total
                  ? Math.round((coverage.supported / coverage.total) * 100)
                  : 0;
                const partialPercent = coverage?.total
                  ? Math.round((coverage.partial / coverage.total) * 100)
                  : 0;
                const missingPercent = coverage?.total
                  ? Math.round((coverage.missing / coverage.total) * 100)
                  : 0;

                const claimMap = new Map(
                  evidenceGraph.claims.map((claim) => [claim.node_id, claim])
                );
                const documentMap = new Map(
                  evidenceGraph.documents.map((document) => [
                    document.node_id,
                    document,
                  ])
                );

                return (
                  <>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "20px",
                        flexWrap: "wrap",
                        marginBottom: "24px",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            color: "#777",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            margin: "0 0 8px 0",
                          }}
                        >
                          Phase 8.5 — Evidence Visualization
                        </p>
                        <h2 style={{ margin: "0 0 8px 0" }}>
                          Evidence Coverage
                        </h2>
                        <p
                          style={{
                            color: "#999",
                            margin: 0,
                            lineHeight: "1.6",
                          }}
                        >
                          See which case claims are supported by uploaded evidence,
                          which are partial, and which still lack supporting evidence.
                        </p>
                      </div>

                      <div
                        style={{
                          minWidth: "150px",
                          padding: "14px 16px",
                          border: "1px solid #333",
                          borderRadius: "10px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            color: "#777",
                            fontSize: "11px",
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                          }}
                        >
                          Coverage
                        </div>
                        <div
                          style={{
                            fontSize: "28px",
                            fontWeight: "700",
                            marginTop: "4px",
                          }}
                        >
                          {coverage ? `${coverage.percentage}%` : "—"}
                        </div>
                      </div>
                    </div>

                    {!coverage || evidenceGraph.claims.length === 0 ? (
                      <div
                        style={{
                          padding: "30px",
                          border: "1px dashed #444",
                          borderRadius: "8px",
                          color: "#777",
                          textAlign: "center",
                        }}
                      >
                        Evidence coverage will appear after the case Justice Graph
                        contains claim and evidence relationships.
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(160px, 1fr))",
                            gap: "12px",
                            marginBottom: "22px",
                          }}
                        >
                          {[
                            ["Supported", coverage.supported, supportedPercent, "#4ade80"],
                            ["Partial", coverage.partial, partialPercent, "#fbbf24"],
                            ["Missing", coverage.missing, missingPercent, "#f87171"],
                          ].map(([label, count, percent, accent]) => (
                            <div
                              key={String(label)}
                              style={{
                                padding: "16px",
                                border: "1px solid #292929",
                                borderRadius: "8px",
                                background: "#0b0b0b",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: "10px",
                                  marginBottom: "10px",
                                }}
                              >
                                <span style={{ color: String(accent), fontWeight: "600" }}>
                                  {label}
                                </span>
                                <span style={{ color: "#ddd" }}>
                                  {count}
                                </span>
                              </div>
                              <div
                                style={{
                                  height: "7px",
                                  background: "#202020",
                                  borderRadius: "99px",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${Number(percent)}%`,
                                    height: "100%",
                                    background: String(accent),
                                    borderRadius: "99px",
                                  }}
                                />
                              </div>
                              <div
                                style={{
                                  marginTop: "7px",
                                  color: "#777",
                                  fontSize: "12px",
                                }}
                              >
                                {percent}% of claims
                              </div>
                            </div>
                          ))}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                          }}
                        >
                          {evidenceGraph.claims.map((claim) => {
                            const relationships = evidenceGraph.relationships.filter(
                              (edge) => edge.target_node_id === claim.node_id
                            );
                            const confidence = relationships.length
                              ? Math.max(
                                ...relationships.map((edge) =>
                                  Number(edge.confidence || 0)
                                )
                              )
                              : 0;
                            const status =
                              confidence >= 0.7
                                ? "SUPPORTED"
                                : confidence >= 0.4
                                  ? "PARTIAL"
                                  : "MISSING";
                            const statusColor =
                              status === "SUPPORTED"
                                ? "#4ade80"
                                : status === "PARTIAL"
                                  ? "#fbbf24"
                                  : "#f87171";

                            return (
                              <div
                                key={claim.node_id}
                                style={{
                                  padding: "18px",
                                  border: "1px solid #292929",
                                  borderRadius: "9px",
                                  background: "#0b0b0b",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: "15px",
                                    alignItems: "flex-start",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <div style={{ flex: "1 1 500px" }}>
                                    <div
                                      style={{
                                        color: "#777",
                                        fontSize: "11px",
                                        textTransform: "uppercase",
                                        letterSpacing: "1px",
                                        marginBottom: "7px",
                                      }}
                                    >
                                      Claim
                                    </div>
                                    <div
                                      style={{
                                        color: "#eee",
                                        lineHeight: "1.55",
                                      }}
                                    >
                                      {claim.label}
                                    </div>
                                  </div>

                                  <span
                                    style={{
                                      color: statusColor,
                                      border: `1px solid ${statusColor}`,
                                      borderRadius: "999px",
                                      padding: "6px 10px",
                                      fontSize: "11px",
                                      fontWeight: "700",
                                      letterSpacing: "0.5px",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {status}
                                  </span>
                                </div>

                                <div style={{ marginTop: "15px" }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      color: "#777",
                                      fontSize: "12px",
                                      marginBottom: "6px",
                                    }}
                                  >
                                    <span>Evidence confidence</span>
                                    <span>{Math.round(confidence * 100)}%</span>
                                  </div>
                                  <div
                                    style={{
                                      height: "6px",
                                      background: "#202020",
                                      borderRadius: "99px",
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: `${Math.round(confidence * 100)}%`,
                                        height: "100%",
                                        background: statusColor,
                                      }}
                                    />
                                  </div>
                                </div>

                                <div
                                  style={{
                                    marginTop: "15px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                  }}
                                >
                                  {relationships.length === 0 ? (
                                    <div style={{ color: "#777", fontSize: "13px" }}>
                                      No supporting evidence relationship found.
                                    </div>
                                  ) : (
                                    relationships.map((edge) => {
                                      const document = documentMap.get(edge.source_node_id);
                                      return (
                                        <div
                                          key={edge.edge_id}
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "10px",
                                            padding: "9px 11px",
                                            border: "1px solid #222",
                                            borderRadius: "7px",
                                            color: "#aaa",
                                            fontSize: "13px",
                                          }}
                                        >
                                          <span style={{ color: "#22d3ee" }}>DOCUMENT</span>
                                          <span>→</span>
                                          <span style={{ color: "#ddd" }}>
                                            {document?.label || edge.source_node_id}
                                          </span>
                                          <span style={{ color: "#666" }}>SUPPORTS</span>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </section>

            {/* ==================================================
                JUSTICE GRAPH
            ================================================== */}

            <section
              style={{
                padding: "30px",
                border: "1px solid #444",
                borderRadius: "10px",
                marginBottom: "30px",
                background: "#080808",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "20px",
                  flexWrap: "wrap",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <p
                    style={{
                      color: "#777",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      margin: "0 0 8px 0",
                    }}
                  >
                    Phase 4 — Justice Graph
                  </p>

                  <h2 id="justice-graph"
                    style={{
                      margin: "0 0 8px 0",
                    }}
                  >
                    Justice Graph
                  </h2>

                  <p
                    style={{
                      color: "#888",
                      margin: 0,
                      lineHeight: "1.5",
                    }}
                  >
                    Case relationships across people,
                    organizations, events, issues,
                    claims, and documents.
                  </p>
                </div>

                <button
                  onClick={() =>
                    loadJusticeGraph(
                      result.case_id
                    )
                  }
                  disabled={graphLoading}
                  style={{
                    padding: "12px 20px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: graphLoading
                      ? "not-allowed"
                      : "pointer",
                  }}
                >
                  <LoadingButtonContent
                    loading={graphLoading}
                    loadingLabel="Loading Graph..."
                    idleLabel={
                      graph
                        ? "Refresh Graph"
                        : "Load Justice Graph"
                    }
                  />
                </button>
              </div>

              {graphError && (
                <div
                  style={{
                    padding: "16px",
                    border: "1px solid #633",
                    borderRadius: "8px",
                    background: "#180909",
                    color: "#ffb0b0",
                    marginBottom: "20px",
                  }}
                >
                  <strong>
                    Justice Graph failed
                  </strong>

                  <p style={{ marginBottom: 0 }}>
                    {graphError}
                  </p>
                </div>
              )}

              {graphLoading && (
                <LoadingPanel
                  title="Loading Justice Graph"
                  description="Fetching structured case nodes and relationships from the NYAYAOS backend."
                  lines={4}
                />
              )}

              {!graph &&
                !graphLoading &&
                !graphError && (
                  <div
                    style={{
                      padding: "35px",
                      border: "1px dashed #444",
                      borderRadius: "8px",
                      textAlign: "center",
                      color: "#777",
                    }}
                  >
                    Click "Load Justice Graph"
                    to visualize the structured
                    case graph.
                  </div>
                )}

              {graph && (
                <>
                  {/* GRAPH SUMMARY */}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(130px, 1fr))",
                      gap: "10px",
                      marginBottom: "20px",
                    }}
                  >
                    <div
                      style={{
                        border: "1px solid #292929",
                        borderRadius: "8px",
                        padding: "14px",
                        background: "#0b0b0b",
                      }}
                    >
                      <div
                        style={{
                          color: "#777",
                          fontSize: "11px",
                          textTransform: "uppercase",
                        }}
                      >
                        Nodes
                      </div>

                      <div
                        style={{
                          fontSize: "24px",
                          fontWeight: "700",
                          marginTop: "5px",
                        }}
                      >
                        {graph.summary.node_count}
                      </div>
                    </div>

                    <div
                      style={{
                        border: "1px solid #292929",
                        borderRadius: "8px",
                        padding: "14px",
                        background: "#0b0b0b",
                      }}
                    >
                      <div
                        style={{
                          color: "#777",
                          fontSize: "11px",
                          textTransform: "uppercase",
                        }}
                      >
                        Relationships
                      </div>

                      <div
                        style={{
                          fontSize: "24px",
                          fontWeight: "700",
                          marginTop: "5px",
                        }}
                      >
                        {graph.summary.edge_count}
                      </div>
                    </div>

                    {(() => {
                      const coverage =
                        getEvidenceCoverage();

                      return (
                        <div
                          style={{
                            border: "1px solid #292929",
                            borderRadius: "8px",
                            padding: "14px",
                            background: "#0b0b0b",
                          }}
                        >
                          <div
                            style={{
                              color: "#777",
                              fontSize: "11px",
                              textTransform: "uppercase",
                            }}
                          >
                            Evidence Coverage
                          </div>

                          <div
                            style={{
                              fontSize: "24px",
                              fontWeight: "700",
                              marginTop: "5px",
                              color:
                                coverage?.percentage ===
                                  100
                                  ? "#4ade80"
                                  : "#fbbf24",
                            }}
                          >
                            {coverage?.percentage ?? 0}%
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* NODE TYPE SUMMARY */}

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginBottom: "20px",
                    }}
                  >
                    {Object.entries(
                      graph.summary.node_counts
                    ).map(([type, count]) => {
                      const style =
                        getGraphNodeStyle(type);

                      return (
                        <div
                          key={type}
                          style={{
                            padding: "7px 10px",
                            border:
                              `1px solid ${style.border}`,
                            borderRadius: "20px",
                            color: style.accent,
                            fontSize: "12px",
                          }}
                        >
                          {formatLabel(type)}: {count}
                        </div>
                      );
                    })}
                  </div>

                  {/* GRAPH CANVAS */}

                  <div
                    style={{
                      position: "relative",
                      height: "680px",
                      overflow: "auto",
                      border: "1px solid #222",
                      borderRadius: "10px",
                      background:
                        "radial-gradient(circle at center, #111 0%, #070707 55%, #050505 100%)",
                    }}
                  >
                    {(() => {
                      const graphWidth = Math.max(
                        1650,
                        7 * 230
                      );

                      const maxRows = Math.max(
                        ...Object.values(
                          graph.summary.node_counts
                        ),
                        1
                      );

                      const graphHeight = Math.max(
                        620,
                        120 + maxRows * 135
                      );

                      return (
                        <svg
                          width={graphWidth}
                          height={graphHeight}
                          style={{
                            display: "block",
                            minWidth: "100%",
                          }}
                        >
                          {/* RELATIONSHIPS */}

                          {graph.edges.map((edge) => {
                            const source =
                              graph.nodes.find(
                                (node) =>
                                  node.node_id ===
                                  edge.source_node_id
                              );

                            const target =
                              graph.nodes.find(
                                (node) =>
                                  node.node_id ===
                                  edge.target_node_id
                              );

                            if (!source || !target) {
                              return null;
                            }

                            const sourcePos =
                              getGraphPosition(
                                source,
                                graph.nodes
                              );

                            const targetPos =
                              getGraphPosition(
                                target,
                                graph.nodes
                              );

                            const edgeStyle =
                              getGraphEdgeStatus(
                                edge
                              );

                            return (
                              <g key={edge.edge_id}>
                                <line
                                  x1={sourcePos.x + 190}
                                  y1={sourcePos.y + 45}
                                  x2={targetPos.x}
                                  y2={targetPos.y + 45}
                                  stroke={
                                    edgeStyle.stroke
                                  }
                                  strokeWidth={
                                    edgeStyle.width
                                  }
                                  opacity="0.75"
                                />

                                <text
                                  x={
                                    (sourcePos.x +
                                      190 +
                                      targetPos.x) /
                                    2
                                  }
                                  y={
                                    (sourcePos.y +
                                      targetPos.y) /
                                    2 +
                                    40
                                  }
                                  fill={
                                    edgeStyle.stroke
                                  }
                                  fontSize="10"
                                  textAnchor="middle"
                                >
                                  {edgeStyle.label}
                                </text>
                              </g>
                            );
                          })}

                          {/* NODES */}

                          {graph.nodes.map((node) => {
                            const position =
                              getGraphPosition(
                                node,
                                graph.nodes
                              );

                            const style =
                              getGraphNodeStyle(
                                node.node_type
                              );

                            const selected =
                              selectedGraphNode?.node_id ===
                              node.node_id;

                            return (
                              <g
                                key={node.node_id}
                                transform={`translate(${position.x}, ${position.y})`}
                                onClick={() =>
                                  setSelectedGraphNode(
                                    node
                                  )
                                }
                                style={{
                                  cursor: "pointer",
                                }}
                              >
                                <rect
                                  width="190"
                                  height="90"
                                  rx="10"
                                  fill={
                                    style.background
                                  }
                                  stroke={
                                    selected
                                      ? "#fff"
                                      : style.border
                                  }
                                  strokeWidth={
                                    selected ? 3 : 1.5
                                  }
                                />

                                <rect
                                  width="190"
                                  height="5"
                                  rx="3"
                                  fill={
                                    style.accent
                                  }
                                />

                                <text
                                  x="12"
                                  y="25"
                                  fill={
                                    style.accent
                                  }
                                  fontSize="10"
                                  fontWeight="700"
                                >
                                  {node.node_type}
                                </text>

                                <foreignObject
                                  x="12"
                                  y="32"
                                  width="166"
                                  height="48"
                                >
                                  <div
                                    style={{
                                      color: "#eee",
                                      fontSize: "12px",
                                      lineHeight: "1.35",
                                      overflow: "hidden",
                                      wordBreak:
                                        "break-word",
                                    }}
                                  >
                                    {node.label}
                                  </div>
                                </foreignObject>
                              </g>
                            );
                          })}
                        </svg>
                      );
                    })()}
                  </div>

                  {/* SELECTED NODE */}

                  {selectedGraphNode && (
                    <div
                      style={{
                        marginTop: "18px",
                        padding: "20px",
                        border: "1px solid #333",
                        borderRadius: "8px",
                        background: "#0b0b0b",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems: "center",
                          gap: "15px",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              color:
                                getGraphNodeStyle(
                                  selectedGraphNode.node_type
                                ).accent,
                              fontSize: "11px",
                              fontWeight: "700",
                              letterSpacing: "1px",
                            }}
                          >
                            {
                              selectedGraphNode.node_type
                            }
                          </div>

                          <h3
                            style={{
                              margin:
                                "5px 0 0 0",
                            }}
                          >
                            {
                              selectedGraphNode.label
                            }
                          </h3>
                        </div>

                        <button
                          onClick={() =>
                            setSelectedGraphNode(
                              null
                            )
                          }
                          style={{
                            padding: "7px 12px",
                          }}
                        >
                          Close
                        </button>
                      </div>

                      {Object.keys(
                        selectedGraphNode.properties ||
                        {}
                      ).length > 0 && (
                          <div
                            style={{
                              marginTop: "15px",
                              display: "flex",
                              flexDirection:
                                "column",
                              gap: "8px",
                            }}
                          >
                            {Object.entries(
                              selectedGraphNode.properties
                            ).map(
                              ([key, value]) => (
                                <div
                                  key={key}
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "180px 1fr",
                                    gap: "12px",
                                  }}
                                >
                                  <span
                                    style={{
                                      color: "#777",
                                      fontWeight: "600",
                                    }}
                                  >
                                    {formatLabel(key)}
                                  </span>

                                  <span
                                    style={{
                                      color: "#ccc",
                                      lineHeight: "1.5",
                                    }}
                                  >
                                    {formatValue(value)}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        )}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: "15px",
                      flexWrap: "wrap",
                      marginTop: "18px",
                      color: "#888",
                      fontSize: "12px",
                    }}
                  >
                    <span>
                      Green SUPPORTS = supported evidence
                    </span>

                    <span>
                      Yellow SUPPORTS = partial evidence
                    </span>

                    <span>
                      Click any node for details
                    </span>
                  </div>
                </>
              )}
            </section>

            {/* ==================================================
                EVIDENCE GRAPH
            ================================================== */}

            <section
              style={{
                padding: "30px",
                border: "1px solid #444",
                borderRadius: "10px",
                marginBottom: "30px",
                background: "#080808",
              }}
            >
              <div
                style={{
                  marginBottom: "22px",
                }}
              >
                <p
                  style={{
                    color: "#777",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    margin: "0 0 8px 0",
                  }}
                >
                  Phase 4 — Evidence Graph
                </p>

                <h2 id="evidence-graph"
                  style={{
                    margin: "0 0 8px 0",
                  }}
                >
                  Evidence Graph
                </h2>

                <p
                  style={{
                    color: "#888",
                    margin: 0,
                    lineHeight: "1.5",
                  }}
                >
                  Shows which submitted documents support
                  each extracted claim and the strength of
                  that relationship.
                </p>
              </div>

              {!graph && (
                <div
                  style={{
                    padding: "30px",
                    border: "1px dashed #444",
                    borderRadius: "8px",
                    textAlign: "center",
                    color: "#777",
                  }}
                >
                  Load the Justice Graph above first.
                  The Evidence Graph uses the same
                  verified graph relationships.
                </div>
              )}

              {graph && (
                (() => {
                  const evidenceGraph =
                    getEvidenceGraphData();

                  return (
                    <>
                      {/* EVIDENCE SUMMARY */}

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(150px, 1fr))",
                          gap: "10px",
                          marginBottom: "20px",
                        }}
                      >
                        <div
                          style={{
                            padding: "15px",
                            border:
                              "1px solid #292929",
                            borderRadius: "8px",
                            background: "#0b0b0b",
                          }}
                        >
                          <div
                            style={{
                              color: "#777",
                              fontSize: "11px",
                              textTransform:
                                "uppercase",
                            }}
                          >
                            Evidence Documents
                          </div>

                          <div
                            style={{
                              fontSize: "24px",
                              fontWeight: "700",
                              marginTop: "5px",
                            }}
                          >
                            {
                              evidenceGraph.documents
                                .length
                            }
                          </div>
                        </div>

                        <div
                          style={{
                            padding: "15px",
                            border:
                              "1px solid #292929",
                            borderRadius: "8px",
                            background: "#0b0b0b",
                          }}
                        >
                          <div
                            style={{
                              color: "#777",
                              fontSize: "11px",
                              textTransform:
                                "uppercase",
                            }}
                          >
                            Claims
                          </div>

                          <div
                            style={{
                              fontSize: "24px",
                              fontWeight: "700",
                              marginTop: "5px",
                            }}
                          >
                            {
                              evidenceGraph.claims
                                .length
                            }
                          </div>
                        </div>

                        <div
                          style={{
                            padding: "15px",
                            border:
                              "1px solid #292929",
                            borderRadius: "8px",
                            background: "#0b0b0b",
                          }}
                        >
                          <div
                            style={{
                              color: "#777",
                              fontSize: "11px",
                              textTransform:
                                "uppercase",
                            }}
                          >
                            Evidence Links
                          </div>

                          <div
                            style={{
                              fontSize: "24px",
                              fontWeight: "700",
                              marginTop: "5px",
                            }}
                          >
                            {
                              evidenceGraph
                                .relationships
                                .length
                            }
                          </div>
                        </div>

                        {(() => {
                          const coverage =
                            getEvidenceCoverage();

                          return (
                            <div
                              style={{
                                padding: "15px",
                                border:
                                  "1px solid #292929",
                                borderRadius: "8px",
                                background:
                                  "#0b0b0b",
                              }}
                            >
                              <div
                                style={{
                                  color: "#777",
                                  fontSize: "11px",
                                  textTransform:
                                    "uppercase",
                                }}
                              >
                                Coverage
                              </div>

                              <div
                                style={{
                                  fontSize: "24px",
                                  fontWeight: "700",
                                  marginTop: "5px",
                                  color:
                                    coverage?.percentage ===
                                      100
                                      ? "#4ade80"
                                      : "#fbbf24",
                                }}
                              >
                                {coverage?.percentage ??
                                  0}
                                %
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* DOCUMENT → CLAIM MAPPING */}

                      <div
                        style={{
                          display: "flex",
                          flexDirection:
                            "column",
                          gap: "12px",
                        }}
                      >
                        {evidenceGraph.claims.map(
                          (claim) => {
                            const claimRelationships =
                              evidenceGraph.relationships.filter(
                                (edge) =>
                                  edge.target_node_id ===
                                  claim.node_id
                              );

                            const strongestConfidence =
                              claimRelationships
                                .length > 0
                                ? Math.max(
                                  ...claimRelationships.map(
                                    (edge) =>
                                      Number(
                                        edge.confidence ||
                                        0
                                      )
                                  )
                                )
                                : 0;

                            let status =
                              "MISSING";

                            if (
                              strongestConfidence >=
                              0.7
                            ) {
                              status =
                                "SUPPORTED";
                            } else if (
                              strongestConfidence >=
                              0.4
                            ) {
                              status =
                                "PARTIAL";
                            }

                            const statusStyle =
                              status ===
                                "SUPPORTED"
                                ? {
                                  border:
                                    "#4ade80",
                                  background:
                                    "#0b1710",
                                  text:
                                    "#4ade80",
                                }
                                : status ===
                                  "PARTIAL"
                                  ? {
                                    border:
                                      "#fbbf24",
                                    background:
                                      "#171307",
                                    text:
                                      "#fbbf24",
                                  }
                                  : {
                                    border:
                                      "#fb7185",
                                    background:
                                      "#1a0b10",
                                    text:
                                      "#fb7185",
                                  };

                            return (
                              <div
                                key={
                                  claim.node_id
                                }
                                style={{
                                  border:
                                    "1px solid #292929",
                                  borderRadius:
                                    "10px",
                                  padding:
                                    "18px",
                                  background:
                                    "#090909",
                                }}
                              >
                                {/* CLAIM HEADER */}

                                <div
                                  style={{
                                    display:
                                      "flex",
                                    justifyContent:
                                      "space-between",
                                    alignItems:
                                      "flex-start",
                                    gap: "15px",
                                  }}
                                >
                                  <div>
                                    <div
                                      style={{
                                        color:
                                          "#c084fc",
                                        fontSize:
                                          "11px",
                                        fontWeight:
                                          "700",
                                        letterSpacing:
                                          "1px",
                                      }}
                                    >
                                      CLAIM
                                    </div>

                                    <div
                                      style={{
                                        color:
                                          "#eee",
                                        fontSize:
                                          "15px",
                                        fontWeight:
                                          "600",
                                        lineHeight:
                                          "1.5",
                                        marginTop:
                                          "5px",
                                      }}
                                    >
                                      {
                                        claim.label
                                      }
                                    </div>
                                  </div>

                                  <div
                                    style={{
                                      flexShrink:
                                        0,
                                      padding:
                                        "6px 10px",
                                      border:
                                        `1px solid ${statusStyle.border}`,
                                      borderRadius:
                                        "20px",
                                      background:
                                        statusStyle.background,
                                      color:
                                        statusStyle.text,
                                      fontSize:
                                        "11px",
                                      fontWeight:
                                        "700",
                                    }}
                                  >
                                    {status}
                                  </div>
                                </div>

                                {/* EVIDENCE LINKS */}

                                <div
                                  style={{
                                    marginTop:
                                      "16px",
                                    display:
                                      "flex",
                                    flexDirection:
                                      "column",
                                    gap: "8px",
                                  }}
                                >
                                  {claimRelationships.length ===
                                    0 ? (
                                    <div
                                      style={{
                                        padding:
                                          "12px",
                                        border:
                                          "1px dashed #633",
                                        borderRadius:
                                          "7px",
                                        color:
                                          "#ffb0b0",
                                        fontSize:
                                          "13px",
                                      }}
                                    >
                                      No supporting
                                      evidence
                                      relationship
                                      found for
                                      this claim.
                                    </div>
                                  ) : (
                                    claimRelationships.map(
                                      (edge) => {
                                        const document =
                                          evidenceGraph.documents.find(
                                            (
                                              item
                                            ) =>
                                              item.node_id ===
                                              edge.source_node_id
                                          );

                                        const confidence =
                                          Number(
                                            edge.confidence ||
                                            0
                                          );

                                        return (
                                          <div
                                            key={
                                              edge.edge_id
                                            }
                                            style={{
                                              display:
                                                "grid",
                                              gridTemplateColumns:
                                                "1fr auto auto",
                                              alignItems:
                                                "center",
                                              gap:
                                                "12px",
                                              padding:
                                                "12px",
                                              border:
                                                "1px solid #222",
                                              borderRadius:
                                                "7px",
                                              background:
                                                "#050505",
                                            }}
                                          >
                                            <div>
                                              <div
                                                style={{
                                                  color:
                                                    "#22d3ee",
                                                  fontSize:
                                                    "12px",
                                                  fontWeight:
                                                    "600",
                                                }}
                                              >
                                                {document
                                                  ?.label ||
                                                  "Evidence document"}
                                              </div>

                                              <div
                                                style={{
                                                  color:
                                                    "#666",
                                                  fontSize:
                                                    "11px",
                                                  marginTop:
                                                    "4px",
                                                }}
                                              >
                                                DOCUMENT
                                                {" → "}
                                                SUPPORTS
                                                {" → "}
                                                CLAIM
                                              </div>
                                            </div>

                                            <div
                                              style={{
                                                color:
                                                  confidence >=
                                                    0.7
                                                    ? "#4ade80"
                                                    : confidence >=
                                                      0.4
                                                      ? "#fbbf24"
                                                      : "#fb7185",
                                                fontSize:
                                                  "12px",
                                                fontWeight:
                                                  "700",
                                              }}
                                            >
                                              {Math.round(
                                                confidence *
                                                100
                                              )}
                                              %
                                            </div>

                                            <div
                                              style={{
                                                color:
                                                  "#777",
                                                fontSize:
                                                  "11px",
                                              }}
                                            >
                                              {isObject(
                                                edge.properties
                                              ) &&
                                                typeof edge
                                                  .properties
                                                  .evidence_status ===
                                                "string"
                                                ? String(
                                                  edge
                                                    .properties
                                                    .evidence_status
                                                )
                                                : "UNCLASSIFIED"}
                                            </div>
                                          </div>
                                        );
                                      }
                                    )
                                  )}
                                </div>
                              </div>
                            );
                          }
                        )}

                        {evidenceGraph.claims
                          .length === 0 && (
                            <div
                              style={{
                                padding: "30px",
                                border:
                                  "1px dashed #444",
                                borderRadius: "8px",
                                textAlign: "center",
                                color: "#777",
                              }}
                            >
                              No claim nodes are
                              available in the graph.
                            </div>
                          )}
                      </div>

                      {/* EVIDENCE GRAPH NOTE */}

                      <div
                        style={{
                          marginTop: "18px",
                          padding: "15px",
                          border:
                            "1px solid #292929",
                          borderRadius: "8px",
                          background: "#070707",
                          color: "#777",
                          fontSize: "12px",
                          lineHeight: "1.6",
                        }}
                      >
                        Evidence status is derived
                        from the graph's SUPPORTS
                        relationships and their
                        confidence values. It does not
                        represent a final legal
                        determination.
                      </div>
                    </>
                  );
                })()
              )}
            </section>

            {/* ==================================================
                CASE INTELLIGENCE ACTION
            ================================================== */}

            <section
              style={{
                padding: "30px",
                border:
                  "1px solid #444",
                borderRadius: "10px",
                marginBottom: "30px",
                background:
                  "#080808",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: "20px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2 id="case-intelligence"
                    style={{
                      marginTop: 0,
                      marginBottom: "8px",
                    }}
                  >
                    Case Intelligence
                  </h2>

                  <p
                    style={{
                      color: "#999",
                      margin: 0,
                      lineHeight:
                        "1.5",
                    }}
                  >
                    Convert the uploaded
                    evidence into structured
                    case facts, entities,
                    events, claims, and a
                    timeline.
                  </p>
                </div>

                <button
                  onClick={
                    generateCaseIntelligence
                  }
                  disabled={
                    intelligenceLoading ||
                    evidence.length === 0
                  }
                  style={{
                    padding:
                      "14px 24px",
                    fontSize:
                      "16px",
                    fontWeight:
                      "600",
                    cursor:
                      intelligenceLoading ||
                        evidence.length ===
                        0
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {intelligenceLoading
                    ? "Analyzing Evidence..."
                    : intelligence
                      ? "Regenerate Intelligence"
                      : "Generate Case Intelligence"}
                </button>
              </div>

              {evidence.length === 0 && (
                <p
                  style={{
                    marginTop:
                      "18px",
                    color:
                      "#777",
                    fontSize:
                      "14px",
                  }}
                >
                  Upload evidence before
                  generating case intelligence.
                </p>
              )}

              {intelligenceLoading && (
                <div style={{ marginTop: "25px" }}>
                  <LoadingPanel
                    title="Analyzing Case Intelligence"
                    description="NYAYAOS is converting available evidence into structured facts, entities, events, claims, and timeline information."
                    lines={5}
                  />
                </div>
              )}

              {intelligenceError && !intelligenceLoading && (
                <div style={{ marginTop: "20px" }}>
                  <ErrorState
                    title="Case Intelligence could not be generated"
                    message={intelligenceError}
                    actionLabel={result?.case_id && evidence.length > 0 ? "Try Again" : undefined}
                    onAction={result?.case_id && evidence.length > 0 ? generateCaseIntelligence : undefined}
                  />
                </div>
              )}
            </section>

            {/* ==================================================
                CASE INTELLIGENCE RESULT
            ================================================== */}

            {intelligence && (
              <section
                style={{
                  marginBottom:
                    "40px",
                }}
              >
                {/* ==================================================
                    INTELLIGENCE HEADER
                ================================================== */}

                <div
                  style={{
                    border:
                      "1px solid #444",
                    borderRadius:
                      "10px",
                    padding:
                      "25px",
                    marginBottom:
                      "20px",
                    background:
                      "#090909",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      gap: "20px",
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          color:
                            "#777",
                          fontSize:
                            "12px",
                          textTransform:
                            "uppercase",
                          letterSpacing:
                            "1px",
                          margin:
                            "0 0 8px 0",
                        }}
                      >
                        AI Case Intelligence
                      </p>

                      <h2
                        style={{
                          margin:
                            "0 0 8px 0",
                        }}
                      >
                        Structured Case Analysis
                      </h2>

                      <p
                        style={{
                          color:
                            "#888",
                          margin: 0,
                        }}
                      >
                        Generated from{" "}
                        {
                          intelligence.processed_evidence_count ??
                          0
                        }{" "}
                        processed evidence item
                        {
                          (intelligence.processed_evidence_count ??
                            0) !==
                            1
                            ? "s"
                            : ""
                        }.
                      </p>
                    </div>

                    <div
                      style={{
                        padding:
                          "10px 14px",
                        border:
                          "1px solid #444",
                        borderRadius:
                          "8px",
                        color:
                          "#bbb",
                        fontSize:
                          "13px",
                      }}
                    >
                      Evidence:{" "}
                      {
                        intelligence.evidence_count ??
                        0
                      }
                    </div>
                  </div>
                </div>

                {/* ==================================================
                    CASE SUMMARY
                ================================================== */}

                <section
                  style={{
                    border:
                      "1px solid #333",
                    borderRadius:
                      "10px",
                    padding:
                      "25px",
                    marginBottom:
                      "20px",
                    background:
                      "#070707",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      marginBottom:
                        "12px",
                    }}
                  >
                    Case Summary
                  </h3>

                  <p
                    style={{
                      color:
                        "#ccc",
                      lineHeight:
                        "1.8",
                      margin: 0,
                      whiteSpace:
                        "pre-wrap",
                    }}
                  >
                    {caseIntelligence?.case_summary ||
                      "No case summary was generated."}
                  </p>
                </section>

                {/* ==================================================
                    POTENTIAL DOMAIN
                ================================================== */}

                <section
                  style={{
                    border:
                      "1px solid #333",
                    borderRadius:
                      "10px",
                    padding:
                      "25px",
                    marginBottom:
                      "20px",
                    background:
                      "#070707",
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      marginBottom:
                        "15px",
                    }}
                  >
                    Potential Domain
                  </h3>

                  {caseIntelligence?.potential_domain ? (
                    isObject(
                      caseIntelligence.potential_domain
                    ) ? (
                      <div
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: "12px",
                        }}
                      >
                        {Object.entries(
                          caseIntelligence.potential_domain
                        ).map(
                          ([
                            key,
                            value,
                          ]) => (
                            <div
                              key={key}
                              style={{
                                padding:
                                  "15px",
                                border:
                                  "1px solid #292929",
                                borderRadius:
                                  "8px",
                                background:
                                  "#0b0b0b",
                              }}
                            >
                              <div
                                style={{
                                  color:
                                    "#777",
                                  fontSize:
                                    "12px",
                                  marginBottom:
                                    "7px",
                                  textTransform:
                                    "uppercase",
                                }}
                              >
                                {formatLabel(
                                  key
                                )}
                              </div>

                              <div
                                style={{
                                  color:
                                    "#ddd",
                                  lineHeight:
                                    "1.5",
                                }}
                              >
                                {formatValue(
                                  value
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p
                        style={{
                          color:
                            "#ccc",
                          margin: 0,
                        }}
                      >
                        {formatValue(
                          caseIntelligence.potential_domain
                        )}
                      </p>
                    )
                  ) : (
                    <p
                      style={{
                        color:
                          "#777",
                        margin: 0,
                      }}
                    >
                      No potential domain
                      identified.
                    </p>
                  )}
                </section>

                {/* ==================================================
                    PEOPLE
                ================================================== */}

                <IntelligenceSection
                  title="People"
                  description="People or actors identified from the available evidence."
                  items={
                    caseIntelligence?.people
                  }
                />

                {/* ==================================================
                    ORGANIZATIONS
                ================================================== */}

                <IntelligenceSection
                  title="Organizations"
                  description="Organizations identified from the available evidence."
                  items={
                    caseIntelligence?.organizations
                  }
                />

                {/* ==================================================
                    DATES
                ================================================== */}

                <IntelligenceSection
                  title="Dates"
                  description="Dates and their associated contexts extracted from the evidence."
                  items={
                    caseIntelligence?.dates
                  }
                />

                {/* ==================================================
                    AMOUNTS
                ================================================== */}

                <IntelligenceSection
                  title="Amounts"
                  description="Financial amounts identified in the evidence."
                  items={
                    caseIntelligence?.amounts
                  }
                />

                {/* ==================================================
                    LOCATIONS
                ================================================== */}

                <IntelligenceSection
                  title="Locations"
                  description="Locations identified in the evidence."
                  items={
                    caseIntelligence?.locations
                  }
                />

                {/* ==================================================
                    EVENTS
                ================================================== */}

                <IntelligenceSection
                  title="Events"
                  description="Events extracted from the evidence."
                  items={
                    caseIntelligence?.events
                  }
                />

                {/* ==================================================
                    FACTUAL CLAIMS
                ================================================== */}

                <IntelligenceSection
                  title="Factual Claims"
                  description="Claims represented from the evidence without treating disputed statements as established facts."
                  items={
                    caseIntelligence?.factual_claims
                  }
                />

                {/* ==================================================
                    TIMELINE VISUALIZATION — PHASE 8.4
                ================================================== */}

                <section
                  id="timeline-visualization"
                  aria-label="Case timeline visualization"
                  style={{
                    border: "1px solid #333",
                    borderRadius: "12px",
                    padding: "22px",
                    marginBottom: "20px",
                    background: "#070707",
                    scrollMarginTop: "110px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "16px",
                      flexWrap: "wrap",
                      marginBottom: "20px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "#22d3ee",
                          fontSize: "10px",
                          fontWeight: "700",
                          letterSpacing: "1.4px",
                          textTransform: "uppercase",
                          marginBottom: "6px",
                        }}
                      >
                        PHASE 8.4 · TIMELINE
                      </div>
                      <h3 style={{ margin: 0, fontSize: "21px" }}>
                        Case Timeline
                      </h3>
                      <p
                        style={{
                          color: "#777",
                          fontSize: "13px",
                          margin: "7px 0 0 0",
                          lineHeight: "1.55",
                          maxWidth: "720px",
                        }}
                      >
                        A chronological view of events extracted from the case evidence.
                        NYAYAOS presents these as extracted events rather than independently verified facts.
                      </p>
                    </div>

                    <div
                      style={{
                        padding: "9px 12px",
                        border: "1px solid #292929",
                        borderRadius: "999px",
                        color: "#aaa",
                        fontSize: "11px",
                        background: "#0b0b0b",
                      }}
                    >
                      {intelligence.timeline?.length ?? 0} event{
                        (intelligence.timeline?.length ?? 0) === 1 ? "" : "s"
                      } extracted
                    </div>
                  </div>

                  {intelligence.timeline && intelligence.timeline.length > 0 ? (
                    <div style={{ position: "relative", paddingLeft: "26px" }}>
                      <div
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          left: "8px",
                          top: "10px",
                          bottom: "10px",
                          width: "1px",
                          background: "#303030",
                        }}
                      />

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "14px",
                        }}
                      >
                        {intelligence.timeline.map((item, index) => {
                          const dateValue =
                            isObject(item)
                              ? item.date ?? item.datetime ?? item.timestamp ?? item.time
                              : null;

                          const title = getDisplayTitle(item, index);

                          return (
                            <article
                              key={index}
                              style={{
                                position: "relative",
                                border: "1px solid #292929",
                                borderRadius: "10px",
                                padding: "15px 16px",
                                background: "#0a0a0a",
                              }}
                            >
                              <span
                                aria-hidden="true"
                                style={{
                                  position: "absolute",
                                  left: "-25px",
                                  top: "19px",
                                  width: "10px",
                                  height: "10px",
                                  borderRadius: "50%",
                                  border: "2px solid #22d3ee",
                                  background: "#070707",
                                  boxSizing: "border-box",
                                }}
                              />

                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  gap: "12px",
                                  flexWrap: "wrap",
                                  marginBottom: "8px",
                                }}
                              >
                                <div
                                  style={{
                                    color: "#eee",
                                    fontWeight: "700",
                                    fontSize: "14px",
                                  }}
                                >
                                  {title}
                                </div>

                                <div
                                  style={{
                                    color: "#22d3ee",
                                    fontSize: "11px",
                                    fontWeight: "600",
                                  }}
                                >
                                  {dateValue ? formatValue(dateValue) : `Event ${index + 1}`}
                                </div>
                              </div>

                              {isObject(item) ? (
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "7px",
                                  }}
                                >
                                  {Object.entries(item)
                                    .filter(([key]) =>
                                      !["date", "datetime", "timestamp", "time"].includes(key)
                                    )
                                    .map(([key, value]) => (
                                      <div
                                        key={key}
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns: "120px minmax(0, 1fr)",
                                          gap: "10px",
                                          fontSize: "12px",
                                        }}
                                      >
                                        <span style={{ color: "#666", fontWeight: "600" }}>
                                          {formatLabel(key)}
                                        </span>
                                        <span style={{ color: "#aaa", lineHeight: "1.5" }}>
                                          {formatValue(value)}
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                <p
                                  style={{
                                    color: "#aaa",
                                    margin: 0,
                                    fontSize: "13px",
                                    lineHeight: "1.55",
                                  }}
                                >
                                  {formatValue(item)}
                                </p>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        border: "1px dashed #333",
                        borderRadius: "10px",
                        padding: "22px",
                        textAlign: "center",
                        color: "#777",
                        background: "#090909",
                      }}
                    >
                      No timeline events were extracted from the available evidence yet.
                    </div>
                  )}
                </section>

                {/* ==================================================
                    AI SAFETY NOTE
                ================================================== */}

                <div
                  style={{
                    border:
                      "1px solid #333",
                    borderRadius:
                      "10px",
                    padding:
                      "18px 20px",
                    background:
                      "#080808",
                    color:
                      "#888",
                    fontSize:
                      "13px",
                    lineHeight:
                      "1.6",
                  }}
                >
                  <strong
                    style={{
                      color:
                        "#aaa",
                    }}
                  >
                    NYAYAOS evidence note:
                  </strong>{" "}
                  This section represents
                  information extracted from
                  the submitted evidence. It
                  is intended for case
                  organization and routing,
                  not as a final legal
                  determination.
                </div>
              </section>
            )}
          </>
        )}

        {/* ==================================================
            LEGAL INFORMATION
        ================================================== */}

        {result && (
          <section
            style={{
              padding: "30px",
              border: "1px solid #444",
              borderRadius: "10px",
              marginBottom: "30px",
              background: "#080808",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "20px",
                flexWrap: "wrap",
                marginBottom: "22px",
              }}
            >
              <div>
                <p
                  style={{
                    color: "#777",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    margin: "0 0 8px 0",
                  }}
                >
                  Phase 5 — Legal Knowledge + RAG
                </p>

                <h2 id="legal-information"
                  style={{
                    margin: "0 0 8px 0",
                  }}
                >
                  Legal Information
                </h2>

                <p
                  style={{
                    color: "#888",
                    margin: 0,
                    lineHeight: "1.6",
                  }}
                >
                  Relevant legal material retrieved from the
                  NYAYAOS legal knowledge base, with citation
                  and source provenance attached to each result.
                </p>
              </div>

              <button
                onClick={() =>
                  loadLegalInformation(result.case_id)
                }
                disabled={legalLoading}
                style={{
                  padding: "12px 20px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: legalLoading
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                <LoadingButtonContent
                  loading={legalLoading}
                  loadingLabel="Retrieving Legal Information..."
                  idleLabel={
                    legalInfo
                      ? "Refresh Legal Information"
                      : "Retrieve Legal Information"
                  }
                />
              </button>
            </div>

            {legalError && (
              <div
                style={{
                  padding: "16px",
                  border: "1px solid #633",
                  borderRadius: "8px",
                  background: "#180909",
                  color: "#ffb0b0",
                  marginBottom: "20px",
                }}
              >
                <strong>
                  Legal retrieval failed
                </strong>

                <p
                  style={{
                    marginBottom: 0,
                  }}
                >
                  {legalError}
                </p>
              </div>
            )}

            {legalLoading && (
              <LoadingPanel
                title="Retrieving Legal Information"
                description="Searching the jurisdiction-aware legal corpus and preparing citation and source provenance information."
                lines={5}
              />
            )}

            {!legalLoading &&
              !legalInfo &&
              !legalError && (
                <div
                  style={{
                    padding: "30px",
                    border: "1px dashed #444",
                    borderRadius: "8px",
                    textAlign: "center",
                    color: "#777",
                  }}
                >
                  Click "Retrieve Legal Information" to search
                  the verified legal knowledge base for this case.
                </div>
              )}

            {legalInfo && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: "10px",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      border: "1px solid #292929",
                      borderRadius: "8px",
                      padding: "15px",
                      background: "#0b0b0b",
                    }}
                  >
                    <div
                      style={{
                        color: "#777",
                        fontSize: "11px",
                        textTransform: "uppercase",
                      }}
                    >
                      Jurisdiction
                    </div>

                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: "700",
                        marginTop: "6px",
                      }}
                    >
                      {legalInfo.jurisdiction || "—"}
                    </div>
                  </div>

                  <div
                    style={{
                      border: "1px solid #292929",
                      borderRadius: "8px",
                      padding: "15px",
                      background: "#0b0b0b",
                    }}
                  >
                    <div
                      style={{
                        color: "#777",
                        fontSize: "11px",
                        textTransform: "uppercase",
                      }}
                    >
                      Legal Domain
                    </div>

                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: "700",
                        marginTop: "6px",
                        color: "#ddd",
                      }}
                    >
                      {legalInfo.legal_domain || "Not specified"}
                    </div>
                  </div>

                  <div
                    style={{
                      border: "1px solid #292929",
                      borderRadius: "8px",
                      padding: "15px",
                      background: "#0b0b0b",
                    }}
                  >
                    <div
                      style={{
                        color: "#777",
                        fontSize: "11px",
                        textTransform: "uppercase",
                      }}
                    >
                      Retrieved Sources
                    </div>

                    <div
                      style={{
                        fontSize: "24px",
                        fontWeight: "700",
                        marginTop: "6px",
                      }}
                    >
                      {legalInfo.result_count ??
                        legalInfo.results?.length ??
                        0}
                    </div>
                  </div>
                </div>

                {legalInfo.query && (
                  <div
                    style={{
                      marginBottom: "20px",
                      padding: "15px",
                      border: "1px solid #292929",
                      borderRadius: "8px",
                      background: "#070707",
                    }}
                  >
                    <div
                      style={{
                        color: "#777",
                        fontSize: "11px",
                        textTransform: "uppercase",
                        marginBottom: "8px",
                      }}
                    >
                      Retrieval Query
                    </div>

                    <pre
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        color: "#ccc",
                        fontFamily: "Arial, sans-serif",
                        fontSize: "13px",
                        lineHeight: "1.6",
                        margin: 0,
                      }}
                    >
                      {legalInfo.query}
                    </pre>
                  </div>
                )}

                {legalInfo.results &&
                  legalInfo.results.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        padding: "16px 18px",
                        border: "1px solid #292929",
                        borderRadius: "10px",
                        background: "#0a0a0a",
                      }}
                    >
                      <div
                        style={{
                          color: "#777",
                          fontSize: "11px",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                        }}
                      >
                        Phase 8.6 — Legal Source Cards
                      </div>
                      <div
                        style={{
                          marginTop: "6px",
                          color: "#eee",
                          fontSize: "18px",
                          fontWeight: "700",
                        }}
                      >
                        Traceable legal sources
                      </div>
                      <p
                        style={{
                          margin: "6px 0 0 0",
                          color: "#888",
                          lineHeight: "1.6",
                          fontSize: "13px",
                        }}
                      >
                        Each card preserves the retrieved provision,
                        source provenance, jurisdiction, citation status,
                        and official source destination.
                      </p>
                    </div>

                    {legalInfo.results.map(
                      (item, index) => {
                        const citation = item.citation || {};
                        const provenance = item.provenance || {};
                        const similarity =
                          typeof item.similarity === "number"
                            ? item.similarity
                            : null;
                        const sourceTitle =
                          citation.source_title ||
                          provenance.source_title ||
                          "Legal source";
                        const sourceUrl =
                          citation.source_url ||
                          provenance.source_url;
                        const verifiedSource =
                          provenance.verification?.verified_source === true;
                        const verifiedCitation =
                          provenance.verification?.citation_verified === true;
                        const statusText =
                          item.citation_status ||
                          (verifiedCitation ? "VERIFIED CITATION" : "CITATION CHECK");

                        return (
                          <article
                            key={
                              item.chunk_id ||
                              `${item.source_id}-${item.section_number}-${index}`
                            }
                            style={{
                              border: "1px solid #292929",
                              borderRadius: "12px",
                              padding: "20px",
                              background: "#090909",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: "16px",
                                flexWrap: "wrap",
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div
                                  style={{
                                    color: "#60a5fa",
                                    fontSize: "11px",
                                    fontWeight: "700",
                                    letterSpacing: "1px",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Source {index + 1} · Section {item.section_number || "—"}
                                </div>
                                <h3
                                  style={{
                                    margin: "7px 0 5px 0",
                                    color: "#f2f2f2",
                                    fontSize: "19px",
                                  }}
                                >
                                  {item.section_title ||
                                    citation.section_title ||
                                    "Legal provision"}
                                </h3>
                                <div
                                  style={{
                                    color: "#bbb",
                                    fontSize: "14px",
                                    lineHeight: "1.5",
                                  }}
                                >
                                  {sourceTitle}
                                </div>
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  flexWrap: "wrap",
                                  justifyContent: "flex-end",
                                }}
                              >
                                <span
                                  style={{
                                    padding: "6px 10px",
                                    border: `1px solid ${verifiedSource ? "#4ade80" : "#fbbf24"}`,
                                    borderRadius: "20px",
                                    color: verifiedSource ? "#4ade80" : "#fbbf24",
                                    fontSize: "11px",
                                    fontWeight: "700",
                                  }}
                                >
                                  {verifiedSource ? "SOURCE VERIFIED" : "SOURCE CHECK"}
                                </span>
                                <span
                                  style={{
                                    padding: "6px 10px",
                                    border: `1px solid ${verifiedCitation ? "#4ade80" : "#555"}`,
                                    borderRadius: "20px",
                                    color: verifiedCitation ? "#4ade80" : "#aaa",
                                    fontSize: "11px",
                                    fontWeight: "700",
                                  }}
                                >
                                  {statusText}
                                </span>
                                {similarity !== null && (
                                  <span
                                    style={{
                                      padding: "6px 10px",
                                      border: "1px solid #444",
                                      borderRadius: "20px",
                                      color: "#aaa",
                                      fontSize: "11px",
                                    }}
                                  >
                                    Retrieval {Math.round(similarity * 100)}%
                                  </span>
                                )}
                              </div>
                            </div>

                            <div
                              style={{
                                marginTop: "16px",
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                                gap: "10px",
                              }}
                            >
                              {[
                                ["Authority", provenance.authority || "—"],
                                ["Jurisdiction", item.jurisdiction || citation.jurisdiction || "—"],
                                ["Citation", citation.citation || provenance.citation || "—"],
                                ["Category", item.legal_category || "—"],
                                ["Domain", item.legal_domain || legalInfo.legal_domain || "—"],
                                ["Version date", provenance.version_date || "Not available"],
                              ].map(([label, value]) => (
                                <div
                                  key={label}
                                  style={{
                                    padding: "12px",
                                    border: "1px solid #222",
                                    borderRadius: "8px",
                                    background: "#070707",
                                  }}
                                >
                                  <div
                                    style={{
                                      color: "#666",
                                      fontSize: "10px",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.8px",
                                    }}
                                  >
                                    {label}
                                  </div>
                                  <div
                                    style={{
                                      color: "#ccc",
                                      marginTop: "5px",
                                      fontSize: "12px",
                                      lineHeight: "1.45",
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {value}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div
                              style={{
                                marginTop: "16px",
                                padding: "16px",
                                border: "1px solid #222",
                                borderRadius: "8px",
                                background: "#050505",
                              }}
                            >
                              <div
                                style={{
                                  color: "#777",
                                  fontSize: "10px",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.8px",
                                  marginBottom: "9px",
                                }}
                              >
                                Retrieved legal text
                              </div>
                              <p
                                style={{
                                  color: "#d0d0d0",
                                  lineHeight: "1.75",
                                  whiteSpace: "pre-wrap",
                                  margin: 0,
                                  fontSize: "14px",
                                }}
                              >
                                {item.content || "No legal text returned."}
                              </p>
                            </div>

                            <div
                              style={{
                                marginTop: "14px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "12px",
                                flexWrap: "wrap",
                              }}
                            >
                              <div
                                style={{
                                  color: "#666",
                                  fontSize: "11px",
                                }}
                              >
                                Source ID: {item.source_id || provenance.source_id || "—"}
                              </div>

                              {sourceUrl ? (
                                <a
                                  href={sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: "inline-block",
                                    padding: "8px 12px",
                                    border: "1px solid #3b82f6",
                                    borderRadius: "7px",
                                    color: "#60a5fa",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    textDecoration: "none",
                                  }}
                                >
                                  Open Official Source ↗
                                </a>
                              ) : (
                                <span
                                  style={{
                                    color: "#666",
                                    fontSize: "12px",
                                  }}
                                >
                                  Official source URL unavailable
                                </span>
                              )}
                            </div>
                          </article>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "30px",
                      border: "1px dashed #444",
                      borderRadius: "8px",
                      textAlign: "center",
                      color: "#777",
                    }}
                  >
                    No legal material was retrieved for this case.
                  </div>
                )}

                {legalInfo.limitations &&
                  legalInfo.limitations.length > 0 && (
                    <div
                      style={{
                        marginTop: "20px",
                        padding: "16px",
                        border: "1px solid #444",
                        borderRadius: "8px",
                        background: "#0b0b0b",
                        color: "#999",
                        fontSize: "13px",
                        lineHeight: "1.6",
                      }}
                    >
                      <strong
                        style={{
                          color: "#bbb",
                        }}
                      >
                        Retrieval limitations
                      </strong>

                      <ul
                        style={{
                          marginBottom: 0,
                        }}
                      >
                        {legalInfo.limitations.map(
                          (item, index) => (
                            <li key={index}>{item}</li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                <div
                  style={{
                    marginTop: "20px",
                    padding: "15px",
                    border: "1px solid #292929",
                    borderRadius: "8px",
                    background: "#070707",
                    color: "#777",
                    fontSize: "12px",
                    lineHeight: "1.6",
                  }}
                >
                  Legal information is retrieved from the
                  available NYAYAOS legal corpus. A retrieved
                  provision is not, by itself, a final legal
                  determination or legal advice. Source citation
                  and provenance are displayed to preserve
                  traceability.
                </div>
              </>
            )}
          </section>
        )}

        {/* ==================================================
            PHASE 8.7 — SAFETY GUARDIAN UI
        ================================================== */}

        {result && (
          <section
            id="safety-stage"
            aria-label="NYAYAOS Safety Guardian"
            style={{
              marginBottom: "30px",
              border: "1px solid #292929",
              borderRadius: "12px",
              padding: "24px",
              background: "#080808",
              scrollMarginTop: "110px",
            }}
          >
            {(() => {
              const safety = buildSafetyPresentation(legalInfo, graph);
              const statusAccent =
                safety.status === "SUPPORTED"
                  ? "#4ade80"
                  : safety.status === "PARTIAL"
                    ? "#fbbf24"
                    : safety.status === "BLOCKED"
                      ? "#f87171"
                      : safety.status === "HUMAN REVIEW"
                        ? "#c084fc"
                        : "#60a5fa";

              return (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "18px",
                      flexWrap: "wrap",
                      marginBottom: "20px",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          color: "#777",
                          fontSize: "12px",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          margin: "0 0 8px 0",
                        }}
                      >
                        Phase 8.7 — Safety Guardian
                      </p>
                      <h2 style={{ margin: "0 0 8px 0" }}>
                        Safety Check
                      </h2>
                      <p
                        style={{
                          margin: 0,
                          color: "#888",
                          lineHeight: "1.6",
                          maxWidth: "760px",
                        }}
                      >
                        NYAYAOS checks whether retrieved legal information is sufficiently
                        supported before presenting it as actionable. Failed or incomplete
                        checks move the case toward human review rather than silently
                        treating uncertainty as legal certainty.
                      </p>
                    </div>

                    <div
                      style={{
                        border: `1px solid ${statusAccent}`,
                        color: statusAccent,
                        borderRadius: "999px",
                        padding: "10px 15px",
                        fontSize: "12px",
                        fontWeight: "800",
                        letterSpacing: "0.7px",
                        background: "#0b0b0b",
                      }}
                    >
                      {safety.status}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "10px",
                      marginBottom: "18px",
                    }}
                  >
                    {[
                      ["Safe to present", safety.safeToPresent ? "YES" : "NO"],
                      [
                        "Human review",
                        safety.requiresHumanReview ? "REQUIRED" : "NOT REQUIRED",
                      ],
                      [
                        "Legal sources",
                        String(legalInfo?.result_count ?? legalInfo?.results?.length ?? 0),
                      ],
                      [
                        "Evidence support",
                        graph ? "GRAPH CHECKED" : "NOT LOADED",
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        style={{
                          border: "1px solid #292929",
                          borderRadius: "8px",
                          padding: "14px",
                          background: "#0b0b0b",
                        }}
                      >
                        <div
                          style={{
                            color: "#777",
                            fontSize: "10px",
                            textTransform: "uppercase",
                            letterSpacing: "0.7px",
                          }}
                        >
                          {label}
                        </div>
                        <div
                          style={{
                            marginTop: "6px",
                            color: "#eee",
                            fontSize: "15px",
                            fontWeight: "700",
                          }}
                        >
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    {safety.checks.map((check) => {
                      const checkColor =
                        check.verified
                          ? "#4ade80"
                          : check.partial
                            ? "#fbbf24"
                            : "#f87171";

                      return (
                        <article
                          key={check.label}
                          style={{
                            border: "1px solid #292929",
                            borderRadius: "9px",
                            padding: "15px",
                            background: "#0a0a0a",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "10px",
                              alignItems: "center",
                              marginBottom: "7px",
                            }}
                          >
                            <strong style={{ color: "#ddd" }}>
                              {check.label}
                            </strong>
                            <span
                              style={{
                                color: checkColor,
                                fontSize: "10px",
                                fontWeight: "800",
                                letterSpacing: "0.6px",
                              }}
                            >
                              {check.verified
                                ? "VERIFIED"
                                : check.partial
                                  ? "PARTIAL"
                                  : "REVIEW"}
                            </span>
                          </div>
                          <p
                            style={{
                              margin: 0,
                              color: "#888",
                              fontSize: "12px",
                              lineHeight: "1.55",
                            }}
                          >
                            {check.detail}
                          </p>
                        </article>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      marginTop: "18px",
                      padding: "16px",
                      border: "1px solid #292929",
                      borderRadius: "9px",
                      background: "#0a0a0a",
                    }}
                  >
                    <div
                      style={{
                        color: "#ddd",
                        fontWeight: "700",
                        marginBottom: "7px",
                      }}
                    >
                      Why did NYAYAOS say this?
                    </div>
                    {safety.reasons.length > 0 ? (
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: "20px",
                          color: "#999",
                          lineHeight: "1.6",
                          fontSize: "13px",
                        }}
                      >
                        {safety.reasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    ) : (
                      <p
                        style={{
                          margin: 0,
                          color: "#888",
                          fontSize: "13px",
                          lineHeight: "1.6",
                        }}
                      >
                        All displayed safety checks are currently satisfied by the
                        information available to the frontend.
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: "14px",
                      color: "#666",
                      fontSize: "11px",
                      lineHeight: "1.6",
                    }}
                  >
                    Safety status is a presentation gate, not a legal determination.
                    Missing verification data is surfaced instead of being treated as verified.
                  </div>
                </>
              );
            })()}
          </section>
        )}

        {/* ==================================================
            JUSTICE ROUTE UI — PHASE 8.7
        ================================================== */}

        {result && (
          <section id="route-stage" style={{ marginTop: "10px", marginBottom: "40px", scrollMarginTop: "100px" }}>
            {(() => {
              const routes = caseRoutes;
              const selectedRoute = selectedJusticeRoute;

              if (!selectedRoute) {
                return (
                  <div>
                    <div style={{ marginBottom: "10px", color: "#60a5fa", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase" }}>
                      Stage 7 · Justice Route
                    </div>
                    <EmptyState
                      title="No justice route loaded"
                      message="This case does not currently expose a Phase 7 route record to the frontend. A route should be created only after the verified facts, legal analysis, and safety checks required by the workflow are available."
                      compact
                      icon="R"
                    />
                  </div>
                );
              }

              const completedCount = getRouteCompletedCount(selectedRoute);
              const routeProgress = Math.round((completedCount / selectedRoute.steps.length) * 100);
              const nextStep = selectedRoute.steps.find((step) => {
                const status = getRouteStepStatus(step);
                return status === "READY" || status === "IN_PROGRESS";
              });
              const routeTypeLabels: Record<JusticeRoute["route_type"], string> = {
                INITIAL_RESOLUTION: "Initial Resolution",
                FORMAL_GRIEVANCE: "Formal Grievance",
                ESCALATION: "Escalation",
                LEGAL_AID: "Legal Aid",
                HUMAN_REVIEW: "Human Review",
              };
              const statusStyles: Record<JusticeRouteStep["status"], { color: string; background: string }> = {
                PENDING: { color: "#777", background: "#111" },
                READY: { color: "#60a5fa", background: "#0a1422" },
                IN_PROGRESS: { color: "#fbbf24", background: "#191507" },
                COMPLETED: { color: "#4ade80", background: "#09170d" },
                BLOCKED: { color: "#f87171", background: "#1a0b0b" },
                SKIPPED: { color: "#888", background: "#111" },
              };

              return (
                <>
                  <div style={{ border: "1px solid #292929", borderRadius: "12px", padding: "28px", background: "#090909", marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0, flex: "1 1 520px" }}>
                        <p style={{ margin: "0 0 7px", color: "#60a5fa", fontSize: "11px", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase" }}>Stage 7 · Justice Route</p>
                        <h2 style={{ margin: "0 0 8px" }}>Turn verified information into an actionable pathway</h2>
                        <p style={{ margin: 0, color: "#888", lineHeight: "1.6", maxWidth: "800px" }}>
                          NYAYAOS presents the Phase 7 route records, ordered steps, destinations, human-review requirements, and the next action for this case.
                        </p>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                        <span style={{ padding: "6px 10px", border: "1px solid #60a5fa", borderRadius: "999px", color: "#60a5fa", fontSize: "10px", fontWeight: "700" }}>{selectedRoute.route_status}</span>
                        <span style={{ color: "#777", fontSize: "11px" }}>{selectedRoute.jurisdiction} · {selectedRoute.priority} priority</span>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginTop: "22px" }}>
                      {[
                        ["Route", routeTypeLabels[selectedRoute.route_type]],
                        ["Progress", `${completedCount}/${selectedRoute.steps.length} steps`],
                        ["Completion", `${routeProgress}%`],
                        ["Human review", selectedRoute.requires_human_review ? "Required" : "Not currently required"],
                      ].map(([label, value]) => (
                        <div key={label} style={{ border: "1px solid #242424", borderRadius: "9px", padding: "14px", background: "#0c0c0c" }}>
                          <div style={{ color: "#666", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "7px" }}>{label}</div>
                          <div style={{ color: "#ddd", fontSize: "13px", fontWeight: "700", lineHeight: "1.4" }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: "18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#777", fontSize: "11px", marginBottom: "7px" }}>
                        <span>Route progress</span><span>{routeProgress}%</span>
                      </div>
                      <div style={{ height: "7px", borderRadius: "999px", background: "#1b1b1b", overflow: "hidden" }}>
                        <div style={{ width: `${routeProgress}%`, height: "100%", background: "#60a5fa", borderRadius: "999px", transition: "width 180ms ease" }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "6px", marginBottom: "16px" }}>
                    {routes.map((route) => {
                      const active = route.route_type === selectedRoute.route_type;
                      return (
                        <button key={route.route_id} type="button" onClick={() => { setSelectedRouteType(route.route_type); setRouteActionMessage(""); }} style={{ flex: "0 0 auto", padding: "10px 14px", border: active ? "1px solid #60a5fa" : "1px solid #333", borderRadius: "8px", background: active ? "#0a1422" : "#0b0b0b", color: active ? "#60a5fa" : "#999", cursor: "pointer", fontSize: "12px", fontWeight: "700" }}>
                          {routeTypeLabels[route.route_type]}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 360px)", gap: "16px", alignItems: "start" }}>
                    <div style={{ border: "1px solid #292929", borderRadius: "12px", background: "#090909", overflow: "hidden" }}>
                      <div style={{ padding: "18px 20px", borderBottom: "1px solid #242424" }}>
                        <h3 style={{ margin: 0 }}>{selectedRoute.title}</h3>
                        <p style={{ margin: "7px 0 0", color: "#888", fontSize: "13px", lineHeight: "1.5" }}>{selectedRoute.description}</p>
                      </div>

                      <div style={{ padding: "8px 20px 20px" }}>
                        {selectedRoute.steps.map((step, index) => {
                          const status = getRouteStepStatus(step);
                          const statusStyle = statusStyles[status];
                          const isLast = index === selectedRoute.steps.length - 1;
                          return (
                            <div key={step.step_id} style={{ display: "grid", gridTemplateColumns: "34px minmax(0, 1fr)", gap: "14px", position: "relative", paddingTop: "14px", paddingBottom: isLast ? "4px" : "14px" }}>
                              <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                                {!isLast && <div style={{ position: "absolute", top: "31px", bottom: "-14px", width: "1px", background: "#2b2b2b" }} />}
                                <div style={{ width: "30px", height: "30px", borderRadius: "50%", border: `1px solid ${statusStyle.color}`, background: statusStyle.background, color: statusStyle.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800", zIndex: 1 }}>
                                  {status === "COMPLETED" ? "✓" : step.step_number}
                                </div>
                              </div>

                              <div style={{ border: "1px solid #252525", borderRadius: "9px", padding: "16px", background: "#0b0b0b" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                                  <div>
                                    <div style={{ color: "#666", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "5px" }}>Step {step.step_number} · {formatLabel(step.step_type)}</div>
                                    <h4 style={{ margin: 0, color: "#eee" }}>{step.title}</h4>
                                  </div>
                                  <span style={{ padding: "5px 8px", border: `1px solid ${statusStyle.color}`, borderRadius: "999px", color: statusStyle.color, background: statusStyle.background, fontSize: "9px", fontWeight: "800" }}>{status}</span>
                                </div>

                                <p style={{ margin: "10px 0 0", color: "#999", fontSize: "13px", lineHeight: "1.55" }}>{step.description}</p>

                                <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
                                  <div style={{ border: "1px solid #222", borderRadius: "7px", padding: "9px" }}>
                                    <div style={{ color: "#666", fontSize: "9px", marginBottom: "4px", textTransform: "uppercase" }}>Destination</div>
                                    <div style={{ color: "#ccc", fontSize: "12px", lineHeight: "1.4" }}>{step.destination_name}</div>
                                  </div>
                                  <div style={{ border: "1px solid #222", borderRadius: "7px", padding: "9px" }}>
                                    <div style={{ color: "#666", fontSize: "9px", marginBottom: "4px", textTransform: "uppercase" }}>Required review</div>
                                    <div style={{ color: step.requires_human_review ? "#fbbf24" : "#4ade80", fontSize: "12px" }}>{step.requires_human_review ? "Human review required" : "Not currently required"}</div>
                                  </div>
                                </div>

                                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "13px" }}>
                                  <button type="button" onClick={() => handleRouteStepAction(step)} disabled={status === "COMPLETED" || status === "BLOCKED" || status === "SKIPPED"} style={{ padding: "9px 13px", border: "1px solid #444", borderRadius: "7px", background: status === "COMPLETED" ? "#101010" : "#111", color: status === "COMPLETED" ? "#555" : "#ddd", cursor: status === "COMPLETED" || status === "BLOCKED" || status === "SKIPPED" ? "not-allowed" : "pointer", fontSize: "11px", fontWeight: "700" }}>
                                    {status === "IN_PROGRESS" ? "Mark Complete" : status === "COMPLETED" ? "Completed" : "Start Step"}
                                  </button>
                                  {step.destination_url && (
                                    <a href={step.destination_url} target="_blank" rel="noreferrer" style={{ padding: "9px 13px", border: "1px solid #333", borderRadius: "7px", color: "#60a5fa", background: "#0a0f16", textDecoration: "none", fontSize: "11px", fontWeight: "700" }}>
                                      Open Official Destination
                                    </a>
                                  )}
                                </div>

                                <div style={{ marginTop: "10px", color: "#777", fontSize: "11px", lineHeight: "1.5" }}>
                                  <strong style={{ color: "#999" }}>Next action:</strong> {step.action_text}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <aside style={{ border: "1px solid #292929", borderRadius: "12px", padding: "20px", background: "#090909", position: "sticky", top: "82px" }}>
                      <div style={{ color: "#60a5fa", fontSize: "10px", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>Next Action</div>
                      <h3 style={{ margin: "0 0 8px" }}>{nextStep ? nextStep.title : "Route completed"}</h3>
                      <p style={{ margin: 0, color: "#888", fontSize: "13px", lineHeight: "1.6" }}>{nextStep ? nextStep.action_text : "All route steps are marked complete in this session."}</p>

                      {nextStep && (
                        <div style={{ marginTop: "16px", padding: "12px", border: "1px solid #222", borderRadius: "8px", background: "#0c0c0c" }}>
                          <div style={{ color: "#666", fontSize: "9px", textTransform: "uppercase", marginBottom: "5px" }}>Destination</div>
                          <div style={{ color: "#ddd", fontSize: "12px", lineHeight: "1.5" }}>{nextStep.destination_name}</div>
                        </div>
                      )}

                      {selectedRoute.requires_human_review && (
                        <div style={{ marginTop: "14px", padding: "12px", border: "1px solid #5a4315", borderRadius: "8px", background: "#171206", color: "#d6a943", fontSize: "12px", lineHeight: "1.55" }}>
                          This route contains human-review requirements. NYAYAOS should not present the route as a substitute for qualified legal review.
                        </div>
                      )}

                      {routeActionMessage && (
                        <div role="status" style={{ marginTop: "14px", padding: "10px 12px", border: "1px solid #254a32", borderRadius: "8px", background: "#09130d", color: "#7edc99", fontSize: "11px", lineHeight: "1.5" }}>
                          {routeActionMessage}
                        </div>
                      )}

                      <button type="button" onClick={resetJusticeRouteSession} style={{ width: "100%", marginTop: "14px", padding: "9px 12px", border: "1px solid #333", borderRadius: "7px", background: "#0d0d0d", color: "#888", cursor: "pointer", fontSize: "11px" }}>
                        Reset Route UI State
                      </button>

                      <div style={{ marginTop: "14px", color: "#555", fontSize: "10px", lineHeight: "1.5" }}>
                        Route controls are presentation-aware. Persisted action state remains governed by the backend Action Tracking workflow.
                      </div>
                    </aside>
                  </div>
                </>
              );
            })()}
          </section>
        )}

        {/* ==================================================
            STAGE 10 — CASE JOURNEY
        ================================================== */}

        {result && (
          <section
            id="journey-stage"
            aria-labelledby="case-journey-title"
            style={{
              marginBottom: "40px",
              padding: "24px",
              border: "1px solid #294a34",
              borderRadius: "14px",
              background: "linear-gradient(145deg, #07100a 0%, #090909 62%)",
              scrollMarginTop: "100px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "18px", flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#4ade80", fontSize: "10px", fontWeight: "800", letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: "7px" }}>Stage 10</div>
                <h2 id="case-journey-title" style={{ margin: 0 }}>Case Journey</h2>
                <p style={{ margin: "8px 0 0", color: "#888", maxWidth: "780px", lineHeight: "1.6", fontSize: "13px" }}>
                  A single traceable view of what NYAYAOS knows about the case, what action is active, what requires an external response, and when qualified human review is required.
                </p>
              </div>
              <div style={{ minWidth: "190px", padding: "12px 14px", border: "1px solid #294a34", borderRadius: "10px", background: "#08110b" }}>
                <div style={{ color: "#6ee7a0", fontSize: "9px", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase" }}>Current workflow state</div>
                <div style={{ marginTop: "6px", color: "#eee", fontSize: "17px", fontWeight: "800" }}>{caseJourney.derivedState}</div>
                <div style={{ marginTop: "5px", color: "#777", fontSize: "10px" }}>Derived from the loaded case and current route session.</div>
              </div>
            </div>

            <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "9px" }}>
              {[
                ["Route", caseJourney.route ? caseJourney.route.route_type.replace(/_/g, " ") : "—"],
                ["Route progress", caseJourney.route ? `${caseJourney.completedSteps.length}/${caseJourney.resolvedSteps.length}` : "—"],
                ["Active action", caseJourney.activeStep ? caseJourney.activeStep.title : "None"],
                ["Response", caseJourney.waitingForExternalResponse ? "Awaiting" : "Not recorded"],
                ["Human review", caseJourney.humanReviewRequired ? "Required / available" : "Not required"],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: "13px", border: "1px solid #242424", borderRadius: "9px", background: "#0b0b0b" }}>
                  <div style={{ color: "#666", fontSize: "9px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>{label}</div>
                  <div style={{ color: "#ddd", fontSize: "12px", fontWeight: "700", lineHeight: "1.45" }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 0.7fr)", gap: "14px" }}>
              <div style={{ border: "1px solid #242424", borderRadius: "11px", background: "#080808", padding: "18px" }}>
                <div style={{ color: "#777", fontSize: "10px", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>Journey timeline</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  {caseJourney.timeline.map((event, index) => (
                    <div key={event.id} style={{ display: "grid", gridTemplateColumns: "18px 1fr auto", gap: "10px", alignItems: "start", paddingBottom: index === caseJourney.timeline.length - 1 ? 0 : "10px", borderBottom: index === caseJourney.timeline.length - 1 ? "none" : "1px solid #181818" }}>
                      <div style={{ width: "9px", height: "9px", marginTop: "4px", borderRadius: "50%", background: event.accent, boxShadow: `0 0 0 3px ${event.accent}18` }} />
                      <div>
                        <div style={{ color: "#ddd", fontSize: "12px", fontWeight: "700" }}>{event.title}</div>
                        <div style={{ color: "#777", fontSize: "11px", lineHeight: "1.5", marginTop: "3px" }}>{event.detail}</div>
                      </div>
                      <span style={{ color: event.status === "COMPLETE" ? "#6ee7a0" : event.status === "HUMAN REVIEW" || event.status === "REQUIRED" ? "#fbbf24" : "#888", fontSize: "9px", fontWeight: "800", whiteSpace: "nowrap" }}>{event.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <aside style={{ border: "1px solid #242424", borderRadius: "11px", background: "#080808", padding: "18px" }}>
                <div style={{ color: "#60a5fa", fontSize: "10px", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>Current action</div>
                <h3 style={{ margin: "0 0 7px", color: "#eee" }}>{caseJourney.activeStep?.title || "No active action"}</h3>
                <p style={{ margin: 0, color: "#888", fontSize: "12px", lineHeight: "1.6" }}>
                  {caseJourney.activeStep?.action_text || "Select or start a route step to create an active action in this frontend session."}
                </p>

                {caseJourney.activeStep && (
                  <div style={{ marginTop: "14px", padding: "11px", border: "1px solid #222", borderRadius: "8px", background: "#0c0c0c" }}>
                    <div style={{ color: "#666", fontSize: "9px", textTransform: "uppercase", marginBottom: "5px" }}>Destination</div>
                    <div style={{ color: "#ddd", fontSize: "12px" }}>{caseJourney.activeStep.destination_name}</div>
                  </div>
                )}

                {caseJourney.waitingForExternalResponse && (
                  <div style={{ marginTop: "12px", padding: "11px", border: "1px solid #4a3c20", borderRadius: "8px", background: "#141007", color: "#d6b76a", fontSize: "11px", lineHeight: "1.55" }}>
                    External response tracking is explicit: NYAYAOS records that a response may be pending, but it does not fabricate bank, police, regulator, or authority responses.
                  </div>
                )}

                {caseJourney.humanReviewRequired && (
                  <div style={{ marginTop: "12px", padding: "11px", border: "1px solid #4a321f", borderRadius: "8px", background: "#140d07", color: "#e2b06a", fontSize: "11px", lineHeight: "1.55" }}>
                    Human review is required or available for this path. Consequential legal decisions remain with a qualified human reviewer.
                  </div>
                )}

                <button type="button" onClick={() => scrollToJourneyStage(JOURNEY_STAGES[6])} style={{ width: "100%", marginTop: "14px", padding: "9px 12px", border: "1px solid #333", borderRadius: "7px", background: "#0d0d0d", color: "#bbb", cursor: "pointer", fontSize: "11px", fontWeight: "700" }}>
                  Return to Justice Route
                </button>
              </aside>
            </div>

            <div style={{ marginTop: "14px", color: "#555", fontSize: "10px", lineHeight: "1.55" }}>
              Case Journey is connected to the same loaded case, evidence, intelligence, graph, legal information, safety state, and Justice Route session already displayed above. External authority responses and persisted backend action history are shown only when the corresponding backend data is available.
            </div>
          </section>
        )}

        {/* ==================================================
            PHASE 8.17 — FULL PRODUCT WALKTHROUGH
        ================================================== */}

        <section
          id="product-walkthrough"
          aria-labelledby="product-walkthrough-title"
          style={{
            marginBottom: "40px",
            padding: "24px",
            border: "1px solid #2b3d4c",
            borderRadius: "14px",
            background: "linear-gradient(145deg, #081018 0%, #090909 60%)",
            scrollMarginTop: "100px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "18px", flexWrap: "wrap" }}>
            <div>
              <div style={{ color: "#22d3ee", fontSize: "10px", fontWeight: "800", letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: "7px" }}>Phase 8.17</div>
              <h2 id="product-walkthrough-title" style={{ margin: 0 }}>Full Product Walkthrough</h2>
              <p style={{ margin: "8px 0 0", color: "#888", maxWidth: "760px", lineHeight: "1.6", fontSize: "13px" }}>
                Review the complete NYAYAOS journey from problem intake through evidence, verified facts, legal retrieval, safety, justice routing, human handoff, evidence packet, and case journey.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setWalkthroughOpen(true)}
              style={{ padding: "10px 14px", border: "1px solid #35516a", borderRadius: "8px", background: "#0b1621", color: "#b8d8ff", cursor: "pointer", fontSize: "11px", fontWeight: "800" }}
            >
              Open Guided Walkthrough
            </button>
          </div>

          <div style={{ marginTop: "18px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "8px" }}>
            {JOURNEY_STAGES.map((stage, index) => {
              const available = walkthroughStatuses[index];
              const skipped = stage.id === "packet";
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => scrollToJourneyStage(stage)}
                  disabled={skipped || !stage.sectionId}
                  style={{ padding: "13px", border: skipped ? "1px solid #2d2d2d" : available ? "1px solid #31533c" : "1px solid #252525", borderRadius: "9px", background: skipped ? "#0a0a0a" : available ? "#09130d" : "#0a0a0a", color: "#ddd", cursor: skipped || !stage.sectionId ? "default" : "pointer", textAlign: "left" }}
                >
                  <div style={{ color: skipped ? "#777" : available ? "#6ee7a0" : "#666", fontSize: "9px", fontWeight: "800", letterSpacing: "1px" }}>STAGE {String(stage.number).padStart(2, "0")}</div>
                  <div style={{ marginTop: "7px", fontWeight: "800", fontSize: "12px" }}>{stage.title}</div>
                  <div style={{ marginTop: "5px", color: skipped ? "#777" : "#666", fontSize: "10px", lineHeight: "1.45" }}>{skipped ? "SKIPPED — current submission scope" : available ? "Available from current case state" : "Workflow connection pending"}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ==================================================
            HUMAN HANDOFF / EVIDENCE PACKET / CASE JOURNEY
        ================================================== */}

        {result && (
          <section style={{ marginBottom: "40px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
            {[
              { id: "human-stage", number: "08", title: "Human Handoff", status: caseJourney.humanReviewRequired ? "REVIEW PATH READY" : "AVAILABLE IF NEEDED", description: "Cases requiring qualified review are routed to a human-review pathway instead of being presented as definitive legal advice.", accent: "#c084fc" },
              { id: "journey-summary", number: "10", title: "Case Journey", status: "CONNECTED", description: "Track the loaded case, evidence, facts, graph, legal review, safety state, justice route, current action, external-response state, and human handoff.", accent: "#4ade80" },
            ].map((stage) => (
              <article key={stage.id} id={stage.id} style={{ border: "1px solid #292929", borderRadius: "10px", padding: "20px", background: "#090909", scrollMarginTop: "110px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                  <span style={{ color: stage.accent, fontSize: "11px", fontWeight: "700", letterSpacing: "1px" }}>STAGE {stage.number}</span>
                  <span style={{ padding: "5px 8px", border: `1px solid ${stage.accent}`, borderRadius: "999px", color: stage.accent, fontSize: "9px", fontWeight: "700" }}>{stage.status}</span>
                </div>
                <h3 style={{ margin: "0 0 8px", color: "#eee" }}>{stage.title}</h3>
                <p style={{ margin: 0, color: "#888", lineHeight: "1.6", fontSize: "13px" }}>{stage.description}</p>
              </article>
            ))}
          </section>
        )}

      </div>
    </main>
  );
}