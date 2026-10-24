# RAG Chunking Playground — Frontend

A modern, interactive frontend for experimenting with **Retrieval-Augmented Generation (RAG)**, document chunking strategies, vector search, and AI-powered PDF question answering.

Built with **Next.js, React, TypeScript, and Tailwind CSS**, this application connects to a FastAPI backend that uses LangChain, Qdrant, Sentence Transformers, and Groq.

## Overview

The RAG Chunking Playground allows users to upload multiple PDF documents, configure different chunking techniques, inspect generated chunks, and ask questions about their documents using an LLM.

The project is designed to help understand the complete RAG workflow:

**PDF Upload → Text Extraction → Chunking → Embeddings → Vector Indexing → Retrieval → LLM Response**

## Features

### 1. Multiple PDF Upload

- Upload one or multiple PDF documents.
- View uploaded PDFs in a collapsible document list.
- Select or deselect PDFs using checkboxes.
- Remove individual PDFs from the current workspace.
- Build a combined vector index from selected documents.
- Display document information, including page count and extracted paragraphs.

### 2. Six Chunking Strategies

Experiment with six different text chunking techniques:

| Technique | Description |
|---|---|
| Fixed Size | Splits text into fixed-size chunks with configurable overlap. |
| Recursive | Splits text recursively using natural separators and chunk-size limits. |
| Sentence | Groups text based on sentence boundaries. |
| Paragraph | Groups text based on paragraph boundaries. |
| Semantic | Uses semantic similarity to determine chunk boundaries. |
| Sliding Window | Creates overlapping windows of consecutive sentences. |

### 3. Configurable RAG Parameters

The configuration sidebar provides interactive sliders and numeric inputs for:

- Chunk Size
- Chunk Overlap
- Top-K Retrieval
- Maximum Output Tokens
- Semantic Similarity Threshold
- Sliding Window Size
- Sliding Window Stride

The interface dynamically displays relevant settings based on the selected chunking strategy.

### 4. Chunk Inspector

Explore the chunks generated from uploaded documents.

- View the total number of chunks.
- Group chunks by their original PDF.
- Expand or collapse individual documents.
- Expand individual chunks to inspect their content.
- View chunk indices, token counts, and page numbers.

Each chunk is associated with its source document, allowing different PDFs to maintain independent chunk numbering.

### 5. RAG Chat Interface

Ask questions about indexed PDF documents through an interactive chat interface.

- AI-generated answers using retrieved PDF context.
- Markdown-formatted responses.
- Loading indicators and error handling.
- Configurable Top-K retrieval and output token limits.
- New Chat functionality to reset the current workspace.

### 6. Source References

For document-based answers, the frontend displays expandable source cards containing:

- Original PDF filename
- Chunk index
- Page numbers
- Similarity score
- Retrieved text

Simple greetings such as "Hi" and "Good morning" are handled without displaying irrelevant PDF sources.

### 7. Collapsible Interface

The application includes a collapsible configuration sidebar, uploaded-PDF list, and Chunk Inspector to keep the workspace organized.

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js | Frontend framework |
| React | Component-based user interface |
| TypeScript | Type safety |
| Tailwind CSS | Styling and responsive layout |
| Lucide React | Icons |
| React Markdown | Rendering LLM responses |
| Remark GFM | GitHub-flavored Markdown support |
| Fetch API | Communication with the FastAPI backend |

## Project Structure

```text
rag-chunking-frontend/
│
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ConfigurationSidebar.tsx
│   │   ├── ChunkInspector.tsx
│   │   ├── ChatPanel.tsx
│   │   └── SourceCard.tsx
│   │
│   ├── lib/
│   │   └── api.ts
│   │
│   └── types/
│       └── rag.ts
│
├── public/
├── .env.local
├── package.json
├── tsconfig.json
└── README.md
```

### Main Files

**`src/app/page.tsx`**

Main application workspace. Manages shared configuration, the active vector index, sidebar visibility, and workspace reset behavior.

**`src/components/ConfigurationSidebar.tsx`**

Handles PDF uploads, document selection, chunking settings, and vector index creation.

**`src/components/ChunkInspector.tsx`**

Displays generated chunks grouped by PDF, with expandable sections.

**`src/components/ChatPanel.tsx`**

Manages the chat interface, user questions, AI responses, and conversation state.

**`src/components/SourceCard.tsx`**

Displays retrieved PDF context and source metadata.

**`src/lib/api.ts`**

Centralizes HTTP requests to the FastAPI backend.

