# Vectra

**Upload a document. Ask anything. Get accurate, cited answers — instantly.**

Vectra is a full-stack Retrieval-Augmented Generation (RAG) assistant that turns PDFs and documents into a searchable, conversational knowledge base. It combines hybrid semantic + keyword retrieval, structure-aware chunking, and streaming AI responses with page-level source citations.

---

## ✨ Features

### 🔍 Retrieval & Search
- **Hybrid retrieval** — combines dense vector search (Qdrant) with keyword/lexical search (MongoDB full-text) fused via **Reciprocal Rank Fusion (RRF)**, so both conceptual questions *and* exact-match lookups (IDs, names, figures) are reliably retrieved.
- **LLM-based reranking** — a second pass re-scores retrieved candidates for relevance before they're sent to the answer-generation model.
- **Structure-aware chunking pipeline** — every page is classified (semantic / structural / page) based on its content shape, then routed to a specialized chunker:
  - Recursive semantic chunking (with overlap) for prose
  - Fixed-window chunking for tabular/form-like content
  - Whole-page fallback for ambiguous content
  - A second-pass **atomic key-value extractor** isolates precise `label: value` pairs (e.g. invoice totals, IDs) for exact-match retrieval.

### 💬 Conversational Chat
- **Conversation memory** — follow-up questions are rewritten using recent chat history so vague references ("what about that?") still retrieve the right content.
- **Live token streaming (SSE)** — answers stream in real time with status updates (retrieving → generating).
- **Page-level source citations** and a **confidence score** on every answer.
- **Strict / General answer modes** — toggle between answers grounded *only* in the document (Strict) or answers that may reason naturally beyond it when clearly related (General).

### ⚡ Performance
- **Redis-backed query caching** — repeated queries are served instantly with zero additional LLM cost.
- **Async ingestion pipeline** (BullMQ + Redis) — document parsing, chunking, and embedding run as background jobs, keeping uploads fast and non-blocking.

### 🔐 Security
- **Layered prompt-injection defenses** — retrieved document content is structurally isolated from instructions via explicit context tags, fake role-marker neutralization, and heuristic flagging of suspicious content — since uploaded documents are untrusted input by nature.
- **Google OAuth authentication** with JWT-based sessions (`httpOnly` cookies).
- Documents are private by default — indexed for search, never exposed to other users.

### 📄 Document Handling
- PDF upload and storage via Supabase Storage.
- Automatic parsing, chunking, and embedding on upload.
- Per-document chat sessions with persistent history.

---

## 🏗️ Architecture

```
┌──────────┐     ┌─────────────┐     ┌──────────────┐
│  React   │────▶│   Express   │────▶│   MongoDB     │  (users, chunks, chat history)
│ Frontend │◀────│   Backend   │────▶│   Qdrant      │  (vector embeddings)
└──────────┘     └─────────────┘────▶│   Redis       │  (queue + cache)
                        │            └──────────────┘
                        ▼
                 ┌─────────────┐     ┌──────────────┐
                 │  BullMQ     │────▶│  Supabase     │  (raw file storage)
                 │  Worker     │◀────│  Storage      │
                 └─────────────┘
```

**Storage responsibilities are intentionally separated:**

| System | Stores | Touched when |
|---|---|---|
| **Supabase Storage** | Raw uploaded file bytes | Once, at ingestion |
| **MongoDB** | Extracted chunk text, metadata, users, chat history | On ingestion + every search/chat request |
| **Qdrant** | Vector embeddings only (no text) | On ingestion + every semantic search |
| **Redis** | Job queue + query cache | On ingestion + every chat request |

---

## 🔄 How a document becomes searchable

1. **Upload** → file is stored in Supabase, a job is queued in Redis (BullMQ).
2. **Worker picks up the job** → downloads the file, parses text per page.
3. **Page classification** → each page is analyzed and tagged `semantic`, `structural`, or `page`.
4. **Chunking** → content is routed to the matching chunker strategy.
5. **Atomic extraction** → structural chunks are further split into precise key-value pairs.
6. **Persistence** → chunk text + metadata saved to MongoDB; embeddings generated and upserted to Qdrant.
7. **Ready to chat** — hybrid search + reranking + streaming generation, end to end.

---

## 🛠️ Tech Stack

**Backend:** Node.js, Express, MongoDB (Mongoose), Redis, BullMQ
**Search:** Qdrant (vector search), MongoDB full-text (keyword search)
**AI:** LLM-based generation, reranking, and embeddings
**Storage:** Supabase Storage
**Auth:** Google OAuth 2.0, JWT
**Frontend:** React, Vite

---

## 🚀 Getting Started

### Prerequisites
- Node.js
- MongoDB instance
- Redis instance
- Qdrant instance
- Supabase project (Storage bucket)
- Google OAuth credentials

### Environment Variables

Create a `.env` file inside `server/`:

```env
PORT=
FRONTEND_URL=
MONGO_URI=
REDIS_URL=
JWT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
OPENROUTER_API_KEY=
```

> Never commit `.env`. See `.env.example` for the full list of required keys.

### Installation

```bash
# Backend
cd server
npm install
npm run dev

# Worker (separate process)
cd server/worker
node index.js

# Frontend
cd frontend
npm install
npm run dev
```

---

## 📌 Roadmap

- [ ] Multi-document chat (query across multiple documents in one session)
- [ ] Conditional reranking based on retrieval score confidence
- [ ] Token usage logging and cost benchmarking

---


---

## 📄 License

MIT
