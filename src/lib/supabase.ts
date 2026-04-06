/**
 * @file supabase.ts
 * @description Standardized client singleton for Supabase connections.
 * @details This file exports the single supabase instance used globally across the 
 * frontend application for database hydration and data operations.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        "Missing Supabase environment variables! Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)