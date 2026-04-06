/**
 * @file client.ts
 * @description Generates a Supabase client designed safely for Next.js browser execution.
 * @details Extracts caching cookies dynamically from standard `document.cookie`. 
 * Use this ONLY inside Client Components ("use client") when querying Supabase.
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
