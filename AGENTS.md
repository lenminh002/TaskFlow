<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Source Of Truth

- `README.md` is still the default create-next-app boilerplate. Trust `package.json`, `eslint.config.mjs`, `tsconfig.json`, and `src/` instead.

## Commands

- Package manager is `npm` (`package-lock.json` is checked in).
- Main checks are `npm run lint` and `npm run build`.
- There is no repo script for tests or standalone typecheck. `next build` is the closest full-project verification step.
- `npm run lint -- src/path/to/file.tsx` is the fastest focused lint check for a touched file.
- Quote App Router paths when they contain brackets in `zsh`, for example: `npm run lint -- "src/app/tasks/[id]/page.tsx"`.

## App Shape

- Single app, not a monorepo.
- App Router code lives under `src/app` with `@/*` path alias mapped to `src/*` in `tsconfig.json`.
- Global shell is `src/app/layout.tsx`: it always wraps pages with `AuthProvider` and the fixed left sidebar `NavBar`.
- Main board route is `src/app/tasks/[id]/page.tsx`. Treat it as the server entrypoint for board data hydration.
- Board interactivity lives in `src/app/tasks/[id]/BoardClient.tsx`; this is the client-side state owner for drag/drop, optimistic updates, and realtime sync.
- Most data mutations are centralized in `src/lib/actions.ts` server actions.

## Supabase Constraints

- Supabase is required for normal app behavior. Both server and client clients depend on `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Auth is anonymous-by-default: `src/components/AuthProvider.tsx` signs users in anonymously if no session exists.
- A signed-in user is still considered incomplete until a row exists in the `users` table. `AuthProvider` blocks with `WelcomeModal` until that profile row is created.
- Avoid bypassing `src/lib/supabase/server.ts` and `src/lib/supabase/client.ts`; they are the intended wrappers for cookie-aware Supabase access.
- Board collaboration depends on the `boards`, `tasks`, `users`, and `board_members` tables plus the `batch_update_positions` RPC used by drag/drop reordering.

## Realtime And UX Gotchas

- `BoardClient` subscribes to Supabase realtime for `tasks` and intentionally debounces events while suppressing self-triggered updates. Preserve that behavior when changing board sync logic.
- Task ordering is driven by the `position` column, using sparse increments (`+1000`) so inserts and cross-column moves do not require full reindexing.
- `NavBar` board list is client-fetched from server actions and uses owner-vs-member behavior: owners delete boards, members leave boards.

## Miscellaneous

- There are ad hoc root scripts `test_supabase.mjs` and `test_rest.mjs`, but they are not wired into `package.json` and should not be treated as official verification.
