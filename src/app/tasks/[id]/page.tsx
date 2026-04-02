import styles from "./page.module.css";
import BoardContainer from "./BoardContainer";
import BoardClient from "./BoardClient";
import { tasks } from "@/lib/data";

export default async function TaskPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    // Find the task name corresponding to this ID from our shared data
    const task = tasks.find(t => t.id === id);
    const taskName = task ? task.name : `Task: ${id}`;

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>{taskName}</h1>

            <BoardContainer className={styles.board}>
                <BoardClient initialTasks={tasks} className={styles.columns}>
                    <button className={styles.add_column}>+</button>
                    <div style={{ minWidth: '8px', flexShrink: 0 }} />
                </BoardClient>
            </BoardContainer>
        </div>
    )
}