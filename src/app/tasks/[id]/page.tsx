import styles from "./page.module.css";
import Column from "@/components/Column/Column";
import BoardContainer from "./BoardContainer";
import { tasks } from "@/lib/data";
import type { ColumnStatus } from "@/type/types";

const BOARD_COLUMNS: { title: string; status: ColumnStatus }[] = [
    { title: "To Do", status: "todo" },
    { title: "In Progress", status: "in_progress" },
    { title: "In Review", status: "in_review" },
    { title: "Done", status: "done" },
];

export default async function TaskPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    // Find the task name corresponding to this ID from our shared data
    const task = tasks.find(t => t.id === id);
    const taskName = task ? task.name : `Task: ${id}`;

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>{taskName}</h1>

            <BoardContainer className={styles.board}>
                <div className={styles.columns}>
                    {BOARD_COLUMNS.map(({ title, status }) => (
                        <Column
                            key={status}
                            title={title}
                            status={status}
                            tasks={tasks.filter((t) => t.status === status)}
                        />
                    ))}
                    <button className={styles.add_column}>+</button>
                    <div style={{ minWidth: '8px', flexShrink: 0 }} />
                </div>
            </BoardContainer>
        </div>
    )
}