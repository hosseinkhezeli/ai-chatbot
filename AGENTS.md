<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


# CLAUDE.md — Project Operating Instructions

> This file is read by Claude Code (or any AI coding agent) at the start of every session in this repo.
> It is the constitution for how work gets done here. If something in a prompt conflicts with this file, this file wins.

## 1. What this project is

A self-hosted chat interface — functionally similar to claude.ai — that lets users talk to an LLM running **our own system prompt and agent harness**, not a vendor's default assistant. We control:
- The system prompt(s) / personas
- The tool-calling loop ("harness") the model runs inside
- The conversation storage, auth, and UX around it

The LLM provider (Anthropic API) is a swappable backend dependency, not the product. The product is the harness + UX around it.

## 2. Who's building this and why

Built by one engineer (frontend-strong, backend-learning) using Claude Code as a pair programmer, explicitly as a **learning project** to become full-stack. This changes how Claude Code should behave here:

- **Prefer teaching over silently fixing.** When implementing backend/DB code, briefly explain the *why*, not just the *what*, in commit messages or inline comments — especially for anything non-obvious (SQL joins, auth flows, streaming mechanics).
- **Don't silently introduce new architecture.** If a task seems to need a new pattern, library, or structural change not already described in `docs/ARCHITECTURE.md`, stop and flag it for discussion before implementing.
- **Small, reviewable steps over big-bang changes.** One logical change per commit. The human wants to read every diff and understand it.

## 3. Tech stack (locked decisions — see docs/ARCHITECTURE.md for rationale)

- **Frontend:** Next.js 16.3 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Vercel AI SDK (`ai` + `@ai-sdk/react`)
- **Backend:** Next.js Route Handlers (`app/api/**`), TypeScript, Node runtime (not Edge, for Phase 1+)
- **Harness/Agent logic:** isolated in `/lib/agent/**` — framework-agnostic, no Next.js imports allowed in this folder
- **LLM Provider:** OpenRouter (via `@openrouter/ai-sdk-provider`), streaming — model-agnostic; default model set via env var, swappable without code changes
- **Database:** PostgreSQL (Neon), Drizzle ORM
- **Auth:** Auth.js (NextAuth v5)
- **Deployment:** Vercel (app) + Neon (DB)

Do not swap any of these without updating `docs/ARCHITECTURE.md` and getting explicit sign-off — this is a learning project, and stack-hopping mid-project defeats the purpose.

## 4. Repo structure (target shape)

```
/app
  /api
    /chat/route.ts          # streaming chat endpoint
    /conversations/...      # CRUD for saved conversations
    /auth/...               # Auth.js routes
  /(chat)/...               # chat UI routes
/lib
  /agent
    systemPrompt.ts         # our custom system prompt, versioned
    harness.ts              # tool-calling loop, orchestration
    tools/                  # individual tool implementations
  /db
    schema.ts               # Drizzle schema
    client.ts
/components                 # UI components (shadcn-based)
/docs
  ARCHITECTURE.md
  ROADMAP.md
```

## 5. Non-negotiable rules

1. **The OpenRouter API key never touches the client.** All LLM calls happen in Route Handlers / server-only code. No exceptions, no "just for testing."
2. **The system prompt is never exposed to the frontend.** It's assembled server-side inside `/lib/agent`.
3. **No `localStorage`/`sessionStorage` for anything security-sensitive.** Session state goes through Auth.js.
4. **Every DB migration must be reviewed before running against a shared/deployed DB.** Local dev migrations are fine to iterate on freely.
5. **No new dependency without a one-line justification** in the PR/commit description — this keeps the human aware of what's growing in `package.json` and why.

## 6. Definition of done (per task)

A task is done when:
- [ ] It matches the current roadmap phase's scope (see `docs/ROADMAP.md`) — no scope creep into future phases
- [ ] Types are correct, no `any` without a comment explaining why
- [ ] The human has been told **what changed and why**, in plain language, not just a diff
- [ ] If it touches the harness or DB schema, `docs/ARCHITECTURE.md` is updated in the same change

## 7. How Claude Code should check in

At the start of any non-trivial task: state a short plan (2-5 bullets) before writing code, and wait for confirmation if the task is ambiguous or spans multiple roadmap phases. This is a deliberate "learning pace" choice — velocity is not the goal, understanding is.

