NYAYAOS — AI-Powered Justice Operating System

Turn a real-world problem into a verified justice journey.

NYAYAOS is an AI-powered justice operating system designed to bridge the gap between a person's real-world legal or civic problem and the formal justice system.

Instead of acting as a generic legal chatbot, NYAYAOS converts messy real-world situations and supporting evidence into a structured, evidence-grounded, jurisdiction-aware, safety-checked justice journey.
1. Overview

People often face legal and civic problems with:

incomplete information
scattered documents
unclear evidence
uncertain jurisdiction
difficulty identifying the appropriate authority
difficulty understanding relevant legal provisions
uncertainty about what to do next
no clear transition from an AI system to qualified human review

Real-World Problem
        ↓
Multimodal Intake
        ↓
Case Intelligence
        ↓
Justice Graph
        ↓
Evidence Graph
        ↓
Legal Knowledge + RAG
        ↓
AI Safety Guardian
        ↓
Justice Route
        ↓
Next Action
        ↓
Human Handoff when required
        ↓
Evidence Packet
        ↓
Case Journey

The central principle is:

Verified Coverage, Not Pretended Completeness.

NYAYAOS does not attempt to sound legally authoritative when the available evidence or legal sources are insufficient.

2. Problem

A person experiencing a legal or civic problem may have to independently figure out:

What actually happened?
What facts can be supported by evidence?
Which claims are verified?
Which legal provisions may be relevant?
Does the law apply to their jurisdiction?
Is the retrieved legal information sufficiently trustworthy?
What should they do next?
Which authority or institution should they approach?
What evidence should they provide?
When should the matter be escalated to a qualified human?

Traditional search engines, document repositories, and generic AI chatbots do not provide this entire workflow as one connected system.

NYAYAOS is designed around that missing layer.

3. Solution

NYAYAOS transforms a case through multiple verification layers.

Case Layer

The user's problem becomes structured case information.

Evidence Layer

Documents and evidence are connected to claims.

Legal Layer

Relevant legal information is retrieved from an authoritative legal corpus.

Safety Layer

The system verifies:

source authority
citations
legal provisions
jurisdiction
effective-date metadata
user evidence
uncertainty
unsupported claims
Action Layer

The system converts verified information into a justice pathway.

Human Layer

When the system cannot safely continue, the case can be routed to qualified human review.

                         ┌─────────────────────┐
                         │   Real-World User    │
                         │       Problem       │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Multimodal Intake   │
                         │ Text + Documents    │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Case Intelligence   │
                         │ Facts / Claims /    │
                         │ Events / Issues     │
                         └──────────┬──────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                             ▼
            ┌─────────────────┐           ┌─────────────────┐
            │  Justice Graph  │           │ Evidence Graph  │
            │ People          │           │ Claims          │
            │ Organizations   │           │ Documents       │
            │ Events          │           │ Support         │
            │ Issues         │           │ Coverage        │
            └────────┬────────┘           └────────┬────────┘
                     │                             │
                     └──────────────┬──────────────┘
                                    ▼
                         ┌─────────────────────┐
                         │ Legal Knowledge +   │
                         │ RAG                 │
                         │                     │
                         │ Jurisdiction-aware  │
                         │ Retrieval           │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ AI Safety Guardian  │
                         │                     │
                         │ Source              │
                         │ Citation            │
                         │ Provision           │
                         │ Jurisdiction        │
                         │ Effective Date      │
                         │ Evidence            │
                         │ Uncertainty         │
                         │ Unsupported Claims  │
                         └──────────┬──────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                             ▼
            ┌─────────────────┐           ┌─────────────────┐
            │ Justice Route   │           │ Human Review    │
            │ Next Action     │           │ Handoff         │
            │ Authorities     │           │ Qualified Human │
            └────────┬────────┘           └────────┬────────┘
                     │                             │
                     └──────────────┬──────────────┘
                                    ▼
                         ┌─────────────────────┐
                         │ Evidence Packet     │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Case Journey        │
                         │ Actions             │
                         │ Responses           │
                         │ Escalation          │
                         │ Resolution          │
                         └─────────────────────-
