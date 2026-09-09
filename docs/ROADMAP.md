# ROADMAP.md

Each phase has a learning goal, not just a feature goal. Don't skip ahead — each phase is designed to teach specific full-stack concepts before the next one adds complexity on top of it.

---

## Phase 0 — Environment & scaffolding

**Learning goal:** get comfortable with the Next.js 16 App Router project shape and tooling before any "real" logic exists.

* Scaffold Next.js 16 app (TypeScript, Tailwind, App Router)
* Install shadcn/ui and set up the base layout
* Set up ESLint/Prettier, git repo, and `.env.local` convention
* Get a basic page deployed to Vercel
* **Done when:** the app is live and the repository structure matches CLAUDE.md

**Status: COMPLETE**

---

# Phase 1 — MVP chat

**Learning goal:** understand the request → harness → model → stream lifecycle.

* [x] Build `/lib/agent/systemPrompt.ts` with the Tutor persona, v1
* [x] Build `/lib/agent/harness.ts`
* [x] Build `POST /api/chat`
* [x] Build a simple chat UI using `useChat`
* [x] Establish the AI provider abstraction
* [x] Implement the active GapGPT provider adapter
* [x] Keep provider selection behind the AI client/factory boundary
* [x] Separate application-level model IDs from provider-specific model IDs
* [x] Verify real streaming responses end to end
* [ ] Real upstream cancellation test
* [ ] Real `maxOutputTokens` limit test

**Current implementation:**

```text
src/app
   ↓
/api/chat
   ↓
lib/agent/harness
   ↓
lib/ai
   ↓
GapGPT adapter
   ↓
GapGPT
```

The UI is intentionally simple. It exists to exercise the backend rather than serve as the final product UI.

**Important constraint:**

Do not add additional AI providers until the application actually needs them.

Unused adapters are not progress.

**Status: COMPLETE**

---

# Phase 2 — Identity, sessions & persistence

**Learning goal:** understand how a real multi-user application connects authentication, sessions, relational data, and server-side authorization.

This is now the **main development phase**.

## 2.1 Database foundation

* [x] Set up Neon Postgres
* [x] Set up Drizzle
* [x] Create database client
* [x] Configure migrations
* [x] Create `users` table
* [x] Create `conversations` table
* [x] Create `messages` table
* [x] Add foreign keys, cascades, and indexes
* [x] Verify migrations are synchronized

**Status: COMPLETE**

---

## 2.2 Authentication

* [x] Choose and install the authentication solution (Auth.js v5)
* [x] Implement login (GitHub OAuth)
* [x] Implement logout
* [x] Establish the server-side session (database strategy)
* [x] Determine the authenticated user for every request (`getCurrentUser()`)
* [x] Persist users in the database (Auth.js adapter)
* [x] Remove the temporary hardcoded development user

**Learning goal:** understand authentication vs. authorization vs. sessions.

**Status: COMPLETE**

---

## 2.3 Session management

* [x] Create the session model/storage required by the authentication system (Auth.js standard tables)
* [x] Handle session creation (Auth.js)
* [x] Handle session expiration (Auth.js)
* [x] Handle session invalidation/logout (Auth.js)
* [x] Create a server-side `getCurrentUser()` / `getSession()` boundary (`lib/auth/current-user.ts`)
* [x] Ensure API routes can reliably identify the current user (all routes use `getRequiredCurrentUser()`)

**Learning goal:** understand how browser credentials become trusted server-side identity.

**Status: COMPLETE**

---

## 2.4 Conversation persistence

* [x] Create a conversation when a new chat begins (in `/api/chat` and `POST /api/conversations`)
* [x] Associate every conversation with `user_id`
* [x] Persist conversation title/metadata
* [x] Return the conversation ID to the client
* [x] Load an existing conversation (`GET /api/conversations/:id`)
* [x] Prevent one user from accessing another user's conversation (ownership checks)

**Learning goal:** relational ownership and authorization.

**Status: COMPLETE**

---

## 2.5 Message persistence

Update `POST /api/chat` so the lifecycle becomes:

```text
request
  ↓
authenticate user
  ↓
resolve/create conversation
  ↓
persist user message
  ↓
run harness
  ↓
stream assistant response
  ↓
persist assistant message
  ↓
complete response
```

Tasks:

* [x] Persist the user message before generation
* [x] Stream the assistant response
* [x] Accumulate the assistant text
* [x] Persist the assistant message after successful completion
* [x] Handle failed/interrupted generations correctly (check `isAborted` and `finishReason`)
* [x] Decide how incomplete assistant messages are represented (not persisted on failure)
* [x] Preserve message ordering (createdAt index)
* [x] Associate every message with the correct conversation