**`src/types/rag.ts`**

Defines TypeScript interfaces for documents, chunking settings, indexes, messages, and retrieved chunks.

## Getting Started

### Prerequisites

Make sure you have:

- Node.js and npm installed.
- A running RAG Chunking Playground FastAPI backend.
- A configured backend environment with the required embedding model and Groq API key.

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/rag-chunking-frontend.git
cd rag-chunking-frontend
```

Replace `YOUR_USERNAME` with your GitHub username.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

This variable specifies the URL of the FastAPI backend.

The Groq API key must remain in the backend environment and should never be exposed through a `NEXT_PUBLIC_` variable.

### 4. Start the Backend

In the separate backend repository:

```bash
uvicorn app.main:app --reload
```

The backend should be accessible at:

```text
http://127.0.0.1:8000
```

FastAPI Swagger documentation:

```text
http://127.0.0.1:8000/docs
```

### 5. Start the Frontend

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## How to Use

1. **Upload PDFs:** Click Upload PDFs and select one or more PDF files.
2. **Select Documents:** Expand the Uploaded PDFs section and choose which documents to include.
3. **Choose Chunking Strategy:** Select one of the six supported techniques.
4. **Configure Parameters:** Adjust chunk size, overlap, and other relevant settings.
5. **Build Vector Index:** Click Build Vector Index to process the selected PDFs.
6. **Inspect Chunks:** Expand the Chunk Inspector to explore the generated chunks grouped by document.
7. **Ask Questions:** Use the chat interface to ask questions about the indexed documents.
8. **Review Sources:** Expand source cards to see the retrieved PDF excerpts supporting an answer.
9. **Start New Chat:** Reset the current workspace to begin a new session.

## Backend Integration

The frontend communicates with the backend using REST APIs.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/documents/upload` | Upload a PDF |
| POST | `/api/v1/indexes` | Create a vector index from selected PDFs |
| GET | `/api/v1/indexes` | List existing indexes |
| GET | `/api/v1/indexes/{index_id}/chunks` | Retrieve indexed chunks |
| POST | `/api/v1/chat` | Generate a response to a user message |

### Multiple PDF Upload Flow

The frontend allows multiple PDF files to be selected at once.

Each file is uploaded through the existing single-file upload API. The frontend collects the returned document IDs and submits them together when creating a vector index.

Example indexing request:

```json
{
  "document_ids": [
    "FIRST_DOCUMENT_UUID",
    "SECOND_DOCUMENT_UUID"
  ],
  "settings": {
    "technique": "paragraph",
    "chunk_size": 400,
    "chunk_overlap": 0,
    "top_k": 4,
    "max_output_tokens": 512,
    "semantic_similarity_threshold": 0.55,
    "window_size": 3,
    "window_stride": 2
  }
}
```

The backend creates one Qdrant collection containing chunks from all selected documents.

### Chat Flow

```text
User Question
     |
     v
Next.js ChatPanel
     |
     v
POST /api/v1/chat
     |
     v
FastAPI RAG Service
     |
     v
Question Embedding
     |
     v
Qdrant Similarity Search
     |
     v
Relevant PDF Chunks
     |
     v
Groq LLM
     |
     v
Generated Answer + Sources
     |
     v
Frontend Chat + Source Cards
```

Greetings are handled separately by the backend without unnecessary vector retrieval.

## Frontend State Management

The application uses React hooks for local state management.

| State | Responsibility |
|---|---|
| Chunking Settings | Stores the selected technique and parameters |
| Uploaded Documents | Stores the current PDF list |
| Selected Document IDs | Tracks PDFs selected for indexing |
| Active Index | Identifies the vector index used for chat |
| Chunks | Stores retrieved indexed chunks for inspection |
| Messages | Stores the current conversation |
| Loading and Error States | Provides feedback during API operations |

The application does not require a separate global state management library for its current scope.

## New Chat Behavior

Starting a new chat resets the frontend workspace, including:

- Current chat messages
- Uploaded PDF list
- Selected document IDs
- Active vector index
- Chunk Inspector content
- Chunking configuration

This is a frontend reset. Previously stored documents and Qdrant collections are not automatically deleted from backend storage.

## Development Notes

- The frontend and backend are maintained as separate repositories.
- PDF extraction, chunking, embedding generation, and LLM inference run in the backend.
- The frontend communicates with the backend through HTTP requests.
- API types are maintained in `src/types/rag.ts`.
- The Groq API key is never stored in the frontend.
- This project is intended for learning and experimentation with RAG architectures.


