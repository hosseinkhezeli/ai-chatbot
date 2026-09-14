# DEVELOPMENT_STATE.md

> Handoff document: what is actually implemented right now, as verified against the code (not just the plan).
> Update this file at the end of every integration step.

## Last updated: 2026-09-14 — Phase 2.7 complete

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