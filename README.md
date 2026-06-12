# Customer Support AI Agent

An AI-powered customer support chat application built with Next.js, Claude API (claude-sonnet-4-6), RAG knowledge base, real-time streaming, mood detection, and human escalation suggestions.

## Features

- **Real-time streaming** responses from Claude via SSE
- **RAG (Retrieval-Augmented Generation)** — keyword search over a 10-article knowledge base surfaces relevant articles before each Claude call
- **Mood detection** — Claude classifies each response as `frustrated`, `neutral`, or `happy` and surfaces an emoji badge
- **Escalation suggestions** — when a customer appears frustrated and unresolved, a banner prompts them to connect with a human agent
- **Extended thinking** — adaptive thinking blocks are streamed and shown in a collapsible "Reasoning process" panel
- **Prompt caching** — the system prompt + injected KB context is cached with `cache_control: ephemeral` for reduced latency and cost
- **Knowledge base citations** — articles used to answer a query are shown as inline source chips
- **Clean Tailwind UI** with dark-mode CSS variables, custom animations, and auto-resize textarea

## Tech Stack

- **Next.js 14** (App Router)
- **@anthropic-ai/sdk** with streaming + extended thinking
- **Tailwind CSS** + Radix UI primitives
- **TypeScript**

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/Dhanush-Aries/customer-support-agent.git
cd customer-support-agent
npm install
```

### 2. Set your API key

```bash
cp .env.example .env.local
# Edit .env.local and add your Anthropic API key
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key from [console.anthropic.com](https://console.anthropic.com) |

## Project Structure

```
├── app/
│   ├── api/chat/route.ts   # Streaming API route (Claude + RAG)
│   ├── page.tsx            # Main chat UI page
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Tailwind base styles + CSS variables
├── components/
│   ├── ChatMessage.tsx     # Message bubble with mood, thinking, citations
│   └── ChatInput.tsx       # Auto-resize textarea with send button
├── data/
│   └── knowledge-base.json # 10 support articles (account, billing, technical, security)
└── lib/
    ├── rag.ts              # Keyword-based search over the knowledge base
    └── utils.ts            # Tailwind class merge utility
```

## Knowledge Base Topics

The built-in knowledge base covers:

- Password reset
- Cancellation and refund policy
- Slow performance troubleshooting
- Subscription upgrades
- Two-factor authentication
- Data export and account deletion
- API access and integrations
- Team management and permissions
- Mobile app troubleshooting
- Contacting support and escalation

## License

MIT
