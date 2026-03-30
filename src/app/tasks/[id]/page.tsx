import styles from "./page.module.css";
import Column from "@/components/Column/Column";
import BoardContainer from "./BoardContainer";
import { tasks } from "@/lib/data";

export default async function TaskPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    // Find the task name corresponding to this ID from our shared data
    const task = tasks.find(t => t.id === id);
    const taskName = task ? task.name : `Task: ${id}`;

    return (
        <div>
            <h1 className={styles.title}>{taskName}</h1>

            <BoardContainer className={styles.board}>
                <div className={styles.columns}>
                    <Column />
                    <Column />
                    <Column />
                    <Column />
                    <button className={styles.add_column}>+</button>
                    <div style={{ minWidth: '8px', flexShrink: 0 }} />
                </div>
            </BoardContainer>
        </div>
    )
}