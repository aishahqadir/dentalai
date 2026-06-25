# DentalAI (v1)

DentalAI is a Next.js + TypeScript scaffold for a dental treatment plan conversion tool.

## Current status

- `See` page: open treatment plan list with mock Dentally data and priority scoring
- `Act` page: AI draft generation flow wired to Anthropic via `/api/draft`
- `Measure` page: reporting scaffold with placeholder conversion metrics
- provider boundary in place for `DentallyProvider` and `LlmProvider`
- CI workflow added for type-check, lint, and tests

## Tech stack

- Next.js App Router
- TypeScript
- Supabase client placeholder
- Anthropic draft provider scaffold
- Vitest for testing
- GitHub Actions for CI

## What is implemented

- `lib/pms/provider.ts` — PMS provider interface
- `lib/llm/provider.ts` — LLM provider interface
- `lib/prioritisation/prioritisation.ts` — priority scoring logic
- `app/(dashboard)/see/page.tsx` — open plan listing UI
- `app/(dashboard)/act/page.tsx` — follow-up draft UI
- `app/(dashboard)/measure/page.tsx` — conversion tracking placeholder UI
- `app/api/plans/route.ts` — plan list API
- `app/api/draft/route.ts` — follow-up draft API
- `app/api/measure/route.ts` — measure report API

## Known limitations

- `DentallyProvider` currently uses a mock provider until sandbox credentials are available
- `Measure` reporting is static placeholder data for now
- `Act` requires a configured Anthropic API key to generate real drafts
- Audit logging, row-level security, and Supabase schema are not implemented yet

## Setup

### Prerequisites

- Node.js + npm (recommended via `nvm install --lts`)
- Git

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Available commands

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run start` — start built app
- `npm run lint` — run Next.js lint
- `npm run typecheck` — run TypeScript type check
- `npm run test` — run Vitest tests

## Environment variables

Copy `.env.example` to `.env.local` and configure values as needed.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DENTALLY_API_KEY` — optional, used by Dentally sandbox provider when available
- `DENTALLY_BASE_URL` — optional, Dentally sandbox base URL
- `ANTHROPIC_API_KEY` — optional, for follow-up draft generation
- `ANTHROPIC_MODEL` — optional, default is `claude-3.5-mini`

## CI

A GitHub Actions workflow is configured in `.github/workflows/ci.yml`.
It runs:

- `npm install`
- `npm run typecheck`
- `npm run lint`
- `npm run test`

## Next work

1. plug in Dentally sandbox credentials and validate API payloads
2. implement Supabase schema, auth, and audit logging
3. wire conversion detection from Dentally into `Measure`
4. add saved draft/approval workflow for `Act`
