
"use client";

import { useState } from "react";

import {
  Layers3,
  Menu,
  PanelLeftOpen,
} from "lucide-react";

import ConfigurationSidebar from "@/components/ConfigurationSidebar";
import ChatPanel from "@/components/ChatPanel";

import {
  DEFAULT_SETTINGS,
  type ChunkingSettings,
  type IndexRecord,
} from "@/types/rag";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [settings, setSettings] =
    useState<ChunkingSettings>({
      ...DEFAULT_SETTINGS,
    });

  const [activeIndex, setActiveIndex] =
    useState<IndexRecord | null>(null);

  const [workspaceVersion, setWorkspaceVersion] =
    useState(0);

  function handleNewChat() {
    // Remove the active PDF index from the UI.
    setActiveIndex(null);

    // Restore every slider to its default.
    setSettings({ ...DEFAULT_SETTINGS });

    // Expand the left sidebar for the new session.
    setSidebarOpen(true);

    // Remount both components to clear their local state:
    // uploaded PDF, chunks, errors, chat messages, etc.
    setWorkspaceVersion((previous) => previous + 1);
  }

  return (
    <div className="flex h-screen flex-col bg-[#09090b] text-zinc-100">
      {/* Header */}
      <header className="flex min-h-[72px] shrink-0 items-center justify-between border-b border-zinc-800 px-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() =>
              setSidebarOpen((previous) => !previous)
            }
            aria-label={
              sidebarOpen
                ? "Collapse sidebar"
                : "Expand sidebar"
            }
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            {sidebarOpen ? (
              <Menu size={22} />
            ) : (
              <PanelLeftOpen size={22} />
            )}
          </button>

          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              <Layers3
                size={20}
                className="text-blue-500"
              />
              RAG Chunking Playground
            </h1>

            <p className="text-xs text-zinc-500">
              PDF-powered retrieval experiments
            </p>
          </div>
        </div>

        {activeIndex && (
          <div className="hidden items-center gap-2 text-xs text-emerald-400 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Index Ready
          </div>
        )}
      </header>

      {/* Workspace */}
      <main className="flex min-h-0 flex-1 gap-3 p-3">
        {/* Keep sidebar mounted when collapsed, so
            its state doesn't disappear accidentally. */}
        <aside
          className={`shrink-0 overflow-y-auto rounded-xl border border-zinc-800 bg-[#101014] p-4 ${
            sidebarOpen
              ? "w-[390px] max-md:w-[310px] max-sm:absolute max-sm:inset-y-[84px] max-sm:left-3 max-sm:z-20 max-sm:w-[min(390px,calc(100%-24px))]"
              : "hidden"
          }`}
        >
          <ConfigurationSidebar
            key={workspaceVersion}
            settings={settings}
            onSettingsChange={setSettings}
            onIndexReady={setActiveIndex}
          />
        </aside>

        {/* Changing the index also starts a fresh chat,
            while New Chat resets the entire workspace. */}
        <ChatPanel
          key={`${workspaceVersion}-${activeIndex?.index_id ?? "none"}`}
          activeIndex={activeIndex}
          settings={settings}
          onNewChat={handleNewChat}
        />
      </main>
    </div>
  );
}
