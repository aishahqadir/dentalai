# Architecture Brief: Dental Treatment Plan Conversion Tool

This is the current-state operational file. It reflects what the system does today. For why decisions were made and what they superseded, see DECISIONS.md (append-only, chronological). Where a decision is marked DECISION, follow it; do not substitute your own default. Where a section is marked PENDING, do not build against it, resolve the open item first (see DECISIONS.md, 2026-08-25 entry, "Open items").

Read this fully before scaffolding anything.

---

## 1. What we are building

A web app for private dental practices that converts open (proposed but not completed) treatment plans into booked, completed treatment. The primary user is a treatment coordinator or practice manager. The product reads open treatment plans from the practice management system (Dentally first), ranks them, conducts AI-led follow-up conversation with the patient, and measures recovered revenue.

Outward positioning to the practice is revenue recovery: sold explicitly as recovering unscheduled treatment value sitting in the practice's ledger. Patient-facing conversation stays warm, low-pressure, and care-led regardless of that sales framing (DECISIONS.md, 2026-08-25 entry, "Decisions").

This is a healthcare-data product handling UK patient information. Compliance and data residency are load-bearing architectural constraints, not later additions.

## 2. v1 scope: the core loop

1. **See**: pull every open treatment plan from Dentally and present them in one list. Per plan: patient reference, proposed treatment, cash value, days since presented, current status.
2. **Prioritise**: rank the list by value weighted by recency. Transparent, overridable rule, not machine learning.
3. **Act**: AI conducts a live, multi-turn conversation with the patient over text/WhatsApp for a selected plan (voice explicitly deferred, not built in v1). Routine turns (logistics, availability, general reassurance, approved non-clinical questions) run AI-to-patient unsupervised. Two gates require human approval before the AI proceeds:
   - Before any appointment is written to Dentally.
   - On any turn that hits a defined escalation trigger.
   - **PENDING: the escalation trigger taxonomy is not yet defined.** Do not build the escalation detection logic until this list exists, versioned, with clinical sign-off. See DECISIONS.md, 2026-08-25 entry, "Open items".
4. **Measure**: detect conversion semi-automatically by reading appointment and plan status back from Dentally, and report open value, worked, converted, and recovered revenue.
   - **PENDING: attribution touchpoint definition.** The prior model (single confirmed touchpoint, strict `sent_at` ordering) assumed one-shot outreach and does not cleanly map onto a multi-turn conversation with mid-conversation escalation. Do not build Measure reporting against the new Act layer until this is redefined and recorded in DECISIONS.md.

V1 scope stays treatment follow-up only. Hygiene recall and missed-call answering are out of scope, deferred until treatment follow-up has a proven conversion and revenue number from pilot.

### 2a. Decision log

For detailed product rules, architecture decisions, and schema changes, see **DECISIONS.md** (single append-only file):
- **2026-06-25 entry** — original product rules, attribution model (v1, one-shot), compliance gate ordering, schema proposal.
- **2026-08-25 entry** — pivot to hybrid conversational Act layer, revenue-recovery outward positioning, two open items pending resolution.

**Session 2026-06-25 (post-lunch)**
Scaffolded Next.js + TypeScript, Supabase client placeholder, provider interfaces (PmsProvider, LlmProvider). Built See, Act (draft-only), and Measure pages with mock/placeholder data. Added Dentally sandbox provider scaffold, Vitest, CI.

**Session 2026-08-25**
Reviewed 10x Dental as competitive context. Decided to move Act from one-shot draft-for-approval to a live conversational engine, gated by human approval on booking and flagged topics (not on every turn, not autonomous end-to-end). Reversed outward positioning to revenue-recovery-led. Confirmed the Supabase schema, RLS, and See/Measure layers carry forward; only Act is being redesigned. Two items flagged pending, do not build past them: escalation trigger taxonomy, attribution touchpoint redefinition.

## 3. Tech stack (DECISION)

- **Language**: TypeScript end to end.
- **Framework**: Next.js (App Router). Server components and route handlers for backend logic; Dentally calls and patient data processing run server-side, never in the browser.
- **Database and auth**: Supabase, self-managed, EU or UK region (e.g. London/eu-west) for data residency.
- **LLM**: Anthropic API as the default, behind a provider interface (see Section 6).
- **Hosting**: EU/UK region to match the database.
- **Messaging channel**: text/WhatsApp for the conversational Act layer. This is a new infrastructure requirement as of 2026-08-25, see Section 5a.

