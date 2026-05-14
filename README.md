# Local RAG Workspace

A production-grade, local-first Retrieval-Augmented Generation (RAG) system built with FastAPI, hybrid retrieval, OCR support, and evaluation tooling.

Designed for developers who want:

- Fully local document indexing and retrieval
- Modern hybrid search (dense + BM25 + RRF)
- OCR support for scanned PDFs/images
- Plug-and-play Gemini/OpenAI generation
- Clean FastAPI backend + lightweight frontend
- Built-in RAG evaluation with RAGAS
- No cloud vector DB dependency

---

# Features

## Retrieval Pipeline

- Dense embeddings using `gemini-embedding-2`
- BM25 sparse retrieval
- Reciprocal Rank Fusion (RRF)
- Hybrid search ranking
- Local Qdrant vector storage

## Document Processing

Supports:

- PDF
- DOCX
- XLSX
- TXT
- Images

OCR fallback via Tesseract for:

- Scanned PDFs
- PNG/JPG/JPEG images

## Backend

- FastAPI API server
- REST endpoints for ingestion/search/evaluation
- Async-friendly architecture
- `.env` configuration support

## Frontend

- Plain JavaScript frontend
- Served directly by FastAPI
- No React/Vite build complexity

## Evaluation

- RAGAS evaluation endpoint
- Supports LLM-based quality metrics
- Optional Gemini/OpenAI integration

---

# Architecture

```text
                ┌────────────────────┐
                │    Web Frontend    │
                │  (Vanilla JS UI)   │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │      FastAPI       │
                │      Backend       │
                └─────────┬──────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
 ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
 │ OCR Engine  │  │ Embeddings  │  │ BM25 Index  │
 │ Tesseract   │  │ Gemini API  │  │ rank-bm25   │
 └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
        │                │                │
        └────────────────┼────────────────┘
                         ▼
                ┌────────────────────┐
                │      Qdrant        │
                │   Local Vector DB  │
                └────────────────────┘
```

---

# Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI |
| Vector DB | Qdrant |
| Dense Embeddings | Gemini Embeddings |
| Sparse Retrieval | BM25 |
| OCR | Tesseract |
| PDF Rendering | pypdfium2 |
| RAG Evaluation | RAGAS |
| Frontend | Vanilla JavaScript |

---

# Project Structure

```text
.
├── main.py
├── app/
│   ├── api/
│   ├── services/
│   ├── retrieval/
│   ├── ingestion/
│   ├── evaluation/
│   └── frontend/
├── data/
├── qdrant_storage/
├── static/
├── templates/
├── .env
└── requirements.txt
```

---

# Installation

## 1. Clone the Repository

```bash
git clone <your-repo-url>
cd local-rag-workspace
```

---

## 2. Install Python Dependencies

### Core Dependencies

```bash
python -m pip install \
fastapi \
pydantic-settings \
qdrant-client \
python-multipart \
uvicorn \
pillow \
pytesseract \
pypdf \
pypdfium2 \
openpyxl \
python-docx \
rank-bm25 \
google-generativeai \
openai
```

---

### CPU-Only PyTorch (Recommended for Local Machines)

```bash
python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
```

---

### Retrieval + Evaluation Dependencies

```bash
python -m pip install \
sentence-transformers \
flagembedding \
datasets \
ragas \
langchain-google-genai \
langchain-huggingface \
langchain-openai
```

---

# Install Tesseract OCR

## Ubuntu / Debian

```bash
sudo apt install tesseract-ocr
```

## macOS

Using Homebrew:

```bash
brew install tesseract
```

## Windows

Download installer:

- https://github.com/UB-Mannheim/tesseract/wiki

Ensure `tesseract` is added to your system `PATH`.

---

# Environment Variables

Create a `.env` file in the project root.

```env
# Optional
GEMINI_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here

# Optional Qdrant settings
QDRANT_PATH=./qdrant_storage
COLLECTION_NAME=local-rag
```

---

# Running the Application

```bash
python main.py
```

