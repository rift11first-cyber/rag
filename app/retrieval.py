from __future__ import annotations

import re
from collections import OrderedDict

from rank_bm25 import BM25Okapi


TOKEN_RE = re.compile(r"[A-Za-z0-9_]{2,}")


def tokenize(text: str) -> list[str]:
    return TOKEN_RE.findall(text.lower())


def sparse_search(chunks: list[dict], query: str, top_k: int) -> list[dict]:
    if not chunks:
        return []
    corpus = [tokenize(chunk["content"]) for chunk in chunks]
    bm25 = BM25Okapi(corpus)
    scores = bm25.get_scores(tokenize(query))
    ranked = sorted(
        zip(chunks, scores),
        key=lambda item: item[1],
        reverse=True,
    )
    return [
        {**chunk, "score": float(score), "search_type": "sparse"}
        for chunk, score in ranked[:top_k]
        if score > 0
    ]


def reciprocal_rank_fusion(dense_results: list[dict], sparse_results: list[dict], top_k: int, k: int = 60) -> list[dict]:
    fused_scores: OrderedDict[str, float] = OrderedDict()
    doc_map: dict[str, dict] = {}

    for rank, item in enumerate(dense_results, start=1):
        key = f"{item['document_id']}:{item['chunk_index']}"
        fused_scores[key] = fused_scores.get(key, 0.0) + 1.0 / (k + rank)
        doc_map[key] = item

    for rank, item in enumerate(sparse_results, start=1):
        key = f"{item['document_id']}:{item['chunk_index']}"
        fused_scores[key] = fused_scores.get(key, 0.0) + 1.0 / (k + rank)
        doc_map.setdefault(key, item)

    ranked = sorted(fused_scores.items(), key=lambda pair: pair[1], reverse=True)[:top_k]
    results = []
    for key, score in ranked:
        payload = dict(doc_map[key])
        payload["rrf_score"] = round(score, 6)
        results.append(payload)
    return results
