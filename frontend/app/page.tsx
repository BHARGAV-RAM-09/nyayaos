"use client";

import { useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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

export default function Home() {
  // ==========================================================
  // CASE STATE
  // ==========================================================

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("IN");
  const [state, setState] = useState("Maharashtra");

  const [result, setResult] = useState<CaseResult | null>(null);
  const [loading, setLoading] = useState(false);

  // ==========================================================
  // EVIDENCE STATE
  // ==========================================================

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [uploading, setUploading] = useState(false);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  // ==========================================================
  // CREATE CASE
  // ==========================================================

  async function createCase() {
    if (!title || !description) {
      alert("Please enter the title and description.");
      return;
    }

    setLoading(true);
    setResult(null);
    setEvidence([]);
    setSelectedFiles([]);

    try {
      const response = await fetch(`${API_URL}/api/cases`, {
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
      });

      if (!response.ok) {
        throw new Error("Case creation failed");
      }

      const data: CaseResult = await response.json();

      setResult(data);
    } catch (error) {
      console.error(error);
      alert("Could not create the case.");
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

    const files = Array.from(event.target.files);

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
      alert("Please select at least one evidence file.");
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
          const errorData = await response.json().catch(() => null);

          throw new Error(
            errorData?.detail ||
            `Failed to upload ${file.name}`
          );
        }
      }

      setSelectedFiles([]);

      await loadEvidence(result.case_id);

      alert("Evidence uploaded successfully.");
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

  async function loadEvidence(caseId: string) {
    setEvidenceLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/cases/${caseId}/evidence`
      );

      if (!response.ok) {
        throw new Error("Failed to retrieve evidence.");
      }

      const data = await response.json();

      setEvidence(data.evidence || []);
    } catch (error) {
      console.error(error);

      alert("Could not load case evidence.");
    } finally {
      setEvidenceLoading(false);
    }
  }

  // ==========================================================
  // FORMAT FILE TYPE
  // ==========================================================

  function getFileTypeLabel(fileType: string) {
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

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "60px",
        fontFamily: "Arial, sans-serif",
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

          <p style={{ color: "#aaa" }}>
            Describe your problem in your own words.
          </p>

          <input
            type="text"
            placeholder="Case title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
            onChange={(e) => setDescription(e.target.value)}
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
            onChange={(e) => setCountry(e.target.value)}
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
            onChange={(e) => setState(e.target.value)}
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
                <strong>Case ID:</strong>{" "}
                {result.case_id}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                {result.status}
              </p>

              <p>
                <strong>Title:</strong>{" "}
                {result.title}
              </p>

              <p>
                <strong>Jurisdiction:</strong>{" "}
                {result.jurisdiction_country} /{" "}
                {result.jurisdiction_state}
              </p>

              <p>
                <strong>Description:</strong>{" "}
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

              <p style={{ color: "#aaa" }}>
                Upload documents, screenshots, receipts,
                statements, or other supporting evidence.
              </p>

              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.txt"
                onChange={handleFileSelection}
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

                  {selectedFiles.map((file) => (
                    <div
                      key={`${file.name}-${file.size}`}
                      style={{
                        padding: "8px 0",
                        color: "#ccc",
                      }}
                    >
                      {file.name}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={uploadEvidence}
                disabled={
                  uploading ||
                  selectedFiles.length === 0
                }
                style={{
                  padding: "14px 28px",
                  fontSize: "16px",
                  cursor:
                    uploading ||
                      selectedFiles.length === 0
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
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
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
                    {evidence.length} evidence item
                    {evidence.length !== 1
                      ? "s"
                      : ""}
                  </p>
                </div>

                <button
                  onClick={() =>
                    loadEvidence(result.case_id)
                  }
                  disabled={evidenceLoading}
                  style={{
                    padding: "10px 18px",
                    cursor: evidenceLoading
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
                evidence.length === 0 && (
                  <div
                    style={{
                      padding: "30px",
                      textAlign: "center",
                      border: "1px dashed #444",
                      borderRadius: "8px",
                      color: "#888",
                    }}
                  >
                    No evidence uploaded yet.
                  </div>
                )}


              {/* ==================================================
                  EVIDENCE LIST
              ================================================== */}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                }}
              >
                {evidence.map((item) => (
                  <div
                    key={item.evidence_id}
                    style={{
                      border: "1px solid #333",
                      borderRadius: "8px",
                      padding: "20px",
                      background: "#0b0b0b",
                    }}
                  >

                    {/* FILE HEADER */}

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems: "flex-start",
                        gap: "20px",
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            margin: "0 0 8px 0",
                          }}
                        >
                          {item.file_name}
                        </h3>

                        <p
                          style={{
                            margin: 0,
                            color: "#999",
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
                        {item.extraction_status}
                      </span>
                    </div>


                    {/* EXTRACTED TEXT */}

                    <div
                      style={{
                        marginTop: "20px",
                        padding: "15px",
                        background: "#050505",
                        borderRadius: "6px",
                        border:
                          "1px solid #222",
                      }}
                    >
                      <p
                        style={{
                          marginTop: 0,
                          color: "#aaa",
                          fontSize: "13px",
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
                            color: "#ddd",
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
                          {item.extracted_text}
                        </pre>
                      ) : (
                        <p
                          style={{
                            color: "#666",
                            margin: 0,
                          }}
                        >
                          No extracted text
                          available.
                        </p>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}