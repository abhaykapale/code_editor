"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  saveChatMessage,
  getChatMessages,
  clearChatMessages,
} from "@/modules/aiChatPanel/actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  /** Local client-side ID (used as React key before DB confirms). */
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "chat" | "code_review" | "suggestion" | "error_fix" | "optimization";
  tokens?: number;
  model?: string;
  /** undefined = not yet saved, true = saved, false = save failed */
  saved?: boolean | undefined;
}

interface UseChatMessagesReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  /** True while a background DB write is in-flight */
  isSaving: boolean;
  isHydrating: boolean;
  sendMessage: (
    userPrompt: string,
    mode: string,
    model: string,
    history: ChatMessage[]
  ) => Promise<void>;
  clearMessages: () => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildModePrompt(mode: string, content: string): string {
  switch (mode) {
    case "review":
      return `You are an expert code reviewer. Please review the following code and provide feedback:\n\n${content}`;
    case "fix":
      return `You are an expert software engineer. Please identify and fix any issues in the following code:\n\n${content}`;
    case "optimize":
      return `You are an expert performance engineer. Please analyze the following code and suggest optimizations:\n\n${content}`;
    default:
      return content;
  }
}

function getModeType(
  mode: string
): ChatMessage["type"] {
  switch (mode) {
    case "review":
      return "code_review";
    case "fix":
      return "error_fix";
    case "optimize":
      return "optimization";
    default:
      return "chat";
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChatMessages(
  playgroundId?: string
): UseChatMessagesReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);

  // Track in-flight saves so we can surface the isSaving flag accurately
  const pendingSaves = useRef(0);

  // ------------------------------------------------------------------
  // Hydrate from DB on mount / when playgroundId changes
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!playgroundId) return;

    let cancelled = false;
    setIsHydrating(true);

    getChatMessages(playgroundId, 50)
      .then((rows) => {
        if (cancelled) return;
        if (rows.length === 0) return;

        setMessages(
          rows.map((r) => ({
            id: r.id,
            role: r.role,
            content: r.content,
            timestamp: new Date(r.createdAt),
            type: "chat",
            saved: true,
          }))
        );
      })
      .catch((err) => {
        if (!cancelled) console.error("[useChatMessages] hydration error:", err);
      })
      .finally(() => {
        if (!cancelled) setIsHydrating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [playgroundId]);

  // ------------------------------------------------------------------
  // Fire-and-forget DB write — never blocks the UI
  // ------------------------------------------------------------------
  const persistMessage = useCallback(
    async (
      role: "user" | "assistant",
      content: string,
      localId: string
    ) => {
      if (!playgroundId) return;

      pendingSaves.current += 1;
      setIsSaving(true);

      try {
        const result = await saveChatMessage(playgroundId, role, content);

        // Update the local message's saved flag
        setMessages((prev) =>
          prev.map((m) =>
            m.id === localId ? { ...m, saved: result.ok } : m
          )
        );
      } catch (err) {
        console.error("[useChatMessages] persistMessage error:", err);
        setMessages((prev) =>
          prev.map((m) => (m.id === localId ? { ...m, saved: false } : m))
        );
      } finally {
        pendingSaves.current -= 1;
        if (pendingSaves.current === 0) setIsSaving(false);
      }
    },
    [playgroundId]
  );

  // ------------------------------------------------------------------
  // sendMessage — optimistic UI first, then fetch AI, then persist both
  // ------------------------------------------------------------------
  const sendMessage = useCallback(
    async (
      userPrompt: string,
      mode: string,
      model: string,
      history: ChatMessage[]
    ) => {
      if (!userPrompt.trim() || isLoading) return;

      const promptWithMode = buildModePrompt(mode, userPrompt.trim());
      const msgType = getModeType(mode);

      // 1. Optimistically add user message
      const userLocalId = `local-user-${Date.now()}`;
      const userMessage: ChatMessage = {
        id: userLocalId,
        role: "user",
        content: promptWithMode,
        timestamp: new Date(),
        type: msgType,
        saved: playgroundId ? undefined : true, // no save needed if no playground
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // 2. Persist user message in background
      if (playgroundId) {
        persistMessage("user", promptWithMode, userLocalId);
      }

      // 3. Call AI
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: promptWithMode,
            history: history.slice(-10).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            mode,
            model,
          }),
        });

        if (response.ok) {
          const data = await response.json();

          const assistantLocalId = `local-ai-${Date.now()}`;
          const assistantMessage: ChatMessage = {
            id: assistantLocalId,
            role: "assistant",
            content: data.response ?? "No response received.",
            timestamp: new Date(),
            type: msgType,
            tokens: data.tokens ?? undefined,
            model: data.model ?? model,
            saved: playgroundId ? undefined : true,
          };

          setMessages((prev) => [...prev, assistantMessage]);

          // 4. Persist AI response in background
          if (playgroundId) {
            persistMessage("assistant", assistantMessage.content, assistantLocalId);
          }
        } else {
          throw new Error(`API error: ${response.status}`);
        }
      } catch (error) {
        console.error("[useChatMessages] sendMessage error:", error);

        const errorLocalId = `local-err-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: errorLocalId,
            role: "assistant",
            content: "Sorry, I couldn't process your request. Please try again.",
            timestamp: new Date(),
            type: "chat",
            saved: true, // don't persist error messages
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, persistMessage, playgroundId]
  );

  // ------------------------------------------------------------------
  // clearMessages — delete from DB then clear local state
  // ------------------------------------------------------------------
  const clearMessages = useCallback(async () => {
    if (playgroundId) {
      await clearChatMessages(playgroundId);
    }
    setMessages([]);
  }, [playgroundId]);

  return {
    messages,
    isLoading,
    isSaving,
    isHydrating,
    sendMessage,
    clearMessages,
    setMessages,
  };
}
