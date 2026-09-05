# ROADMAP.md

Each phase has a learning goal, not just a feature goal. Don't skip ahead — each phase is designed to teach specific full-stack concepts before the next one adds complexity on top.

## Phase 0 — Environment & scaffolding
**Learning goal:** get comfortable with the Next.js 16 App Router project shape and tooling before any "real" logic exists.
- Scaffold Next.js 16.3 app (TypeScript, Tailwind, App Router)
- Install shadcn/ui, set up base layout
- Set up ESLint/Prettier, git repo, `.env.local` convention
- Get a "Hello World" page deployed to Vercel
- **Done when:** empty app is live on a Vercel URL, repo structure matches CLAUDE.md

## Phase 1 — MVP chat (no auth, no DB)
**Learning goal:** understand server-side streaming and where the "harness" boundary lives.
- Build `/lib/agent/systemPrompt.ts` with your first real custom system prompt
- Build `/lib/agent/harness.ts` — single-turn call to OpenRouter via `@openrouter/ai-sdk-provider`, streamed. Pick a default model (e.g. `anthropic/claude-sonnet-4.5`) but read it from `OPENROUTER_MODEL` so it's swappable without a code change
- Build `POST /api/chat` Route Handler that calls the harness and streams back
- Build chat UI using `useChat` from `@ai-sdk/react`
- Conversation history lives only in browser memory (lost on refresh) — that's fine for this phase
- **Done when:** you can have a full streaming conversation with your own system prompt, end to end, with nothing persisted

## Phase 2 — Persistence (Database)
**Learning goal:** relational data modeling, migrations, querying from a server.
- Set up Neon Postgres + Drizzle
- Implement `users` (stubbed, no real auth yet — one hardcoded dev user), `conversations`, `messages` tables
- Wire `/api/chat` to persist every message
- Build `/api/conversations` CRUD endpoints
- Update UI: conversation sidebar, ability to reopen past chats
- **Done when:** refreshing the browser doesn't lose your chat history

## Phase 3 — Auth (multi-user)
**Learning goal:** sessions, cookies, protecting routes/data by user.
- Add Auth.js (start with a single OAuth provider, e.g. GitHub login, to avoid building password flows from scratch)
- Scope all DB queries to `session.user_id`
- Protect `/api/*` routes — reject unauthenticated requests
- **Done when:** two different logged-in users have fully separate, isolated conversation histories

## Phase 4 — Harness upgrade (the interesting part)
**Learning goal:** agent orchestration — the actual "harness" concept.
- Add tool-calling support to `harness.ts` (start with one trivial tool, e.g. a calculator or a fake weather lookup)
- Support multiple system-prompt "personas" a user can pick per conversation
- Add prompt versioning (store which system_prompt_version each conversation used)
- **Done when:** the model can call at least one real tool mid-conversation and use the result in its reply

## Phase 5 — Polish & deploy for real
**Learning goal:** the unglamorous stuff that makes a side project feel like a real product.
- Rate limiting per user (avoid API cost blowups)
- Error handling/UX for API failures, dropped streams, retries
- Loading states, empty states, mobile-responsive polish
- Basic observability (log errors, maybe a simple usage dashboard)
- Production deploy checklist, custom domain if desired
- **Done when:** you'd be comfortable sending the link to someone else to actually use

---

## Suggested pace
This is a learning project — there's no deadline pressure here. A reasonable cadence is one phase every 1-2 weeks depending on available time, with Phase 4 likely taking longest since it's conceptually the newest territory (agent/tool-calling design).

## After Phase 5 (optional stretch goals, not scoped yet)
- Extract `/lib/agent` into a standalone backend service (tests the ADR-001 decision)
- File/image upload support in chat
- Since OpenRouter already gives multi-model access, experiment with letting users pick a model per conversation in the UI (not just via env var) — a small feature with real UX design decisions behind it
- Usage-based billing / API key management for other users
