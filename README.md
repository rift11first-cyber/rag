# Local RAG Workspace

Local-first RAG stack with:

- Python FastAPI backend
- Plain JavaScript frontend served by FastAPI
- `gemini-embedding-2` embeddings
- Local Qdrant storage
- Tesseract OCR fallback for scanned PDFs and images
- Hybrid retrieval with BM25 + dense search + RRF
- RAGAS evaluation endpoint

## Run

1. Install Python dependencies.
   For a CPU-only local machine, install the project plus a CPU PyTorch wheel before using BGE-M3:

```bash
python -m pip install fastapi pydantic-settings qdrant-client python-multipart uvicorn pillow pytesseract pypdf pypdfium2 openpyxl python-docx rank-bm25 google-generativeai openai
python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
python -m pip install sentence-transformers flagembedding datasets ragas langchain-google-genai langchain-huggingface langchain-openai
```

2. Install `tesseract-ocr` on your machine and make sure `tesseract` is on `PATH`.
3. Start the app:

```bash
python main.py
```

4. Open `http://127.0.0.1:8000`.

## Notes

- The app loads `.env` automatically but does not require cloud Qdrant.
- Retrieval, embeddings, OCR, and vector storage are local.
- If you have `GEMINI_API_KEY`, `GOOGLE_API_KEY`, or `OPENAI_API_KEY` in `.env`, answer generation and RAGAS LLM metrics will use them.
