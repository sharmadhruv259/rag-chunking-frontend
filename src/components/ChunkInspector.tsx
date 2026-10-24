
"use client";

import { useMemo, useState } from "react";

import {
  ChevronDown,
  ChevronRight,
  FileText,
  Layers3,
} from "lucide-react";

import type { RetrievedChunk } from "@/types/rag";

interface ChunkInspectorProps {
  chunks: RetrievedChunk[];
}

interface DocumentGroup {
  id: string;
  filename: string;
  chunks: RetrievedChunk[];
}

export default function ChunkInspector({
  chunks,
}: ChunkInspectorProps) {
  const [inspectorOpen, setInspectorOpen] =
    useState(true);

  const [expandedDocuments, setExpandedDocuments] =
    useState<Record<string, boolean>>({});

  const [expandedChunks, setExpandedChunks] =
    useState<Record<string, boolean>>({});

  const documentGroups = useMemo<DocumentGroup[]>(() => {
    const groups = new Map<string, DocumentGroup>();

    for (const chunk of chunks) {
      // Prefer document ID so PDFs with identical filenames
      // are still treated as different documents.
      const groupId =
        chunk.document_id ?? chunk.filename;

      if (!groups.has(groupId)) {
        groups.set(groupId, {
          id: groupId,
          filename: chunk.filename,
          chunks: [],
        });
      }

      groups.get(groupId)!.chunks.push(chunk);
    }

    return Array.from(groups.values()).map((group) => ({
      ...group,
      chunks: [...group.chunks].sort(
        (a, b) => a.chunk_index - b.chunk_index
      ),
    }));
  }, [chunks]);

  function toggleDocument(documentId: string) {
    setExpandedDocuments((previous) => ({
      ...previous,
      [documentId]:
        !(previous[documentId] ?? true),
    }));
  }

  function toggleChunk(chunkKey: string) {
    setExpandedChunks((previous) => ({
      ...previous,
      [chunkKey]: !previous[chunkKey],
    }));
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
      {/* Main Chunk Inspector Header */}
      <button
        type="button"
        onClick={() =>
          setInspectorOpen((previous) => !previous)
        }
        aria-expanded={inspectorOpen}
        className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left hover:bg-zinc-800/50"
      >
        <div className="flex items-center gap-2">
          {inspectorOpen ? (
            <ChevronDown
              size={16}
              className="text-zinc-400"
            />
          ) : (
            <ChevronRight
              size={16}
              className="text-zinc-400"
            />
          )}

          <Layers3
            size={16}
            className="text-blue-400"
          />

          <span className="text-sm font-semibold">
            Chunk Inspector
          </span>
        </div>

        <span className="rounded-full bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400">
          {chunks.length} chunks
        </span>
      </button>

      {/* Main Collapsible Content */}
      {inspectorOpen && (
        <div className="border-t border-zinc-800 p-3">
          {chunks.length === 0 ? (
            <p className="py-5 text-center text-xs text-zinc-500">
              Build a vector index to inspect chunks.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-zinc-500">
                {documentGroups.length} PDFs
                {" · "}
                {chunks.length} total chunks
              </p>

              {documentGroups.map((group) => {
                const documentOpen =
                  expandedDocuments[group.id] ?? true;

                return (
                  <div
                    key={group.id}
                    className="overflow-hidden rounded-lg border border-zinc-800 bg-[#151519]"
                  >
                    {/* Per-PDF Header */}
                    <button
                      type="button"
                      onClick={() =>
                        toggleDocument(group.id)
                      }
                      aria-expanded={documentOpen}
                      className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left hover:bg-zinc-800/50"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {documentOpen ? (
                          <ChevronDown
                            size={14}
                            className="shrink-0 text-zinc-400"
                          />
                        ) : (
                          <ChevronRight
                            size={14}
                            className="shrink-0 text-zinc-400"
                          />
                        )}

                        <FileText
                          size={15}
                          className="shrink-0 text-red-400"
                        />

                        <span
                          title={group.filename}
                          className="truncate text-xs font-medium text-zinc-200"
                        >
                          {group.filename}
                        </span>
                      </div>

                      <span className="shrink-0 rounded-md bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400">
                        {group.chunks.length}
                      </span>
                    </button>

                    {/* Chunks For This PDF */}
                    {documentOpen && (
                      <div className="flex flex-col gap-2 border-t border-zinc-800 p-2">
                        {group.chunks.map(
                          (chunk, position) => {
                            // A chunk index repeats between PDFs.
                            // Include document identity in the key.
                            const chunkKey = [
                              group.id,
                              chunk.chunk_index,
                              position,
                            ].join(":");

                            const chunkOpen =
                              expandedChunks[chunkKey] ??
                              false;

                            return (
                              <div
                                key={chunkKey}
                                className="rounded-lg border border-zinc-800 bg-zinc-900"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleChunk(chunkKey)
                                  }
                                  aria-expanded={chunkOpen}
                                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-zinc-800/50"
                                >
                                  <div className="flex items-center gap-2">
                                    {chunkOpen ? (
                                      <ChevronDown
                                        size={14}
                                        className="text-zinc-400"
                                      />
                                    ) : (
                                      <ChevronRight
                                        size={14}
                                        className="text-zinc-400"
                                      />
                                    )}

                                    <span className="text-xs font-medium text-zinc-200">
                                      Chunk{" "}
                                      {chunk.chunk_index}
                                    </span>
                                  </div>

                                  <span className="text-[10px] text-zinc-500">
                                    {chunk.token_count} tokens
                                  </span>
                                </button>

                                {chunkOpen && (
                                  <div className="border-t border-zinc-800 px-3 py-3">
                                    <p className="mb-2 text-[11px] text-zinc-500">
                                      Pages:{" "}
                                      {chunk.page_numbers.length
                                        ? chunk.page_numbers.join(
                                            ", "
                                          )
                                        : "Unknown"}
                                    </p>

                                    <p className="whitespace-pre-wrap break-words text-xs leading-6 text-zinc-300">
                                      {chunk.text}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
