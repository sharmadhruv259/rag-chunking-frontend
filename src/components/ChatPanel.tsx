
"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import {
  ArrowUp,
  Bot,
  FileText,
  Loader2,
  MessageSquareText,
  Plus,
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import SourceCard from "@/components/SourceCard";
import { ragApi } from "@/lib/api";

import type {
  ChatMessage,
  ChunkingSettings,
  IndexRecord,
} from "@/types/rag";

interface ChatPanelProps {
  activeIndex: IndexRecord | null;
  settings: ChunkingSettings;
  onNewChat: () => void;
}

export default function ChatPanel({
  activeIndex,
  settings,
  onNewChat,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  // Cancel in-flight browser requests when the panel unmounts.
  useEffect(() => {
    return () => {
      requestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  function handleNewChat() {
    requestRef.current?.abort();
    requestRef.current = null;

    // The parent will clear all settings, document state,
    // active index, chunks, and conversation history.
    onNewChat();
  }

  async function sendMessage(
    event?: FormEvent<HTMLFormElement>
  ) {
    event?.preventDefault();

    const text = question.trim();

    if (!text || loading) {
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    setQuestion("");
    setError(null);
    setLoading(true);

    try {
      const response = await ragApi.chat(
        activeIndex?.index_id ?? null,
        text,
        settings.top_k,
        settings.max_output_tokens,
        controller.signal
      );

      if (controller.signal.aborted) {
        return;
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.answer,
        sources: response.sources,
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (caught) {
      if (controller.signal.aborted) {
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to generate a response."
      );
    } finally {
      if (!controller.signal.aborted) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-zinc-800 bg-[#101014]">
      {/* Chat Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <MessageSquareText
            size={20}
            className="shrink-0 text-blue-500"
          />

          <div className="min-w-0">
            <h2 className="text-sm font-semibold">
              Chat with PDF
            </h2>

            <p className="mt-1 truncate text-xs text-zinc-500">
              {activeIndex
                ? activeIndex.filename
                : "No document indexed"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleNewChat}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
        >
          <Plus size={15} />
          New Chat
        </button>
      </div>

      {/* Conversation */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <FileText
                size={28}
                className="text-blue-400"
              />
            </div>

            <h3 className="text-base font-semibold">
              {activeIndex
                ? "Ask anything about your PDF"
                : "Welcome to RAG Chunking Playground"}
            </h3>

            <p className="max-w-sm text-sm leading-6 text-zinc-500">
              {activeIndex
                ? "Your vector index is ready. Ask a question to retrieve relevant information."
                : "Say hello, or upload and index a PDF to start asking document questions."}
            </p>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                {message.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-sm leading-6 text-white">
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                ) : (
                  <div className="flex w-full min-w-0 gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/15 text-blue-400">
                      <Bot size={18} />
                    </div>

                    <div className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-[#151519] p-4">
                      <div className="mb-3 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                        Assistant
                      </div>

                      <div className="rag-markdown break-words text-sm leading-7 text-zinc-200">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>

                      {/* No sources = no SourceCard */}
                      <SourceCard
                        sources={message.sources ?? []}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <Loader2
                  size={18}
                  className="animate-spin text-blue-400"
                />
                Generating response...
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mx-4 mb-2 rounded-lg border border-red-900 bg-red-950/30 p-3 text-xs text-red-400 sm:mx-8"
        >
          {error}
        </div>
      )}

      {/* Message Input */}
      <div className="shrink-0 border-t border-zinc-800 p-4">
        <form
          onSubmit={(event) => void sendMessage(event)}
          className="mx-auto flex max-w-3xl items-end gap-3 rounded-xl border border-zinc-700 bg-[#09090b] p-3 focus-within:border-blue-500"
        >
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(event) =>
              setQuestion(event.target.value)
            }
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={1}
            placeholder={
              activeIndex
                ? "Ask a question about the PDF..."
                : "Say hello or upload a PDF..."
            }
            className="max-h-40 min-h-7 flex-1 resize-none bg-transparent px-1 py-1 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
          />

          <button
            type="submit"
            disabled={!question.trim() || loading}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {loading ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <ArrowUp size={18} />
            )}
          </button>
        </form>

        <p className="mt-2 text-center text-[11px] text-zinc-500">
          {activeIndex
            ? `Top-K: ${settings.top_k} · Max tokens: ${settings.max_output_tokens} · Enter to send`
            : "Greetings are available. PDF questions require an index."}
        </p>
      </div>
    </section>
  );
}
