# SparkAgent — Phase 1

This is a real, working slice of SparkAgent, scoped to Phase 1 of the spec:

- Next.js App Router app shell
- Supabase auth session handling, shared across `try.sparkagent.in.net` (login) and `agent.sparkagent.in.net` (this app)
- Postgres schema for `profiles`, `conversations`, `messages` with Row Level Security
- Model provider abstraction (`AIProvider`) with a real Anthropic Claude implementation — no mocked output
- Streaming chat API route that persists messages to Supabase
- Minimal but functional chat UI: sidebar with real conversation list (create/rename/delete), streaming message view

Nothing here fakes success. If Claude's API call fails, the UI shows a failure state, not a fabricated answer. There is no email/GitHub/voice/browser code in this drop — those are Phases 3–5 in your own spec, and I don't want to hand you stub buttons that pretend to work.

## 1. Why I couldn't push this myself

I don't have network/GitHub access in this environment. You'll need to copy these files into `Vexedhere/agent` and push them yourself (or grant Claude Code repo access via `gh` locally, which *can* push).

```bash
# from the root of your local clone of Vexedhere/agent
cp -r sparkagent-phase1/* .
git checkout -b phase1-foundation
git add .
git commit -m "Phase 1: auth shell, schema, provider abstraction, streaming chat"
git push origin phase1-foundation
# then open a PR into main
```

## 2. Cross-subdomain auth (important)

`try.sparkagent.in.net` (login) and `agent.sparkagent.in.net` (this app) are different subdomains of `sparkagent.in.net`. For a session created on `try.` to be readable on `agent.`, **both apps must set the Supabase auth cookie domain to `.sparkagent.in.net`** (leading dot = shared across subdomains). This repo's `lib/supabase/server.ts` and `middleware.ts` already do this via `cookieOptions.domain`. You need to make the *same* change in the `try.sparkagent.in.net` codebase, or SSO will silently fail (each subdomain will think the user is logged out).

Also set in Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://agent.sparkagent.in.net`
- Redirect URLs: add `https://agent.sparkagent.in.net/auth/callback` and `https://try.sparkagent.in.net/auth/callback`

## 3. What happens on login

- Unauthenticated visitor to `agent.sparkagent.in.net` → `middleware.ts` redirects to `https://try.sparkagent.in.net/login?next=https://agent.sparkagent.in.net`
- `try.sparkagent.in.net` handles the actual login UI and Supabase auth call (that app isn't in this repo)
- On success, the shared cookie means `agent.sparkagent.in.net` middleware sees a valid session and lets the user through to the workspace at `/`

## 4. Setup

```bash
npm install
cp .env.example .env.local   # fill in real values
```

Run the SQL in `supabase/schema.sql` against your `nzaelikbjumaidaombmp` project (SQL Editor in Supabase Dashboard, or via `supabase db push` if you use the CLI).

```bash
npm run dev
```

## 5. What's real vs. what's next

Real and working in this drop:
- Supabase-authenticated pages, protected by middleware
- Conversation CRUD (list, create, rename, delete) — real DB reads/writes, RLS-scoped per user
- Streaming chat completions from Anthropic's API, persisted to `messages`
- Error states surfaced honestly (provider down, no API key configured, DB write failure)

Not built yet (per your own Phase 2+ ordering — do not let anyone tell you these are done until they are):
- Tool system / agent state machine
- File uploads and analysis
- Web search/research tool
- Gmail, GitHub, voice, vision, browser agent

## 6. Environment variables

See `.env.example`. Never commit `.env.local`. The Anthropic API key and the Supabase service-role key are used server-side only (API routes / server components) — they are never sent to the browser.
