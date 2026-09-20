"use client";

import { useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function Home() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("IN");
  const [state, setState] = useState("Maharashtra");

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function createCase() {
    if (!title || !description) {
      alert("Please enter the title and description.");
      return;
    }

    setLoading(true);
    setResult(null);

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

      const data = await response.json();

      setResult(data);
    } catch (error) {
      console.error(error);
      alert("Could not create the case.");
    } finally {
      setLoading(false);
    }
  }

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
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <h1 style={{ fontSize: "48px" }}>NYAYAOS</h1>

        <p style={{ fontSize: "20px", marginBottom: "40px" }}>
          AI-Powered Justice Operating System
        </p>

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
          }}
        />

        <button
          onClick={createCase}
          disabled={loading}
          style={{
            padding: "14px 28px",
            fontSize: "16px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Creating Case..." : "Create Case"}
        </button>

        {result && (
          <div
            style={{
              marginTop: "40px",
              padding: "20px",
              border: "1px solid #444",
            }}
          >
            <h2>Case Created</h2>

            <p>
              <strong>Case ID:</strong> {result.case_id}
            </p>

            <p>
              <strong>Status:</strong> {result.status}
            </p>

            <p>
              <strong>Title:</strong> {result.title}
            </p>

            <p>
              <strong>Jurisdiction:</strong>{" "}
              {result.jurisdiction_country} /{" "}
              {result.jurisdiction_state}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}