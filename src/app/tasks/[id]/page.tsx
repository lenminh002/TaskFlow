import styles from "./page.module.css";
import BoardContainer from "./BoardContainer";
import BoardClient from "./BoardClient";
import EditableTitle from "./EditableTitle";
import { fetchCards } from "@/lib/actions";
import { supabase } from "@/lib/supabase";

// TaskPage is a Server Component — it runs on the server and fetches data before rendering.
// The URL parameter `id` is the board ID — it determines which board's cards to display.
export default async function TaskPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    // Fetch the board name from Supabase
    const { data: board } = await supabase
        .from('boards')
        .select('name')
        .eq('id', id)
        .single()
    const boardName = board ? board.name : `Board: ${id}`;

    // Fetch only cards that belong to this board
    const cards = await fetchCards(id);

    return (
        <div className={styles.page}>
            {/* Click the title to rename the board */}
            <EditableTitle boardId={id} initialName={boardName} />

            {/* BoardContainer handles horizontal scrolling and wheel event interception */}
            <BoardContainer className={styles.board}>
                {/* BoardClient manages card state (add/remove) for this specific board.
                    We pass the board ID so new cards are linked to this board. */}
                <BoardClient boardId={id} initialTasks={cards} className={styles.columns}>
                    {/* Button to add a new column (not yet functional) */}
                    <button className={styles.add_column}>+</button>
                    {/* Spacer to add right padding at the end of horizontal scroll */}
                    <div style={{ minWidth: '8px', flexShrink: 0 }} />
                </BoardClient>
            </BoardContainer>
        </div>
    )
}