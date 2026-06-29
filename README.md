<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&height=200&color=0:0d47a1,50:7e22ce,100:ff006e&text=Customer%20Support%20Agent&fontSize=42&fontColor=ffffff&animation=fadeIn&desc=Claude%20%C2%B7%20Next.js%2014%20%C2%B7%20Streaming%20RAG&descAlignY=80&descSize=16" width="100%" alt="banner"/>
</div>

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Anthropic](https://img.shields.io/badge/Claude_Sonnet_4.6-D97757?style=for-the-badge&logo=anthropic&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-00ff41?style=for-the-badge)

</div>

A streaming customer-support chat built with **Next.js 14** and **Claude Sonnet 4.6** — RAG over a 10-article knowledge base, mood-aware UI, extended-thinking blocks, and ephemeral prompt caching.

## ✨ Features

- 🌊 **Real-time streaming** — Claude responses over Server-Sent Events
- 🔎 **RAG knowledge base** — keyword search across 10 support articles, cited inline as source chips
- 😀 **Mood detection** — every reply classified `frustrated` / `neutral` / `happy`, surfaced as an emoji badge
- 🚨 **Auto-escalation banner** — when frustration looks unresolved, prompts the user to talk to a human
- 🧠 **Extended thinking** — Claude's reasoning streamed live into a collapsible panel
- 💸 **Prompt caching** — system prompt + KB context flagged `cache_control: ephemeral` to cut input cost
- 🎨 **Polished Tailwind UI** — dark-mode CSS vars, custom animations, auto-resize textarea

## 🏗️ Architecture

```mermaid
flowchart LR
    U[User] -->|message| UI[Next.js Chat UI]
    UI -->|POST /api/chat| API[API Route]
    API -->|keyword search| KB[(knowledge-base.json<br/>10 articles)]
    KB -->|top-K articles| API
    API -->|stream w/ ephemeral cache| C[Claude Sonnet 4.6]
    C -->|SSE: thinking + text + mood| UI
    UI -->|render| U
```

## 🚀 Quick start

```bash
git clone https://github.com/Dhanush-Aries/customer-support-agent.git
cd customer-support-agent
npm install

cp .env.example .env.local            # then add ANTHROPIC_API_KEY
npm run dev                           # http://localhost:3000
```

## 🛠️ Tech stack

**Next.js 14** (App Router) · **@anthropic-ai/sdk** with streaming + extended thinking · **Tailwind CSS** + Radix UI · **TypeScript**

## ⚙️ Environment

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Get it at [console.anthropic.com](https://console.anthropic.com) |

## 📂 Project structure

```
├── app/
│   ├── api/chat/route.ts   # Streaming API route (Claude + RAG)
│   ├── page.tsx            # Main chat UI page
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Tailwind base + CSS variables
├── components/
│   ├── ChatMessage.tsx     # Message bubble with mood / thinking / citations
│   └── ChatInput.tsx       # Auto-resize textarea + send
├── data/
│   └── knowledge-base.json # 10 support articles (account, billing, security, …)
└── lib/
    ├── rag.ts              # Keyword search over the KB
    └── utils.ts            # Tailwind class merge
```

## 📚 Knowledge base topics

Password reset · Cancellation & refunds · Slow-performance troubleshooting · Subscription upgrades · 2FA · Data export & account deletion · API access · Team management · Mobile app issues · Contacting support

## 📜 License

MIT — see [LICENSE](./LICENSE)

---

<sub>Part of the <a href="https://github.com/Dhanush-Aries">Dhanush Shankar</a> AI engineering portfolio.</sub>
