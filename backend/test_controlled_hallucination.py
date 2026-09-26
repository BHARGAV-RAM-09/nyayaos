from app.services.legal_rag_service import LegalRAGService


print("=" * 60)
print("CONTROLLED HALLUCINATION TEST")
print("=" * 60)


# ----------------------------------------------------------
# RETRIEVED LEGAL CORPUS
# ----------------------------------------------------------

retrieved_chunks = [
    {
        "source_id": (
            "5a78d6df-b6f9-40f4-8986-f416c80b184d"
        ),
        "section_number": "66",
        "section_title": "Computer related offences",

        # IMPORTANT:
        # This test source intentionally contains
        # "Indian Penal Code" so we can verify that
        # source-grounded references are allowed.
        "content": (
            "Whoever, dishonestly or fraudulently, does "
            "any act referred to in section 43, is punishable "
            "under this section. The provision contains an "
            "explanation referring to the Indian Penal Code "
            "as part of the supplied legal source material."
        ),

        "jurisdiction": "INDIA",
        "legal_domain": "CYBER_OFFENCE",
        "legal_category": "CYBER_OFFENCE"
    },

    {
        "source_id": (
            "5a78d6df-b6f9-40f4-8986-f416c80b184d"
        ),
        "section_number": "66C",
        "section_title": "Punishment for identity theft",

        "content": (
            "Whoever, fraudulently or dishonestly makes "
            "use of the electronic signature, password "
            "or any other unique identification feature "
            "of any other person shall be punished under "
            "the supplied legal provision."
        ),

        "jurisdiction": "INDIA",
        "legal_domain": "CYBER_OFFENCE",
        "legal_category": "CYBER_OFFENCE"
    }
]


# ----------------------------------------------------------
# TEST 1 — HALLUCINATED EXTERNAL STATUTE
# ----------------------------------------------------------

print("\nTEST 1 — HALLUCINATED EXTERNAL STATUTE")
print("-" * 60)

hallucinated_external = {
    "issue_summary": (
        "The case may also be governed by the "
        "Bharatiya Nyaya Sanhita."
    ),

    "legal_analysis": (
        "Section 66 of the Information Technology Act "
        "is relevant. The Bharatiya Nyaya Sanhita "
        "also applies to the offence."
    ),

    "relevant_sections": [
        {
            "section_number": "66",
            "section_title": "Computer related offences",
            "source_id": (
                "5a78d6df-b6f9-40f4-8986-f416c80b184d"
            )
        }
    ]
}


try:

    LegalRAGService._validate_result(
        hallucinated_external,
        retrieved_chunks
    )

    raise AssertionError(
        "Hallucinated external statute was not blocked."
    )

except RuntimeError as exc:

    print(
        "BLOCKED correctly:",
        str(exc)
    )


# ----------------------------------------------------------
# TEST 2 — HALLUCINATED SECTION
# ----------------------------------------------------------

print("\nTEST 2 — HALLUCINATED SECTION")
print("-" * 60)

hallucinated_section = {
    "issue_summary": (
        "The retrieved material may be relevant."
    ),

    "legal_analysis": (
        "The available material includes relevant "
        "legal provisions."
    ),

    "relevant_sections": [
        {
            "section_number": "999",
            "section_title": "Invented provision",
            "source_id": (
                "5a78d6df-b6f9-40f4-8986-f416c80b184d"
            )
        }
    ]
}


try:

    LegalRAGService._validate_result(
        hallucinated_section,
        retrieved_chunks
    )

    raise AssertionError(
        "Hallucinated section was not blocked."
    )

except RuntimeError as exc:

    print(
        "BLOCKED correctly:",
        str(exc)
    )


# ----------------------------------------------------------
# TEST 3 — HALLUCINATED SOURCE
# ----------------------------------------------------------

print("\nTEST 3 — HALLUCINATED SOURCE")
print("-" * 60)

hallucinated_source = {
    "issue_summary": (
        "The retrieved material may be relevant."
    ),

    "legal_analysis": (
        "The available legal material is relevant."
    ),

    "relevant_sections": [
        {
            "section_number": "66",
            "section_title": "Computer related offences",
            "source_id": "fake-source-id"
        }
    ]
}


