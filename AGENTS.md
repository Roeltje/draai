# Draai

Read docs/BOUWPLAN.md and docs/CONTRACT.md first. Dutch, phone-first personal record picker. Local/self-hosted LXC deployment; no Sites hosting.

## Ownership
Root owns package/config/shared types/docs/integration. Frontend agent owns src/, index.html and public/. Backend agent owns server/ and tests/. Do not edit another agent's files without coordination.

## Engineering
Node 24, TypeScript, React/Vite, Fastify, node:sqlite. No AI service needed. Secrets server-only in .env (ignored). Demo collection and history must never mix with live data. API errors must not expose keys. Use artist IDs for credit matching. Discogs attribution and data freshness rules apply.

## Commands
pnpm install; pnpm dev (server + Vite); pnpm check; pnpm test; pnpm build; pnpm start (production :3210). Node executable in this environment: /Users/roel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node. pnpm: /Users/roel/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm. Add node bin to PATH when invoking pnpm here.

## Done
Relevant tests and typecheck/build pass, mobile and wide UI visually inspected, complete choose/confirm/finish/history flow checked in a browser. State unverified real service and hardware checks honestly. Keep docs/PROGRESS.md current. No tests just mirroring presentation markup.
