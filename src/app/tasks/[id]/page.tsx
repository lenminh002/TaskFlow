import styles from "./page.module.css";
import BoardContainer from "./BoardContainer";
import BoardClient from "./BoardClient";
import { tasks } from "@/lib/data";

// TaskPage is a Server Component — it runs on the server and fetches data before rendering.
// The URL parameter `id` determines which task/board to display.
export default async function TaskPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    // Find the task name corresponding to this ID from our shared data
    const task = tasks.find(t => t.id === id);
    const taskName = task ? task.name : `Task: ${id}`;

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>{taskName}</h1>

            {/* BoardContainer handles horizontal scrolling and wheel event interception */}
            <BoardContainer className={styles.board}>
                {/* BoardClient is a client component that manages task state (add/remove).
                    We pass the server-fetched tasks as initialTasks.
                    The children (add_column button + spacer) render inside the .columns flex row. */}
                <BoardClient initialTasks={tasks} className={styles.columns}>
                    {/* Button to add a new column (not yet functional) */}
                    <button className={styles.add_column}>+</button>
                    {/* Spacer to add right padding at the end of horizontal scroll */}
                    <div style={{ minWidth: '8px', flexShrink: 0 }} />
                </BoardClient>
            </BoardContainer>
        </div>
    )
}