Application runs at:

```text
http://127.0.0.1:8000
```

---

# How It Works

## 1. Document Ingestion

Documents are:

- Uploaded via UI/API
- Parsed into text chunks
- OCR processed if needed
- Embedded into dense vectors
- Indexed into:
  - Qdrant
  - BM25 corpus

---

## 2. Hybrid Retrieval

Queries use:

### Dense Retrieval

Semantic similarity via Gemini embeddings.

### Sparse Retrieval

Keyword matching via BM25.

### Fusion

Results merged using:

- Reciprocal Rank Fusion (RRF)

This improves:

- Recall
- Ranking quality
- Semantic + lexical matching balance

---

## 3. Answer Generation

If API keys are configured:

- Gemini/OpenAI generate grounded responses
- Retrieved chunks injected into prompts

Without API keys:

- Retrieval still works locally

---

# OCR Pipeline

The system automatically detects low-text PDFs and scanned documents.

Fallback flow:

```text
PDF/Image
   ↓
Page Rendering
   ↓
Tesseract OCR
   ↓
Extracted Text
   ↓
Chunking + Embedding
```

Supported image formats:

- PNG
- JPG
- JPEG
- TIFF

---

# API Endpoints

## Health Check

```http
GET /health
```

---

## Upload Documents

```http
POST /upload
```

Multipart file upload.

---

## Search

```http
POST /search
```

Example request:

```json
{
  "query": "What is reciprocal rank fusion?"
}
```

---

## Ask Questions

```http
POST /ask
```

Example request:

```json
{
  "question": "Summarize the uploaded contract"
}
```

---

## RAGAS Evaluation

```http
POST /evaluate
```

Evaluates:

- Faithfulness
- Context precision
- Context recall
- Answer relevancy

---

# Example Workflow

## Upload

```bash
curl -X POST \
  -F "file=@document.pdf" \
  http://127.0.0.1:8000/upload
```

---

## Search

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"hybrid retrieval"}' \
  http://127.0.0.1:8000/search
```

---

## Ask

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"question":"Explain OCR fallback"}' \
  http://127.0.0.1:8000/ask
```

---

# Why Hybrid Retrieval?

Dense search alone may miss:

- Exact keywords
- IDs
- Acronyms
- Rare terminology

BM25 alone may miss:

- Semantic similarity
- Rephrased concepts

Hybrid retrieval combines both strengths.

---

# Performance Notes

## Recommended Hardware

Minimum:

- 8 GB RAM
- 4 CPU cores

Recommended:

- 16 GB RAM
- SSD storage

---

## CPU-Only Support

This project is optimized to run locally without requiring CUDA or GPU acceleration.

---

# Security & Privacy

- Local-first architecture
- No mandatory cloud services
- No hosted vector database
- Documents remain on your machine

External APIs are optional and only used if keys are configured.

---

# Future Improvements

Potential roadmap:

- Streaming responses
- Multi-user workspaces
- Metadata filtering
- Local LLM integration
- Docker support
- Authentication
- Redis caching
- Chunk visualization UI
- Citation highlighting
- Incremental indexing

---

# Troubleshooting

## Tesseract Not Found

Error:

```text
tesseract is not installed or not in PATH
```

Fix:

```bash
tesseract --version
```

Ensure the executable is available globally.

---

## Torch Installation Issues

Use CPU wheel explicitly:

```bash
python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
```

---

## Qdrant Storage Errors

Delete local storage and restart:

```bash
rm -rf qdrant_storage
```

---

# Development Tips

Run FastAPI with auto reload:

```bash
uvicorn main:app --reload
```

---

# Contributing

Contributions are welcome.

Suggested areas:

- Better chunking strategies
- Improved reranking
- GPU acceleration
- Local embedding models
- UI enhancements
- Multi-modal retrieval

---


# Acknowledgements

Built using:

- FastAPI
- Qdrant
- Gemini
- OpenAI
- Hugging Face
- Tesseract OCR
- RAGAS