5. Key Features
5.1 Multimodal Intake

Users can describe a real-world problem and provide supporting documents.

The system converts the initial input into a structured case.

5.2 Case Intelligence

NYAYAOS extracts structured information such as:

case summary
facts
people
organizations
events
claims
issues
potential domain

Example domains include:

Cyber / Financial Fraud
Consumer
Employment / Wages
Housing / Tenancy
5.3 Justice Graph

NYAYAOS represents the case as a graph.

Example:

CASE
 │
 ├── PERSON
 │
 ├── ORGANIZATION
 │
 ├── EVENT
 │
 ├── CLAIM
 │
 ├── ISSUE
 │
 └── DOCUMENT

Relationships connect the entities and events involved in the case.

5.4 Evidence Graph

The Evidence Graph connects documents to claims.

Example:

DOCUMENT
   │
   ├── SUPPORTS ──→ CLAIM 1
   │
   └── SUPPORTS ──→ CLAIM 2

Evidence confidence is classified as:

Confidence	Status
≥ 0.70	SUPPORTED
0.40–0.69	PARTIAL
< 0.40	MISSING

Evidence coverage is calculated from these classifications.

6. Legal Knowledge + RAG

NYAYAOS uses a structured legal corpus rather than allowing the language model to independently invent legal references.

The legal knowledge layer contains:

legal sources
sections
section titles
legal content
jurisdiction
legal domain
legal category
source metadata
embeddings

The current implementation uses:

Legal Document
      ↓
PDF Extraction
      ↓
Section Chunking
      ↓
Metadata
      ↓
Local Embeddings
      ↓
pgvector
      ↓
Semantic Retrieval
      ↓
Jurisdiction Filtering
      ↓
Grounded Legal RAG
Current legal corpus

Registered sources include:

Information Technology Act, 2000
Consumer Protection Act, 2019
Code on Wages, 2019
Maharashtra Rent Control Act, 1999

The Information Technology Act has been ingested, chunked and embedded for retrieval.

The remaining registered sources are part of the source registry but are not yet represented as a fully ingested/embedded corpus.

7. Grounded Legal RAG

The RAG layer is intentionally constrained.

The model receives retrieved legal chunks and is instructed to use only those materials.

The generated response contains:

{
  "case_id": "",
  "jurisdiction": "",
  "legal_domain": "",
  "issue_summary": "",
  "legal_analysis": "",
  "relevant_sections": [],
  "limitations": [],
  "needs_human_review": false
}

NYAYAOS validates the generated result before presenting it.

Unsupported external legal references can cause the result to be blocked.

8. AI Safety Guardian

The Safety Guardian is one of the core differentiators of NYAYAOS.

It does not simply ask:

"Did the AI generate an answer?"

It asks:

"Is the generated legal information sufficiently supported to be safely presented?"

The Safety Guardian verifies:

Source Verification
        ↓
Citation Verification
        ↓
Provision Verification
        ↓
Jurisdiction Verification
        ↓
Effective-Date Verification
        ↓
User-Evidence Verification
        ↓
Uncertainty Detection
        ↓
Unsupported-Claim Detection
        ↓
Safety Decision
9. Safety Decisions

NYAYAOS supports four safety outcomes.

SUPPORTED

The available checks support presenting the retrieved legal information.

PARTIAL

Some required evidence or verification is incomplete.

HUMAN_REVIEW

The system has identified uncertainty or verification requirements that require qualified human review.

BLOCKED

The system detects an unsupported claim, invalid jurisdiction, or invalid legal provision.

The principle is:

Insufficient Support
       ↓
Do NOT fabricate certainty
       ↓
Restrict output
       ↓
Route to Human Review when necessary
10. Justice Route Engine

After legal and safety analysis, NYAYAOS converts the case into an actionable pathway.

Supported route types include:

INITIAL_RESOLUTION
FORMAL_GRIEVANCE
ESCALATION
LEGAL_AID
HUMAN_REVIEW

Each route contains ordered steps.

Example:

1. Preserve Transaction Evidence
          ↓
2. Notify the Bank
          ↓
3. Report Cyber-Financial Fraud
          ↓
