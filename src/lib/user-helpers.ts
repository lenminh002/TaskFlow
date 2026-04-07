/**
 * @file user-helpers.ts
 * @description Helper functions for fetching and verifying user profile data.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fetch a username by its associated User UUID.
 * @param supabase - The Supabase client instance.
 * @param userId - The UUID of the user to look up.
 * @returns The username string or null if not found.
 */
export async function fetchUsernameById(supabase: SupabaseClient, userId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from("users")
        .select("username")
        .eq("id", userId)
        .single();

    if (error || !data) {
        return null;
    }

    return data.username;
}

/**
 * Checks if a user profile already exists for a specific UUID.
 * @param supabase - The Supabase client instance.
 * @param userId - The UUID to check.
 * @returns True if a profile exists, false otherwise.
 */
export async function hasUserProfile(supabase: SupabaseClient, userId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            return false;
        }

        throw error;
    }

    return Boolean(data);
}
