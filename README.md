# SparkAgent

Cloud-first AI agent workspace for `agent.sparkagent.in.net` using the same Supabase project as the public authentication service.

## Current foundation

- Strict TypeScript Node API
- Supabase session verification with per-user queries
- RLS-first Postgres schema
- Persistent conversations and messages
- Streaming agent endpoint
- OpenAI-compatible provider abstraction
- Modular tool contract with permissions and risk levels
- No fake tool success or hard-coded AI responses
- Secret-safe environment template
- Premium responsive workspace UI

## Required production environment

Copy `.env.example` to `.env` on the server and set:

- `SUPABASE_ANON_KEY`: the Supabase publishable/anon key for the project
- `AI_BASE_URL`: an OpenAI-compatible provider endpoint
- `AI_API_KEY`: server-only provider credential
- `AI_MODEL`: model identifier
- `CORS_ORIGIN=https://agent.sparkagent.in.net`

The browser must never receive `AI_API_KEY` or a Supabase service-role key.

The static client can optionally be configured with a browser-safe Supabase key through the deployment environment as `SPARKAGENT_SUPABASE_ANON_KEY` and the API URL through `SPARKAGENT_API_BASE`.

## Database

Run `supabase/schema.sql` against the existing SparkAgent Supabase project. It creates the private user-owned entities and RLS policies needed by the foundation.

## Development

```bash
npm install
npm run dev
```

The API defaults to port `8787`. The static `index.html` is the client entry point.

## Important scope boundary

Gmail, GitHub write operations, browser automation, code execution, voice, image generation, file storage, and additional integrations are intentionally not represented as working features yet. They require their real provider credentials, OAuth flows, permission checks, and execution adapters. They should be added behind the tool contract rather than simulated in the UI.
