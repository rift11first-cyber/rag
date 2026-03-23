import logging
import uuid
import os

from fastapi import FastAPI
import inngest
from inngest.fast_api import serve
from dotenv import load_dotenv

import ai

from data_loader import load_and_chunk_pdf, embed_texts
from vector_db import QdrantStorage

from custom_types import (
    RAGChunkAndSrc,
    RAGUpsertResult,
    RAGSearchResult
)

load_dotenv()

inngest_client = inngest.Inngest(
    app_id="rag-app",
    logger=logging.getLogger("uvicorn"),
    is_production=False,
    serializer=inngest.PydanticSerializer(),
)


# ---------------- PDF INGESTION FUNCTION ---------------- #

@inngest_client.create_function(
    fn_id="rag-function",
    trigger=inngest.TriggerEvent(event="rag-event"),
)
async def rag_function(ctx: inngest.Context):

    def _load(ctx: inngest.Context) -> RAGChunkAndSrc:
        pdf_path = ctx.event.data["pdf_path"]
        source_id = ctx.event.data.get("source_id", pdf_path)

        chunks = load_and_chunk_pdf(pdf_path)

        return RAGChunkAndSrc(
            chunks=chunks,
            source_id=source_id
        )

    def _upsert(chunks_and_src: RAGChunkAndSrc) -> RAGUpsertResult:
        chunks = chunks_and_src.chunks
        source_id = chunks_and_src.source_id

        vecs = embed_texts(chunks)

        ids = [
            str(uuid.uuid5(uuid.NAMESPACE_URL, f"{source_id}_{i}"))
            for i in range(len(chunks))
        ]

        payloads = [
            {"source": source_id, "text": chunks[i]}
            for i in range(len(chunks))
        ]

        QdrantStorage().upsert(
            ids=ids,
            vectors=vecs,
            payloads=payloads
        )

        return RAGUpsertResult(ingested=len(chunks))

    chunks_and_src = await ctx.step.run(
        "load",
        lambda: _load(ctx),
        output_type=RAGChunkAndSrc
    )

    ingested = await ctx.step.run(
        "upsert",
        lambda: _upsert(chunks_and_src),
        output_type=RAGUpsertResult
    )

    return ingested.model_dump()


# ---------------- RAG QUERY FUNCTION ---------------- #

@inngest_client.create_function(
    fn_id="RAG_Query",
    trigger=inngest.TriggerEvent(event="rag-query-event")
)
async def rag_query_function(ctx: inngest.Context):

    def _search(question: str, top_k: int = 5) -> RAGSearchResult:
        query_vec = embed_texts([question])[0]

        store = QdrantStorage()
        found = store.search(query_vec, top_k=top_k)

        return RAGSearchResult(
            contexts=found["contexts"],
            sources=found["sources"]
        )

    question = ctx.event.data["question"]
    top_k = ctx.event.data.get("top_k", 5)

    found = await ctx.step.run(
        "embed-and-search",
        lambda: _search(question, top_k),
        output_type=RAGSearchResult
    )

    context_block = "\n\n".join(found.contexts)

    user_content = (
        "Use the following context to answer the question.\n\n"
        f"Context: {context_block}\n\n"
        f"Question: {question}\n\n"
        "Answer:"
    )

    adapter = ai.openai.Adapter(
        auth_key=os.getenv("OPENAI_API_KEY"),
        model="gpt-4o-mini",
    )

    res = await ctx.step.ai.infer(
        "llm-answer",
        adapter=adapter,
        body={
            "max_tokens": 1024,
            "temperature": 0.2,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a helpful assistant for answering questions based on provided context."
                },
                {
                    "role": "user",
                    "content": user_content
                }
            ]
        }
    )

    answer = res["choices"][0]["message"]["content"].strip()

    return {
        "answer": answer,
        "sources": found.sources,
        "num_contexts": len(found.contexts)
    }


# ---------------- FASTAPI APP ---------------- #

app = FastAPI()

serve(
    app,
    inngest_client,
    functions=[rag_function, rag_query_function]
)