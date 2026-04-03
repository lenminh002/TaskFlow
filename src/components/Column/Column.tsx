import styles from "./Column.module.css";
import Card from "@/components/Card/Card";
import type { Task, ColumnStatus } from "@/type/types";

// Props for the Column component (defined here since only Column uses it)
interface ColumnProps {
    title: string;                          // Display name shown at the top of the column (e.g. "To Do")
    status: ColumnStatus;                   // Status key used as a data attribute for styling/filtering
    tasks?: Task[];                         // Array of tasks to render as cards inside this column
    onAddCard?: () => void;                 // Callback triggered when the "+" button is clicked
    onRemoveCard?: (id: string) => void;    // Callback triggered when a card's "×" button is clicked
}

// Column represents a single vertical lane on the Kanban board.
// It receives its tasks and callbacks from BoardClient (the parent).
export default function Column({ title, status, tasks = [], onAddCard, onRemoveCard }: ColumnProps) {
    return (
        <div className={styles.column} data-status={status}>
            <h1>{title}</h1>

            {/* Render a Card for each task in this column */}
            {tasks.map((task) => (
                <Card 
                    key={task.id} 
                    task={task} 
                    onRemoveCard={onRemoveCard}
                />
            ))}

            <hr style={{ border: '1px solid #000000' }} />

            {/* "+" button to add a new card to this column */}
            <button className={styles.add_card} onClick={onAddCard}>+</button>
        </div>
    );
}