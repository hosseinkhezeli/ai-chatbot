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

* [ ] Choose and install the authentication solution
* [ ] Implement login
* [ ] Implement logout
* [ ] Establish the server-side session
* [ ] Determine the authenticated user for every request
* [ ] Persist users in the database
* [ ] Remove the temporary hardcoded development user

**Learning goal:** understand authentication vs. authorization vs. sessions.

---

## 2.3 Session management

* [ ] Create the session model/storage required by the authentication system
* [ ] Handle session creation
* [ ] Handle session expiration
* [ ] Handle session invalidation/logout
* [ ] Create a server-side `getCurrentUser()` / `getSession()` boundary
* [ ] Ensure API routes can reliably identify the current user

**Learning goal:** understand how browser credentials become trusted server-side identity.

---

## 2.4 Conversation persistence

* [ ] Create a conversation when a new chat begins
* [ ] Associate every conversation with `user_id`
* [ ] Persist conversation title/metadata
* [ ] Return the conversation ID to the client
* [ ] Load an existing conversation
* [ ] Prevent one user from accessing another user's conversation

**Learning goal:** relational ownership and authorization.

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

* [ ] Persist the user message before generation
* [ ] Stream the assistant response
* [ ] Accumulate the assistant text
* [ ] Persist the assistant message after successful completion
* [ ] Handle failed/interrupted generations correctly
* [ ] Decide how incomplete assistant messages are represented
* [ ] Preserve message ordering
* [ ] Associate every message with the correct conversation

**Learning goal:** understand database writes around long-running streaming requests.

---

## 2.6 Conversation API

Create:

```text
/api/conversations
/api/conversations/:id
```

Tasks:

* [ ] `GET /api/conversations` — list current user's conversations
* [ ] `POST /api/conversations` — create conversation
* [ ] `GET /api/conversations/:id` — fetch conversation + messages
* [ ] `DELETE /api/conversations/:id` — delete conversation
* [ ] Validate IDs
* [ ] Scope every query to the authenticated user

**Learning goal:** server-side CRUD and authorization boundaries.

---

## 2.7 Chat UI connected to persistence

The current UI is intentionally minimal.

Now connect it to the database:

* [ ] Create/load the current conversation
* [ ] Load existing messages on page load
* [ ] Send messages into the persisted conversation
* [ ] Refresh without losing history
* [ ] Open an existing conversation
* [ ] Add a conversation sidebar
* [ ] Create a new conversation
* [ ] Delete a conversation

**Done when:**

> A logged-in user can close the browser, return later, reopen a conversation, and see the complete message history.

---

# Phase 3 — Production identity & authorization

**Learning goal:** move from "authentication works" to "authorization is correct."

* [ ] Protect `/api/chat`
* [ ] Protect `/api/conversations`
* [ ] Reject unauthenticated requests
* [ ] Scope all database queries to `session.user_id`
* [ ] Verify conversation ownership before reading
* [ ] Verify conversation ownership before writing
* [ ] Verify conversation ownership before deleting
* [ ] Handle unauthorized access consistently
* [ ] Remove all development-user assumptions

**Done when:**

> Two different users can use the application simultaneously and can never see, modify, or delete each other's conversations.

---

# Phase 4 — Harness upgrade

**Learning goal:** understand what an actual agent harness is beyond a single model call.

Only start this phase after authentication and persistence are solid.

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

* [ ] Store `system_prompt_version` on the conversation
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
Phase 2 ← CURRENT
   ↓
Phase 3
   ↓
Phase 4
   ↓
Phase 5
   ↓
Phase 6+
```

Do not build advanced agent features before the application has reliable identity and persistence.

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
✅ GapGPT provider
✅ Neon
✅ Drizzle
✅ Database schema
✅ Migrations

⏳ Authentication
⏳ Sessions
⏳ Current-user server boundary
⏳ Conversation persistence
⏳ Message persistence
⏳ Conversation CRUD
⏳ Protected API routes
⏳ Multi-user isolation

🚫 Not needed yet:
   - Multiple AI providers
   - Tool calling
   - RAG
   - Model routing
   - Advanced UI
   - File uploads
   - Billing
```

# Immediate next milestone

The next implementation task is **Phase 2.2 — Authentication**.

Before modifying `/api/chat`, establish the authentication/session layer and a reliable server-side concept of:

```ts
getCurrentUser()
```

Then persistence can be built correctly around the authenticated user rather than building it around the temporary hardcoded development user.
