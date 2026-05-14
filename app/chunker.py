from __future__ import annotations


def chunk_text(text: str, chunk_size: int, overlap: int) -> list[dict]:
    text = text.strip()
    if not text:
        return []

    chunks: list[dict] = []
    start = 0
    index = 0
    length = len(text)

    while start < length:
        end = min(start + chunk_size, length)
        if end < length:
            boundary = max(
                text.rfind("\n\n", start, end),
                text.rfind("\n", start, end),
                text.rfind(". ", start, end),
                text.rfind(" ", start, end),
            )
            if boundary > start + int(chunk_size * 0.5):
                end = boundary + 1

        content = text[start:end].strip()
        if content:
            chunks.append(
                {
                    "chunk_index": index,
                    "content": content,
                    "char_count": len(content),
                }
            )
            index += 1

        if end >= length:
            break
        start = max(end - overlap, start + 1)

    return chunks