try:

    LegalRAGService._validate_result(
        hallucinated_source,
        retrieved_chunks
    )

    raise AssertionError(
        "Hallucinated source was not blocked."
    )

except RuntimeError as exc:

    print(
        "BLOCKED correctly:",
        str(exc)
    )


# ----------------------------------------------------------
# TEST 4 — SAFE GROUNDED OUTPUT
# ----------------------------------------------------------

print("\nTEST 4 — SAFE GROUNDED OUTPUT")
print("-" * 60)

safe_result = {
    "issue_summary": (
        "The retrieved legal material contains "
        "provisions relevant to the identified issue."
    ),

    "legal_analysis": (
        "Section 66 of the Information Technology Act "
        "is included in the retrieved legal material. "
        "The available material should be considered "
        "in light of the case facts."
    ),

    "relevant_sections": [
        {
            "section_number": "66",
            "section_title": "Computer related offences",
            "source_id": (
                "5a78d6df-b6f9-40f4-8986-f416c80b184d"
            )
        },
        {
            "section_number": "66C",
            "section_title": "Punishment for identity theft",
            "source_id": (
                "5a78d6df-b6f9-40f4-8986-f416c80b184d"
            )
        }
    ]
}


validated = LegalRAGService._validate_result(
    safe_result,
    retrieved_chunks
)


print("Status: CLEAR")

print(
    "Validated sections:",
    [
        section["section_number"]
        for section in validated["relevant_sections"]
    ]
)

assert validated == safe_result


# ----------------------------------------------------------
# TEST 5 — SOURCE-GROUNDED LEGAL REFERENCE
# ----------------------------------------------------------

print("\nTEST 5 — SOURCE-GROUNDED LEGAL TEXT")
print("-" * 60)

source_grounded_result = {
    "issue_summary": (
        "Section 66 is part of the retrieved "
        "Information Technology Act material."
    ),

    "legal_analysis": (
        "The retrieved source text itself contains "
        "the phrase Indian Penal Code in its explanation. "
        "This statement is being reported as part of "
        "the supplied source material."
    ),

    "relevant_sections": [
        {
            "section_number": "66",
            "section_title": "Computer related offences",
            "source_id": (
                "5a78d6df-b6f9-40f4-8986-f416c80b184d"
            )
        }
    ]
}


validated = LegalRAGService._validate_result(
    source_grounded_result,
    retrieved_chunks
)


print("Status: CLEAR")

print(
    "Source-grounded reference accepted."
)

assert validated == source_grounded_result


# ----------------------------------------------------------
# TEST 6 — UNSUPPORTED IPC REFERENCE
# ----------------------------------------------------------

print("\nTEST 6 — UNSUPPORTED IPC REFERENCE")
print("-" * 60)

unsupported_ipc_result = {
    "issue_summary": (
        "The Indian Penal Code independently applies "
        "to this case."
    ),

    "legal_analysis": (
        "The retrieved material establishes liability "
        "under the Indian Penal Code."
    ),

    "relevant_sections": [
        {
            "section_number": "66",
            "section_title": "Computer related offences",
            "source_id": (
                "5a78d6df-b6f9-40f4-8986-f416c80b184d"
            )
        }
    ]
}


# For this test, use a corpus that does NOT contain
# "Indian Penal Code".

corpus_without_ipc = [
    {
        **retrieved_chunks[0],
        "content": (
            "Whoever, dishonestly or fraudulently, does "
            "any act referred to in section 43, is punishable "
            "under this section."
        )
    },
    retrieved_chunks[1]
]


try:

    LegalRAGService._validate_result(
        unsupported_ipc_result,
        corpus_without_ipc
    )

    raise AssertionError(
        "Unsupported IPC reference was not blocked."
    )

except RuntimeError as exc:

    print(
        "BLOCKED correctly:",
        str(exc)
    )


# ----------------------------------------------------------
# FINAL RESULT
# ----------------------------------------------------------

print("\n" + "=" * 60)
print("FINAL TEST RESULT")
print("=" * 60)

print(
    "PASS: Controlled hallucination protection "
    "is working correctly."
)