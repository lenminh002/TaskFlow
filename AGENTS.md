# AGENTS.md

## Project Overview

This is a single-app Next.js App Router project leveraging Supabase for realtime collaborative features. The project contains custom, sparse-increment task reordering logic, optimistic UI updates, and anonymous-by-default authentication handling.

<!-- BEGIN:nextjs-agent-rules -->
**IMPORTANT: This is NOT the Next.js you know.**
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Setup Commands

- Install dependencies: `npm install`
- Start development server: `npm run dev`
- Build for production: `npm run build`

*Note: Supabase is required for normal app behavior. Both server and client depend on `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` being present in your `.env`.*

## Development Workflow

- The package manager is `npm` (`package-lock.json` is checked in).
- Single app, not a monorepo.
- App Router code lives under `src/app` with the `@/*` path alias mapped to `src/*` in `tsconfig.json`.
- `README.md` is still the default `create-next-app` boilerplate. Do not trust it for app shape logic. Trust `package.json`, `eslint.config.mjs`, `tsconfig.json`, and the `src/` directory instead.

## Testing Instructions

There is no dedicated repository script for running a test suite or standalone typechecks.

- **Full Project Verification**: `next build` (or `npm run build`) is the closest full-project verification step.
- **Global Linting**: `npm run lint`
- **Focused File Linting (Fastest Check)**: `npm run lint -- src/path/to/file.tsx`
  - *Zsh Note*: Quote App Router paths when they contain brackets in `zsh`. Example: `npm run lint -- "src/app/tasks/[id]/page.tsx"`.
- *Note:* There are ad hoc root scripts like `test_supabase.mjs` and `test_rest.mjs`, but they are not wired into `package.json` and should not be treated as official verification.

## Architecture and State Management

- **Global Shell**: `src/app/layout.tsx` is the global shell. It always wraps pages with `AuthProvider` and the fixed left sidebar `NavBar`.
- **Main Board Route**: `src/app/tasks/[id]/page.tsx`. Treat this as the server entrypoint for board data hydration.
- **Board Client State**: `src/app/tasks/[id]/BoardClient.tsx`. This is the client-side state owner for drag/drop, optimistic updates, and realtime synchronization.
- **Server Actions**: Most data mutations are centralized in `src/lib/actions.ts`.

## Supabase Constraints and Patterns

- **Auth State**: Auth is anonymous-by-default. `src/components/AuthProvider.tsx` signs users in anonymously if no session exists. A signed-in user is still considered incomplete until a row exists in the `users` table. `AuthProvider` blocks the UI with `WelcomeModal` until that profile row is created.
- **Client/Server Access**: Avoid bypassing `src/lib/supabase/server.ts` and `src/lib/supabase/client.ts`. They are the intended wrappers for cookie-aware Supabase access.
- **Data Model Requirements**: Board collaboration depends on the `boards`, `tasks`, `users`, and `board_members` tables.
- **Drag & Drop RPC**: Rely on the `batch_update_positions` RPC used by drag/drop reordering.

## Realtime and UX Gotchas

- **Debounced Subscriptions**: `BoardClient` subscribes to Supabase realtime for `tasks`. It intentionally debounces events while suppressing self-triggered updates. **Preserve that behavior when changing board sync logic.**
- **Task Ordering (Sparse Increments)**: Task ordering is driven by the `position` column, using sparse increments (`+1000`) so inserts and cross-column moves do not require a full reindex of all rows.
- **Board Permissions UI**: `NavBar` board list is client-fetched from server actions and uses explicit owner-vs-member behavior (owners delete boards, members leave boards).