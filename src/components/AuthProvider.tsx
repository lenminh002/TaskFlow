/**
 * @file AuthProvider.tsx
 * @description Global application wrapper that acts as an authentication interceptor.
 * @details This component shields the database logic by ensuring every single user explicitly
 * has a tracked "Guest" profile assigned to them the exact moment they open the application,
 * satisfying internal RLS permissions.
 */

"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const hasInitialized = useRef(false);

    useEffect(() => {
        // Prevent React strict mode double-firing from doing 2 back-to-back signins
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const initAuth = async () => {
            const supabase = createClient();
            
            // Check if user already has an active guest cookie session
            const { data } = await supabase.auth.getSession();
            
            if (!data.session) {
                console.log("No active session detected. Spawning new Anonymous Guest Profile...");
                
                // Trigger anonymous login which mints a JWT and stamps it seamlessly into the browser cookies
                const { error, data: authData } = await supabase.auth.signInAnonymously();
                
                if (error) {
                    console.error("Anonymous authentication failed to initialize:", error);
                } else if (authData.session) {
                    console.log("Guest profile bound successfully! Refreshing Server Components...");
                    
                    // Force the Next.js Server Components to re-render.
                    // During this re-render, the new guest cookie is passed to `server.ts`,
                    // granting `actions.ts` secure backend authorization via Row Level Security (RLS) policies.
                    router.refresh();
                }
            }
        };
        
        initAuth();
    }, [router]);

    // Pass-through wrapper, we do not block rendering!
    return <>{children}</>;
}
