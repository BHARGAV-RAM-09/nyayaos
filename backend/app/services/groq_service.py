import os

from dotenv import load_dotenv
from groq import Groq


load_dotenv()


class GroqService:
    """
    Centralized Groq client for NYAYAOS.

    Responsibilities:
    - Load GROQ_API_KEY from environment
    - Initialize the Groq client
    - Verify the connection
    - Provide the authenticated client to other AI services
    """

    MODEL = "openai/gpt-oss-20b"

    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")

        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY is not configured in the environment."
            )

        self.client = Groq(
             api_key=api_key,
             timeout=120.0,
)

    def get_client(self) -> Groq:
        """
        Return the authenticated Groq client.

        Other NYAYAOS services can reuse this client without
        handling the API key themselves.
        """
        return self.client

    def test_connection(self) -> str:
        """
        Test whether NYAYAOS can successfully communicate with Groq.
        """

        response = self.client.chat.completions.create(
            model=self.MODEL,
            messages=[
                {
                    "role": "user",
                    "content": "Reply with exactly: NYAYAOS GROQ CONNECTED",
                }
            ],
            temperature=0.6,
            max_completion_tokens=1024,
            reasoning_effort="low",
        )

        print("\n--- GROQ DEBUG ---")
        print("Model:", response.model)
        print("Finish reason:", response.choices[0].finish_reason)
        print("Message:", response.choices[0].message)
        print(
            "Content:",
            repr(response.choices[0].message.content),
        )
        print("------------------\n")

        return response.choices[0].message.content or ""