/**
 * @file server.ts
 * @description Generates a secure Supabase client strictly bound for Next.js Server environments.
 * @details Synchronously parses physical HTTP browser cookies out of `next/headers` to construct a 
 * trusted user context. This guarantees Server Actions are safely constrained by Row-Level Security (RLS).
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This is safely ignored if called repeatedly out of context.
          }
        },
      },
    }
  )
}
