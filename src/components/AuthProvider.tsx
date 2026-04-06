/**
 * @file AuthProvider.tsx
 * @description Global application wrapper that acts as an authentication interceptor.
 * @details This component shields the database logic by ensuring every single user explicitly
 * has a tracked "Guest" profile assigned to them the exact moment they open the application,
 * satisfying internal RLS permissions.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ensureSession } from "@/lib/auth-helpers";
import { hasUserProfile } from "@/lib/user-helpers";
import WelcomeModal from "./WelcomeModal";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const hasInitialized = useRef(false);
    
    const [needsUsername, setNeedsUsername] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        // Prevent React strict mode double-firing from doing 2 back-to-back signins
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const initAuth = async () => {
            const supabase = createClient();
            
            // Extract active JWT cookie session
            let currentSession = await ensureSession(supabase);
            
            if (!currentSession) {
                if (process.env.NODE_ENV === 'development') {
                    console.log("No active session detected. Spawning new Anonymous Guest Profile...");
                }
                const { error, data: authData } = await supabase.auth.signInAnonymously();
                
                if (error || !authData.session) {
                    console.error("Anonymous authentication failed to initialize:", error);
                    return;
                }
                
                currentSession = authData.session;
            }
            
            if (currentSession) {
                const uid = currentSession.user.id;
                setUserId(uid);
                
                // Read from Public public users table to verify if they went through the Welcome Gate
                let profileExists = false;

                try {
                    profileExists = await hasUserProfile(supabase, uid);
                } catch (profileError) {
                    console.error("Failed to verify user profile:", profileError);
                    return;
                }

                if (!profileExists) {
                    if (process.env.NODE_ENV === 'development') {
                        console.log("No users table row detected. Staging Welcome Interceptor.");
                    }
                    setNeedsUsername(true);
                } else {
                    // Existing complete user detected
                    router.refresh();
                }
            }
        };
        
        initAuth();
    }, [router]);

    return (
        <>
            {children}
            {needsUsername && userId && (
                <WelcomeModal 
                    userId={userId} 
                    onComplete={() => {
                        setNeedsUsername(false);
                        router.refresh(); // Refresh Server Components enforcing safe RLS
                    }} 
                />
            )}
        </>
    );
}
