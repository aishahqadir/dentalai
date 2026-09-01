# DECISIONS.md

Append-only, chronological record of why decisions were made. Do not edit or delete prior entries, even when a later entry supersedes one. If something here is superseded, the later entry says so explicitly, the earlier entry stays as the reasoning trail. CLAUDE.md reflects current state only, this file reflects how we got there.

---

## 2026-06-25 (post-lunch session)

### Context

The build at this point implements the original architecture brief faithfully: scaffold, `PmsProvider` and `LlmProvider` interfaces, See plus prioritisation with override, the Act draft scaffold, a placeholder Measure, and CI. This entry records the decisions made in this session, to be applied on top of that state.

### Product rules

- Tracking is at item level. Four item states: proposed, accepted, completed, declined.
- Positive-action close rule. A plan or item closes only through positive action. Silence never closes. Nothing ages out silently.
- Decline always captures a structured reason from a defined picklist.
- Attribution. A conversion counts only if a confirmed outreach touchpoint initiated by the tool precedes it. Digital touchpoints auto-log. Offline touchpoints (calls) require one-tap TCO confirmation. An unlogged call earns no credit and the patient stays on the active list. No touchpoint means never counted.
- Recovered revenue is reported per patient, with item-level detail.
- AI drafting in v1 names the treatment type, asserts no clinical content, uses one house style, and is draft-for-approval only. Tone options deferred. Loosened later only with rigour and a verified clinical reference source.
- Product voice is patient care and case acceptance, never a sales tool. The pipeline framing is the internal builder's model only and never appears in outward copy.

**Superseded 2026-08-25**: "AI drafting in v1 ... is draft-for-approval only" and "Product voice is patient care ... never a sales tool" were both revisited and changed in the 2026-08-25 entry below. See that entry for reasoning. This entry stands as the original reasoning for why those constraints were chosen in the first place.

### Architecture and scope

- Interaction model. Desktop web app is the home. A morning email digest is the hook: read-only, low-risk, internal message. Primary user is the TCO or practice manager.
- Data freshness. Live-synced local copy kept current by Dentally webhooks, a fresh per-patient read at the point of action, and periodic reconciliation as backstop. Fetch-live-on-every-click was rejected (rate limit, dependency).
- Go-live backlog import capped at the last 6 months. This is an initial-import cap only. Plans then persist until positively resolved.
- Measure success bar is two things held together: recovered revenue that is attributable and defensible, and how the practice actually uses the tool. Measure instruments usage as well as outcome.
- Stack confirmed. TypeScript end to end, Next.js App Router, self-managed Supabase in an EU or UK region, Anthropic behind a swappable `LlmProvider`, PMS behind a swappable `PmsProvider` (Dentally first).

### Deferred (do not build in v1, but keep the model open)

- Cadence and sequencing logic deferred to user research. The v1 data model must accommodate a future attribute-driven cadence engine. Inputs include treatment type and value.
- Treatment categorisation taxonomy deferred. v1 stores Dentally's raw treatment data faithfully. Own buckets built later.
- Multi-site and multi-practice deferred. Keep practice as a first-class entity so it is addable later.
- Pricing parked. Working assumption only: classic SaaS annual subscription. Revisit after research.

### Implied schema changes (applied)

- `treatment_plan_items`: `state` (enum: proposed, accepted, completed, declined), `state_changed_at`, `decline_reason` (nullable, FK to the picklist), `closed_via`. Raw Dentally treatment code and type stored per item, faithfully.
- `treatment_plans`: plan-level status is a rollup of item states rather than an independent field. Kept `presented_at`, `priority_score`, `last_synced_at`. Added an import-window marker for the 6-month cap.
- `decline_reasons`: the picklist, as an enum or a small reference table.
- `outreach_events`: `is_confirmed` (bool), `confirmation_method` (auto for digital, one_tap for calls). Kept `channel`, `drafted_by`, `approved_by`, `sent_at`, `status`.
- `conversion_events`: moved to item level (item id, not just plan id). Added `attributed_touchpoint_id` (FK to `outreach_events`, nullable). A conversion is attributable only when a confirmed touchpoint precedes it.
- `usage_events` (new table): `practice_id`, `actor`, `event_type` (digest_opened, plan_viewed, draft_generated, draft_sent, call_logged, etc.), `entity`, `occurred_at`. Backs the usage half of the Measure success bar.
- `audit_log` and RLS implemented at this stage, not deferred.

### Compliance gate (reordering)

