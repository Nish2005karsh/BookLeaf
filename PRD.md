# PRD: BookLeaf Author Support & Communication Portal

> You are a senior full-stack engineer building a hiring-assignment project for BookLeaf Publishing (self-publishing company, India/US). Read this entire document before writing code. Build in the phases listed in section 15, commit after every phase, and **verify your own work** per section 13. Do not stop at "it compiles".

---

## 1. Goal

Build a web app with two interfaces, **Author Portal** and **Admin Portal**, that helps BookLeaf's ops team handle author support tickets faster and more consistently using AI-assisted classification, prioritisation and response drafting.

**How it will be graded (optimise in this order):**

| Weight | Criterion | What it means for you |
|---|---|---|
| 25% | AI integration | Good prompts, accurate use of the knowledge base (KB), classification accuracy, graceful degradation, token/cost awareness |
| 25% | Architecture & code quality | Layered structure, separation of concerns, no spaghetti, typed, readable, comments where non-obvious |
| 15% | API design | REST conventions, auth middleware, RBAC, validation, meaningful errors, docs |
| 15% | Functionality | Both portals work, full ticket lifecycle, near-real-time updates, edge cases |
| 10% | Product thinking | Feels like a tool a real ops team would use |
| 10% | Docs & communication | README, write-up, commit messages |

Working software beats perfect software. Core ticket flow + AI integration come before polish.

---

## 2. Rules for the agent

