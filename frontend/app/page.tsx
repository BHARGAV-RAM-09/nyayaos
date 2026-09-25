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
      </div>
    </main>
  );
}