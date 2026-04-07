/**
 * @file auth-helpers.ts
 * @description Utility functions for interacting with Supabase Auth sessions.
 */

import type { SupabaseClient, Session } from "@supabase/supabase-js";

/**
 * Retrieve the current authenticated user's ID.
 * @param supabase - The Supabase client instance.
 * @returns The user's UUID or null if no session exists.
 */
export async function getSessionUserId(supabase: SupabaseClient): Promise<string | null> {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    return session?.user?.id ?? null;
}

/**
 * Ensure an active session exists and return it.
 * @param supabase - The Supabase client instance.
 * @returns The current session or null.
 */
export async function ensureSession(supabase: SupabaseClient): Promise<Session | null> {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    return session;
}
