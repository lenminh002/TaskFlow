"use client";

import { useState } from "react";
import Column from "@/components/Column/Column";
import { addCard, removeCard } from "@/lib/actions";
import type { Task, ColumnStatus } from "@/type/types";

// Define the 4 columns that make up the Kanban board.
const BOARD_COLUMNS: { title: string; status: ColumnStatus }[] = [
    { title: "To Do", status: "todo" },
    { title: "In Progress", status: "in_progress" },
    { title: "In Review", status: "in_review" },
    { title: "Done", status: "done" },
];

// BoardClient is a client component that owns the cards state for a specific board.
// It receives the board's cards from the server (page.tsx) via props,
// and manages adding/removing cards on the client side.
export default function BoardClient({ boardId, initialTasks, className, children }: { boardId: string; initialTasks: Task[]; className?: string; children?: React.ReactNode }) {
    // Store all cards in React state so the UI re-renders when cards change
    const [tasks, setTasks] = useState<Task[]>(initialTasks);

    // Creates a new card with a unique ID and adds it to the given column.
    // The card is linked to this board via boardId.
    async function addTask(status: ColumnStatus, name: string) {
        const newTask: Task = {
            id: crypto.randomUUID(),
            boardId: boardId,
            name: name,
            status: status,
        };
        // Optimistically update UI
        setTasks((prev) => [...prev, newTask]);

        // Persist to Supabase
        const result = await addCard({ id: newTask.id, name: newTask.name, status: status, boardId: boardId });
        if (!result) {
            // Rollback if insert failed
            setTasks((prev) => prev.filter((t) => t.id !== newTask.id));
        }
    }

    // Removes a card by filtering it out of the cards array by its ID
    async function removeTask(taskId: string) {
        // Save for rollback
        const prevTasks = tasks;
        // Optimistically update UI
        setTasks((prev) => prev.filter((task) => task.id !== taskId));

        // Persist to Supabase
        const success = await removeCard(taskId);
        if (!success) {
            // Rollback if delete failed
            setTasks(prevTasks);
        }
    }

    return (
        <div className={className}>
            {/* Render one Column for each board column definition */}
            {BOARD_COLUMNS.map(({ title, status }) => (
                <Column
                    key={status}
                    title={title}
                    status={status}
                    // Only pass cards that belong to this column's status
                    tasks={tasks.filter((t) => t.status === status)}
                    // When the "+" button is clicked, the Column modal provides the name
                    onAddCard={(name) => addTask(status, name)}
                    // When the "×" button is clicked on a card, remove that card
                    onRemoveCard={removeTask}
                />
            ))}
            {children}
        </div>
    );
}
