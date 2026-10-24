
import type {
  ChatResponse,
  ChunkingSettings,
  IndexChunksResponse,
  IndexRecord,
  UploadResponse,
} from "@/types/rag";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8000";

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    options
  );

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;

    try {
      const error = await response.json();

      if (typeof error.detail === "string") {
        message = error.detail;
      } else if (Array.isArray(error.detail)) {
        message = error.detail
          .map(
            (item: { msg?: string }) =>
              item.msg ?? "Validation error"
          )
          .join("; ");
      }
    } catch {
      // Keep the HTTP error message.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const ragApi = {
  uploadPdf(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    return request<UploadResponse>(
      "/api/v1/documents/upload",
      {
        method: "POST",
        body: formData,
      }
    );
  },

  createIndex(
    documentIds: string[],
    settings: ChunkingSettings
  ): Promise<IndexRecord> {
    return request<IndexRecord>(
      "/api/v1/indexes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_ids: documentIds,
          settings,
        }),
      }
    );
  },

  getIndexes(): Promise<IndexRecord[]> {
    return request<IndexRecord[]>("/api/v1/indexes");
  },

  getIndexChunks(
    indexId: string
  ): Promise<IndexChunksResponse> {
    return request<IndexChunksResponse>(
      `/api/v1/indexes/${indexId}/chunks`
    );
  },

  chat(
    indexId: string | null,
    question: string,
    topK: number,
    maxTokens: number,
    signal?: AbortSignal
  ): Promise<ChatResponse> {
    return request<ChatResponse>(
      "/api/v1/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal,
        body: JSON.stringify({
          index_id: indexId,
          question,
          top_k: topK,
          max_output_tokens: maxTokens,
        }),
      }
    );
  },
};
