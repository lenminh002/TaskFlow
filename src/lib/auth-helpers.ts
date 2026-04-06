import type { SupabaseClient, Session } from "@supabase/supabase-js";

export async function getSessionUserId(supabase: SupabaseClient): Promise<string | null> {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    return session?.user?.id ?? null;
}

export async function ensureSession(supabase: SupabaseClient): Promise<Session | null> {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    return session;
}