4. Track Complaint / Response

Routes contain:

destination
destination type
official destination URL where verified
priority
step status
human-review requirements
current step
total steps
11. Action Tracking

NYAYAOS tracks concrete actions associated with justice routes.

Action states include:

READY
  ↓
IN_PROGRESS
  ↓
COMPLETED

Other supported states include:

BLOCKED
SKIPPED
CANCELLED

Actions are linked to:

Case
Route
Route Step
Destination
Priority
Human Review Requirement

This makes the justice route an operational workflow rather than merely a recommendation.

12. Human Handoff

Cases that cannot safely continue automatically can be handed off to a human review pathway.

Current flow:

Safety Decision
      ↓
Human Review Required
      ↓
HUMAN_REVIEW Route
      ↓
Human Review Action
      ↓
Action = IN_PROGRESS
      ↓
Case = HUMAN_REVIEW

The implemented Human Handoff endpoint is:

POST /api/cases/{case_id}/human-handoff

Human-handoff status can be retrieved through:

GET /api/cases/{case_id}/human-handoff

This prevents the system from presenting itself as a replacement for qualified legal review.

13. Evidence Packet

The Evidence Packet is designed to create a traceable case package containing:

Case Facts
Evidence
Justice Graph
Evidence Coverage
Legal Sources
Citations
Limitations
Justice Routes
Actions
Human Review Information
Case State History

The packet is intended to provide a structured handoff between NYAYAOS and:

a qualified reviewer
a legal-aid workflow
an authority
a downstream justice process

The Evidence Packet generation service and database layer are currently under integration.

14. Case Journey

The final workflow represents the case as a journey rather than a single AI response.

Problem
   ↓
Evidence
   ↓
Verified Facts
   ↓
Justice Graph
   ↓
Relevant Law
   ↓
Safety Check
   ↓
Justice Route
   ↓
Human Handoff if required
   ↓
Evidence Packet
   ↓
Action
   ↓
Response
   ↓
Escalation
   ↓
Resolution

This provides a persistent operational view of what happened and what should happen next.

15. Case State Machine

Cases move through controlled states.

NEW
 ↓
VERIFIED
 ↓
LEGAL_ANALYSIS
 ↓
SAFETY_CHECK
 ↓
ROUTE_READY
 ↓
ACTION_IN_PROGRESS
 ↓
AWAITING_RESPONSE
 ↓
RESOLVED
 ↓
CLOSED

Alternative transitions allow controlled movement into:

HUMAN_REVIEW
ESCALATED

Invalid transitions are rejected by the database state-machine logic.

A case_state_history table preserves state transitions for traceability.

16. Technology Stack
Frontend
Next.js / React
TypeScript
CSS-in-JS / inline UI styling
Responsive interface
Backend
Python
FastAPI
Supabase Python client
Database
Supabase PostgreSQL
PostgreSQL JSONB
pgvector
AI
Groq
openai/gpt-oss-20b
Local/free embedding pipeline
Legal Retrieval
PostgreSQL + pgvector
Semantic vector search
Jurisdiction filtering
Legal-domain filtering
Source provenance
Document Processing
PyMuPDF
Storage / Infrastructure
Supabase
Development
Git
GitHub
VS Code
17. Database Architecture

Core entities include:

cases
 │
 ├── evidence
 │
 ├── graph_nodes
 │
 ├── graph_edges
 │
 ├── legal_sources
 │
 ├── legal_chunks
 │
 ├── justice_routes
 │     └── justice_route_steps
 │
 ├── actions
 │
 ├── case_state_history
 │
 └── evidence_packets
       └── evidence_packet_items

This provides a single connected data model across:

Case
Evidence
Legal Knowledge
Safety
Justice Route
Actions
Human Review
Evidence Packet
Case Journey
18. API

Representative API endpoints include:

Cases
GET  /api/cases
POST /api/cases
Case Intelligence
POST /api/cases/{case_id}/intelligence
Justice Graph
GET /api/cases/{case_id}/graph
Evidence
GET /api/cases/{case_id}/evidence
POST /api/cases/{case_id}/evidence
Legal Information
GET /api/legal/case/{case_id}
Human Handoff
POST /api/cases/{case_id}/human-handoff
GET  /api/cases/{case_id}/human-handoff
Evidence Packet
POST /api/cases/{case_id}/evidence-packet
GET  /api/evidence-packets/{packet_id}
19. Example Case

NYAYAOS has been tested against an unauthorized banking transaction scenario.

Example structured case:

Case:
Unauthorized Bank Transaction

Domain:
Cyber / Financial Fraud

Jurisdiction:
Maharashtra, India

The Justice Graph contains:

1 Case
2 Persons
2 Organizations
3 Events
2 Claims
2 Issues
1 Document

The Evidence Graph connects the uploaded transaction evidence to the identified claims.

Example:

Unauthorized Transaction Evidence Dossier
              │
              ├── SUPPORTS → Unauthorized ₹80,000 debit
              │
              └── SUPPORTS → IMPS / NetBanking transaction

The case achieved 100% evidence coverage in the completed Phase 4 test scenario.

20. Official Destination Integration

NYAYAOS uses verified official destinations where available.

Examples include:

National Cyber Crime Reporting Portal
https://www.cybercrime.gov.in/
RBI Complaint Management System
https://cms.rbi.org.in/
National Consumer Helpline
https://consumerhelpline.gov.in/

NYAYAOS does not invent a bank-specific URL when the user's bank is unknown.

21. Responsible AI

NYAYAOS is designed around several safety principles.

No fabricated legal authority

The system should not invent statutes, sections, citations, or authorities.

Grounded retrieval

Legal analysis is generated from retrieved legal source material.

Jurisdiction awareness

Legal information is filtered according to the case jurisdiction.

Evidence awareness

Claims are evaluated against available evidence.

Uncertainty disclosure

Insufficient information should result in uncertainty rather than false confidence.

Human escalation

Cases requiring qualified review can be routed to human review.

Source provenance

Legal information retains source identifiers and metadata.

Controlled output

Blocked or unsafe legal analysis is not presented as verified legal guidance.

22. Limitations

NYAYAOS is a prototype justice-support system and is not a substitute for a lawyer, court, police officer, regulator, or other qualified authority.

Important limitations include:

legal coverage is not exhaustive
the current corpus is limited
not every Indian state or legal domain is currently covered
legal source metadata may sometimes be incomplete
effective-date verification can remain UNKNOWN when source metadata lacks a version date
AI-generated analysis requires grounding and safety checks
human review may be required
official processes and requirements can change
destination availability can vary by case and jurisdiction
the system does not guarantee a legal outcome

The product intentionally communicates uncertainty instead of presenting incomplete coverage as comprehensive legal authority.

23. Current Implementation Status
Foundation
 Backend foundation
 Supabase integration
 Frontend foundation
Multimodal Intake
 Case creation
 Evidence upload
 Document processing
Case Intelligence
 Structured case extraction
 Facts
 Claims
 Events
 Issues
 Domain identification
Justice + Evidence Graph
 Justice Graph
 Evidence Graph
 Claim → Evidence mapping
 Evidence classification
 Evidence coverage
 Graph UI
Legal Knowledge + RAG
 Legal source registry
 Legal ingestion
 Legal chunking
 Legal metadata
 Local embeddings
 pgvector
 Semantic retrieval
 Jurisdiction-aware retrieval
 Grounded RAG
 Citation/provenance foundation
AI Safety Guardian
 Source verification
 Citation verification
 Provision verification
 Jurisdiction verification
 Effective-date verification
 User-evidence verification
 Uncertainty detection
 Unsupported-claim detection
 Safety decision engine
 SUPPORTED
 PARTIAL
 BLOCKED
 HUMAN REVIEW
 Safety explanation
 19/19 safety regression tests
Justice Route
 Route data model
 Case state machine
 Initial Resolution
 Formal Grievance
 Escalation
 Legal Aid
 Human Review
 Next Action generation
 Official destinations
 Action Tracking
 Human Handoff
