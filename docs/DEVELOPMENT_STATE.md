# DEVELOPMENT_STATE.md

> Handoff document: what is actually implemented right now, as verified against the code (not just the plan).
> Update this file at the end of every integration step.

## Last updated: 2026-09-14 — Test infrastructure complete

## Testing infrastructure (new, 2026-09-14)

Automated tests added on branch `testing/test-infrastructure`. Vitest (unit + integration) and Playwright (E2E).

**Commands:**
- `npm test` — vitest run (unit + integration)
- `npm run test:watch`, `npm run test:ui`, `npm run test:coverage`
- `npm run test:e2e` — Playwright (requires `npx playwright install` to download browsers)

**Results (as of this commit):**
- Unit + integration: **65 passed, 11 skipped** (the 11 are real-DB tests that only run when `TEST_DATABASE_URL` is set — see below), 8 test files (7 run, 1 skipped file).
- Type check (`npx tsc --noEmit`): passes (0 errors).
- Lint (`npm run lint`): 1 pre-existing error in `src/hooks/use-mobile.ts` + several pre-existing unused-var warnings — none introduced by test code.
- E2E: 36 tests collected (auth + chat-flow specs × chromium/firefox/webkit). NOT yet executed: Playwright's browser download failed in this environment (network error), and authenticated flows require GitHub OAuth which cannot run headless without a seeded test session. Documented as a known gap below.

**What's covered:**
- `tests/unit/agent/systemPrompt.test.ts` — persona selection/versioning, unknown-persona error.
- `tests/unit/agent/harness.test.ts` — UI→model message conversion, param passthrough, default factory client.
- `tests/unit/ai/factory.test.ts` — `AI_PROVIDER` env selection, unsupported-provider error.
- `tests/unit/ai/adapters/gapgpt.test.ts` — model mapping (`chat`→`glm-4-flash`), missing/invalid API key, param passthrough. Provider boundary (`ai` + `@ai-sdk/openai-compatible`) is mocked — unit/integration tests NEVER call live GapGPT.
- `tests/unit/auth/current-user.test.ts` — session resolution, `getRequiredCurrentUser` throwing on missing user.
- `tests/integration/conversations.test.ts` (24 tests) — full CRUD for `/api/conversations`: auth boundary (401), invalid-UUID validation (400), ownership enforcement (404, not 403, to avoid leaking existence), title validation incl. `null` clearing.
- `tests/integration/chat.test.ts` (13 tests) — `/api/chat`: auth boundary, request-body validation, conversation create-vs-reuse paths, user-message persistence, harness param wiring, harness-failure (500) and persist-failure (500) handling.
- `tests/integration/database.test.ts` (11 tests, real DB) — schema-level round-trips (insert/select/ownership/cascade). **Skipped unless `TEST_DATABASE_URL` is set** to an isolated (non-production) database — this env var is intentionally separate from `DATABASE_URL` so tests can never touch the deployed DB by accident. Set it in a local `.env.test` (gitignored) or shell before running.
- `e2e/auth.spec.ts`, `e2e/chat-flow.spec.ts` — Playwright specs: sign-in page, protected-route redirect, create→send→respond→reopen→rename→delete, conversation switching, sidebar search, mobile viewport. Authenticated steps call `test.skip(true, ...)` when no test credentials exist — they are scaffolding awaiting a seeded test session or a `storageState` login fixture.

**Bug found and fixed by the tests:** `PATCH /api/conversations/:id` rejected `title: null` with 400 even though it legitimately stores `null` (matches POST's behavior and the route's own `title ?? null` write). Fixed in `src/app/api/conversations/[id]/route.ts` — the only production-code change in this branch.

**Known gaps:**
1. E2E has never been executed — browsers can't be downloaded here, and no authenticated session fixture exists yet. Next step: add a Playwright `globalSetup`/storage-state login against a seeded dev account.
2. Real-DB integration tests are skipped by default (no `TEST_DATABASE_URL` provided); they exercise the same flows as the mocked tests but against Drizzle/Neon directly.
3. `/api/chat`'s stream-persistence path (`onFinish` writing the assistant message) is only verified structurally (mocked `toUIMessageStream` never invokes `onFinish`) — real coverage needs the E2E harness or a fake UI-message stream that actually calls the callback.
4. No component/UI tests (`@testing-library/react` intentionally not wired in — jsdom env exists but is unused for now; can be added later without reconfiguring).
5. Harness cancellation / mid-stream-failure persistence (Phase 5 "Harness testing") remains open — the provider boundary is mocked, so genuine stream-abort behavior isn't exercised.

## Backend (complete, verified)