## 4. Architecture principles

- **Design wide, build narrow.** The data model and integration seams must accommodate the eventual three-tier user model (pipeline owner, executor, AI) and multiple PMS systems. Only the v1 slice is built now.
- **Isolate the differentiated parts.** PMS integration, prioritisation engine, LLM conversational layer, and escalation logic each live behind their own boundary, independently testable and replaceable.
- **Compliance first, not retrofitted.** Data minimisation, RLS, encrypted credentials, and an audit trail are part of the initial scaffold.
- **Own the schema and the security policies.** Define the data model deliberately, do not auto-generate it from a loose prompt.
- **Gate before build.** Where a product decision is marked PENDING in this file, the corresponding code does not get written until the decision is recorded in DECISIONS.md. This applies specifically to escalation detection logic and attribution reporting against the new Act layer.

## 5. PMS integration seam (DECISION)

Dentally is the first implementation of a generic PMS provider interface, so additional systems can be added later without touching the rest of the app.

```typescript
// lib/pms/provider.ts
export interface TreatmentItem {
  description: string;
  valuePence: number;
}

export interface OpenTreatmentPlan {
  pmsPlanId: string;
  pmsPatientId: string;
  items: TreatmentItem[];
  totalValuePence: number;
  presentedAt: Date;
  status: string;
}

export interface PatientContact {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
}

export interface AppointmentDraft {
  scheduledAt: Date;
  durationMinutes: number;
  appointmentType: string;
  approvedBy: string; // human who approved the booking gate
}

export interface PmsProvider {
  listOpenTreatmentPlans(): Promise<OpenTreatmentPlan[]>;
  getPatientContact(pmsPatientId: string): Promise<PatientContact>;
  isPlanBookedOrCompleted(pmsPlanId: string): Promise<boolean>;
  writeBookedAppointment(pmsPlanId: string, appointment: AppointmentDraft): Promise<void>;
}
```

`writeBookedAppointment` replaces the previous optional, unimplemented `sendMessage` stub. It is now in scope, since the conversational Act layer needs to write a confirmed booking back to Dentally once a human has approved it at the booking gate. This is the only PmsProvider method that follows an approval gate; everything else is read-only.

`lib/pms/dentally/` implements `PmsProvider` for Dentally: OAuth or scoped API-key auth, reading `treatment_plan`, `treatment_plan_item`, `account`, `patients`, and `appointments` objects. Build and test against the Dentally sandbox before any live practice data. Store values in pence as integers, never floats.

## 5a. Conversational messaging seam (NEW, 2026-08-25)

This did not exist in the original brief. The prior model only needed to send one drafted message per plan; the hybrid model needs a live, stateful, two-way conversation with a patient over text/WhatsApp, independent of the Dentally connection.

```typescript
// lib/messaging/provider.ts
export interface ConversationTurn {
  role: "patient" | "ai" | "human";
  body: string;
  occurredAt: Date;
}

export interface MessagingProvider {
  sendMessage(patientContact: PatientContact, body: string): Promise<void>;
  onInboundMessage(handler: (patientContact: PatientContact, body: string) => Promise<void>): void;
}
```

Do not implement the escalation-detection logic that decides which turns route to a human until the trigger taxonomy (Section 2, PENDING) exists. The interface and the message logging can be built now; the trigger logic cannot.

## 6. LLM seam (DECISION, revised 2026-08-25)

The conversational engine sits behind a provider interface. Claude is the default implementation. No other part of the codebase imports the Anthropic SDK directly.

```typescript
// lib/llm/provider.ts
export interface ConversationContext {
  patientFirstName: string;
  proposedTreatmentSummary: string;
  daysSincePresented: number;
  practiceName: string;
  conversationHistory: ConversationTurn[];
  tone: "warm" | "neutral";
}

export interface ConversationResponse {
  reply: string;
  requiresEscalation: boolean;
  escalationReason?: string;
}

export interface LlmProvider {
  continueConversation(context: ConversationContext): Promise<ConversationResponse>;
}
```

This replaces the prior one-shot `generateFollowUp`. `requiresEscalation` and `escalationReason` are structural placeholders only, the actual trigger logic that populates them depends on the taxonomy in Section 2 (PENDING). Do not hardcode trigger detection ahead of that decision.

