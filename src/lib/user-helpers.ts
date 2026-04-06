import type { SupabaseClient } from "@supabase/supabase-js";

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
