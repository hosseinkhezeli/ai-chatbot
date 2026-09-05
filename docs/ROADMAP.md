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
- [x] Build `/lib/agent/systemPrompt.ts` with your first real custom system prompt — Tutor persona, v1, hard-throws on unknown `personaId`
- [x] Build `/lib/agent/harness.ts` — single-turn call to OpenRouter via `@openrouter/ai-sdk-provider`, streamed. Reads `OPENROUTER_MODEL` (default `anthropic/claude-haiku-4.5`). Capped at `maxTokens: 1024`. Owns the orchestration loop rather than using the SDK's `ToolLoopAgent` — see ADR-006.
- [x] Build `POST /api/chat` Route Handler that calls the harness and streams back — `src/app/api/chat/route.ts`. Manual curl tests: 3/3 passing (invalid JSON → 400, missing/malformed `messages` → 400, valid request → 200 + `Transfer-Encoding: chunked`).
- [ ] Build chat UI using `useChat` from `@ai-sdk/react`
- Conversation history lives only in browser memory (lost on refresh) — that's fine for this phase
- **Done when:** you can have a full streaming conversation with your own system prompt, end to end, with nothing persisted

**Phase 1 status (2026-09-05):** harness and route handler are proven end-to-end **only** via the free-tier model `minimax/minimax-m3:free` (uncommented temporarily in `.env.local` for the curl test, then re-commented). The paid default `anthropic/claude-haiku-4.5` is the documented real default in `docs/ARCHITECTURE.md` and `.env.local` notes, but is currently blocked on the OpenRouter account being out of credits — no real-network round-trip has been observed against it. Two harness behaviors are still unverified against a real streaming response: (1) `cancel()` reaching a live upstream request (only proven via stub test), and (2) `maxTokens: 1024` cap behavior against a response longer than 1024 tokens (no such response has been observed yet). Both are tracked in the `harness.ts` TODO comment and slated for Phase 5's real test coverage.

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
- **Real test coverage for the harness.** Phase 1 shipped with a stub-only test surface: pump loop, cancel propagation, and error surfacing are covered against a fake `streamText`, but `cancel()` against a real live stream and `maxTokens` cap behavior against a long response have not been observed end-to-end. Phase 5 should adopt a real test runner and close those gaps — the harness `TODO` comment tracks what's outstanding.
- **Done when:** you'd be comfortable sending the link to someone else to actually use

---

## Suggested pace
This is a learning project — there's no deadline pressure here. A reasonable cadence is one phase every 1-2 weeks depending on available time, with Phase 4 likely taking longest since it's conceptually the newest territory (agent/tool-calling design).

## After Phase 5 (optional stretch goals, not scoped yet)
- Extract `/lib/agent` into a standalone backend service (tests the ADR-001 decision)
- File/image upload support in chat
- Since OpenRouter already gives multi-model access, experiment with letting users pick a model per conversation in the UI (not just via env var) — a small feature with real UX design decisions behind it
- Usage-based billing / API key management for other users
