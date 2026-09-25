from typing import Any, Dict
import json

from app.services.groq_service import GroqService


class AIExtractionService:
    """
    NYAYAOS Case Intelligence AI Service.
    """

    MODEL = "openai/gpt-oss-20b"

    ALLOWED_DOMAINS = [
        "Cyber / Financial Fraud",
        "Consumer Dispute",
        "Employment / Wage",
        "Housing / Tenant",
        "Family / Matrimonial",
        "Education",
        "Healthcare",
        "Insurance",
        "Banking / Financial Services",
        "Property / Land",
        "Government Services",
        "Privacy / Data Protection",
        "Criminal / Personal Safety",
        "Civil Dispute",
        "Other",
        "Unknown",
    ]

    def __init__(self, groq_client):
        self.client = groq_client

    def extract_case_intelligence(
        self,
        evidence_text: str,
    ) -> Dict[str, Any]:

        if not evidence_text or not evidence_text.strip():
            raise ValueError("Evidence text cannot be empty.")

        prompt = f"""
You are the Case Intelligence extraction engine for NYAYAOS.

Analyze the evidence text below and return ONLY valid JSON.

Extract only information explicitly supported by the evidence.

DO NOT:
- invent facts
- infer missing information
- decide which claim is true
- provide legal advice
- identify a law that applies
- declare a legal violation
- declare fraud as a legal conclusion

Preserve conflicting statements as separate claims.

Return exactly:

{{
  "people": [],
  "organizations": [],
  "dates": [],
  "amounts": [],
  "locations": [],
  "events": [],
  "claims": [],
  "potential_domain": {{
    "primary": "",
    "secondary": [],
    "confidence": "",
    "reason": ""
  }},
  "case_summary": ""
}}

PEOPLE FORMAT:

[
  {{
    "name": "",
    "role": "",
    "relationship_to_case": ""
  }}
]

ORGANIZATIONS FORMAT:

[
  {{
    "name": "",
    "type": "",
    "relationship_to_case": ""
  }}
]

DATES FORMAT:

[
  {{
    "date": "",
    "date_type": "",
    "description": ""
  }}
]

AMOUNTS FORMAT:

[
  {{
    "amount": "",
    "currency": "",
    "description": ""
  }}
]

LOCATIONS FORMAT:

[
  {{
    "name": "",
    "location_type": "",
    "relationship_to_case": ""
  }}
]

EVENTS FORMAT:

[
  {{
    "event": "",
    "date": "",
    "description": "",
    "actors": []
  }}
]

CLAIMS FORMAT:

[
  {{
    "claim": "",
    "claimant": "",
    "claim_type": "",
    "description": ""
  }}
]

POTENTIAL DOMAIN:

Primary must be one of:

{json.dumps(self.ALLOWED_DOMAINS)}

Use Unknown when there is insufficient information.

The domain is ONLY a routing/classification label.
It is NOT a legal conclusion.

CASE SUMMARY RULES:

- factual
- neutral
- concise
- approximately 3-6 sentences
- preserve conflicting claims
- no legal advice
- no legal conclusions
- no invented facts

EVIDENCE TEXT:

{evidence_text}
"""

        response = self.client.chat.completions.create(
            model=self.MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a factual case-intelligence "
                        "extraction engine for NYAYAOS."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            temperature=0,
            max_completion_tokens=5000,
            reasoning_effort="low",
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content

        if not content:
            raise RuntimeError(
                "Groq returned an empty response."
            )

        try:
            result = json.loads(content)
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                f"Groq returned invalid JSON: {content}"
            ) from exc

        self._validate_result(result)

        return result

    def _validate_result(
        self,
        result: Dict[str, Any],
    ) -> None:

        expected_lists = [
            "people",
            "organizations",
            "dates",
            "amounts",
            "locations",
            "events",
            "claims",
        ]

        for key in expected_lists:

            if key not in result:
                result[key] = []

            if not isinstance(result[key], list):
                raise ValueError(
                    f"Expected '{key}' to be a list."
                )

        if "potential_domain" not in result:
            result["potential_domain"] = {
                "primary": "Unknown",
                "secondary": [],
                "confidence": "low",
                "reason": "Insufficient information.",
            }

        if not isinstance(
            result["potential_domain"],
            dict,
        ):
            raise ValueError(
                "'potential_domain' must be an object."
            )

        domain = result["potential_domain"]

        domain.setdefault("primary", "Unknown")
        domain.setdefault("secondary", [])
        domain.setdefault("confidence", "low")
        domain.setdefault(
            "reason",
            "Insufficient information.",
        )

        if domain["primary"] not in self.ALLOWED_DOMAINS:
            domain["primary"] = "Unknown"

        if not isinstance(domain["secondary"], list):
            domain["secondary"] = []

        domain["secondary"] = [
            item
            for item in domain["secondary"]
            if item in self.ALLOWED_DOMAINS
            and item != domain["primary"]
        ]

        if domain["confidence"] not in [
            "high",
            "medium",
            "low",
        ]:
            domain["confidence"] = "low"

        if "case_summary" not in result:
            result["case_summary"] = ""

        if not isinstance(
            result["case_summary"],
            str,
        ):
            result["case_summary"] = str(
                result["case_summary"]
            )

    def generate_case_summary(
        self,
        case_intelligence: Dict[str, Any],
    ) -> str:

        if not case_intelligence:
            raise ValueError(
                "Case intelligence cannot be empty."
            )

        intelligence_json = json.dumps(
            case_intelligence,
            ensure_ascii=False,
            indent=2,
        )

        prompt = f"""
You are the Case Summary Engine for NYAYAOS.

Generate a concise, neutral, factual summary using ONLY
the structured case intelligence below.

RULES:

- Do not invent facts.
- Do not add facts not present in the input.
- Do not decide which conflicting claim is true.
- Preserve important conflicting claims.
- Do not provide legal advice.
- Do not identify a law that applies.
- Do not state that a legal violation occurred.
- Do not make a legal conclusion.
- Do not recommend a legal strategy.
- Mention important dates and amounts when relevant.
- Mention actions already taken.
- Use neutral language.
- Keep the summary approximately 3-6 sentences.

Return ONLY the summary text.

CASE INTELLIGENCE:

{intelligence_json}
"""

        response = self.client.chat.completions.create(
            model=self.MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You generate neutral factual summaries "
                        "for NYAYAOS case intelligence."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            temperature=0,
            max_completion_tokens=2000,
            reasoning_effort="low",
        )

        summary = response.choices[0].message.content

        if not summary:
            raise RuntimeError(
                "Groq returned an empty case summary."
            )

        return summary.strip()

    def generate_timeline(
        self,
        case_intelligence: Dict[str, Any],
    ) -> list:
        """
        Generate a chronological timeline from extracted
        case intelligence.

        Timeline generation must use only information already
        extracted from the evidence.
        """

        if not case_intelligence:
            raise ValueError(
                "Case intelligence cannot be empty."
            )

        events = case_intelligence.get(
            "events",
            [],
        )

        dates = case_intelligence.get(
            "dates",
            [],
        )

        if not events and not dates:
            return []

        timeline_input = {
            "events": events,
            "dates": dates,
        }

        prompt = f"""
You are the Timeline Engine for NYAYAOS.

Create a chronological timeline using ONLY the supplied
events and dates.

Return ONLY valid JSON.

Return exactly:

{{
  "timeline": [
    {{
      "date": "",
      "date_type": "",
      "title": "",
      "description": "",
      "actors": []
    }}
  ]
}}

RULES:

1. Use only supplied information.
2. Do not invent dates.
3. Do not invent events.
4. Do not infer missing dates.
5. Preserve exact dates when available.
6. If an event has no date, do NOT assign one.
7. Sort events chronologically when exact dates are available.
8. Events without dates should appear after dated events.
9. Keep descriptions factual.
10. Preserve conflicting claims.
11. Do not make legal conclusions.
12. Do not provide legal advice.
13. Do not merge separate events unless they clearly describe
    the same event.
14. Keep the timeline concise.
15. Actors must come only from the supplied event actors.

INPUT:

{json.dumps(
    timeline_input,
    ensure_ascii=False,
    indent=2,
)}
"""

        response = self.client.chat.completions.create(
            model=self.MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You create factual chronological "
                        "timelines for NYAYAOS."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            temperature=0,
            max_completion_tokens=3000,
            reasoning_effort="low",
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content

        if not content:
            raise RuntimeError(
                "Groq returned an empty timeline."
            )

        try:
            result = json.loads(content)
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                f"Groq returned invalid timeline JSON: {content}"
            ) from exc

        timeline = result.get("timeline", [])

        if not isinstance(timeline, list):
            raise ValueError(
                "Timeline must be a list."
            )

        return timeline