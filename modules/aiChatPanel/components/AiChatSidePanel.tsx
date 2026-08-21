"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import {
  Loader2,
  Send,
  User,
  Copy,
  X,
  Code,
  Sparkles,
  MessageSquare,
  RefreshCw,
  Settings,
  Zap,
  Brain,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import "katex/dist/katex.min.css";
import { useChatMessages, type ChatMessage } from "@/modules/aiChatPanel/hooks/useChatMessages";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const MessageTypeIndicator: React.FC<{
  type?: string;
  model?: string;
  tokens?: number;
  saved?: boolean;
}> = ({ type, model, tokens, saved }) => {
  const getTypeConfig = (type?: string) => {
    switch (type) {
      case "code_review":
        return { icon: Code, color: "text-blue-400", label: "Code Review" };
      case "suggestion":
        return { icon: Sparkles, color: "text-purple-400", label: "Suggestion" };
      case "error_fix":
        return { icon: RefreshCw, color: "text-red-400", label: "Error Fix" };
      case "optimization":
        return { icon: Zap, color: "text-yellow-400", label: "Optimization" };
      default:
        return { icon: MessageSquare, color: "text-zinc-600", label: "Chat" };
    }
  };

  const config = getTypeConfig(type);
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3 w-3", config.color)} />
        <span className={cn("text-xs font-medium", config.color)}>
          {config.label}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-600">
        {model && <span>{model}</span>}
        {tokens && <span>{tokens} tok</span>}
        {/* Save status indicator */}
        {saved === true && (
          <CheckCircle2 className="h-3 w-3 text-zinc-700" aria-label="Saved" />
        )}
        {saved === false && (
          <AlertCircle className="h-3 w-3 text-red-700" aria-label="Save failed" />
        )}
        {saved === undefined && (
          <Loader2 className="h-3 w-3 animate-spin text-zinc-700" aria-label="Saving…" />
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AIChatSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided, chat history is persisted to the database scoped to this playground */
  playgroundId?: string;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const AIChatSidePanel: React.FC<AIChatSidePanelProps> = ({
  isOpen,
  onClose,
  playgroundId,
}) => {
  const [input, setInput] = useState("");
  const [chatMode, setChatMode] = useState<"chat" | "review" | "fix" | "optimize">("chat");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [autoSave, setAutoSave] = useState(true);
  const [streamResponse, setStreamResponse] = useState(true);
  const [model, setModel] = useState<string>("gpt-6");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Chat state + DB persistence
  const { messages, isLoading, isSaving, isHydrating, sendMessage, clearMessages } =
    useChatMessages(playgroundId);

  // Scroll to bottom when messages change
  useEffect(() => {
    const id = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(id);
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const prompt = input.trim();
    setInput("");
    await sendMessage(prompt, chatMode, model, messages);
  };

  const exportChat = () => {
    const blob = new Blob(
      [JSON.stringify({ messages, exportedAt: new Date().toISOString() }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-chat-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      !searchTerm.trim() ||
      msg.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterType === "all" ||
      (filterType === "chat" && (!msg.type || msg.type === "chat")) ||
      msg.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <TooltipProvider>
      <>
        {/* Backdrop */}
        <div
          className={cn(
            "fixed inset-0 bg-black/40 z-40 transition-opacity duration-200",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={onClose}
        />

        {/* Side Panel */}
        <div
          className={cn(
            "fixed right-0 top-0 h-full w-full max-w-6xl bg-zinc-950 border-l border-zinc-800/70 z-50 flex flex-col transition-transform duration-300 ease-out",
            isOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          {/* Header */}
          <div className="shrink-0 border-b border-zinc-800/70">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 h-11">
              <div className="flex items-center gap-2.5">
                <video src={"/logo.mp4"} width={38} height={38} />
                <span className="text-sm font-medium text-zinc-200 tracking-tight">
                  AI Assistant
                </span>
                {messages.length > 0 && (
                  <span className="text-xs text-zinc-600 tabular-nums">
                    {messages.length}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* DB save status pill */}
                {isSaving && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700">
                    <Loader2 className="h-2.5 w-2.5 animate-spin text-zinc-500" />
                    <span className="text-[10px] text-zinc-500">Saving</span>
                  </div>
                )}
                {isHydrating && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700">
                    <Loader2 className="h-2.5 w-2.5 animate-spin text-zinc-500" />
                    <span className="text-[10px] text-zinc-500">Loading history</span>
                  </div>
                )}
                {playgroundId && !isSaving && !isHydrating && messages.length > 0 && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
                    <CheckCircle2 className="h-2.5 w-2.5 text-zinc-600" />
                    <span className="text-[10px] text-zinc-600">Synced</span>
                  </div>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuCheckboxItem
                      checked={autoSave}
                      onCheckedChange={setAutoSave}
                    >
                      Auto-save conversations
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={streamResponse}
                      onCheckedChange={setStreamResponse}
                    >
                      Stream responses
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={exportChat}>
                      <Download className="h-3.5 w-3.5 mr-2" />
                      Export chat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => clearMessages()}>
                      Clear messages
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Controls bar */}
            <Tabs
              value={chatMode}
              onValueChange={(value) => setChatMode(value as any)}
              className="px-4 pb-2.5"
            >
              <div className="flex items-center gap-2">
                <TabsList className="h-7 bg-zinc-900 border border-zinc-800 p-0.5 gap-px">
                  <TabsTrigger
                    value="chat"
                    className="h-6 px-2.5 text-xs flex items-center gap-1.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
                  >
                    <MessageSquare className="h-3 w-3" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger
                    value="review"
                    className="h-6 px-2.5 text-xs flex items-center gap-1.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
                  >
                    <Code className="h-3 w-3" />
                    Review
                  </TabsTrigger>
                  <TabsTrigger
                    value="fix"
                    className="h-6 px-2.5 text-xs flex items-center gap-1.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Fix
                  </TabsTrigger>
                  <TabsTrigger
                    value="optimize"
                    className="h-6 px-2.5 text-xs flex items-center gap-1.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
                  >
                    <Zap className="h-3 w-3" />
                    Optimize
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-1.5 ml-auto">
                  <div className="hidden sm:flex items-center">
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="h-7 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-400 px-2 focus:outline-none focus:border-zinc-600 cursor-pointer"
                    >
                      <option value="gpt-6">gpt-6</option>
                      <option value="codellama">codellama</option>
                      <option value="llama2">llama2</option>
                    </select>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-600 pointer-events-none" />
                    <Input
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-7 pl-6 w-32 text-xs bg-zinc-900 border-zinc-800 placeholder:text-zinc-600 focus:border-zinc-600 focus-visible:ring-0"
                    />
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60"
                      >
                        <Filter className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setFilterType("all")}>
                        All messages
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterType("chat")}>
                        Chat only
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterType("code_review")}>
                        Code reviews
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterType("error_fix")}>
                        Error fixes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterType("optimization")}>
                        Optimizations
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Tabs>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto bg-zinc-950">
            <div className="px-5 py-5 space-y-5">
              {/* Empty state */}
              {filteredMessages.length === 0 && !isLoading && !isHydrating && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                    <Brain className="h-4 w-4 text-zinc-500" />
                  </div>
                  <p className="text-sm font-medium text-zinc-300 mb-1">
                    AI Assistant
                  </p>
                  <p className="text-xs text-zinc-600 mb-6 max-w-xs leading-relaxed">
                    Advanced analysis for code review, debugging, and optimization.
                    {playgroundId && (
                      <span className="block mt-1 text-zinc-700">
                        Chat history auto-saved to your playground.
                      </span>
                    )}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full max-w-sm">
                    {[
                      "Review my React component for performance",
                      "Fix TypeScript compilation errors",
                      "Optimize database query performance",
                      "Add comprehensive error handling",
                      "Implement security best practices",
                      "Refactor code for better maintainability",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md text-xs text-zinc-500 hover:text-zinc-300 transition-colors text-left leading-snug"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hydrating skeleton */}
              {isHydrating && (
                <div className="flex flex-col gap-4 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-md bg-zinc-800 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-zinc-800 rounded w-3/4" />
                        <div className="h-3 bg-zinc-800 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Message list */}
              {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex items-start gap-3 group",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Brain className="h-3.5 w-3.5 text-zinc-500" />
                    </div>
                  )}

                  <div
                    className={cn(
                      msg.role === "user"
                        ? "max-w-[80%] bg-zinc-800/80 text-zinc-100 rounded-xl rounded-br-sm px-3.5 py-2.5 text-sm"
                        : "flex-1 min-w-0"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <MessageTypeIndicator
                        type={msg.type}
                        model={msg.model}
                        tokens={msg.tokens}
                        saved={playgroundId ? msg.saved : undefined}
                      />
                    )}

                    <div className="prose prose-invert prose-sm max-w-none text-zinc-200 prose-p:leading-relaxed prose-p:my-2 first:prose-p:mt-0">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          code: ({ children, className, inline }: any) => {
                            if (inline) {
                              return (
                                <code className="bg-zinc-800 px-1 py-0.5 rounded text-sm font-mono text-zinc-200">
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <div className="bg-zinc-900 border border-zinc-800 rounded-md my-3 overflow-hidden">
                                <pre className="text-sm text-zinc-300 overflow-x-auto p-3 m-0">
                                  <code className={className}>{children}</code>
                                </pre>
                              </div>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Message actions */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                        <span>
                          {msg.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {/* User message save indicator */}
                        {msg.role === "user" && playgroundId && (
                          <>
                            {msg.saved === undefined && (
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            )}
                            {msg.saved === true && (
                              <CheckCircle2 className="h-2.5 w-2.5 text-zinc-700" />
                            )}
                            {msg.saved === false && (
                              <AlertCircle className="h-2.5 w-2.5 text-red-700" />
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(msg.content)}
                          className="h-6 w-6 p-0 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInput(msg.content)}
                          className="h-6 w-6 p-0 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {msg.role === "user" && (
                    <Avatar className="h-7 w-7 border border-zinc-700 bg-zinc-800 shrink-0">
                      <AvatarFallback className="bg-zinc-800 text-zinc-400">
                        <User className="h-3.5 w-3.5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {/* AI thinking indicator */}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Brain className="h-3.5 w-3.5 text-zinc-500" />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                    <span className="text-xs text-zinc-500">
                      {chatMode === "review"
                        ? "Analyzing code structure and patterns..."
                        : chatMode === "fix"
                        ? "Identifying issues and solutions..."
                        : chatMode === "optimize"
                        ? "Analyzing performance bottlenecks..."
                        : "Processing your request..."}
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="h-1" />
            </div>
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSendMessage}
            className="shrink-0 border-t border-zinc-800/70 p-3"
          >
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <Textarea
                  placeholder={
                    chatMode === "chat"
                      ? "Ask about your code, request improvements, or paste code to analyze..."
                      : chatMode === "review"
                      ? "Describe what you'd like me to review in your code..."
                      : chatMode === "fix"
                      ? "Describe the issue you're experiencing..."
                      : "Describe what you'd like me to optimize..."
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleSendMessage(e as any);
                    }
                  }}
                  disabled={isLoading}
                  className="min-h-[40px] max-h-32 bg-zinc-900 border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus-visible:ring-0 resize-none pr-14"
                  rows={1}
                />
                <div className="absolute right-2.5 bottom-2.5 flex items-center">
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] text-zinc-600 bg-zinc-800 border border-zinc-700/60 rounded font-mono">
                    ⌘↵
                  </kbd>
                </div>
              </div>
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="h-10 w-10 p-0 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-0 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </>
    </TooltipProvider>
  );
};