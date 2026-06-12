"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, Bot, User, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState } from "react";

export type Mood = "frustrated" | "neutral" | "happy";

export interface KBSource {
  id: string;
  title: string;
  category: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  mood?: Mood;
  sources?: KBSource[];
  suggestAgent?: boolean;
  isStreaming?: boolean;
  thinkingStreaming?: boolean;
}

interface ChatMessageProps {
  message: Message;
  onRequestAgent?: () => void;
}

const moodConfig: Record<Mood, { emoji: string; label: string; className: string }> = {
  frustrated: {
    emoji: "😤",
    label: "Frustrated",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  happy: {
    emoji: "😊",
    label: "Happy",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  neutral: {
    emoji: "😐",
    label: "Neutral",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

function ThinkingBlock({ text, streaming }: { text: string; streaming?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  if (!text && !streaming) return null;

  return (
    <div className="mb-3 rounded-lg border border-violet-200 bg-violet-50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-violet-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-violet-500 text-xs font-semibold uppercase tracking-wide">
            {streaming ? "Thinking..." : "Reasoning process"}
          </span>
          {streaming && (
            <span className="inline-flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-violet-400 animate-pulse-soft" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-1 rounded-full bg-violet-400 animate-pulse-soft" style={{ animationDelay: "200ms" }} />
              <span className="w-1 h-1 rounded-full bg-violet-400 animate-pulse-soft" style={{ animationDelay: "400ms" }} />
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-violet-200">
          <p className="thinking-text text-violet-700 whitespace-pre-wrap">{text}</p>
        </div>
      )}
    </div>
  );
}

function SourceCitations({ sources }: { sources: KBSource[] }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
        <ExternalLink className="w-3 h-3" />
        Knowledge Base Sources
      </p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((source) => (
          <span
            key={source.id}
            className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-700 font-medium"
          >
            <span className="text-blue-400">{source.id}</span>
            <span>{source.title}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function AgentSuggestion({ onRequestAgent }: { onRequestAgent?: () => void }) {
  return (
    <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 animate-fade-in">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-amber-800">Escalation Recommended</p>
          <p className="text-xs text-amber-700 mt-0.5">
            It looks like you might benefit from speaking with a human agent for personalized help.
          </p>
          <button
            onClick={onRequestAgent}
            className="mt-2 text-xs font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900"
          >
            Connect with a human agent
          </button>
        </div>
      </div>
    </div>
  );
}

// Strip the METADATA line from text before displaying
function cleanContent(content: string): string {
  return content.replace(/\n?METADATA:\s*\{[^}]*\}\s*$/m, "").trim();
}

export function ChatMessage({ message, onRequestAgent }: ChatMessageProps) {
  const isUser = message.role === "user";
  const displayContent = cleanContent(message.content);

  return (
    <div
      className={cn(
        "flex gap-3 animate-fade-in",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-violet-500 to-blue-500 text-white"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* Bubble */}
      <div className={cn("max-w-[80%] min-w-0", isUser ? "items-end" : "items-start")}>
        {/* Mood badge — shown on assistant messages */}
        {!isUser && message.mood && !message.isStreaming && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                moodConfig[message.mood].className
              )}
            >
              <span>{moodConfig[message.mood].emoji}</span>
              <span>{moodConfig[message.mood].label}</span>
            </span>
          </div>
        )}

        <div
          className={cn(
            "rounded-2xl px-4 py-3 shadow-sm",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-card border border-border rounded-tl-sm"
          )}
        >
          {/* Thinking section (assistant only) */}
          {!isUser && (message.thinking || message.thinkingStreaming) && (
            <ThinkingBlock text={message.thinking ?? ""} streaming={message.thinkingStreaming} />
          )}

          {/* Main text */}
          <div
            className={cn(
              "text-sm leading-relaxed whitespace-pre-wrap break-words",
              isUser ? "text-primary-foreground" : "text-foreground"
            )}
          >
            {displayContent}
            {message.isStreaming && !message.thinkingStreaming && displayContent && (
              <span className="inline-block w-0.5 h-3.5 bg-current ml-0.5 animate-pulse-soft" />
            )}
          </div>

          {/* Source citations */}
          {!isUser && !message.isStreaming && message.sources && message.sources.length > 0 && (
            <SourceCitations sources={message.sources} />
          )}
        </div>

        {/* Agent suggestion banner */}
        {!isUser && !message.isStreaming && message.suggestAgent && (
          <AgentSuggestion onRequestAgent={onRequestAgent} />
        )}
      </div>
    </div>
  );
}
