from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, Distance, VectorParams


class QdrantStorage:

    def __init__(self, url="http://localhost:6333", collection="docs", dim=3072):
        self.client = QdrantClient(url=url, timeout=30)
        self.collection = collection

        if not self.client.collection_exists(collection):
            self.client.recreate_collection(
                collection_name=collection,
                vectors_config=VectorParams(size=dim, distance=Distance.COSINE)
            )

    def upsert(self, ids, vectors, payloads):

        points = [
            PointStruct(
                id=ids[i],
                vector=vectors[i],
                payload=payloads[i]
            )
            for i in range(len(ids))
        ]

        self.client.upsert(
            collection_name=self.collection,
            points=points
        )

    def search(self, query_vector, top_k=5):

        results = self.client.search(
            collection_name=self.collection,
            query_vector=query_vector,
            with_payload=True,
            limit=top_k
        )

        contexts = []
        sources = []

        for r in results:
            payload = getattr(r, "payload", None) or {}

            context = payload.get("text", "")
            source = payload.get("source", "")

            if context:
                contexts.append(context)
                sources.append(source)

        return {"contexts": contexts, "sources": sources}