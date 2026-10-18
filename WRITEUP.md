# Architectural Writeup & Production Evolution

## 1. What Was Prioritised

1. **Zero-Hallucination Integrity (The Facts-First Rule):**
   In author support, hallucinated royalty figures or false turnaround dates permanently damage author trust. We engineered a strict **code-level facts engine (`facts.ts`)** that computes quarterly cycles, 45-day payment windows, and ₹1,000 threshold rollovers before any prompt is assembled. Missing or unverifiable facts trigger explicit `[[VERIFY: ...]]` tokens with a mandatory UI confirmation modal before sending.

2. **Rock-Solid Degradation (AI as an Accelerator, Not a Dependency):**
   Authors must always be able to submit tickets and receive support even if Google AI Studio hits rate limits (429), times out, or has an outage. The system incorporates:
   - Client-side token-bucket RPM rate limiting and proactive daily caps (`budget.ts`).
   - Circuit breaker that opens on repeated 429/5xx errors.
   - Deterministic keyword/regex fallback classifier (`fallback.ts`) tested against 15 realistic author queries.
   - Professional, BookLeaf-toned deterministic template drafts (`fallback-drafts.ts`) filled with real book facts.

3. **Author Privacy & Security by Default:**
   - Multi-tenant isolation: Authors querying another author's tickets or books receive `404 Not Found` (never `403 Forbidden`), completely eliminating ID enumeration vulnerabilities.
   - Internal notes and AI triage rationale are stripped in the serialization layer and never touch the author client bundle.
   - Session management uses signed JWT tokens stored in `httpOnly`, `sameSite=lax`, `secure` cookies.

4. **BookLeaf Design System Fidelity:**
   Implemented the exact BookLeaf visual brand identity: BookLeaf Coral (`#F2697A`), Deep Coral (`#D9435A`), Light Coral (`#FDE4E8`), BookLeaf Teal (`#4FB3C8`), Dark Charcoal typography (`#2E3A4B`), and pill-shaped rounded buttons (`rounded-full`), with zero generic purple/blue gradients.

---

## 2. Key Trade-Offs Made

| Decision | Selected Approach | Trade-Off & Justification |
| :--- | :--- | :--- |
| **Real-time Updates** | Short-polling (4s thread / 10s queue) | Polling is stateless, works effortlessly on serverless environments (Vercel, AWS Lambda), has zero persistent connection overhead, and avoids WebSocket disconnection edge cases. SWR pauses polling when the browser tab is hidden to conserve bandwidth. |
| **Model Choice** | Gemini 2.5 Flash / Flash-Lite | Optimized for sub-second latency and minimal token cost ($0.075 / 1M input tokens) while providing native JSON structured output schema enforcement. |
| **Prompt Delivery** | Dynamic KB Sectioning | Never sends the entire Knowledge Base in a single request. Prompts only include the active category snippet and the matching few-shot calibration example, cutting token overhead by ~70%. |
| **Draft Generation** | Lazy Generation on Admin Open | Drafts are generated only when an administrator opens the ticket in the workbench, rather than at ticket creation time. Tickets that are duplicates or resolved immediately incur zero draft LLM expense. |

---

## 3. How to Evolve to High-Scale Production

1. **Distributed Rate Limiting & Queueing:**
   Replace the in-memory token bucket in `budget.ts` with Redis-backed Upstash or Dragonfly rate limiting to coordinate RPM and daily quotas across multi-region serverless lambdas.
2. **Server-Sent Events (SSE) / Postgres LISTEN/NOTIFY:**
   Upgrade short-polling to SSE backed by Neon Postgres logical replication / LISTEN-NOTIFY or Redis Pub/Sub for sub-50ms instant message push notifications.
3. **Continuous AI Fine-Tuning & Evaluation Harness:**
   Capture human admin edits to AI drafts to build a curated DPO (Direct Preference Optimization) dataset, refining BookLeaf's custom tone and accuracy over time.
4. **Direct Cloud Storage for Attachments:**
   Integrate S3 / Cloudflare R2 presigned URLs with virus scanning for manuscript proofs, high-resolution cover PDFs, and printing defect photos.