Product UX
 Complete user journey
 Navigation
 Dashboard
 Timeline
 Evidence visualization
 Legal source cards
 Safety Guardian UI
 Justice Route UI
 Loading states
 Error states
In Progress
 Evidence Packet integration
 Case Journey backend/frontend connection
 Accessibility
 Visual polish
 Demo data
 Performance cleanup
 Full product walkthrough
24. Testing

NYAYAOS includes testing across multiple layers.

Legal Retrieval

Tests cover:

semantic retrieval
domain filtering
jurisdiction filtering
unsupported jurisdiction
retrieved legal sections
Safety

The Phase 6 regression suite currently covers:

19 / 19 PASS

Including:

source verification
citation verification
provision verification
jurisdiction verification
effective-date handling
user-evidence verification
uncertainty detection
unsupported claims
safety decisions
safety statuses
safety explanation
hallucinated legal-reference protection
grounded output validation
Justice Route

Tests cover:

route creation
state transitions
next-action generation
duplicate-action protection
human-review routing
Human Handoff

The implemented test demonstrated:

case_state        = HUMAN_REVIEW
handoff_status    = ACTIVE
handoff_type      = HUMAN_REVIEW
human_review_required = TRUE
action.status     = IN_PROGRESS
route_status      = ACTIVE
25. Project Structure
NYAYAOS/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── legal.py
│   │   │   └── routes.py
│   │   │
│   │   ├── core/
│   │   │   └── config.py
│   │   │
│   │   ├── services/
│   │   │   ├── ai_extraction_service.py
│   │   │   ├── case_legal_retrieval_service.py
│   │   │   ├── evidence_packet_service.py
│   │   │   ├── legal_embedding_service.py
│   │   │   ├── legal_ingestion_service.py
│   │   │   ├── legal_rag_service.py
│   │   │   ├── legal_vector_service.py
│   │   │   ├── pdf_service.py
│   │   │   ├── legal_*_verification_service.py
│   │   │   └── ...
│   │   │
│   │   └── ...
│   │
│   ├── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   └── page.tsx
│   ├── public/
│   └── package.json
│
└── README.md
26. Local Development
Backend
cd C:\Users\bharg\Documents\NYAYAOS\backend
.\venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload

Backend:

http://127.0.0.1:8000
Frontend

Open another terminal:

cd C:\Users\bharg\Documents\NYAYAOS\frontend
npm run dev
27. Environment Variables

The backend uses environment variables for configuration.

Example:

SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

Secrets must remain in .env and must never be committed to GitHub.

28. Design Philosophy

NYAYAOS is based on five principles:

1. Evidence before assertion

A claim should have supporting evidence whenever possible.

2. Sources before generation

Legal information should originate from identifiable legal sources.

3. Verification before presentation

Retrieved information should pass safety checks before being presented as supported.

4. Action after understanding

The system should help the user move from understanding the problem toward an appropriate next action.

5. Human review when automation is insufficient

AI should not pretend to replace qualified human judgment when the available evidence or legal information is insufficient.

29. Why NYAYAOS?

NYAYAOS is not designed as:

User → Chatbot → Legal Answer

Instead:

User
 ↓
Problem
 ↓
Evidence
 ↓
Verified Facts
 ↓
Graph
 ↓
Relevant Law
 ↓
Safety Verification
 ↓
Justice Route
 ↓
Action
 ↓
Human Review when needed
 ↓
Case Journey

The goal is to build an operational justice layer, not merely a conversational legal assistant.
31. Future Expansion

Potential future capabilities include:

broader India jurisdiction packs
additional authoritative legal sources
richer legal source versioning
expanded legal-domain coverage
document OCR
multilingual intake
voice-based intake
authority-specific workflows
richer legal-aid integration
notification and follow-up systems
advanced case analytics
document/evidence packet export
stronger auditability
human reviewer portals
32. Team

Project: NYAYAOS
Track: Access to Justice / Civic Tech
Hackathon: LexHack 2026

33. Final Product Statement

NYAYAOS transforms a person's real-world legal or civic problem and supporting evidence into a verified, actionable justice journey.

It is designed to make the path from problem → evidence → law → safety → action → human review → resolution more structured, transparent, and accessible.