The conversational prompt must reflect the product's ethical line: help a patient say yes to care already clinically recommended, never apply pressure or invent clinical urgency, on both AI-run and human-escalated turns.

## 7. Prioritisation engine

Unchanged. `lib/prioritisation/` holds ranking logic, kept separate and pure. v1 rule: rank by value weighted by recency. Expose the score and factors so the UI can show why a plan is ranked where it is, and allow manual override. No black-box model here.

## 8. Data model (define deliberately)

Core tables from the 2026-06-25 schema (`pms_connections`, `treatment_plans`, `treatment_plan_items`, `decline_reasons`, `outreach_events`, `conversion_events`, `usage_events`, `app_users`, `audit_log`) carry forward. Additions needed for the conversational Act layer:

- `conversations`: plan id, patient id, started_at, status (active, escalated, closed).
- `conversation_turns`: conversation id, role (patient, ai, human), body, occurred_at. This is the message log for the live engine, distinct from `outreach_events`, which recorded one-shot drafted sends.
- `escalation_events`: conversation id, turn id, trigger_reason, resolved_by, resolved_at. **Do not finalise this schema until the escalation trigger taxonomy exists** (Section 2, PENDING). A placeholder table structure can be scaffolded, but `trigger_reason` should not be built as an enum until the taxonomy is fixed.
- `conversion_events.attributed_touchpoint_id` currently points at `outreach_events`. **This FK target is PENDING redefinition** for the conversational model, do not migrate this column until the attribution touchpoint decision is recorded in DECISIONS.md.

Store values in pence as integers. Practise data minimisation: key plans and patients by PMS identifiers, avoid persisting patient PII not needed. RLS on every table from the start, scoped by practice and role.

## 9. Suggested folder structure

```
/app
  /(dashboard)        TCO pipeline views (See, Prioritise, Act, Measure)
  /api                route handlers (server-side backend)
/lib
  /pms
    provider.ts       PmsProvider interface + shared types
    /dentally         Dentally implementation
  /messaging
    provider.ts       MessagingProvider interface + shared types
    /whatsapp         (or chosen channel) implementation
  /llm
    provider.ts       LlmProvider interface + shared types (conversational)
    /anthropic         Claude implementation (default)
  /prioritisation      ranking engine (pure, unit-tested)
  /escalation          PENDING: trigger detection, do not build until taxonomy exists
  /db                  typed Supabase client and queries
  /auth                session and role helpers
  /audit               audit logging helper
/supabase
  /migrations          SQL migrations (Supabase CLI convention)
  /tests               pgTAP RLS isolation tests
/types                 shared domain types
```

## 10. Do NOT build in v1 (cut list, revised 2026-08-25)

- Full autonomy with no human gate at all (booking and flagged-topic gates are non-negotiable v1 requirements, not a later hardening pass).
- Escalation trigger detection logic ahead of the taxonomy decision (Section 2, PENDING).
- Attribution reporting against the new Act layer ahead of the touchpoint redefinition (Section 2, PENDING).
- Voice as a channel (text/WhatsApp only in v1).
- Hygiene recall and missed-call answering (deferred until treatment follow-up is proven).
- Reception/executor task view and assignment.
- Full role-management UI.
- Front-of-pipeline tooling (presentation, objection handling).
- Multi-step automated cadences.
- Any PMS other than Dentally.
- Patient-facing portals, payments or financing.

## 11. First tasks, in order

1. Confirm existing scaffold still runs: Next.js + TypeScript + Supabase (EU/UK region), env config, CI.
2. Define the revised `PmsProvider` (with `writeBookedAppointment`), the new `MessagingProvider`, and the revised conversational `LlmProvider`. Interfaces only, no escalation logic yet.
3. Resolve the escalation trigger taxonomy (Phase 0/1 discovery output, Raihan's clinical sign-off) and record it in DECISIONS.md before writing any detection code.
4. Resolve the attribution touchpoint redefinition and record it in DECISIONS.md before touching `conversion_events` or Measure reporting.
5. Implement the conversational Act loop against Dentally sandbox and a test messaging channel, with both gates (booking, flagged topic) enforced from the taxonomy in step 3.
6. Rework Measure against the redefined attribution model from step 4.
7. Wire audit logging and verify RLS throughout before any live practice data or live messaging channel is connected.

Stop after step 7 unless a further decision has been recorded in DECISIONS.md.