- `POST /api/chat` — streaming chat; accepts optional `conversationId` in the request body; persists user + assistant messages; ownership-checked.
- `GET /api/conversations` — list current user's conversations (ordered by `updatedAt` desc). Supports `?q=` search parameter with `ilike` filtering.
- `POST /api/conversations` — create conversation, returns `{ conversation }`.
- `GET /api/conversations/:id` — returns `{ conversation, messages }`. Response includes the conversation's persisted messages (ordered by `createdAt` asc; `content` jsonb holds UIMessage `parts`).
- `DELETE /api/conversations/:id` — ownership-checked delete (wired to UI).
- `PATCH /api/conversations/:id` — ownership-checked rename (wired to UI via dropdown).
- Auth.js v5 (GitHub OAuth, database sessions), `getRequiredCurrentUser()` guard on every route.

## Frontend integration status

### Done (Phase 2.7 complete)

#### Phase 2.7 Step 1 — sidebar list + New Chat (2026-09-09)

- `AppSidebar` fetches real conversations from `GET /api/conversations` (loading skeleton / error + Retry / empty state).
- "New chat" calls `POST /api/conversations`, prepends the result, activates it.

#### Phase 2.7 Step 2 — conversation selection + chat history hydration (2026-09-09)

- `AppShell` (client component) owns `activeConversationId` — the single source of truth. Sidebar receives `activeConversationId` + `onConversationSelect`; Chat receives `conversationId`.
- Clicking a sidebar conversation → `Chat` fetches `GET /api/conversations/:id` and hydrates `useChat` via `setMessages()` (AI SDK 7: `setMessages` replaces state; `messages` init option — NOT the old `initialMessages`).
- Stale-response guard: an effect cleanup flag ignores late fetch results after a fast conversation switch; switching always resets messages first (no cross-conversation leakage).
- History has loading / empty / error+Retry states; a failed load doesn't block selecting another conversation.
- Sending a message passes `{ body: { conversationId } }` to `sendMessage` (verified: `DefaultChatTransport` merges per-request body over static body), so streams land in the selected conversation. New/unsent conversations pass no ID — `/api/chat` creates one server-side.

#### Phase 2.7 Step 3 — delete conversation (2026-09-12)

- `DELETE /api/conversations/:id` wired to dropdown action; list refreshes on success.

#### Phase 2.7 Step 4 — rename conversation (2026-09-14, commit 16d175b)

- `PATCH /api/conversations/:id` implemented with title validation.
- `ConversationActions` dropdown includes inline rename editor (`RenameMenuItem`) with Enter-to-save, Escape-to-cancel.
- `useConversations.updateConversationTitle` calls `renameConversation` API and optimistically updates local list.

#### Phase 2.7 Step 5 — search conversations (2026-09-14)

- `GET /api/conversations?q=` supports server-side `ilike` filtering on `title`.
- `ConversationSearch` input in sidebar header, debounced (300ms) via `useConversations` hook.
- Search query passed to `getConversations()` API call.

#### Phase 2.7 Step 6 — real user menu (2026-09-14)

- `UserMenu` uses `useSession()` from `next-auth/react` to display authenticated user's name, email, and avatar.
- Loading skeleton while session loads; sign-out action wired to `signOut()`.

#### Phase 2.7 Step 7 — chat header title sync (2026-09-14)

- `useActiveConversation` hook fetches conversation metadata via `getConversation()` to populate `activeConversationTitle`.
- Desktop header (in `AppShell`) and mobile header both display the active conversation's real title.
- Falls back to "New Conversation" when no conversation selected.

## Known deviations / notes

- AI SDK 7.0.93: client uses `setMessages` + per-request `body`; server uses `createUIMessageStreamResponse` (never the deprecated `toUIMessageStreamResponse`).
- DB `messages.content` is the UIMessage `parts` array, not plain text — hydration maps rows to `{ id, role, parts }`.
- Rows with role `tool` are skipped during hydration (no top-level UIMessage equivalent in v7); none exist today.
- `lib/` at root contains server-side domain code (agent, ai, auth, db). `src/lib/` is only for frontend utilities (`utils.ts`).
- The `lib/agent/` folder is framework-agnostic — no Next.js imports allowed.
- Provider abstraction: `lib/ai/factory.ts` resolves `AI_PROVIDER=gapgpt` → `GapGPTAIClient`; logical model `chat` maps to `glm-4-flash`.

## Next task

Phase 2.7 is complete. The application is a working, multi-user chat product with:
- Real authentication (GitHub OAuth)
- Real conversation persistence (CRUD)
- Real message history hydration
- Search, rename, delete all functional
- Real user session data in UI

**Next milestone: Phase 3 — Production identity & authorization (already mostly complete in practice)** or **Phase 4 — Harness upgrade (tool calling)**.

Per ROADMAP.md, Phase 3 authorization concerns are already addressed in the current implementation. The logical next step is Phase 4 (tool calling) once the human confirms readiness to move on.