**Learning goal:** understand database writes around long-running streaming requests.

**Status: COMPLETE**

---

## 2.6 Conversation API

Create:

```text
/api/conversations
/api/conversations/:id
```

Tasks:

* [x] `GET /api/conversations` — list current user's conversations
* [x] `POST /api/conversations` — create conversation
* [x] `GET /api/conversations/:id` — fetch conversation + messages
* [x] `DELETE /api/conversations/:id` — delete conversation
* [x] Validate IDs
* [x] Scope every query to the authenticated user

**Learning goal:** server-side CRUD and authorization boundaries.

**Status: COMPLETE**

---

## 2.7 Chat UI connected to persistence

The current UI is intentionally minimal. The backend is fully implemented — now connect the frontend to it.

| UI Element | Current State | Work Needed |
|------------|---------------|-------------|
| Conversation list (sidebar) | Mock data (`MOCK_HISTORY`) | Replace with `GET /api/conversations` |
| New Chat button | Mock button (no action) | Call `POST /api/conversations`, navigate |
| Conversation selection | Static highlight only | Fetch `GET /api/conversations/:id`, load messages |
| Conversation delete | Dropdown item only | Call `DELETE /api/conversations/:id` |
| Conversation rename | Dropdown item only | Add `PATCH /api/conversations/:id` + UI |
| Search input | Static input | Add search param to `GET /api/conversations` + debounce |
| User menu | Static "Jane Doe" | Use real session data from Auth.js |
| Load existing messages | Not implemented | Hydrate `useChat` with initial messages |

**Tasks:**

* [ ] Fetch and display conversation list in sidebar from `GET /api/conversations`
* [ ] Wire New Chat button → `POST /api/conversations` → navigate to new conversation
* [ ] Click conversation in sidebar → load messages via `GET /api/conversations/:id` → hydrate chat
* [ ] Delete conversation → `DELETE /api/conversations/:id` → refresh list
* [ ] Add `PATCH /api/conversations/:id` for rename → wire dropdown item
* [ ] Add search/filter to `GET /api/conversations` → wire search input with debounce
* [ ] Replace static user menu with real session data (use `useSession` from Auth.js)
* [ ] Hydrate `useChat` with existing messages when opening a conversation
* [ ] Handle empty state (no conversations) → show "New Chat" prompt

**Done when:**

> A logged-in user can close the browser, return later, reopen a conversation, and see the complete message history. The sidebar shows their real conversations and all CRUD operations work.

---

# Phase 3 — Production identity & authorization

**Learning goal:** move from "authentication works" to "authorization is correct."

* [ ] Protect `/api/chat` (✅ already done via `getRequiredCurrentUser`)
* [ ] Protect `/api/conversations` (✅ already done)
* [ ] Reject unauthenticated requests (✅ already done)
* [ ] Scope all database queries to `session.user_id` (✅ already done)
* [ ] Verify conversation ownership before reading (✅ already done)
* [ ] Verify conversation ownership before writing (✅ already done)
* [ ] Verify conversation ownership before deleting (✅ already done)
* [ ] Handle unauthorized access consistently (✅ returns 401/404)
* [ ] Remove all development-user assumptions (✅ no hardcoded user)

**Status: MOSTLY COMPLETE** — Phase 3 authorization concerns are already addressed in the current implementation. Remaining work is mostly Phase 2.7 (UI integration).

---

# Phase 4 — Harness upgrade

**Learning goal:** understand what an actual agent harness is beyond a single model call.

Only start this phase after authentication and persistence are solid (including UI integration).

## 4.1 Tool calling

* [ ] Add one simple tool
* [ ] Define the tool schema
* [ ] Allow the model to call the tool
* [ ] Feed tool results back into the model
* [ ] Persist tool activity where appropriate
* [ ] Handle tool failures

Example:

```text
user
 ↓
model
 ↓
tool
 ↓
tool result
 ↓
model
 ↓
final response
```

---

## 4.2 Multiple personas

* [ ] Allow multiple system-prompt personas
* [ ] Store the selected persona on the conversation
* [ ] Validate persona IDs
* [ ] Load the correct system prompt when generating
* [ ] Preserve the persona used by historical conversations

---

## 4.3 Prompt versioning

* [ ] Store `system_prompt_version` on the conversation (already in schema)
* [ ] Store/resolve the correct prompt version
* [ ] Keep historical conversations reproducible
* [ ] Handle prompt migrations intentionally

**Done when:**

