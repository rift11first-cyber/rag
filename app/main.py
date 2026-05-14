from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

from app.chunker import chunk_text
from app.config import settings
from app.embeddings import embedding_service
from app.extractor import ExtractionError, extract_text
from app.llm import llm_service
from app.retrieval import reciprocal_rank_fusion, sparse_search
from app.store import store


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    store.get_client()
    try:
        yield
    finally:
        store.close()


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Serve React production build if available, otherwise fallback to old static/
_FRONTEND_DIST = Path("frontend/dist")
if _FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=str(_FRONTEND_DIST / "assets")), name="assets")
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def index():
    if _FRONTEND_DIST.is_dir():
        return FileResponse(str(_FRONTEND_DIST / "index.html"))
    return FileResponse("static/index.html")


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "collection": settings.qdrant_collection,
        "embedding_model": settings.embedding_model,
        "llm_model": settings.llm_model,
    }


@app.get("/api/documents")
async def list_documents():
    return {"documents": store.list_documents()}


@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        text = extract_text(file.filename or "document", payload, file.content_type)
    except ExtractionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to extract text: {exc}") from exc

    if not text.strip():
        raise HTTPException(status_code=400, detail="No text could be extracted from the file.")

    chunks = chunk_text(text, settings.chunk_size, settings.chunk_overlap)
    try:
        embeddings = embedding_service.embed_texts(chunk["content"] for chunk in chunks)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    document_id = store.save_document(
        name=file.filename or "document",
        mime_type=file.content_type,
        content=text,
        metadata={"content_type": file.content_type or "application/octet-stream"},
    )
    chunk_count = store.save_chunks(document_id, chunks, embeddings)
    return {
        "document_id": document_id,
        "name": file.filename,
        "chunk_count": chunk_count,
        "char_count": len(text),
    }


@app.delete("/api/documents/{document_id}")
async def delete_document(document_id: str):
    store.delete_document(document_id)
    return {"deleted": document_id}


@app.post("/api/query")
async def query_rag(payload: dict):
    question = (payload.get("question") or "").strip()
    top_k = int(payload.get("top_k") or settings.default_top_k)
    if not question:
        raise HTTPException(status_code=400, detail="Question is required.")

    try:
        query_embedding = embedding_service.embed_text(question)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    dense_results = store.search_dense(query_embedding, top_k=top_k)
    sparse_results = sparse_search(store.all_chunks(), question, top_k=top_k)
    contexts = reciprocal_rank_fusion(dense_results, sparse_results, top_k=top_k)
    answer = llm_service.answer(question, contexts)
    return {"question": question, "answer": answer, "contexts": contexts}


@app.post("/api/evaluate")
async def evaluate(payload: dict):
    rows = payload.get("samples") or []
    if not rows:
        raise HTTPException(status_code=400, detail="`samples` must contain at least one evaluation row.")

    normalized = []
    for row in rows:
        normalized.append(
            {
                "user_input": row["question"],
                "response": row["answer"],
                "retrieved_contexts": row["contexts"],
                "reference": row["ground_truth"],
            }
        )

    try:
        from app.ragas_eval import run_ragas_evaluation

        scores = run_ragas_evaluation(normalized)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"RAGAS evaluation failed: {exc}") from exc
    return {"scores": scores}


def run() -> None:
    uvicorn.run(app, host=settings.app_host, port=settings.app_port, reload=False)
