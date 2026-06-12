"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage, Message, KBSource } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { Bot, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi there! I'm your AI support assistant, powered by Claude. I have access to our knowledge base and can help you with account issues, billing questions, technical problems, and more.\n\nWhat can I help you with today?",
  mood: "happy",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [agentRequested, setAgentRequested] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (userText: string) => {
    if (isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userText,
    };

    const assistantId = `assistant-${Date.now()}`;
    const streamingMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
      thinkingStreaming: false,
    };

    setMessages((prev) => [...prev, userMessage, streamingMessage]);
    setIsLoading(true);

    try {
      // Build conversation history for the API (exclude streaming placeholder and welcome)
      const history = [...messages, userMessage]
        .filter((m) => m.id !== "welcome")
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Track accumulated state for the streaming message
      let thinkingText = "";
      let responseText = "";
      let kbSources: KBSource[] = [];
      let inThinking = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;

          try {
            const event = JSON.parse(data);

            switch (event.type) {
              case "kb_sources":
                kbSources = event.sources ?? [];
                break;

              case "thinking_start":
                inThinking = true;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, thinkingStreaming: true }
                      : m
                  )
                );
                break;

              case "thinking_delta":
                thinkingText += event.delta ?? "";
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, thinking: thinkingText }
                      : m
                  )
                );
                break;

              case "thinking_stop":
                inThinking = false;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, thinkingStreaming: false }
                      : m
                  )
                );
                break;

              case "text_start":
                // Text block starting — nothing special needed
                break;

              case "text_delta":
                responseText += event.delta ?? "";
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: responseText }
                      : m
                  )
                );
                break;

              case "done":
                // Finalize the message
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          content: responseText,
                          thinking: thinkingText || undefined,
                          isStreaming: false,
                          thinkingStreaming: false,
                          mood: event.mood ?? "neutral",
                          suggestAgent: event.suggestAgent ?? false,
                          sources: kbSources.length > 0 ? kbSources : undefined,
                        }
                      : m
                  )
                );
                break;

              case "error":
                throw new Error(event.message ?? "Stream error");
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === `assistant-${Date.now()}` || m.isStreaming
            ? {
                ...m,
                content: `Sorry, I encountered an error: ${errorMsg}. Please try again.`,
                isStreaming: false,
                thinkingStreaming: false,
                mood: "neutral",
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([WELCOME_MESSAGE]);
    setAgentRequested(false);
  };

  const handleRequestAgent = () => {
    setAgentRequested(true);
    const agentMessage: Message = {
      id: `system-${Date.now()}`,
      role: "assistant",
      content:
        "I've noted your request to speak with a human agent. In a real deployment, this would connect you to our support team. Average wait time is under 5 minutes.\n\nIn the meantime, is there anything else I can help clarify?",
      mood: "neutral",
    };
    setMessages((prev) => [...prev, agentMessage]);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground leading-tight">
                Customer Support AI
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Powered by Claude
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status indicator */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-green-700">Online</span>
            </div>

            <button
              onClick={handleReset}
              title="Start new conversation"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Agent requested banner */}
      {agentRequested && (
        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 py-2 px-4">
          <p className="text-xs text-amber-700 text-center font-medium">
            Human agent requested — connecting you to our support team...
          </p>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onRequestAgent={handleRequestAgent}
            />
          ))}

          {/* Typing indicator when loading but no streaming message yet */}
          {isLoading && !messages.some((m) => m.isStreaming) && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-t border-border">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <ChatInput
            onSend={handleSend}
            isLoading={isLoading}
          />
          <p className={cn(
            "text-center text-xs text-muted-foreground mt-2"
          )}>
            AI responses may not always be accurate. For urgent issues, contact support directly.
          </p>
        </div>
      </div>
    </div>
  );
}
