/**
 * @file page.tsx
 * @description Application landing page (Root Route).
 * @details Displays the user's ID in a styled badge and provides a prompt to select a project.
 */

import { createClient } from "@/lib/supabase/server";
import { getSessionUserId } from "@/lib/auth-helpers";

/**
 * The Root Landing Page of the application.
 */
export default async function Home() {
  const supabase = await createClient();
  const userId = await getSessionUserId(supabase);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
      minHeight: 0,
      position: 'relative', // Relative positioning context for the absolute ID badge
      height: '100%',
    }}>
      {/* Top right corner ID badge for quick copying during team onboarding */}
      {userId && (
        <div style={{
          position: 'absolute',
          top: '1.5rem',
          right: '2rem',
          backgroundColor: '#eee',
          padding: '0.5rem',
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          color: '#666',
        }}>
          Your ID: {userId}
        </div>
      )}
      <h1>Select or create a project to start</h1>
    </div>
  );
}
