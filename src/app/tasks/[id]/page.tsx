/**
 * @file page.tsx
 * @description Server route for specific Kanban boards (`/tasks/[id]`).
 * @details React Server Component (RSC) that pre-fetches the board and tasks before rendering BoardClient.
 */

import styles from "./page.module.css";
import BoardContainer from "./BoardContainer";
import BoardClient from "./BoardClient";
import EditableTitle from "./EditableTitle";
import { fetchCards } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

/** entrypoint for data hydration on Task board routes */
export default async function TaskPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    // Query Supabase directly to extract the specific board name for the page header
    const supabase = await createClient();
    const { data: board } = await supabase
        .from('boards')
        .select('name')
        .eq('id', id)
        .single()
    const boardName = board ? board.name : `Board: ${id}`;

    // Bulk fetch all tasks filtered by the current board ID locally to hydrate the client
    const cards = await fetchCards(id);

    return (
        <div className={styles.page}>
            {/* Render the board title as an interactive element allowing inline renaming */}
            <EditableTitle boardId={id} initialName={boardName} />

            {/* A scrollable container clamping horizontal workflow layouts to standard screen sizes */}
            <BoardContainer className={styles.board}>
                {/* Mount the interactive React core encapsulating state logic for drag-and-drop actions */}
                <BoardClient boardId={id} initialTasks={cards} className={styles.columns}>
                    <button className={styles.add_column}>+</button>
                    {/* Inject a non-shrinking visual pad preventing the rightmost content from hugging the edge */}
                    <div style={{ minWidth: '8px', flexShrink: 0 }} />
                </BoardClient>
            </BoardContainer>
        </div>
    )
}