/**
 * @file supabase.ts
 * @description Standardized client singleton for Supabase connections.
 * @details This file exports the single supabase instance used globally across the 
 * frontend application for database hydration and data operations.
 */

import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)