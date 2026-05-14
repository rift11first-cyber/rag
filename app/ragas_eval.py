from __future__ import annotations

from datasets import Dataset

from app.config import settings


def run_ragas_evaluation(rows: list[dict]) -> dict:
    from ragas import evaluate
    from ragas.metrics import answer_relevancy, context_precision, context_recall, faithfulness

    dataset = Dataset.from_list(rows)
    llm = _build_ragas_llm()
    embeddings = _build_ragas_embeddings()
    result = evaluate(
        dataset=dataset,
        metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
        llm=llm,
        embeddings=embeddings,
    )
    scores = result.to_pandas().mean(numeric_only=True).to_dict()
    return {key: float(value) for key, value in scores.items()}


def _build_ragas_llm():
    if settings.gemini_api_key or settings.google_api_key:
        from langchain_google_genai import ChatGoogleGenerativeAI

        return ChatGoogleGenerativeAI(
            model=settings.llm_model,
            google_api_key=settings.gemini_api_key or settings.google_api_key,
            temperature=0.0,
        )
    if settings.openai_api_key:
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(model=settings.llm_model, api_key=settings.openai_api_key, temperature=0.0)
    raise RuntimeError("RAGAS evaluation requires either GEMINI_API_KEY/GOOGLE_API_KEY or OPENAI_API_KEY.")


def _build_ragas_embeddings():
    if settings.gemini_api_key or settings.google_api_key:
        from langchain_google_genai import GoogleGenerativeAIEmbeddings

        return GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-2",
            google_api_key=settings.gemini_api_key or settings.google_api_key,
        )
    if settings.openai_api_key:
        from langchain_openai import OpenAIEmbeddings

        return OpenAIEmbeddings(api_key=settings.openai_api_key)
    raise RuntimeError("RAGAS evaluation requires either GEMINI_API_KEY/GOOGLE_API_KEY or OPENAI_API_KEY.")
