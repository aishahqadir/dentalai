# Architecture Brief: Dental Treatment Plan Conversion Tool (v1)

This document is the opening instruction for Claude Code. It defines the stack, the architecture, and the build order. Read it fully before scaffolding anything. Where a decision is marked DECISION, follow it; do not substitute your own default.

A good place to keep this: save it as `CLAUDE.md` at the repo root so it stays in context for every future session, then start building from the "First tasks" section at the end.

---

## 1. What we are building

A web app for private dental practices that converts open (proposed but not completed) treatment plans into booked, completed treatment. The primary user is a treatment coordinator or practice manager. The product reads open treatment plans from the practice management system (Dentally first), ranks them, helps draft personalised follow-up messages, and measures recovered revenue.

This is a healthcare-data product handling UK patient information. Compliance and data residency are load-bearing architectural constraints, not later additions.

## 2. v1 scope: the core loop

Build exactly these four capabilities and nothing beyond them:

1. **See**: pull every open treatment plan from Dentally and present them in one list. Per plan: patient reference, proposed treatment, cash value, days since presented, current status.
2. **Prioritise**: rank the list by value weighted by recency. This is a transparent, overridable rule, not machine learning. This is our own logic and the only part that is not just PMS data.
3. **Act**: generate an AI-drafted, personalised follow-up message for a selected plan. Draft-for-approval only. The user reads, edits, and sends. No automatic sending in v1.
4. **Measure**: detect conversion semi-automatically by reading appointment and plan status back from Dentally, and report open value, worked, converted, and recovered revenue.

## 3. Tech stack (DECISION)

- **Language**: TypeScript end to end.
- **Framework**: Next.js (App Router). Server components and route handlers for backend logic, so the Dentally calls and patient data processing run server-side, never in the browser.
- **Database and auth**: Supabase, on a self-managed Supabase account (not Lovable Cloud, not a managed-for-us instance). The project must be created in an EU or UK region (e.g. London/eu-west) for data residency. We need full access to the dashboard, service keys, and the ability to sign a data processing agreement.
- **LLM**: Anthropic API as the default, accessed behind a provider interface so the model is swappable (see section 6).
- **Hosting**: deploy the app in an EU/UK region to match the database. Keep the host simple and reliable; do not introduce infrastructure we have to hand-manage.

Rationale, briefly: this is the stack the founder is fastest in, it keeps all patient data processing server-side and in-region, and Postgres via Supabase is production-grade from day one.

## 4. Architecture principles

- **Design wide, build narrow.** The data model and the integration seams must accommodate the eventual three-tier user model (pipeline owner, executor, AI) and multiple PMS systems. But only the v1 slice is built now.
- **Isolate the differentiated parts.** The PMS integration, the prioritisation engine, and the LLM drafting layer each live behind their own boundary. These are the parts that carry risk and value; keep them independently testable and replaceable.
- **Compliance first, not retrofitted.** Patient data minimisation, row-level security, encrypted credentials, and an audit trail are part of the initial scaffold, not a later pass.
- **Own the schema and the security policies.** Do not auto-generate the data model from a loose prompt. Define it deliberately as below.

## 5. PMS integration seam (DECISION)

Dentally is the first implementation of a generic PMS provider interface, so additional systems (SOE/Exact, CareStack, R4, or an aggregator like Sikka/Leyr) can be added later without touching the rest of the app.

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

export interface PmsProvider {
  listOpenTreatmentPlans(): Promise<OpenTreatmentPlan[]>;
  getPatientContact(pmsPatientId: string): Promise<PatientContact>;
  // Conversion detection for the Measure step:
  isPlanBookedOrCompleted(pmsPlanId: string): Promise<boolean>;
  // Optional, deferred to a later version (do not implement in v1):
  sendMessage?(pmsPatientId: string, body: string): Promise<void>;
}
```

`lib/pms/dentally/` implements `PmsProvider` for Dentally: OAuth or scoped API-key auth, reading the `treatment_plan`, `treatment_plan_item`, `account`, `patients`, and `appointments` objects. Build and test against the Dentally sandbox/developer environment before any live practice data. Store the `planned_private_treatment_value` and per-plan values in pence as integers, never floats.

## 6. LLM seam (DECISION)

The drafting model sits behind a provider interface. Claude is the default implementation. No other part of the codebase imports the Anthropic SDK directly.

```typescript
// lib/llm/provider.ts
export interface FollowUpContext {
  patientFirstName: string;
  proposedTreatmentSummary: string;
  daysSincePresented: number;
  practiceName: string;
  tone: "warm" | "neutral";
}

