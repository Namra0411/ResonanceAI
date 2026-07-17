# Vectra

> **Upload a document. Ask anything. Get accurate, cited answers — instantly.**

Vectra is a full-stack **Retrieval-Augmented Generation (RAG)** platform that transforms PDFs and documents into a searchable, conversational knowledge base. It combines **hybrid semantic + keyword retrieval**, **structure-aware chunking**, **LLM reranking**, and **streaming AI responses** with page-level citations for fast, trustworthy document question answering.

<p align="center">
  <a href="https://youtu.be/bvdFHW6DxFA">
    <img src="https://img.youtube.com/vi/bvdFHW6DxFA/maxresdefault.jpg" width="800" alt="Vectra Demo"/>
  </a>
</p>

<p align="center">
  <a href="https://youtu.be/bvdFHW6DxFA">
    <strong>🎥 Watch the Live Demo</strong>
  </a>
</p>

---

# ✨ Features

## 🔍 Intelligent Retrieval

- **Hybrid Search** — combines dense vector retrieval (Qdrant) with MongoDB full-text search using **Reciprocal Rank Fusion (RRF)**, allowing both semantic understanding and precise keyword lookups.
- **LLM Reranking** — retrieved candidates are re-ranked by an LLM before answer generation, improving contextual relevance.
- **Structure-Aware Chunking Pipeline**
  - Recursive semantic chunking for natural language.
  - Fixed-window chunking for structured content.
  - Whole-page fallback for ambiguous layouts.
  - Atomic key-value extraction for accurate retrieval of IDs, totals, invoice fields, and similar structured data.

---

## 💬 Conversational AI

- Multi-turn conversations with **history-aware query rewriting**.
- **Server-Sent Event (SSE)** streaming for real-time token generation.
- Page-level citations on every answer.
- Confidence score for generated responses.
- **Strict Mode** (document-grounded only) and **General Mode** (allows reasoning beyond the document when appropriate).

---

## ⚡ Performance

- Redis-powered query caching reduces repeated LLM calls.
- Background ingestion pipeline using **BullMQ** keeps uploads responsive.
- Asynchronous parsing, chunking, embedding, and indexing.

---

## 🔐 Security

- Layered prompt-injection protection for uploaded documents.
- Google OAuth authentication.
- JWT session management using **httpOnly cookies**.
- User documents remain private and isolated.

---

## 📄 Document Processing

- PDF upload via Supabase Storage.
- Automatic parsing and intelligent chunk generation.
- Embedding generation and vector indexing.
- Persistent per-document chat history.

---

# 🏗️ System Architecture

```text
                       ┌─────────────────────────────┐
                       │          Frontend           │
                       │        React + Vite         │
                       └──────────────┬──────────────┘
                                      │
                                      ▼
                       ┌─────────────────────────────┐
                       │     Express REST API        │
                       └──────────────┬──────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
   MongoDB                    Qdrant Vector DB               Redis
(users, chats, chunks)        (embeddings)            (cache + BullMQ queue)
          ▲                                                   │
          │                                                   ▼
          │                                         Background Worker
          │                                                   │
          └──────────────────────────────┬────────────────────┘
                                         ▼
                               Supabase Storage
                              (uploaded documents)
```

---

# 📦 Storage Responsibilities

| Component | Purpose |
|------------|---------|
| **Supabase Storage** | Original uploaded PDF files |
| **MongoDB** | Users, extracted text chunks, metadata, chat history |
| **Qdrant** | Dense vector embeddings |
| **Redis** | Query cache and BullMQ job queue |

---

# 🔄 Document Processing Pipeline

```text
Upload PDF
      │
      ▼
Store File (Supabase)
      │
      ▼
Queue Job (BullMQ)
      │
      ▼
Parse Pages
      │
      ▼
Classify Each Page
      │
      ▼
Structure-Aware Chunking
      │
      ▼
Atomic Key-Value Extraction
      │
      ▼
Store Text (MongoDB)
      │
      ▼
Generate Embeddings
      │
      ▼
Index in Qdrant
      │
      ▼
Ready for Chat
```

---

# 🛠 Tech Stack

### Frontend

- React
- Vite

### Backend

- Node.js
- Express.js

### AI

- LLM-based Answer Generation
- LLM Reranking
- Embeddings

### Retrieval

- Qdrant
- MongoDB Full-Text Search
- Reciprocal Rank Fusion (RRF)

### Infrastructure

- Redis
- BullMQ
- Supabase Storage

### Authentication

- Google OAuth 2.0
- JWT Authentication

---

# 🚀 Getting Started

## Prerequisites

- Node.js
- MongoDB
- Redis
- Qdrant
- Supabase Project
- Google OAuth Credentials

---

## Environment Variables

Create a `.env` inside the `server/` directory.

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

> Never commit your `.env` file.

---

## Installation

### Backend

```bash
cd server
npm install
npm run dev
```

### Worker

```bash
cd server/worker
node index.js
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

# 📌 Roadmap

- [ ] Multi-document conversations
- [ ] Conditional reranking based on retrieval confidence
- [ ] Token usage analytics
- [ ] OCR support for scanned PDFs
- [ ] Citation highlighting inside documents
- [ ] Streaming markdown rendering
- [ ] Batch document uploads

---

# 📜 License

This project is licensed under the **MIT License**.
