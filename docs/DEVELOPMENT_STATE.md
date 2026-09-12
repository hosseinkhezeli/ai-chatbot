# DEVELOPMENT_STATE.md

> Handoff document: what is actually implemented right now, as verified against the code (not just the plan).
> Update this file at the end of every integration step.

## Last updated: 2026-09-09 — Phase 2.7 Step 2 complete

## Backend (complete, verified)

- `POST /api/chat` — streaming chat; accepts optional `conversationId` in the request body; persists user + assistant messages; ownership-checked.
- `GET /api/conversations` — list current user's conversations (ordered by `updatedAt` desc).
- `POST /api/conversations` — create conversation, returns `{ conversation }`.
- `GET /api/conversations/:id` — returns `{ conversation, messages }`. As of Step 2, the response includes the conversation's persisted messages (ordered by `createdAt` asc; `content` jsonb holds UIMessage `parts`).
- `DELETE /api/conversations/:id` — ownership-checked delete (not yet wired to the UI).
- Auth.js v5 (GitHub OAuth, database sessions), `getRequiredCurrentUser()` guard on every route.

## Frontend integration status

### Done

**Phase 2.7 Step 1 — sidebar list + New Chat (2026-09-09)**
- `AppSidebar` fetches real conversations from `GET /api/conversations` (loading skeleton / error + Retry / empty state).
- "New chat" calls `POST /api/conversations`, prepends the result, activates it.

**Phase 2.7 Step 2 — conversation selection + chat history hydration (2026-09-09)**
- `AppShell` (client component) owns `activeConversationId` — the single source of truth. Sidebar receives `activeConversationId` + `onConversationSelect`; Chat receives `conversationId`.
- Clicking a sidebar conversation → `Chat` fetches `GET /api/conversations/:id` and hydrates `useChat` via `setMessages()` (AI SDK 7: `setMessages` replaces state; `messages` init option — NOT the old `initialMessages`).
- Stale-response guard: an effect cleanup flag ignores late fetch results after a fast conversation switch; switching always resets messages first (no cross-conversation leakage).
- History has loading / empty / error+Retry states; a failed load doesn't block selecting another conversation.
- Sending a message passes `{ body: { conversationId } }` to `sendMessage` (verified: `DefaultChatTransport` merges per-request body over static body), so streams land in the selected conversation. New/unsent conversations pass no ID — `/api/chat` creates one server-side.

### Not done (remaining Phase 2.7 work)

- ✅ Delete conversation in UI (endpoint exists) — **completed 2026-09-12**
- Rename conversation (needs `PATCH /api/conversations/:id`).
- Search input wiring (needs search param on `GET /api/conversations`).
- User menu still static "Jane Doe" (needs real Auth.js session data).
- Chat header / mobile header still shows a hardcoded "New Conversation" label.

## Known deviations / notes

- AI SDK 7.0.93: client uses `setMessages` + per-request `body`; server uses `createUIMessageStreamResponse` (never the deprecated `toUIMessageStreamResponse`).
- DB `messages.content` is the UIMessage `parts` array, not plain text — hydration maps rows to `{ id, role, parts }`.
- Rows with role `tool` are skipped during hydration (no top-level UIMessage equivalent in v7); none exist today.

## Next task

Phase 2.7 Step 4 — add `PATCH /api/conversations/:id` for rename, wire the dropdown item. Then search, then real user menu.