1. No placeholder code, no `TODO: implement`, no fake/hardcoded API responses in production paths.
2. TypeScript strict mode. No `any` unless commented why.
3. Secrets only in env vars. Never import the AI SDK or read `process.env.AI_*` from any client component. Add `import "server-only"` to AI modules.
4. All input validated with zod at the API boundary. Errors use one envelope (section 8).
5. Do **not** invent BookLeaf policy. Every policy fact in AI output must come from the KB in section 10.2 or from the author's DB record.
6. Commit after each phase with conventional messages (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
7. Avoid generic "AI slop" UI: follow the design system in section 4 exactly. No default Tailwind blue/purple gradients, no emoji as icons, no lorem ipsum.
8. When something is ambiguous, pick the simplest sensible default, and record it under "Assumptions" in the README.

---

## 3. Tech stack (fixed, don't substitute)

- **Next.js** (latest stable, App Router) + **TypeScript** + **Tailwind CSS**
- **PostgreSQL hosted on Neon** + **Prisma ORM**. Use Neon for local dev, tests and production (no Docker needed). The Neon MCP server is available in this environment: use it to inspect the schema, run verification queries and create a **separate Neon branch for the test suite** so tests never touch the demo data. Use a dev/demo Neon project only. Never run destructive MCP operations on anything else.
- **Auth:** email + password, bcrypt hashes, JWT (`jose`) in an `httpOnly`, `SameSite=Lax`, `Secure` (in prod) cookie
- **Validation:** `zod`
- **Client data fetching / near-real-time:** `swr` with interval polling (see section 11)
- **AI:** Google Gemini via `@google/genai` (free tier from Google AI Studio), behind a provider interface so Anthropic/OpenAI can be swapped in. Model comes from env `AI_MODEL`: use a current **Flash / Flash-Lite** model that is available on the free tier (model names change often and older ones get shut down, so never hardcode one; read it from env and document how to check AI Studio for the current name). Justify choice in README: generous free tier (zero cost for a demo), low latency for short classification/draft tasks, JSON-schema structured output, good instruction-following for tone. Because the free tier is rate-limited, the app MUST have a complete fallback path (section 10.6).
- **Icons:** `lucide-react`. **Font:** Lato (via `next/font/google`)
- **Tests:** Vitest (unit/API integration). **No Playwright.** UI/E2E verification is done by driving the running app through the IDE's built-in browser agent (section 13, step 6).
- **Deploy target:** Vercel + Neon. Must work with serverless (no long-lived in-memory state, no websockets). **Neon connection rules:** use the **pooled** connection string (host contains `-pooler`) as `DATABASE_URL` for the running app, and the **direct** (non-pooled) string as `DIRECT_URL` for Prisma migrations. Configure Prisma accordingly for the installed version (`directUrl` in the datasource, or `prisma.config.ts` in newer versions). Handle Neon cold starts: enable a connection retry on first query, and keep the `/api/health` DB check tolerant (retry once). Set Prisma `connection_limit` low for serverless.

---

## 4. Design system (match BookLeaf's website look)

The visual identity is: warm **coral-pink** primary, **teal** accent band, lots of white, soft pink gradient "blobs", **pill-shaped buttons**, rounded cards with thin coral outlines, friendly and clean. Define everything as CSS variables in `globals.css` and map them in Tailwind theme so colours can be swapped in one place.

```css
:root {
  /* Brand */
  --bl-coral:        #F2697A;  /* primary: buttons, section bands, links */
  --bl-coral-dark:   #E04F62;  /* hover / pressed */
  --bl-coral-soft:   #FDE4E8;  /* tinted backgrounds, badges, blobs */
  --bl-coral-wash:   #FFF5F6;  /* page background tint */
  --bl-teal:         #4FB3C8;  /* accent: stats band, info states */
  --bl-teal-dark:    #3A97AB;
  --bl-teal-soft:    #DFF3F7;
  --bl-black:        #111111;  /* secondary CTA ("Get in touch" style) */
  /* Neutrals */
  --bl-ink:          #2E3A4B;  /* headings (dark slate, not pure black) */
  --bl-text:         #556070;  /* body */
  --bl-muted:        #8A94A3;
  --bl-border:       #F3C9D0;  /* coral-tinted hairline for cards */
  --bl-border-neutral:#E6E8EC;
  --bl-surface:      #FFFFFF;
  /* Status */
  --bl-success:#2FA36B; --bl-warning:#E9A23B; --bl-danger:#D9435A; --bl-info:var(--bl-teal);
  /* Shape */
  --radius-card: 14px; --radius-pill: 999px; --radius-input: 10px;
  --shadow-card: 0 4px 24px rgba(242,105,122,.10);
}
```

> The exact hex values were sampled by eye from screenshots. Keep them centralised so they can be tuned against the official palette.

**Components and patterns**
- **Logo lockup:** recreate in CSS/SVG (no copied image assets): a coral rounded square with a white "/" slash, followed by "BookLeaf" (light weight) over "Publishing" (smaller). Subtitle "Author Support".
- **Buttons:** primary = coral pill, white text, bold; hover = `--bl-coral-dark`. Secondary = black pill. Ghost = coral text with coral outline pill. Min height 40px, focus ring 2px coral at 40% opacity.
- **Cards:** white, 1px `--bl-border`, radius 14px, `--shadow-card`. Feature cards use a coral-soft icon tile (circle) with a lucide icon in coral, like the "Publish your book faster / Live Sales Report" tiles on the site.
- **Page backgrounds:** `--bl-coral-wash` with one or two large blurred coral-soft radial blobs positioned top-right (CSS only).
- **Hero/header band on dashboards:** solid coral band with white heading (like their "Get in touch" section), with a **teal stat strip** below it showing 3-4 big numbers (icon in translucent white tile, big number, small caption), mirroring their "150K+ / 22K+ / 2M+ / 150+" strip. Author: Books, Copies sold, Royalty earned, Royalty pending. Admin: Open, Critical, Unassigned, Avg first response.
- **Tables:** white, header row in coral-wash with coral-dark small caps text, zebra off, row hover coral-wash. Sticky header. Responsive: tables collapse to cards under 768px.
- **Badges (pill, soft bg + strong text):**
  - Status: Open = teal-soft/teal-dark; In Progress = amber-soft/amber; Resolved = green-soft/green; Closed = grey.
  - Priority: Critical = danger solid white text; High = coral solid; Medium = amber-soft; Low = grey-soft.
  - Category: neutral outline pill with a small lucide icon per category.
  - AI chip: tiny "AI suggested" sparkle chip next to AI-set values. When an admin overrides, show "Edited by {name}".
- **Typography:** Lato. H1 32/700, H2 24/700, H3 18/700, body 15/400, small 13. Headings `--bl-ink`, body `--bl-text`.
- **Inputs:** 44px high, radius 10px, 1px neutral border, coral focus ring, inline error text in danger colour.
- **Empty states:** soft illustration made from CSS/SVG shapes, one sentence, one CTA. Never a blank table.
- **Loading:** skeleton shimmers in coral-soft. **Toasts** bottom-right.
- **Layout:** Author portal = top navbar (like the site: logo left, links centre, user menu right). Admin portal = left sidebar (collapsible) + top bar, denser layout. Max content width 1200px.
- **Voice in UI copy:** warm, direct, human ("We're on it. Expect a reply within 48 hours."), never robotic.
- **Accessibility:** WCAG AA contrast (white text on `--bl-coral` is borderline: use bold 14px+ and verify with a contrast check; use `--bl-coral-dark` for small text). Keyboard navigable, labelled inputs, `aria-live` for new-reply notifications.

---

## 5. Data model (Prisma)

Design for clarity and extensibility. Use enums, indexes, and cascading rules deliberately.

```
enum Role { AUTHOR ADMIN }
enum TicketStatus { OPEN IN_PROGRESS RESOLVED CLOSED }
enum Priority { CRITICAL HIGH MEDIUM LOW }
enum Category { ROYALTY_PAYMENTS ISBN_METADATA PRINTING_QUALITY DISTRIBUTION_AVAILABILITY BOOK_STATUS_PRODUCTION GENERAL_INQUIRY }
enum AiState { PENDING DONE FAILED SKIPPED }
enum MessageSender { AUTHOR ADMIN }

User        id, email (unique), passwordHash, name, role, phone?, city?, joinedAt, createdAt
Book        id (cuid), externalId ("BK001", unique), authorId→User, title, isbn, genre,
            publicationDate?, status (string, e.g. "Published & Live" / "In Production - Cover Design"),
            mrp? , royaltyPerCopy?, copiesSold, royaltyEarned, royaltyPaid, royaltyPending,
            lastPayoutDate?, printPartner?, availableOn String[]
Ticket      id, number (human friendly auto-increment, shown as BL-1042), authorId→User, bookId?→Book,
            subject, description, attachmentNames String[] (UI only),
            category?, aiCategory?, priority?, aiPriority?, aiConfidence?, aiReason?,
            categoryOverriddenById?, priorityOverriddenById?,
            aiState AiState, status TicketStatus default OPEN, assignedToId?→User,
            draftResponse?, draftGeneratedAt?, draftState AiState,
            firstRespondedAt?, resolvedAt?, createdAt, updatedAt
            indexes: (status, priority, createdAt), (authorId), (assignedToId), (category)
TicketMessage  id, ticketId, sender MessageSender, authorUserId, body, createdAt   // visible to author
InternalNote   id, ticketId, adminId, body, createdAt                              // admin only
AiCallLog      id, ticketId?, kind (CLASSIFY|DRAFT), model, inputTokens, outputTokens,
               latencyMs, success, errorCode?, createdAt                           // cost observability
```

Rules: money in integer rupees; dates as UTC `DateTime`; never trust client-provided `authorId`: always derive from session.

---

## 6. Seed data

A file `data/bookleaf_sample_data.json` (10 authors, 18 books) is provided at repo root; **the seed script must read this exact file** (do not retype the data). `prisma/seed.ts`:

- Create one `User` (role AUTHOR) per author. Password for all authors: `Author@123`. Email from JSON.
- Create books mapped field-by-field (`null` stays `null`).
- Create two admins: `admin@bookleafpub.com` / `Admin@123` (Ops Lead) and `support@bookleafpub.com` / `Admin@123` (Support Exec).
- Create ~12 **demo tickets** across authors covering all 6 categories and all 4 statuses, with a mix of ages (some 6+ days old), a few with admin replies, one with an internal note. Include at least: Ananya Reddy ("no royalty yet", published 2024-07, ₹0 paid), Sneha Kulkarni asking about *Midnight in Mysore* (in production), Diya Chatterjee ISBN mismatch, Arjun Malhotra low royalty. Seed demo tickets with `aiState = DONE` and plausible pre-computed categories/priorities so the queue looks real without calling the API.
- Make seed idempotent (`upsert`). Add `npm run db:seed` and `npm run db:reset`.

---

## 7. Auth & RBAC

- `POST /api/auth/login` → verifies bcrypt, sets cookie JWT `{sub, role, exp 7d}`. Generic error message on failure (don't reveal whether the email exists). Basic rate-limit on login (e.g. 10/min per IP+email, DB- or memory-backed, documented limitation for serverless).
- Route protection in **two layers** (defence in depth): (1) framework request-interception file (`middleware.ts` or `proxy.ts`, depending on Next version) redirects unauthenticated users from `/author/*` and `/admin/*` and checks role; (2) every API handler calls `requireAuth(role?)` from `lib/auth/guards.ts`, which is the real enforcement.
- Authors: all queries are scoped `where: { authorId: session.userId }`. Accessing someone else's ticket/book returns **404** (not 403) to avoid leaking existence. Admins access everything.
- Never return `passwordHash`. Create a `serializeX` layer so DTOs are explicit.
- Admin-only fields (`InternalNote`, AI reasoning, draft, override metadata) must never appear in author responses. Test this.

---

## 8. REST API

Base `/api`. JSON only. Plural nouns, kebab-case, proper verbs and status codes (200/201/204/400/401/403/404/409/422/429/503).

**Error envelope (always):**
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Subject must be at least 5 characters", "details": [{ "path": "subject", "message": "..." }] } }
```
Codes: `VALIDATION_ERROR, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, CONFLICT, RATE_LIMITED, AI_UNAVAILABLE, INTERNAL`. No raw stack traces to clients; log server-side. A global `handleRoute(fn)` wrapper maps `ZodError`, `AppError` subclasses, and Prisma errors to this envelope.

| Method & path | Role | Purpose |
|---|---|---|
| `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` | public / any | Session |
| `GET /books` | author (own) / admin (`?authorId=`) | List books |
| `GET /books/:id` | owner / admin | Single book |
| `POST /tickets` | author | Create ticket (returns immediately; AI triage runs after response) |
| `GET /tickets` | author (own) / admin (all) | List. Admin filters: `status, category, priority, assignedTo (id\|me\|unassigned), from, to, q`; `sort=urgency\|newest\|oldest`; `page, pageSize`; `updatedSince` for polling |
| `GET /tickets/:id` | owner / admin | Detail + public messages (admin also gets notes, AI fields, draft) |
| `POST /tickets/:id/messages` | author (follow-up) / admin (**send response**) | Adds a visible message. Admin send sets `firstRespondedAt`, moves OPEN→IN_PROGRESS if still open |
| `PATCH /tickets/:id` | admin | Update `status, category, priority, assignedToId` (overrides recorded with admin id) |
| `POST /tickets/:id/assign-me` | admin | Convenience assign |
| `POST /tickets/:id/notes` · (notes returned in detail) | admin | Internal notes |
| `POST /tickets/:id/draft` | admin | (Re)generate AI draft; `GET` returns cached draft |
| `POST /tickets/:id/classify` | admin | Re-run AI classification manually |
| `GET /admin/stats` | admin | Counts for the stat strip |
| `GET /admin/users?role=ADMIN` | admin | Assignee dropdown |
| `GET /health` | public | DB + AI config status (no secrets) |

Author follow-up on a RESOLVED ticket reopens it (→ OPEN). Closed tickets reject new messages (409). Provide `openapi.yaml` at repo root **and** a README endpoint table. Optional: serve it at `/api-docs`.

---

## 9. Screens

### Author Portal (`/author/...`)
1. **/login**: split layout; left coral hero with brand message, right form. Show demo credentials hint box only when `NEXT_PUBLIC_SHOW_DEMO_HINT=true`.
2. **/author (Dashboard)**: coral header band "Welcome back, {firstName}", teal stat strip, recent tickets, quick CTA "Raise a query".
3. **/author/books**: card grid (table on desktop toggle). Each shows title, ISBN, genre, publication date, status badge, MRP, copies sold, royalty earned / paid / pending, platforms. **Edge cases:** books *in production* show a production-stage progress stepper (Manuscript → Editing → Cover Design → Typesetting → Proofreading → ISBN → Printing → Distribution → Live) with the current stage highlighted, and "Not yet published" / "-" for null MRP, date, royalty. Zero paid + pending > 0 shows an info note. Pending below ₹1,000 shows "Below ₹1,000 minimum, rolls over to next quarter". Raise-query shortcut per book.
4. **/author/tickets/new**: dropdown (author's books incl. in-production ones, plus "General / Account Level"), subject (5-120 chars), description (20-4000 chars with counter), attachment dropzone (**UI only**, lists filenames, stores names, states "Attachments upload coming soon" in helper text). Successful submit → toast + redirect to the ticket.
5. **/author/tickets**: list with status badges; empty state; unread-reply dot.
6. **/author/tickets/[id]**: chat-style thread (original query, admin responses, own follow-ups), status badge, ticket number, composer for follow-ups. Polls for updates; new admin reply appears **without refresh** with a subtle highlight + `aria-live` announcement. Authors never see category/priority/AI/notes.

### Admin Portal (`/admin/...`)
1. **/admin (Ticket Queue)** main screen: stat strip; filter bar (status, category, priority, assignee, date range, search); default sort = **urgency** (see below). Columns: number, subject, author, book, category (+AI chip), priority badge, status, assignee, age ("3d 4h"). **SLA/age cues:** a row gets a red left border and "Overdue" tag when open longer than SLA (Critical 24h, High 48h, Medium 72h, Low 5d); the oldest unresolved tickets are visibly marked. Quick actions: assign to me, change status inline. Polls every 10s and shows a "N new tickets: refresh" pill.
   - **Urgency score** (`lib/tickets/urgency.ts`, unit-tested): `priorityWeight(CRITICAL 1000, HIGH 600, MEDIUM 300, LOW 100) + ageHours * 2` for unresolved tickets; resolved/closed sink to the bottom.
2. **/admin/tickets/[id] (Workbench)**, two columns:
   - Left: ticket header, author + book context card (royalty numbers, status, platforms, production stage), conversation thread.
   - Right: **Triage panel** (category select + priority select, each with an AI chip, confidence and one-line AI reason, instant override with "Edited by"), status select, assign-to-me / assignee select, **Internal notes** (yellow-tinted "Not visible to author" box).
   - Bottom: **Reply composer** pre-filled with AI draft (skeleton while generating), buttons: *Regenerate*, *Discard draft*, *Send response*. If the draft contains `[[VERIFY: ...]]` markers, highlight them and require confirmation before send (see 10.5). If AI failed: neutral banner "AI drafting is unavailable right now, you can write the reply manually", composer empty and fully usable.
3. Keyboard-friendly (Cmd/Ctrl+Enter to send).

---

## 10. AI subsystem (highest weight, do this carefully)

### 10.1 Architecture
```
src/lib/ai/
  provider.ts        // interface LLMProvider { complete(req): Promise<{text, usage}> }
  gemini.ts          // implementation (server-only), uses structured JSON output for classify
  mock.ts            // deterministic provider for tests/dev (AI_PROVIDER=mock)
  client.ts          // timeout, retries w/ exponential backoff+jitter, circuit breaker, logging to AiCallLog
  knowledge-base.ts  // KB split into typed sections (below)
  classify.ts        // classifyTicket()
  draft.ts           // generateDraft()
  fallback.ts        // keyword heuristic classifier/prioritiser (no network)
  fallback-drafts.ts // per-category template drafts filled from facts.ts (no network), see 10.6
  budget.ts          // client-side request budget (token bucket + daily cap) to stay under free-tier limits
  facts.ts           // deterministic facts builder (payout dates etc.)
  prompts/           // prompt templates as pure functions, unit-testable
```

### 10.2 Knowledge base (store as structured TS constants, sections keyed by category)
Encode **exactly** this content (do not embellish):

**company**: BookLeaf Publishing, self-publishing in India & US. Packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium paid package with marketing/distribution add-ons). Handles cover design, typesetting, ISBN assignment, printing, distribution, royalty management. In-house printing facility and warehouse in Delhi; print partners Repro India and Epitome Books.

**royalty**: 80/20 split, 80% of net profit to author. Net profit = MRP − printing cost − platform commission (Amazon/Flipkart) − shipping. Calculated quarterly, paid within 45 days of quarter end. Minimum payout ₹1,000; below that rolls over to next quarter. Paid by bank transfer to account linked in author dashboard. Detailed per-platform breakdown available in dashboard.

**isbn**: Every book gets a unique ISBN assigned by BookLeaf, registered under BookLeaf's imprint. Author wanting own imprint ISBN must obtain independently. ISBN errors (duplicate, wrong book linked) = high priority, escalate to production team.

**printing**: In-house handles most orders; overflow/specific formats go to Repro India or Epitome Books. Standard turnaround 5-7 business days from order confirmation. Quality issues (misprints, binding defects, colour inconsistency) → free reprint after verification; author may need to share photos.

**distribution**: Listed on Amazon India, Flipkart, Amazon US, Amazon UK, BookLeaf Store. New listings live 7-10 business days after publication complete. "Unavailable" usually = stock sync issue; BookLeaf can trigger re-sync within 24-48 hours.

**production**: Stages: Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live. Authors emailed at each stage. Delays typically at Cover Design (awaiting author approval) and Proofreading (revision rounds).

**general**: Metadata/description updates on live books can be submitted through the dashboard or by emailing the team; changes reflect on platforms in 3-5 business days.

**tone** (always included): empathetic and professional; authors are partners not customers; acknowledge concern before solutions; be specific with numbers/dates/statuses; own BookLeaf's mistakes directly with no corporate deflection; for escalations give a clear timeline ("Our team will look into this and get back to you within 48 hours"); always end with a clear next step.

**few-shot calibration** (one compact example per category, from the brief's table, in `examples` section keyed by category):
- Royalty (none after 4 months): acknowledge frustration, explain quarterly cycle + 45-day window, check bank details linked, give specific next payout date, if genuinely overdue escalate with 48h timeline.
- Royalty (too low, 200 copies ₹3,000): explain net profit formula, offer line-by-line breakdown, not defensive.
- ISBN mismatch Amazon vs physical: high priority, acknowledge serious data issue, escalating to production now, 48h timeline.
- Print quality: apologise sincerely, ask for photos, free reprint once verified, 5-7 business days.
- Unavailable on Amazon: stock sync issue, re-sync triggered, 24-48h.
- 3 weeks in typesetting: check actual status, be honest about reason, give specific updated timeline, frame collaboratively, don't blame author.
- Update live description: yes via dashboard/email, 3-5 business days.

### 10.3 Classification + priority (one call, cheap)
- **Single request** returns both category and priority (halves cost/latency).
- Input = `subject`, `description` (truncated to ~1,500 chars), plus tiny structured signals derived in code: `bookStatus`, `isInProduction`, `monthsSincePublication`, `royaltyPaid==0`, `royaltyPending`. **No KB, no history**, only a ~250-token system prompt with category definitions and a priority rubric.
- Priority rubric given to the model: **CRITICAL**: duplicate/wrong ISBN, wrong book data live, royalty unpaid well past the 45-day window or >~6 months with nothing received, legal/chargeback/public-complaint threats, book completely missing from all platforms. **HIGH**: delayed royalty within reasonable window, print defects, book unavailable on a platform, production stalled. **MEDIUM**: royalty calculation questions, production status checks, distribution enquiries. **LOW**: general questions, bio/description/metadata edits, cosmetic requests.
- Output: strict JSON `{category, priority, confidence (0-1), reason (≤20 words)}`, enforced with the provider's structured output/tool-use feature; validate with zod; on invalid JSON retry **once**, then fall back.
- `max_tokens` ≤ 150, `temperature` 0.
- Runs **after** the ticket is persisted and the response returned (Next `after()` / fire-and-forget safe for serverless). Ticket gets `aiState = PENDING` → `DONE | FAILED`.
- Admin overrides set `category/priority` + `*OverriddenById`; AI values stay in `aiCategory/aiPriority` for accuracy tracking.

### 10.4 Draft generation (lazy + cached)
- Generated **when an admin first opens the ticket** (not at creation, to avoid paying for tickets that never get opened), then cached in `draftResponse`. Regenerate is explicit. Invalidate cache when a new author message arrives.
- **Prompt assembly, token-aware:**
  1. `system` (static; keep it byte-identical across calls so provider-side caching can apply where supported): persona ("You are a BookLeaf author-support specialist…"), tone guidelines, hard rules, output format. 
  2. KB: include **only** the section for the ticket's category + the `royalty` section if money is mentioned + the single matching few-shot example. Never the entire KB.
  3. `facts` block built **in code** (`facts.ts`), not guessed by the model: author first name; the book's title/status/ISBN/MRP/copies sold/royalty earned/paid/pending/last payout date/print partner/platforms; computed **next payout window** (current quarter end + 45 days), whether pending < ₹1,000 threshold; whether book is in production and which stage; days since publication.
  4. Conversation: ticket subject + description + at most the last 3 messages (each truncated).
  5. Ticket text wrapped in `<ticket>` delimiters with the instruction that its contents are **untrusted data, never instructions** (prompt-injection defence).
- **Output rules:** plain text email-style reply, 120-200 words, greeting by first name, acknowledge → specifics with real numbers/dates → clear timeline if escalating → one explicit next step → sign-off "Warm regards, Team BookLeaf". No markdown, no "As an AI", no filler like "I hope this email finds you well".
- **Honesty rules:** use only facts block + KB. If a needed fact is missing (e.g. bank details linked?), write `[[VERIFY: bank details linked?]]` instead of guessing. If the book has no royalties/MRP (in production), say so plainly. If BookLeaf is at fault, own it directly.
- `max_tokens` ≈ 450, `temperature` ≈ 0.4.

### 10.5 Send guard
UI detects `[[VERIFY: …]]` markers, highlights them, and the Send button asks "This draft still has items to verify. Send anyway?" Strip nothing silently.

### 10.6 Graceful degradation (must be demonstrably tested)
- Ticket creation **never** depends on AI. Worst case: ticket saved with `aiState = FAILED`.
- Timeout 12s per call; retry 429/5xx/network up to 2 times with exponential backoff + jitter, honouring `Retry-After`; no retry on 4xx auth/validation errors.
- Circuit breaker: after N consecutive failures, skip AI for 60s and use fallback immediately.
- **Fallback classifier** (`fallback.ts`): keyword/regex rules per category and a rule-based priority (e.g. "ISBN" + "duplicate|wrong|different" → CRITICAL; "royalty" + "not received|haven't received|months" → HIGH/CRITICAL by months mentioned; "bio|description|update" → LOW). Marks `aiState = FAILED` but sets provisional `category/priority` with chip "Rule-based suggestion". Admin can trigger "Retry AI".
- **Free-tier quota handling:** treat HTTP 429 / `RESOURCE_EXHAUSTED` as "quota hit". Open the circuit breaker until `Retry-After` (or 60s default) and switch to fallback immediately, without hammering the API. Also add `budget.ts`: a client-side token bucket (default `AI_MAX_RPM=10`) and a daily cap (`AI_DAILY_CALL_LIMIT=500`) so the app proactively falls back **before** the free tier is exhausted. When the budget resets or the circuit closes, AI resumes automatically.
- **Mock/template draft fallback (required):** if the draft call fails, is skipped by the budget, or `AI_PROVIDER=mock`, return a **template draft** from `fallback-drafts.ts` instead of an error. One template per category, written in BookLeaf's tone (acknowledge → specifics → timeline → next step → sign-off) and filled from `facts.ts` (author first name, book title/status, copies sold, royalty earned/paid/pending, computed next payout window, in-production stage, etc.). Cover all 6 categories plus variants for: royalty overdue vs within window, pending < ₹1,000 rollover, in-production book, zero-royalty book. Missing facts become `[[VERIFY: …]]` markers. Pre-fill the composer with it exactly as with an AI draft, but show a clear amber chip "Template draft (AI unavailable)" so the admin knows it isn't AI-generated. Never present fallback output as AI output. The same applies to classification via `fallback.ts` (chip "Rule-based suggestion").
- The draft endpoint therefore returns 200 with `source: "ai" | "template"` in the body. `503 AI_UNAVAILABLE` is only returned if even the template cannot be built (e.g. ticket data missing). The UI always keeps the manual composer usable.
- **Demo mode:** `AI_PROVIDER=mock` forces this path end to end (also used by tests), so the full app can be demoed with zero API key.
- Missing API key at boot: app still runs, `/api/health` reports `ai: "not_configured"`, AI features are skipped cleanly.

### 10.7 Cost awareness (document in README)
Log every call to `AiCallLog` (tokens, latency, success). Admin stats shows "AI calls today / est. cost". README explains: one combined classify call, no KB on classification, KB sectioned by category, history capped at 3 messages, truncation, stable system prompt (provider caching where available), client-side request budget guard for free-tier limits, lazy draft generation + cache, `max_tokens` caps, small model, `temperature 0` for deterministic classification. Include a rough cost-per-ticket estimate with the arithmetic.

---

## 11. Near-real-time updates

Serverless-friendly **short polling** with SWR: ticket detail every 4s while the tab is visible, list pages every 10s, using `?updatedSince=` (or `ETag`/`If-None-Match` → 304) so unchanged polls are tiny. Pause when the tab is hidden, refresh on focus. README must explain why polling over WebSockets/SSE (Vercel serverless limits, simplicity, resilience) and how it would evolve (SSE or Supabase Realtime / Postgres LISTEN/NOTIFY).

---

## 12. Edge cases that must work (tests will use the seed data)

- Books in production (BK013 *Midnight in Mysore*, BK015 *Raising Roots*): null ISBN-adjacent fields render gracefully, no `NaN`/"null", can still be selected in the ticket dropdown, AI draft uses production-stage language.
- Authors with ₹0 paid and pending > 0 (Ananya, Arjun, Kavita's published book, Diya's *Howrah Nights*).
- Pending below ₹1,000 (Kavita's *The Nagpur Notebooks*, ₹850) mention rollover.
- Authors with no tickets → empty state. Author with 2-3 books.
- Admin sees ticket whose author has later been given a follow-up; reopen flow.
- Double submit of the ticket form (disable button + idempotency by short window).
- Very long descriptions, special characters, Hindi/Urdu text (store/render UTF-8 correctly).
- Author tries `/api/tickets/{someone else's id}` → 404. Author hits an admin route → 403. Logged-out → 401.

---

## 13. Verification protocol (you must run this yourself and report results)

Do **not** claim completion until all of these pass. Create `VERIFICATION.md` with command outputs/summary.

1. **Static:** `npm run lint`, `npx tsc --noEmit`, `npm run build` all clean.
2. **Unit (Vitest):** urgency scoring, fallback classifier (≥15 labelled sample queries including the 7 from the brief, assert categories), payout-date/facts builder (quarter edges, 45-day window, ₹1,000 threshold), prompt builders (KB section selection, no secrets, delimiters present, token-size ceiling), zod schemas, error-envelope mapper.
3. **API integration tests** against a test DB with `AI_PROVIDER=mock`: login success/failure; cookie flags; every endpoint's happy path; **RBAC matrix** (author vs admin vs anonymous for each route); author cannot see another author's tickets/books (404); author responses never contain notes/AI fields/draft/passwordHash; validation errors return the envelope with 400/422; PATCH overrides recorded; status transitions (reopen on follow-up, closed rejects).
4. **AI degradation tests:** mock provider throwing timeout / 429 / 500 / malformed JSON → ticket still created (201), fallback classification applied, `aiState=FAILED`, draft endpoint returns 503 envelope, manual reply still works, circuit breaker opens and recovers.
5. **Secret hygiene:** script greps the built client bundle (`.next/static`) and repo for the AI key pattern/`GEMINI_API_KEY`; fail if found. `.env*` in `.gitignore`; `.env.example` committed.
6. **E2E via the built-in browser agent** (start `npm run dev` with `AI_PROVIDER=mock`; use two separate sessions, e.g. normal + incognito window, for author and admin; capture screenshots/recordings as proof and list pass/fail per item in `VERIFICATION.md`): (a) author logs in → views books → submits ticket → sees it in My Tickets; (b) admin logs in → sees it at/near top of queue with category+priority → opens it → draft present → edits → sends; (c) **author page, without reload, shows the admin reply** within 10s; (d) admin overrides category/priority and sets status; internal note never appears on the author side; (e) in-production book displays stepper and "-" values; (f) filters/sort in queue; (g) mobile viewport smoke test (390px) for both portals.
7. **Live AI smoke test** (only if `GEMINI_API_KEY` is set; keep the call count low to respect free-tier limits): run the 7 sample queries from section 10.2 through classify + draft; print results in `VERIFICATION.md` and self-check each against the expected tone/content (timeline given, next step present, numbers used, no hallucinated policy). Fix prompts until satisfactory.
8. **Visual check:** take browser-agent screenshots of key screens (login, author dashboard, books, ticket thread, admin queue, workbench) and confirm they follow section 4 (palette, pill buttons, teal stat strip, coral band). Fix deviations.
9. **Fresh-clone test:** from a clean checkout follow README exactly (`npm i`, env setup, `prisma migrate`, seed, `npm run dev`) and confirm it works.

Provide `npm run test` and `npm run verify` (runs steps 1-5; steps 6-9 are performed by the agent and recorded in `VERIFICATION.md`).

---

## 14. Documentation deliverables

**README.md** must contain: overview + live URL placeholder; **test credentials** (admin + 2-3 author logins); local setup (env vars, creating a free Neon project and copying the pooled + direct URLs, migrate, seed, run), plus why Neon (serverless Postgres, branching for tests, free tier, works with Vercel); architecture diagram (mermaid) and folder structure; **architecture decisions & why** (Next route handlers + service layer, Prisma, polling, JWT cookie, provider abstraction); **AI integration** (model choice justification, prompt strategy, KB sectioning, structured output, injection defence, error handling/degradation, cost management with numbers); API docs table + link to `openapi.yaml`; testing instructions; **known limitations & next steps** (real file uploads, email notifications, SSE/Realtime, per-tenant rate limiting store in Redis, eval harness for classification accuracy, audit log, SLA alerts, multilingual replies, RAG over a larger KB, human feedback loop from edited drafts).

**WRITEUP.md** (max 1 page): what was prioritised, trade-offs, how to evolve to production.

**.env.example:**
```
DATABASE_URL=postgresql://USER:PASS@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require   # Neon POOLED url (runtime)
DIRECT_URL=postgresql://USER:PASS@ep-xxxx.REGION.aws.neon.tech/neondb?sslmode=require           # Neon DIRECT url (migrations)
TEST_DATABASE_URL=                                                                               # Neon branch for tests
JWT_SECRET=change-me-long-random
AI_PROVIDER=gemini           # gemini | mock
GEMINI_API_KEY=              # from Google AI Studio (free tier)
AI_MODEL=                    # current Flash/Flash-Lite model name from AI Studio
AI_TIMEOUT_MS=12000
AI_MAX_RPM=10
AI_DAILY_CALL_LIMIT=500
NEXT_PUBLIC_SHOW_DEMO_HINT=true
```

---

## 15. Build phases (commit after each)

1. Scaffold, Tailwind theme/tokens, fonts, layout shells, logo, UI primitives (Button, Card, Badge, Input, Select, Table, Toast, Skeleton, EmptyState, StatStrip)
2. Prisma schema, migrations, seed from JSON, DB client
3. Auth (login/logout/me), guards, middleware, error envelope, rate-limit
4. Books + tickets API with zod, RBAC, services/repositories layers
5. Author portal screens
6. AI module (provider, client, KB, classify, fallback, facts, draft) + wiring after ticket creation + AiCallLog
7. Admin portal screens (queue, workbench, triage, notes, reply composer)
8. Polling/real-time
9. Tests + verification protocol, fix everything it finds
10. OpenAPI, README, WRITEUP, final polish, `VERIFICATION.md`

## 16. Suggested structure
```
src/
  app/ (auth)/login · author/… · admin/… · api/…
  components/ui · components/author · components/admin
  lib/ auth/ db/ ai/ tickets/ books/ http/ (errors, handleRoute, validators)
  server/ services/ (ticketService, bookService) repositories/
  types/
prisma/ schema.prisma seed.ts
data/ bookleaf_sample_data.json
tests/ unit · api
openapi.yaml README.md WRITEUP.md VERIFICATION.md
```
Routes stay thin: parse → validate → call service → serialize. Business rules live in services; DB access in repositories.

## 17. Definition of done
Everything in section 13 passes, README setup works from a clean clone, both portals are usable on mobile and desktop, design matches section 4, and no secret appears in client code or git history.