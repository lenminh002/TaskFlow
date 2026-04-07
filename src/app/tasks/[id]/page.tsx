/**
 * @file page.tsx
 * @description Server route for specific Kanban boards (`/tasks/[id]`).
 * @details React Server Component (RSC) that pre-fetches the board and tasks before rendering BoardClient.
 */

import styles from "./page.module.css";
import BoardContainer from "./BoardContainer";
import BoardClient from "./BoardClient";
import EditableTitle from "@/components/EditableTitle/EditableTitle";
import AddMemberButton from "@/components/AddMemberButton";
import { fetchCards, fetchBoardMembersFull } from "@/lib/actions";
import { getSessionUserId } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { fetchUsernameById } from "@/lib/user-helpers";

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
    const userId = await getSessionUserId(supabase);

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
                    <h2>You don&apos;t have permission to view this board</h2>
                    <p style={{ marginTop: '0.5rem', color: '#666' }}>Please check the URL or ensure you created this board.</p>
                </div>
            </div>
        );
    }

    const boardName = board.name;
    let creatorUsername = "Unknown";

    // Attempt lookup natively for UX author mapping
    if (board.user_id) {
        const username = await fetchUsernameById(supabase, board.user_id);
        if (!username) {
            console.warn(`User profile not found for board owner: ${board.user_id}`);
        } else {
            creatorUsername = username;
        }
    }

    // Bulk fetch all tasks filtered by the current board ID locally to hydrate the client
    const cards = await fetchCards(id);

    // Fetch the unified roster of everyone allowed to collaborate (for assignment dropdown mapping)
    const teamMembers = await fetchBoardMembersFull(id);

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerMain}>
                    <div className={styles.titleRow}>
                        <EditableTitle boardId={id} initialName={boardName} />
                        <span className={styles.creator_wrapper}>
                            created by <strong className={styles.creatorName}>{creatorUsername}</strong>
                            <div className={styles.creator_tooltip}>
                                ID: {board.user_id}
                            </div>
                        </span>
                    </div>
                </div>

                {userId && (
                    <div className={styles.headerActions}>
                        <span className={styles.userIdBadge}>
                            Your ID: {userId}
                        </span>
                        <AddMemberButton boardId={id} />
                    </div>
                )}
            </header>

            {/* A scrollable container clamping horizontal workflow layouts to standard screen sizes */}
            <BoardContainer className={styles.board}>
                <BoardClient key={id} boardId={id} initialTasks={cards} teamMembers={teamMembers} className={styles.columns}>
                    <div style={{ minWidth: '8px', flexShrink: 0 }} />
                </BoardClient>
            </BoardContainer>
        </div>
    )
}
