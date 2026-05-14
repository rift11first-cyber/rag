from __future__ import annotations

from app.config import settings


SYSTEM_PROMPT = """You are a retrieval grounded assistant.
Answer only from the supplied context.
If the context is insufficient, say that clearly.
Always be concise and factual."""


class LLMService:
    def __init__(self) -> None:
        self._provider = None
        self._client = None

    def _resolve_provider(self) -> str | None:
        if settings.gemini_api_key or settings.google_api_key:
            return "gemini"
        if settings.openai_api_key:
            return "openai"
        return None

    def _load(self) -> str | None:
        if self._provider is not None:
            return self._provider

        provider = self._resolve_provider()
        self._provider = provider
        if provider == "gemini":
            import google.generativeai as genai

            genai.configure(api_key=settings.gemini_api_key or settings.google_api_key)
            self._client = genai.GenerativeModel(settings.llm_model, system_instruction=SYSTEM_PROMPT)
        elif provider == "openai":
            from openai import OpenAI

            self._client = OpenAI(api_key=settings.openai_api_key)
        return self._provider

    def answer(self, question: str, contexts: list[dict]) -> str:
        provider = self._load()
        context_block = "\n\n".join(
            f"[{index}] {item['content']}" for index, item in enumerate(contexts, start=1)
        )
        prompt = f"Context:\n{context_block}\n\nQuestion: {question}\n\nAnswer:"

        if provider == "gemini":
            response = self._client.generate_content(prompt)
            return (response.text or "").strip()

        if provider == "openai":
            response = self._client.responses.create(
                model=settings.llm_model,
                input=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
            )
            return response.output_text.strip()

        fallback = contexts[0]["content"] if contexts else "No relevant context was found."
        return f"No LLM provider is configured. Best matching context:\n\n{fallback}"


llm_service = LLMService()