> The model can call at least one real tool and the conversation stores enough metadata to explain how the response was generated.

---

# Phase 5 — Reliability & production polish

**Learning goal:** understand the operational concerns that turn a working side project into a usable product.

* [ ] Rate limiting
* [ ] Request size limits
* [ ] Better validation with Zod
* [ ] Provider/API error handling
* [ ] Stream interruption handling
* [ ] Retry strategy
* [ ] Stop-generation UX
* [ ] Loading states
* [ ] Empty states
* [ ] Mobile responsiveness
* [ ] Basic observability
* [ ] Error logging
* [ ] Usage/token tracking
* [ ] Production deployment checklist

### Harness testing

Close the currently known test gaps:

* [ ] Test cancellation against a real streaming request
* [ ] Test output-token limits against a sufficiently long response
* [ ] Test provider failures
* [ ] Test interrupted streams
* [ ] Test persistence when streaming fails halfway through

**Done when:**

> You'd be comfortable giving the application to another person.

---

# Phase 6 — Advanced AI infrastructure

**Learning goal:** understand provider abstraction as a production infrastructure concern rather than an architectural exercise.

Only introduce these when there is an actual reason.

* [ ] Add a second provider
* [ ] Provider failover
* [ ] Provider/model routing
* [ ] Cost-aware model selection
* [ ] Latency-aware routing
* [ ] Provider health tracking
* [ ] Per-request model selection
* [ ] Model selection in the UI

The existing adapter architecture should make this possible without changing the harness.

**Important:** do not implement multiple unused providers just to demonstrate the pattern.

---

# Phase 7 — Optional product features

These are intentionally outside the core learning path.

* [ ] File/image attachments
* [ ] Image understanding
* [ ] Model picker
* [ ] Conversation search
* [ ] Conversation rename
* [ ] Conversation archive
* [ ] Message reactions
* [ ] Markdown/code rendering improvements
* [ ] Usage dashboard
* [ ] User settings
* [ ] Usage-based billing
* [ ] API key management

---

# Suggested pace

This is a learning project — there is no deadline pressure.

The priority is now:

```text
Phase 1 ✅
   ↓
Phase 2 (2.1-2.6) ✅
   ↓
Phase 2.7 ← CURRENT: Connect UI to real backend
   ↓
Phase 3 ✅ (mostly covered)
   ↓
Phase 4
   ↓
Phase 5
   ↓
Phase 6+
```

Do not build advanced agent features before the application has reliable identity, persistence, **and a working UI connected to it**.

---

# Current project status

```text
✅ Next.js / App Router
✅ TypeScript
✅ Tailwind
✅ shadcn/ui
✅ Simple chat UI
✅ Streaming chat
✅ System prompt
✅ Agent harness
✅ AI provider abstraction
✅ GapGPT provider (glm-4-flash)
✅ Neon
✅ Drizzle
✅ Database schema
✅ Migrations
✅ Authentication (GitHub OAuth)
✅ Sessions (database strategy)
✅ Current-user server boundary
✅ Conversation persistence
✅ Message persistence
✅ Conversation CRUD API
✅ Protected API routes
✅ Multi-user isolation
✅ Authorization (ownership checks)

🟡 Phase 2.7 — UI integration (sidebar, conversation list, user menu)
    ├── Sidebar conversation list (mock data)
    ├── New Chat button (not wired)
    ├── Conversation selection (not wired)
    ├── Search input (not wired)
    ├── Delete/Rename (not wired)
    └── User menu (static data)

🚫 Not needed yet:
   - Multiple AI providers
   - Tool calling
   - RAG
   - Model routing
   - Advanced UI
   - File uploads
   - Billing
```

---

# Immediate next milestone

The next implementation task is **Phase 2.7 — Chat UI connected to persistence**.

The backend is complete. The work now is entirely frontend integration:

1. **Create a server action or client-side fetch** to load conversations for the sidebar
2. **Replace `MOCK_HISTORY`** in `AppSidebar` with real data from `GET /api/conversations`
3. **Wire New Chat button** → `POST /api/conversations` → redirect to chat view
4. **Implement conversation selection** → fetch messages via `GET /api/conversations/:id` → hydrate `useChat`
5. **Add `PATCH /api/conversations/:id`** for rename, wire dropdown
6. **Wire Delete** → `DELETE /api/conversations/:id`
7. **Add search parameter** to `GET /api/conversations` and debounce search input
8. **Replace static UserMenu** with real session data using `useSession()` from `@auth/react`
9. **Handle initial message hydration** in `Chat` component when opening existing conversation

This is the final step to make the application a real, usable chat product rather than a backend demo.