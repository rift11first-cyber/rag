from __future__ import annotations

import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone

from qdrant_client import QdrantClient
from qdrant_client.http import models

from app.config import settings


class LocalStore:
    def __init__(self) -> None:
        settings.data_dir.mkdir(parents=True, exist_ok=True)
        settings.uploads_path.mkdir(parents=True, exist_ok=True)
        settings.qdrant_path.mkdir(parents=True, exist_ok=True)
        self.client: QdrantClient | None = None
        self._init_db()

    def get_client(self) -> QdrantClient:
        if self.client is None:
            self.client = QdrantClient(path=str(settings.qdrant_path))
        return self.client

    def close(self) -> None:
        if self.client is not None:
            self.client.close()
            self.client = None

    @contextmanager
    def _conn(self):
        connection = sqlite3.connect(settings.sqlite_path)
        connection.row_factory = sqlite3.Row
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def _init_db(self) -> None:
        with self._conn() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    mime_type TEXT,
                    content TEXT NOT NULL,
                    metadata_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS chunks (
                    point_id TEXT PRIMARY KEY,
                    document_id TEXT NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    metadata_json TEXT NOT NULL
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id)")

    def ensure_collection(self, vector_size: int) -> None:
        client = self.get_client()
        collections = {item.name for item in client.get_collections().collections}
        if settings.qdrant_collection not in collections:
            client.create_collection(
                collection_name=settings.qdrant_collection,
                vectors_config=models.VectorParams(size=vector_size, distance=models.Distance.COSINE),
            )

    def save_document(self, name: str, mime_type: str | None, content: str, metadata: dict) -> str:
        document_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO documents (id, name, mime_type, content, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (document_id, name, mime_type, content, json.dumps(metadata), created_at),
            )
        return document_id

    def save_chunks(self, document_id: str, chunks: list[dict], embeddings: list[list[float]]) -> int:
        if not chunks or not embeddings:
            return 0
        self.ensure_collection(len(embeddings[0]))
        points = []
        with self._conn() as conn:
            for chunk, embedding in zip(chunks, embeddings):
                point_id = f"{document_id}:{chunk['chunk_index']}"
                conn.execute(
                    "INSERT OR REPLACE INTO chunks (point_id, document_id, chunk_index, content, metadata_json) VALUES (?, ?, ?, ?, ?)",
                    (
                        point_id,
                        document_id,
                        chunk["chunk_index"],
                        chunk["content"],
                        json.dumps({"char_count": chunk["char_count"]}),
                    ),
                )
                points.append(
                    models.PointStruct(
                        id=point_id,
                        vector=embedding,
                        payload={
                            "document_id": document_id,
                            "chunk_index": chunk["chunk_index"],
                            "content": chunk["content"],
                        },
                    )
                )
        self.get_client().upsert(collection_name=settings.qdrant_collection, wait=True, points=points)
        return len(points)

    def list_documents(self) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT d.id, d.name, d.mime_type, d.created_at, COUNT(c.point_id) AS chunk_count, LENGTH(d.content) AS char_count
                FROM documents d
                LEFT JOIN chunks c ON c.document_id = d.id
                GROUP BY d.id
                ORDER BY d.created_at DESC
                """
            ).fetchall()
        return [dict(row) for row in rows]

    def all_chunks(self) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT point_id, document_id, chunk_index, content FROM chunks ORDER BY document_id, chunk_index"
            ).fetchall()
        return [dict(row) for row in rows]

    def search_dense(self, embedding: list[float], top_k: int) -> list[dict]:
        try:
            results = self.get_client().query_points(
                collection_name=settings.qdrant_collection,
                query=embedding,
                limit=top_k,
                with_payload=True,
            ).points
        except Exception:
            return []

        payloads = []
        for item in results:
            payload = dict(item.payload or {})
            payload["score"] = float(item.score or 0.0)
            payload["search_type"] = "dense"
            payloads.append(payload)
        return payloads

    def delete_document(self, document_id: str) -> None:
        with self._conn() as conn:
            conn.execute("DELETE FROM documents WHERE id = ?", (document_id,))
            conn.execute("DELETE FROM chunks WHERE document_id = ?", (document_id,))
        self.get_client().delete(
            collection_name=settings.qdrant_collection,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="document_id",
                            match=models.MatchValue(value=document_id),
                        )
                    ]
                )
            ),
        )


store = LocalStore()
