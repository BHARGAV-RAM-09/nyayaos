"use client";

import { useState } from "react";

// Local development API
// Keep this explicit while running NYAYAOS locally so the frontend
// always talks to the FastAPI server on port 8000.
const API_URL = "http://127.0.0.1:8000";

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
  // CREATE CASE
  // ==========================================================

  async function createCase() {
    if (!title || !description) {
      alert(
        "Please enter the title and description."
      );
      return;
    }

    setLoading(true);

    setResult(null);
    setEvidence([]);
    setSelectedFiles([]);

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

      alert(
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
      alert("Create a case first.");
      return;
    }

    if (selectedFiles.length === 0) {
      alert(
        "Please select at least one evidence file."
      );
      return;
    }

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

      alert(
        "Evidence uploaded successfully."
      );
    } catch (error) {
      console.error(error);

      alert(
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
    } catch (error) {
      console.error(error);

      alert(
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
      alert("Create a case first.");
      return;
    }

    if (evidence.length === 0) {
      alert(
        "Upload at least one evidence file first."
      );
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
  // LOAD EXISTING CASE
  // ==========================================================

  async function loadExistingCase() {
    const caseId =
      existingCaseId.trim();

    if (!caseId) {
      alert("Enter a Case ID first.");
      return;
    }

    setExistingCaseLoading(true);
    setGraph(null);
    setGraphError("");
    setSelectedGraphNode(null);

    try {
      // The current backend exposes GET /api/cases
      // (list) rather than GET /api/cases/{case_id}.
      // Load the list and select the requested case.
      const casesResponse = await fetch(
        `${API_URL}/api/cases`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const casesData =
        await casesResponse.json().catch(
          () => null
        );

      if (!casesResponse.ok) {
        throw new Error(
          casesData?.detail ||
          "Cases could not be loaded."
        );
      }

      const caseList = Array.isArray(
        casesData
      )
        ? casesData
        : Array.isArray(
          casesData?.cases
        )
          ? casesData.cases
          : [];

      const caseData = caseList.find(
        (item: {
          case_id?: string;
        }) =>
          item.case_id === caseId
      );

      if (!caseData) {
        throw new Error(
          "Case not found. Check the Case ID."
        );
      }

      const graphResponse = await fetch(
        `${API_URL}/api/cases/${caseId}/graph`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const graphData =
        await graphResponse.json().catch(
          () => null
        );

      if (!graphResponse.ok) {
        throw new Error(
          graphData?.detail ||
          "Justice Graph could not be loaded."
        );
      }

      setResult(caseData);
      setGraph(graphData);

      await loadEvidence(caseId);
      await loadLegalInformation(caseId);
    } catch (error) {
      console.error(
        "Existing case loading error:",
        error
      );

      setGraphError(
        error instanceof Error
          ? error.message
          : "Failed to load existing case."
      );
    } finally {
      setExistingCaseLoading(false);
    }
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

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "60px 20px",
        fontFamily:
          "Arial, sans-serif",
        background: "#050505",
        color: "white",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
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
            marginBottom: "40px",
            color: "#aaa",
          }}
        >
          AI-Powered Justice Operating System
        </p>

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
              {existingCaseLoading
                ? "Loading Case..."
                : "Load Existing Case"}
            </button>
          </div>

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
          <h2>What happened?</h2>

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
            {loading
              ? "Creating Case..."
              : "Create Case"}
          </button>
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
              <h2>Evidence</h2>

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
                {uploading
                  ? "Uploading Evidence..."
                  : "Upload Evidence"}
              </button>
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
                  {evidenceLoading
                    ? "Loading..."
                    : "Refresh"}
                </button>
              </div>

              {/* ==================================================
                  EMPTY STATE
              ================================================== */}

              {!evidenceLoading &&
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

                  <h2
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
                  {graphLoading
                    ? "Loading Graph..."
                    : graph
                      ? "Refresh Graph"
                      : "Load Justice Graph"}
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
                <div
                  style={{
                    padding: "35px",
                    border: "1px solid #292929",
                    borderRadius: "8px",
                    textAlign: "center",
                    color: "#aaa",
                    background: "#0b0b0b",
                  }}
                >
                  Loading graph data from the
                  NYAYAOS backend...
                </div>
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

                <h2
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
                  <h2
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
                <div
                  style={{
                    marginTop:
                      "25px",
                    padding:
                      "20px",
                    border:
                      "1px solid #333",
                    borderRadius:
                      "8px",
                    background:
                      "#0d0d0d",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color:
                        "#ccc",
                    }}
                  >
                    NYAYAOS is analyzing
                    the available evidence.
                    This may take a moment.
                  </p>
                </div>
              )}

              {intelligenceError && (
                <div
                  style={{
                    marginTop:
                      "20px",
                    padding:
                      "16px",
                    border:
                      "1px solid #633",
                    borderRadius:
                      "8px",
                    background:
                      "#180909",
                    color:
                      "#ffb0b0",
                  }}
                >
                  <strong>
                    Intelligence generation
                    failed
                  </strong>

                  <p
                    style={{
                      marginBottom: 0,
                    }}
                  >
                    {
                      intelligenceError
                    }
                  </p>
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
                    TIMELINE
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
                        "6px",
                    }}
                  >
                    Case Timeline
                  </h3>

                  <p
                    style={{
                      color:
                        "#777",
                      fontSize:
                        "14px",
                      marginTop: 0,
                      marginBottom:
                        "20px",
                    }}
                  >
                    Timeline generated from
                    dates and events present
                    in the extracted evidence.
                  </p>

                  {intelligence.timeline &&
                    intelligence.timeline
                      .length > 0 ? (
                    <div
                      style={{
                        display:
                          "flex",
                        flexDirection:
                          "column",
                        gap:
                          "12px",
                      }}
                    >
                      {intelligence.timeline.map(
                        (
                          item,
                          index
                        ) => (
                          <div
                            key={index}
                            style={{
                              display:
                                "grid",
                              gridTemplateColumns:
                                "45px 1fr",
                              gap:
                                "15px",
                            }}
                          >
                            <div
                              style={{
                                width:
                                  "36px",
                                height:
                                  "36px",
                                border:
                                  "1px solid #555",
                                borderRadius:
                                  "50%",
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                color:
                                  "#bbb",
                                fontSize:
                                  "13px",
                              }}
                            >
                              {index +
                                1}
                            </div>

                            <div
                              style={{
                                border:
                                  "1px solid #292929",
                                borderRadius:
                                  "8px",
                                padding:
                                  "16px",
                                background:
                                  "#090909",
                              }}
                            >
                              {isObject(
                                item
                              ) ? (
                                <div
                                  style={{
                                    display:
                                      "flex",
                                    flexDirection:
                                      "column",
                                    gap:
                                      "8px",
                                  }}
                                >
                                  {Object.entries(
                                    item
                                  ).map(
                                    ([
                                      key,
                                      value,
                                    ]) => (
                                      <div
                                        key={
                                          key
                                        }
                                        style={{
                                          display:
                                            "grid",
                                          gridTemplateColumns:
                                            "130px 1fr",
                                          gap:
                                            "12px",
                                        }}
                                      >
                                        <span
                                          style={{
                                            color:
                                              "#777",
                                            fontSize:
                                              "13px",
                                            fontWeight:
                                              "600",
                                          }}
                                        >
                                          {formatLabel(
                                            key
                                          )}
                                        </span>

                                        <span
                                          style={{
                                            color:
                                              "#ccc",
                                            lineHeight:
                                              "1.5",
                                          }}
                                        >
                                          {formatValue(
                                            value
                                          )}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : (
                                <p
                                  style={{
                                    color:
                                      "#ccc",
                                    margin:
                                      0,
                                    lineHeight:
                                      "1.6",
                                  }}
                                >
                                  {formatValue(
                                    item
                                  )}
                                </p>
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
                          "#777",
                        margin: 0,
                      }}
                    >
                      No timeline events
                      were generated.
                    </p>
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

                <h2
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
                {legalLoading
                  ? "Retrieving Legal Information..."
                  : legalInfo
                    ? "Refresh Legal Information"
                    : "Retrieve Legal Information"}
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
              <div
                style={{
                  padding: "30px",
                  border: "1px solid #292929",
                  borderRadius: "8px",
                  textAlign: "center",
                  color: "#aaa",
                  background: "#0b0b0b",
                }}
              >
                Retrieving jurisdiction-aware legal material
                and resolving citation provenance...
              </div>
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
                      gap: "14px",
                    }}
                  >
                    {legalInfo.results.map(
                      (item, index) => {
                        const citation =
                          item.citation || {};

                        const provenance =
                          item.provenance || {};

                        const similarity =
                          typeof item.similarity === "number"
                            ? item.similarity
                            : null;

                        return (
                          <article
                            key={
                              item.chunk_id ||
                              `${item.source_id}-${item.section_number}-${index}`
                            }
                            style={{
                              border: "1px solid #292929",
                              borderRadius: "10px",
                              padding: "20px",
                              background: "#090909",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: "15px",
                                flexWrap: "wrap",
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    color: "#60a5fa",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                    letterSpacing: "1px",
                                  }}
                                >
                                  SECTION{" "}
                                  {item.section_number || "—"}
                                </div>

                                <h3
                                  style={{
                                    margin: "6px 0 5px 0",
                                    color: "#eee",
                                  }}
                                >
                                  {item.section_title ||
                                    citation.section_title ||
                                    "Legal provision"}
                                </h3>

                                <p
                                  style={{
                                    margin: 0,
                                    color: "#888",
                                    fontSize: "13px",
                                  }}
                                >
                                  {citation.source_title ||
                                    provenance.source_title ||
                                    "Legal source"}
                                  {" • "}
                                  {citation.citation ||
                                    provenance.citation ||
                                    "Citation unavailable"}
                                </p>
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    padding: "6px 10px",
                                    border: "1px solid #4ade80",
                                    borderRadius: "20px",
                                    color: "#4ade80",
                                    fontSize: "11px",
                                    fontWeight: "700",
                                  }}
                                >
                                  {item.citation_status ||
                                    "CITATION"}
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
                                    Similarity{" "}
                                    {Math.round(
                                      similarity * 100
                                    )}
                                    %
                                  </span>
                                )}
                              </div>
                            </div>

                            <div
                              style={{
                                marginTop: "18px",
                                padding: "15px",
                                border: "1px solid #222",
                                borderRadius: "7px",
                                background: "#050505",
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
                                Retrieved Legal Text
                              </div>

                              <p
                                style={{
                                  color: "#ccc",
                                  lineHeight: "1.7",
                                  whiteSpace: "pre-wrap",
                                  margin: 0,
                                  fontSize: "14px",
                                }}
                              >
                                {item.content ||
                                  "No legal text returned."}
                              </p>
                            </div>

                            <div
                              style={{
                                marginTop: "14px",
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(220px, 1fr))",
                                gap: "10px",
                              }}
                            >
                              <div
                                style={{
                                  padding: "12px",
                                  border: "1px solid #222",
                                  borderRadius: "7px",
                                  background: "#070707",
                                }}
                              >
                                <div
                                  style={{
                                    color: "#666",
                                    fontSize: "11px",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Authority
                                </div>

                                <div
                                  style={{
                                    color: "#ccc",
                                    marginTop: "5px",
                                    fontSize: "13px",
                                  }}
                                >
                                  {provenance.authority ||
                                    "—"}
                                </div>
                              </div>

                              <div
                                style={{
                                  padding: "12px",
                                  border: "1px solid #222",
                                  borderRadius: "7px",
                                  background: "#070707",
                                }}
                              >
                                <div
                                  style={{
                                    color: "#666",
                                    fontSize: "11px",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Jurisdiction
                                </div>

                                <div
                                  style={{
                                    color: "#ccc",
                                    marginTop: "5px",
                                    fontSize: "13px",
                                  }}
                                >
                                  {item.jurisdiction ||
                                    citation.jurisdiction ||
                                    "—"}
                                </div>
                              </div>

                              <div
                                style={{
                                  padding: "12px",
                                  border: "1px solid #222",
                                  borderRadius: "7px",
                                  background: "#070707",
                                }}
                              >
                                <div
                                  style={{
                                    color: "#666",
                                    fontSize: "11px",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Source Verification
                                </div>

                                <div
                                  style={{
                                    color:
                                      provenance.verification
                                        ?.verified_source
                                        ? "#4ade80"
                                        : "#fbbf24",
                                    marginTop: "5px",
                                    fontSize: "13px",
                                    fontWeight: "700",
                                  }}
                                >
                                  {provenance.verification
                                    ?.verified_source
                                    ? "VERIFIED SOURCE"
                                    : "VERIFY SOURCE"}
                                </div>
                              </div>
                            </div>

                            {(citation.source_url ||
                              provenance.source_url) && (
                                <div
                                  style={{
                                    marginTop: "14px",
                                  }}
                                >
                                  <a
                                    href={
                                      citation.source_url ||
                                      provenance.source_url
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      color: "#60a5fa",
                                      fontSize: "13px",
                                    }}
                                  >
                                    Open Official Source
                                  </a>
                                </div>
                              )}
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
      </div>
    </main>
  );
}