export interface LlmProvider {
  generateFollowUp(context: FollowUpContext): Promise<string>;
}
```

`lib/llm/anthropic/` implements `LlmProvider` using the Anthropic API, selected via an environment variable so swapping providers is a config change, not a code change. The drafting prompt must reflect the product's ethical line: help a patient say yes to care already clinically recommended, never apply pressure or invent clinical urgency. Drafts are always returned for human approval.

## 7. Prioritisation engine

`lib/prioritisation/` holds our ranking logic, kept separate and pure (easy to unit test and to evolve). v1 rule: rank by value weighted by recency, so a high-value recently-presented plan outranks a small or stale one. Expose the score and the factors so the UI can show why a plan is ranked where it is, and allow manual override. Do not use a black-box model here.

## 8. Data model (define deliberately)

Core tables. Store values in pence as integers. Practise data minimisation: key plans and patients by their PMS identifiers and avoid persisting patient PII you do not need. Fetch contact details transiently for the drafting and sending step rather than warehousing them; if any contact data must be cached, give it a clear retention and deletion policy.

- `pms_connections`: practice id, PMS type, encrypted credentials/token, region. Credentials encrypted at rest, never in client code.
- `treatment_plans`: internal id, pms_plan_id, pms_connection_id, total_value_pence, presented_at, status, priority_score, last_synced_at.
- `treatment_plan_items`: plan id, description, value_pence.
- `outreach_events`: plan id, channel, drafted_by, approved_by, sent_at, status. Records what was sent and by whom.
- `conversion_events`: plan id, detected_at, type (booked or completed).
- `app_users`: id, role (owner, executor), practice id. Roles defined now even though only the owner role is used in v1.
- `audit_log`: actor, action, entity, timestamp. Written on every read/write of patient-related data.

Row-level security on every table from the start, scoped by practice and role. Verify that a user from one practice cannot see another practice's data.

## 9. Suggested folder structure

```
/app
  /(dashboard)        TCO pipeline views (See, Prioritise, Act, Measure)
  /api                route handlers (server-side backend)
/lib
  /pms
    provider.ts       PmsProvider interface + shared types
    /dentally         Dentally implementation
  /llm
    provider.ts       LlmProvider interface + shared types
    /anthropic        Claude implementation (default)
  /prioritisation     ranking engine (pure, unit-tested)
  /db                 typed Supabase client and queries
  /auth               session and role helpers
  /audit              audit logging helper
/db                   SQL migrations / schema
/types                shared domain types
```

## 10. Do NOT build in v1 (cut list)

Hold the line on these even if they seem quick:

- Reception/executor task view and assignment.
- Any automatic message sending or autonomy beyond draft-for-approval (`sendMessage` stays unimplemented).
- Full role-management UI.
- Front-of-pipeline tooling (presentation, objection handling).
- Multi-step automated cadences.
- Any PMS other than Dentally.
- Patient-facing portals, two-way message threading, payments or financing.

## 11. First tasks, in order

1. Scaffold Next.js + TypeScript + self-managed Supabase (EU/UK region). Set up env config and secrets handling. Confirm the app runs.
2. Define the domain types and the `PmsProvider` and `LlmProvider` interfaces. No implementations yet.
3. Implement `DentallyProvider` against the sandbox: authenticate, then `listOpenTreatmentPlans`. Prove the data comes back and is clean (value, age, status, patient reference all present and usable).
4. Build the data sync and the read-only "See" list view.
5. Add the prioritisation engine and apply the ranking to the list, with visible scoring and manual override.
6. Add the "Act" step: `AnthropicProvider` generating a draft-for-approval follow-up message.
7. Add the "Measure" step: conversion detection via `isPlanBookedOrCompleted`, plus the open/worked/converted/recovered reporting.
8. Wire audit logging and verify row-level security throughout before any live practice data is connected.

Stop after step 8. That is the complete v1.
