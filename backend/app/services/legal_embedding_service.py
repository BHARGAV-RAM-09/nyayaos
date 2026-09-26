from typing import List, Dict, Any

from sentence_transformers import SentenceTransformer
from app.core.config import settings
from supabase import create_client


class LegalEmbeddingService:

    MODEL_NAME = "all-mpnet-base-v2"

    _model = None

    @classmethod
    def get_model(cls):
        if cls._model is None:
            cls._model = SentenceTransformer(cls.MODEL_NAME)
        return cls._model

    @staticmethod
    def get_supabase_client():
        return create_client(
            settings.supabase_url,
            settings.supabase_key
        )

    @classmethod
    def generate_embedding(cls, text: str) -> List[float]:
        if not text or not text.strip():
            raise ValueError("Text is required for embedding generation")

        model = cls.get_model()

        embedding = model.encode(
            text,
            normalize_embeddings=True
        )

        return embedding.tolist()

    @classmethod
    def generate_embeddings(
        cls,
        chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:

        if not chunks:
            raise ValueError("No legal chunks provided")

        model = cls.get_model()

        texts = [
            chunk["content"]
            for chunk in chunks
        ]

        embeddings = model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=True
        )

        results = []

        for chunk, embedding in zip(chunks, embeddings):
            results.append({
                "chunk_id": chunk.get("chunk_id"),
                "section_number": chunk.get("section_number"),
                "embedding": embedding.tolist()
            })

        return results

    @classmethod
    def embed_source_chunks(cls, source_id: str) -> int:

        if not source_id:
            raise ValueError("source_id is required")

        supabase = cls.get_supabase_client()

        response = (
            supabase
            .table("legal_chunks")
            .select("chunk_id, section_number, content")
            .eq("source_id", source_id)
            .order("section_number")
            .execute()
        )

        chunks = response.data or []

        if not chunks:
            raise ValueError(
                f"No legal chunks found for source: {source_id}"
            )

        model = cls.get_model()

        texts = [
            chunk["content"]
            for chunk in chunks
        ]

        embeddings = model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=True
        )

        updated_count = 0

        for chunk, embedding in zip(chunks, embeddings):

            (
                supabase
                .table("legal_chunks")
                .update({
                    "embedding": embedding.tolist()
                })
                .eq("chunk_id", chunk["chunk_id"])
                .execute()
            )

            updated_count += 1

        return updated_count