/**
 * @file page.tsx
 * @description Server route for specific Kanban boards (`/tasks/[id]`).
 * @details React Server Component (RSC) that pre-fetches the board and tasks before rendering BoardClient.
 */

import styles from "./page.module.css";
import BoardContainer from "./BoardContainer";
import BoardClient from "./BoardClient";
import EditableTitle from "./EditableTitle";
import AddMemberButton from "@/components/AddMemberButton";
import { fetchCards, fetchBoardMembersFull } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

/** 
 * Entrypoint for data hydration on Task board routes.
 * 
 * Technical Flow:
 * 1. Checks the active authenticated session natively pulling structural UUIDs.
 * 2. Fetches the core Board metadata strictly mapping `name` and `user_id` owner flags.
 * 3. Joins the owner's UUID against the public Profile table securely exposing creator metadata.
 * 4. Resolves the entire `tasks` array preemptively before generating the interactive UI.
 */
export default async function TaskPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    // Query Supabase directly to extract the specific board name and owner for the page header
    const { data: board, error } = await supabase
        .from('boards')
        .select('name, user_id')
        .eq('id', id)
        .single();

    if (error || !board) {
        return (
            <div className={styles.page} style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <div style={{ textAlign: "center", margin: "auto" }}>
                    <h2>You don't have permission to view this board</h2>
                    <p style={{ marginTop: '0.5rem', color: '#666' }}>Please check the URL or ensure you created this board.</p>
                </div>
            </div>
        );
    }

    const boardName = board.name;
    let creatorUsername = "Unknown";
    
    // Attempt lookup natively for UX author mapping
    if (board.user_id) {
        const { data: profile } = await supabase.from('users').select('username').eq('id', board.user_id).single();
        if (profile) creatorUsername = profile.username;
    }

    // Bulk fetch all tasks filtered by the current board ID locally to hydrate the client
    const cards = await fetchCards(id);
    
    // Fetch the unified roster of everyone allowed to collaborate (for assignment dropdown mapping)
    const teamMembers = await fetchBoardMembersFull(id);

    return (
        <div className={styles.page}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                    <EditableTitle boardId={id} initialName={boardName} />
                    <span 
                        className={styles.creator_wrapper}
                        style={{ fontSize: '0.85rem', fontStyle: 'italic', color: '#888' }}
                    >
                        created by <strong style={{ color: '#555' }}>{creatorUsername}</strong>
                        <div className={styles.creator_tooltip}>
                            ID: {board.user_id}
                        </div>
                    </span>
                </div>
                {userId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.875rem', color: '#666', fontFamily: 'monospace', padding: '0.5rem', backgroundColor: '#eee' }}>
                            Your ID: {userId}
                        </span>
                        <AddMemberButton boardId={id} />
                    </div>
                )}
            </header>

            {/* A scrollable container clamping horizontal workflow layouts to standard screen sizes */}
            <BoardContainer className={styles.board}>
                {/* Mount the interactive React core encapsulating state logic for drag-and-drop actions */}
                <BoardClient boardId={id} initialTasks={cards} teamMembers={teamMembers} className={styles.columns}>
                    <button className={styles.add_column}>+</button>
                    {/* Inject a non-shrinking visual pad preventing the rightmost content from hugging the edge */}
                    <div style={{ minWidth: '8px', flexShrink: 0 }} />
                </BoardClient>
            </BoardContainer>
        </div>
    )
}