
"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import {
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  Files,
  FileUp,
  Loader2,
  RotateCcw,
  Settings2,
  X,
} from "lucide-react";

import ChunkInspector from "@/components/ChunkInspector";
import { ragApi } from "@/lib/api";

import {
  DEFAULT_SETTINGS,
  type ChunkingSettings,
  type ChunkingTechnique,
  type IndexRecord,
  type RetrievedChunk,
  type UploadResponse,
} from "@/types/rag";

interface ConfigurationSidebarProps {
  settings: ChunkingSettings;
  onSettingsChange: (settings: ChunkingSettings) => void;
  onIndexReady: (index: IndexRecord | null) => void;
}

interface NumberSettingProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

function NumberSetting({
  label,
  value,
  min,
  max,
  step = 1,
  disabled = false,
  onChange,
}: NumberSettingProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const displayedValue = draft ?? String(value);

  function commitValue() {
    if (draft === null) {
      return;
    }

    const parsed = Number(draft);

    if (draft.trim() && Number.isFinite(parsed)) {
      const clamped = Math.max(
        min,
        Math.min(max, Math.round(parsed))
      );

      onChange(clamped);
    }

    setDraft(null);
  }

  return (
    <div className={disabled ? "opacity-40" : ""}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-zinc-300">
          {label}
        </label>

        <input
          type="number"
          min={min}
          max={max}
          value={displayedValue}
          disabled={disabled}
          onChange={(event) =>
            setDraft(event.target.value)
          }
          onBlur={commitValue}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          aria-label={label}
          className="w-20 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-right text-xs outline-none focus:border-blue-500"
        />
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          setDraft(null);
          onChange(Number(event.target.value));
        }}
        aria-label={`${label} slider`}
        className="w-full cursor-pointer accent-blue-500 disabled:cursor-not-allowed"
      />

      <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
        <span>{min.toLocaleString()}</span>
        <span>{max.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function ConfigurationSidebar({
  settings,
  onSettingsChange,
  onIndexReady,
}: ConfigurationSidebarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  // Store all uploaded PDFs instead of one document.
  const [documents, setDocuments] = useState<UploadResponse[]>(
    []
  );

  // Document IDs selected for the next vector index.
  const [
    selectedDocumentIds,
    setSelectedDocumentIds,
  ] = useState<string[]>([]);

  const [pdfListOpen, setPdfListOpen] = useState(true);

  const [currentIndex, setCurrentIndex] =
    useState<IndexRecord | null>(null);

  const [chunks, setChunks] = useState<RetrievedChunk[]>(
    []
  );

  const [uploading, setUploading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const overlapAllowed =
    settings.technique === "fixed" ||
    settings.technique === "recursive";

  const selectedCount = selectedDocumentIds.length;

  const allSelected =
    documents.length > 0 &&
    documents.every((document) =>
      selectedDocumentIds.includes(document.document_id)
    );

  function updateSettings(
    patch: Partial<ChunkingSettings>
  ) {
    onSettingsChange({
      ...settings,
      ...patch,
    });
  }

  function changeTechnique(
    technique: ChunkingTechnique
  ) {
    updateSettings({
      technique,
      chunk_overlap:
        technique === "fixed" ||
        technique === "recursive"
          ? settings.chunk_overlap
          : 0,
    });
  }

  function invalidateIndex() {
    // The current index no longer represents the selected PDFs.
    setCurrentIndex(null);
    setChunks([]);
    onIndexReady(null);
  }

  async function uploadPdfs(files: File[]) {
    if (files.length === 0) {
      return;
    }

    const validFiles = files.filter((file) =>
      file.name.toLowerCase().endsWith(".pdf")
    );

    const invalidCount = files.length - validFiles.length;

    if (validFiles.length === 0) {
      setError("Please select valid PDF files.");
      return;
    }

    setUploading(true);
    setError(null);

    // The newly uploaded PDFs will be selected by default,
    // so any existing index needs to be rebuilt.
    invalidateIndex();

    try {
      // The backend currently accepts one file per request.
      // Promise.allSettled lets successful uploads be kept
      // even when another PDF fails.
      const results = await Promise.allSettled(
        validFiles.map((file) => ragApi.uploadPdf(file))
      );

      if (!mountedRef.current) {
        return;
      }

      const successful: UploadResponse[] = [];
      const failed: string[] = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          successful.push(result.value);
        } else {
          failed.push(validFiles[index].name);
        }
      });

      if (successful.length > 0) {
        setDocuments((previous) => [
          ...previous,
          ...successful,
        ]);

        setSelectedDocumentIds((previous) => [
          ...previous,
          ...successful.map(
            (document) => document.document_id
          ),
        ]);

        setPdfListOpen(true);
      }

      const issues: string[] = [];

      if (invalidCount > 0) {
        issues.push(
          `${invalidCount} non-PDF file(s) skipped.`
        );
      }

      if (failed.length > 0) {
        issues.push(
          `Failed to upload: ${failed.join(", ")}.`
        );
      }

      if (issues.length > 0) {
        setError(issues.join(" "));
      }
    } catch (caught) {
      if (!mountedRef.current) {
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to upload PDFs."
      );
    } finally {
      if (mountedRef.current) {
        setUploading(false);
      }
    }
  }

  function handleFilesSelected(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files ?? []
    );

    // Allow the same files to be selected again.
    event.target.value = "";

    void uploadPdfs(files);
  }

  function toggleDocument(documentId: string) {
    if (uploading || indexing) {
      return;
    }

    const isSelected =
      selectedDocumentIds.includes(documentId);

    const nextSelected = isSelected
      ? selectedDocumentIds.filter(
          (id) => id !== documentId
        )
      : [...selectedDocumentIds, documentId];

    setSelectedDocumentIds(nextSelected);
    invalidateIndex();
    setError(null);
  }

  function toggleSelectAll() {
    if (uploading || indexing) {
      return;
    }

    const nextSelected = allSelected
      ? []
      : documents.map(
          (document) => document.document_id
        );

    setSelectedDocumentIds(nextSelected);
    invalidateIndex();
    setError(null);
  }

  function removeDocument(documentId: string) {
    if (uploading || indexing) {
      return;
    }

    // Only remove the PDF from this frontend workspace.
    // Do not delete the uploaded file from backend storage.
    setDocuments((previous) =>
      previous.filter(
        (document) =>
          document.document_id !== documentId
      )
    );

    setSelectedDocumentIds((previous) =>
      previous.filter((id) => id !== documentId)
    );

    invalidateIndex();
    setError(null);
  }

  function clearAllDocuments() {
    if (uploading || indexing) {
      return;
    }

    setDocuments([]);
    setSelectedDocumentIds([]);
    invalidateIndex();
    setError(null);
  }

  async function buildIndex() {
    if (selectedDocumentIds.length === 0) {
      setError(
        "Please select at least one PDF to build an index."
      );
      return;
    }

    if (uploading || indexing) {
      return;
    }

    setIndexing(true);
    setError(null);

    invalidateIndex();

    try {
      const record = await ragApi.createIndex(
        selectedDocumentIds,
        settings
      );

      if (!mountedRef.current) {
        return;
      }

      const result = await ragApi.getIndexChunks(
        record.index_id
      );

      if (!mountedRef.current) {
        return;
      }

      setChunks(result.chunks);
      setCurrentIndex(record);
      onIndexReady(record);
    } catch (caught) {
      if (!mountedRef.current) {
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to build vector index."
      );
    } finally {
      if (mountedRef.current) {
        setIndexing(false);
      }
    }
  }

  const settingsChangedAfterIndex =
    currentIndex !== null &&
    (
      settings.technique !==
        currentIndex.settings.technique ||
      settings.chunk_size !==
        currentIndex.settings.chunk_size ||
      settings.chunk_overlap !==
        currentIndex.settings.chunk_overlap ||
      settings.semantic_similarity_threshold !==
        currentIndex.settings.semantic_similarity_threshold ||
      settings.window_size !==
        currentIndex.settings.window_size ||
      settings.window_stride !==
        currentIndex.settings.window_stride
    );

  return (
    <div className="flex flex-col gap-5">
      {/* Configuration Header */}
      <div className="flex items-center gap-2">
        <Settings2 size={18} />
        <h2 className="font-semibold">
          Configuration
        </h2>
      </div>

      {/* Multiple PDF Upload */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      <button
        type="button"
        disabled={uploading || indexing}
        onClick={() => inputRef.current?.click()}
        className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/40 text-sm transition hover:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? (
          <Loader2
            size={24}
            className="animate-spin text-blue-400"
          />
        ) : (
          <FileUp
            size={24}
            className="text-zinc-400"
          />
        )}

        <span className="font-medium">
          {uploading
            ? "Uploading PDFs..."
            : "Upload PDFs"}
        </span>

        <span className="text-xs text-zinc-500">
          Select one or multiple PDF documents
        </span>
      </button>

      {/* Collapsible Uploaded PDFs Section */}
      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
        <button
          type="button"
          onClick={() =>
            setPdfListOpen((previous) => !previous)
          }
          aria-expanded={pdfListOpen}
          className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left transition hover:bg-zinc-800/50"
        >
          <div className="flex min-w-0 items-center gap-2">
            {pdfListOpen ? (
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

            <Files
              size={16}
              className="text-blue-400"
            />

            <span className="text-xs font-semibold text-zinc-200">
              Uploaded PDFs
            </span>
          </div>

          <span className="rounded-full bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400">
            {documents.length} documents
          </span>
        </button>

        {pdfListOpen && (
          <div className="border-t border-zinc-800 px-3 pb-3 pt-3">
            {documents.length === 0 ? (
              <div className="py-4 text-center">
                <FileText
                  size={22}
                  className="mx-auto text-zinc-600"
                />

                <p className="mt-2 text-xs text-zinc-500">
                  No PDFs uploaded yet.
                </p>
              </div>
            ) : (
              <>
                {/* Select All and Clear All */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={uploading || indexing}
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-[11px] text-zinc-400 hover:text-white disabled:opacity-50"
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                        allSelected
                          ? "border-blue-500 bg-blue-600"
                          : "border-zinc-600"
                      }`}
                    >
                      {allSelected && (
                        <Check
                          size={12}
                          className="text-white"
                        />
                      )}
                    </span>

                    {allSelected
                      ? "Deselect all"
                      : "Select all"}
                  </button>

                  <button
                    type="button"
                    disabled={uploading || indexing}
                    onClick={clearAllDocuments}
                    className="text-[11px] text-zinc-500 transition hover:text-red-400 disabled:opacity-50"
                  >
                    Clear all
                  </button>
                </div>

                {/* Uploaded Document List */}
                <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
                  {documents.map((document) => {
                    const selected =
                      selectedDocumentIds.includes(
                        document.document_id
                      );

                    return (
                      <div
                        key={document.document_id}
                        className={`flex items-center gap-2 rounded-lg border p-3 transition ${
                          selected
                            ? "border-blue-500/40 bg-blue-500/10"
                            : "border-zinc-800 bg-zinc-900"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={uploading || indexing}
                          onChange={() =>
                            toggleDocument(
                              document.document_id
                            )
                          }
                          aria-label={`Select ${document.filename}`}
                          className="h-4 w-4 shrink-0 cursor-pointer accent-blue-500 disabled:cursor-not-allowed"
                        />

                        <FileText
                          size={16}
                          className="shrink-0 text-red-400"
                        />

                        <div className="min-w-0 flex-1">
                          <p
                            title={document.filename}
                            className="truncate text-xs font-medium text-zinc-200"
                          >
                            {document.filename}
                          </p>

                          <p className="mt-1 text-[10px] text-zinc-500">
                            {document.page_count} pages
                            {" · "}
                            {document.total_paragraphs} paragraphs
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={uploading || indexing}
                          onClick={() =>
                            removeDocument(
                              document.document_id
                            )
                          }
                          aria-label={`Remove ${document.filename}`}
                          title="Remove from workspace"
                          className="shrink-0 rounded p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-red-400 disabled:opacity-50"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 rounded-md bg-zinc-800/50 px-3 py-2">
                  <p className="text-[11px] text-zinc-400">
                    <span className="font-semibold text-blue-400">
                      {selectedCount}
                    </span>
                    {" of "}
                    {documents.length}
                    {" PDFs selected for indexing"}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Chunking Strategy */}
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">
          Chunking strategy
        </label>

        <select
          value={settings.technique}
          onChange={(event) =>
            changeTechnique(
              event.target.value as ChunkingTechnique
            )
          }
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm outline-none focus:border-blue-500"
        >
          <option value="fixed">Fixed Size</option>
          <option value="recursive">Recursive</option>
          <option value="sentence">Sentence</option>
          <option value="paragraph">Paragraph</option>
          <option value="semantic">Semantic</option>
          <option value="sliding_window">
            Sliding Window
          </option>
        </select>
      </div>

      {/* Chunk Size and Overlap */}
      <div className="grid grid-cols-2 gap-4">
        <NumberSetting
          label="Chunk Size"
          value={settings.chunk_size}
          min={50}
          max={2000}
          step={10}
          onChange={(value) =>
            updateSettings({
              chunk_size: value,
              chunk_overlap: Math.min(
                settings.chunk_overlap,
                value - 1
              ),
            })
          }
        />

        <NumberSetting
          label="Overlap"
          value={settings.chunk_overlap}
          min={0}
          max={Math.max(
            0,
            settings.chunk_size - 1
          )}
          disabled={!overlapAllowed}
          onChange={(value) =>
            updateSettings({
              chunk_overlap: value,
            })
          }
        />
      </div>

      {/* Semantic Chunking Settings */}
      {settings.technique === "semantic" && (
        <div>
          <div className="mb-2 flex justify-between gap-2 text-xs text-zinc-300">
            <span>
              Semantic Similarity Threshold
            </span>

            <span>
              {settings.semantic_similarity_threshold.toFixed(
                2
              )}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={
              settings.semantic_similarity_threshold
            }
            onChange={(event) =>
              updateSettings({
                semantic_similarity_threshold:
                  Number(event.target.value),
              })
            }
            className="w-full accent-blue-500"
          />
        </div>
      )}

      {/* Sliding Window Settings */}
      {settings.technique === "sliding_window" && (
        <div className="grid grid-cols-2 gap-4">
          <NumberSetting
            label="Window Size"
            value={settings.window_size}
            min={1}
            max={30}
            onChange={(value) =>
              updateSettings({
                window_size: value,
                window_stride: Math.min(
                  settings.window_stride,
                  value
                ),
              })
            }
          />

          <NumberSetting
            label="Window Stride"
            value={settings.window_stride}
            min={1}
            max={settings.window_size}
            onChange={(value) =>
              updateSettings({
                window_stride: value,
              })
            }
          />
        </div>
      )}

      {/* Top-K and Max Tokens */}
      <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4">
        <NumberSetting
          label="Top-K"
          value={settings.top_k}
          min={1}
          max={20}
          onChange={(value) =>
            updateSettings({
              top_k: value,
            })
          }
        />

        <NumberSetting
          label="Max Tokens"
          value={settings.max_output_tokens}
          min={64}
          max={4096}
          step={64}
          onChange={(value) =>
            updateSettings({
              max_output_tokens: value,
            })
          }
        />
      </div>

      {/* Reset Settings */}
      <button
        type="button"
        onClick={() =>
          onSettingsChange({
            ...DEFAULT_SETTINGS,
          })
        }
        className="flex items-center justify-center gap-2 text-xs text-zinc-400 transition hover:text-white"
      >
        <RotateCcw size={13} />
        Reset to defaults
      </button>

      {/* Build Combined Index */}
      <button
        type="button"
        disabled={
          selectedCount === 0 ||
          uploading ||
          indexing
        }
        onClick={() => void buildIndex()}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        {indexing ? (
          <Loader2
            size={17}
            className="animate-spin"
          />
        ) : (
          <Database size={17} />
        )}

        {indexing
          ? "Building Index..."
          : `Build Vector Index${
              selectedCount > 1
                ? ` (${selectedCount} PDFs)`
                : ""
            }`}
      </button>

      {/* Index Status */}
      {currentIndex && (
        <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
            <Check size={15} />
            Index ready
          </div>

          <p className="mt-2 text-[11px] text-zinc-400">
            {currentIndex.document_ids.length} PDFs
            {" · "}
            {currentIndex.total_chunks} chunks
          </p>

          <div className="mt-2 flex flex-col gap-1">
            {currentIndex.filenames.map(
              (filename, index) => (
                <p
                  key={`${filename}-${index}`}
                  className="truncate text-[11px] text-zinc-500"
                  title={filename}
                >
                  {filename}
                </p>
              )
            )}
          </div>
        </div>
      )}

      {settingsChangedAfterIndex && (
        <p className="text-xs text-amber-400">
          Chunking settings changed. Build a new
          index to apply them.
        </p>
      )}

      {/* Error Message */}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-xs text-red-400"
        >
          {error}
        </p>
      )}

      {/* Existing Collapsible Chunk Inspector */}
      <ChunkInspector chunks={chunks} />
    </div>
  );
}
