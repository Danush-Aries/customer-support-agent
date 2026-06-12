import Anthropic from "@anthropic-ai/sdk";
import { searchKnowledgeBase } from "@/lib/rag";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-6";

// Stable system prompt — cached on the API side for repeated requests
const SYSTEM_PROMPT = `You are a helpful, empathetic customer support agent for a SaaS company. Your job is to:

1. Understand the customer's issue clearly
2. Provide accurate, actionable solutions based on the knowledge base provided
3. Always be polite and professional, even when customers are frustrated
4. If you can't resolve an issue from the knowledge base, acknowledge it and suggest escalation

When relevant knowledge base articles are provided in the context, use them as your primary source of truth and cite the article IDs (e.g., [kb-001]) when referencing them.

IMPORTANT: At the end of every response, you MUST output a special metadata line in this exact JSON format on its own line:
METADATA: {"mood": "MOOD", "sources": ["id1", "id2"], "suggestAgent": BOOL}

Where:
- mood: Detected customer mood — must be exactly one of: "frustrated", "neutral", or "happy"
  - frustrated: customer uses angry language, exclamation marks, words like "terrible", "worst", "broken", "useless", "disgusted", "hate", "absurd", "ridiculous", "unacceptable", "fix this now"
  - happy: customer uses positive language, thanks, compliments
  - neutral: everything else
- sources: array of knowledge base article IDs you referenced (empty array [] if none)
- suggestAgent: true if the customer seems very frustrated (frustrated mood AND the issue seems unresolved), false otherwise

Example:
METADATA: {"mood": "frustrated", "sources": ["kb-002", "kb-004"], "suggestAgent": true}`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get the latest user message for RAG search
    const lastUserMsg = [...messages]
      .reverse()
      .find((m: Anthropic.MessageParam) => m.role === "user");
    const userQuery =
      typeof lastUserMsg?.content === "string"
        ? lastUserMsg.content
        : Array.isArray(lastUserMsg?.content)
        ? lastUserMsg.content
            .filter((b: Anthropic.ContentBlockParam) => b.type === "text")
            .map((b: Anthropic.TextBlockParam) => b.text)
            .join(" ")
        : "";

    // RAG: find relevant knowledge base articles
    const { articles, contextText } = searchKnowledgeBase(userQuery, 3);

    // Build system text with optional KB context injection
    const systemText = articles.length > 0
      ? `${SYSTEM_PROMPT}\n\n<knowledge_base>\n${contextText}\n</knowledge_base>`
      : SYSTEM_PROMPT;

    // Encode the stream using ReadableStream + TextEncoder
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send KB sources metadata immediately so the client can show citations
          const sourcesEvent = JSON.stringify({
            type: "kb_sources",
            sources: articles.map((a) => ({
              id: a.id,
              title: a.title,
              category: a.category,
            })),
          });
          controller.enqueue(
            encoder.encode(`data: ${sourcesEvent}\n\n`)
          );

          // Stream the response from Claude
          const stream = client.messages.stream({
            model: MODEL,
            max_tokens: 64000,
            thinking: { type: "adaptive" },
            system: [
              {
                type: "text",
                text: systemText,
                // Cache the system prompt + KB context — stable across same-query turns
                cache_control: { type: "ephemeral" },
              },
            ],
            messages: messages as Anthropic.MessageParam[],
          });

          let thinkingBuffer = "";
          let textBuffer = "";
          let currentBlockType: string | null = null;

          for await (const event of stream) {
            if (event.type === "content_block_start") {
              currentBlockType = event.content_block.type;
              if (currentBlockType === "thinking") {
                const e = JSON.stringify({ type: "thinking_start" });
                controller.enqueue(encoder.encode(`data: ${e}\n\n`));
              } else if (currentBlockType === "text") {
                const e = JSON.stringify({ type: "text_start" });
                controller.enqueue(encoder.encode(`data: ${e}\n\n`));
              }
            } else if (event.type === "content_block_delta") {
              if (
                event.delta.type === "thinking_delta" &&
                event.delta.thinking
              ) {
                thinkingBuffer += event.delta.thinking;
                const e = JSON.stringify({
                  type: "thinking_delta",
                  delta: event.delta.thinking,
                });
                controller.enqueue(encoder.encode(`data: ${e}\n\n`));
              } else if (
                event.delta.type === "text_delta" &&
                event.delta.text
              ) {
                textBuffer += event.delta.text;
                const e = JSON.stringify({
                  type: "text_delta",
                  delta: event.delta.text,
                });
                controller.enqueue(encoder.encode(`data: ${e}\n\n`));
              }
            } else if (event.type === "content_block_stop") {
              if (currentBlockType === "thinking") {
                const e = JSON.stringify({ type: "thinking_stop" });
                controller.enqueue(encoder.encode(`data: ${e}\n\n`));
              }
              currentBlockType = null;
            } else if (event.type === "message_stop") {
              // Parse the METADATA line from the complete text
              const metadataMatch = textBuffer.match(
                /METADATA:\s*(\{[^}]+\})/
              );
              let mood: string = "neutral";
              let suggestAgent: boolean = false;
              let parsedSources: string[] = [];

              if (metadataMatch) {
                try {
                  const meta = JSON.parse(metadataMatch[1]);
                  mood = meta.mood ?? "neutral";
                  suggestAgent = meta.suggestAgent ?? false;
                  parsedSources = meta.sources ?? [];
                } catch {
                  // Ignore parse failures — defaults stand
                }
              }

              const doneEvent = JSON.stringify({
                type: "done",
                mood,
                suggestAgent,
                sources: parsedSources,
              });
              controller.enqueue(encoder.encode(`data: ${doneEvent}\n\n`));
            }
          }

          controller.close();
        } catch (err) {
          const errMsg =
            err instanceof Anthropic.APIError
              ? err.message
              : "An error occurred while calling the Claude API";
          const errEvent = JSON.stringify({ type: "error", message: errMsg });
          controller.enqueue(encoder.encode(`data: ${errEvent}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat route error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
