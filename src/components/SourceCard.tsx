
"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react";

import type { RetrievedChunk } from "@/types/rag";

interface SourceCardProps {
  sources: RetrievedChunk[];
}

export default function SourceCard({
  sources,
}: SourceCardProps) {
  const [showSources, setShowSources] = useState(false);
  const [expandedSource, setExpandedSource] =
    useState<number | null>(null);

  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-zinc-800 pt-3">
      <button
        type="button"
        onClick={() => setShowSources((previous) => !previous)}
        aria-expanded={showSources}
        className="flex items-center gap-2 text-xs text-zinc-400 transition hover:text-blue-400"
      >
        <FileText size={14} />

        <span>
          Sources ({sources.length})
        </span>

        {showSources ? (
          <ChevronDown size={14} />
        ) : (
          <ChevronRight size={14} />
        )}
      </button>

      {showSources && (
        <div className="mt-3 space-y-2">
          {sources.map((source, index) => {
            const expanded = expandedSource === index;

            return (
              <div
                key={`${source.chunk_index}-${index}`}
                className="overflow-hidden rounded-lg border border-zinc-800 bg-[#09090b]"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSource(
                      expanded ? null : index
                    )
                  }
                  aria-expanded={expanded}
                  className="flex w-full items-center justify-between gap-3 p-3 text-left transition hover:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-zinc-200">
                      Source {index + 1}
                      {" · "}
                      Chunk {source.chunk_index}
                    </p>

                    <p className="mt-1 text-[11px] text-zinc-500">
                      Page {source.page_numbers.join(", ")}
                      {source.score !== null &&
                        source.score !== undefined && (
                          <>
                            {" · "}
                            Score: {source.score.toFixed(3)}
                          </>
                        )}
                    </p>
                  </div>

                  {expanded ? (
                    <ChevronDown size={15} />
                  ) : (
                    <ChevronRight size={15} />
                  )}
                </button>

                {expanded && (
                  <div className="border-t border-zinc-800 p-3">
                    <p className="mb-2 break-all text-[11px] text-zinc-500">
                      {source.filename}
                    </p>

                    <p className="whitespace-pre-wrap break-words text-xs leading-6 text-zinc-300">
                      {source.text}
                    </p>

                    <p className="mt-3 text-[11px] text-zinc-500">
                      {source.token_count} tokens
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
