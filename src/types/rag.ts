
export type ChunkingTechnique =
  | "fixed"
  | "recursive"
  | "sentence"
  | "paragraph"
  | "semantic"
  | "sliding_window";

export interface ChunkingSettings {
  technique: ChunkingTechnique;
  chunk_size: number;
  chunk_overlap: number;
  top_k: number;
  max_output_tokens: number;
  semantic_similarity_threshold: number;
  window_size: number;
  window_stride: number;
}

export const DEFAULT_SETTINGS: ChunkingSettings = {
  technique: "paragraph",
  chunk_size: 400,
  chunk_overlap: 0,
  top_k: 4,
  max_output_tokens: 512,
  semantic_similarity_threshold: 0.55,
  window_size: 3,
  window_stride: 2,
};

export interface UploadResponse {
  document_id: string;
  filename: string;
  page_count: number;
  total_paragraphs: number;
}

export interface Chunk {
  chunk_index: number;
  text: string;
  token_count: number;
  page_numbers: number[];
}

export interface RetrievedChunk extends Chunk {
  document_id: string | null;
  filename: string;
  score: number | null;
}

export interface IndexRecord {
  index_id: string;

  // Backward-compatible first PDF.
  document_id: string;
  filename: string;

  // All PDFs included in the index.
  document_ids: string[];
  filenames: string[];

  settings: ChunkingSettings;
  total_chunks: number;
  created_at: string;
}

export interface IndexChunksResponse {
  index_id: string;
  total_chunks: number;
  chunks: RetrievedChunk[];
}

export interface ChatResponse {
  index_id: string | null;
  answer: string;
  sources: RetrievedChunk[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: RetrievedChunk[];
}
