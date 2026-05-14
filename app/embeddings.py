from typing import Iterable, List
import google.generativeai as genai

from app.config import settings


class EmbeddingService:
    _configured = False

    def _ensure_configured(self) -> None:
        if self._configured:
            return

        api_key = settings.gemini_api_key or settings.google_api_key
        if not api_key:
            raise RuntimeError(
                "No Gemini/Google API key configured. "
                "Set GEMINI_API_KEY or GOOGLE_API_KEY in your .env file."
            )

        genai.configure(api_key=api_key)
        self._configured = True

    def embed_texts(self, texts: Iterable[str]) -> List[List[float]]:
        self._ensure_configured()

        items = [t.strip() for t in texts if t and t.strip()]
        if not items:
            return []

        try:
            # ✅ Use batch embedding (much faster)
            result = genai.embed_content(
                model="models/gemini-embedding-2",   # ✅ FIXED MODEL
                content=items
            )

            # Gemini returns list of embeddings
            return result["embedding"]

        except Exception as exc:
            raise RuntimeError(
                f"Embedding API call failed: {exc}"
            ) from exc

    def embed_text(self, text: str) -> List[float]:
        embeddings = self.embed_texts([text])
        return embeddings[0] if embeddings else []


embedding_service = EmbeddingService()