RLS on every table, scoped by practice and role, and `audit_log` writes on every patient-data read and write, land before real Dentally credentials are wired in. Compliance is load-bearing, not a later addition. Do not connect a live PMS to a system with no row-level security and no audit logging, real patient PII would be flowing at that point.

### Webhook sequencing note (recommendation, not a decision)

The freshness architecture stands as decided above. For the single design-partner practice, the loop can be proven on periodic sync plus point-of-action reads first, webhook listeners added once the loop is working. Sequencing call for the pilot, not a change to the target architecture.

---

## 2026-08-25

### Context and trigger

Reviewed 10x Dental (YC W25, US market) as competitive context. Their model: autonomous voice/text AI conducts live two-way conversation with patients on recall, unscheduled treatment, and missed calls, and books directly into the PMS with no human review step. Reported conversion uplift (self-published, unverified) of roughly 5x over front-desk baseline.

This prompted reopening the v1 constraint that AI only drafts, never converses live, set in the 2026-06-25 entry above. The following decisions were made deliberately, not adopted from 10x wholesale.

### Decisions

**Supersedes 2026-06-25, "AI drafting in v1 ... is draft-for-approval only"**

- AI conducts live, multi-turn conversation with the patient (text/WhatsApp channel; voice explicitly deferred, not decided against, just not v1).
- Human approval is required before any appointment is booked, and on any conversational turn that hits a defined escalation trigger (see Open items below).
- Routine turns (logistics, availability, general reassurance) run AI-to-patient unsupervised, live.
- This is a hybrid model: live autonomous conversation, gated human approval on booking and flagged topics. Neither the 2026-06-25 draft-for-approval model nor 10x's fully autonomous model.
- Reasoning: fully autonomous conversation with no review carries clinical-adjacent risk (e.g. a patient expressing pain concern being answered by AI with no clinician oversight) that has no published mitigation in 10x's model. Draft-for-approval alone cannot close a booking in one sitting, which is where most of the conversion uplift comes from. The hybrid model captures the conversion mechanism while keeping a safety gate on the specific turns that carry risk.

**Reaffirms 2026-06-25 scope intent**

- V1 scope stays treatment follow-up only. Hygiene recall and missed-call answering (both part of 10x's bundle) are explicitly deferred to post-pilot expansion, sequenced only after treatment follow-up has a proven number behind it.

**Supersedes 2026-06-25, "Product voice is patient care ... never a sales tool"**

- Outward positioning to the practice owner changes from patient-care-led to revenue-recovery-led. The product is pitched explicitly as recovering unscheduled treatment value, matching the language a practice owner immediately understands.
- This does not change patient-facing conversation tone, which stays warm and low-pressure. The reversal is in how the product is sold to the practice, not how the AI speaks to patients.
- Flagged for visibility: this is a direct reversal of a position held deliberately in the 2026-06-25 entry (and earlier pushback on overconfident/aggressive framing generally). Recorded here so the reasoning trail shows this was a considered change, not drift.

**Confirmed, no change from 2026-06-25**

- Technical foundation carries forward. Supabase schema, RLS, pgTAP isolation tests, CI, and the See and Measure layers stand. Only the Act layer is redesigned, from one-shot draft generation to a live conversational engine with an escalation queue.

### Open items, NOT decisions, need resolution before build

**Escalation trigger taxonomy.** "Flagged topics only" requires a specific, versioned list of triggers (pain/discomfort language, cost objection past a threshold, cancellation or complaint language, anything touching clinical risk or complications). This is now core product IP, equivalent in weight to the treatment categorisation map. Requires Raihan's clinical input on where the clinical/non-clinical line sits. Do not guess this list, build it in Phase 0/1 discovery.

**Attribution model redefinition.** The 2026-06-25 attribution model (single confirmed touchpoint, strict `sent_at` ordering) was built for one-shot drafted messages. A live multi-turn conversation with a mid-conversation human escalation changes what "the touchpoint" is: conversation start, the message containing the booking offer, or the human-approved send at the escalation point are all candidates. This needs its own decision before the Measure layer or schema is touched. Getting this wrong undermines the "defensible attribution" principle that was the whole reason binary item-level credit was chosen over first-touch or last-touch in the first place.

### Reconciliation tasks, in order

1. Fold this entry's implications into CLAUDE.md (done, see CLAUDE.md 2026-08-25 revision).
2. Run discovery (interviews per the original Phase 0 plan) to produce the escalation trigger taxonomy, with Raihan's clinical sign-off.
3. Resolve the attribution touchpoint redefinition as its own decision, appended here, before any schema migration for the new Act layer.
4. Only then spec and build the redesigned Act layer.
