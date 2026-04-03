"use client";

import { useState } from "react";
import Column from "@/components/Column/Column";
import { addTask as addTaskToDb, removeTask as removeTaskFromDb } from "@/lib/actions";
import type { Task, ColumnStatus } from "@/type/types";

// Define the 4 columns that make up the Kanban board.
const BOARD_COLUMNS: { title: string; status: ColumnStatus }[] = [
    { title: "To Do", status: "todo" },
    { title: "In Progress", status: "in_progress" },
    { title: "In Review", status: "in_review" },
    { title: "Done", status: "done" },
];

// BoardClient is a client component that owns the tasks state.
// It receives the initial tasks from the server (page.tsx) via props,
// and manages adding/removing tasks on the client side.
export default function BoardClient({ initialTasks, className, children }: { initialTasks: Task[]; className?: string; children?: React.ReactNode }) {
    // Store all tasks in React state so the UI re-renders when tasks change
    const [tasks, setTasks] = useState<Task[]>(initialTasks);

    // Creates a new task with a unique ID and adds it to the given column.
    async function addTask(status: ColumnStatus) {
        const newTask = {
            id: crypto.randomUUID(),
            name: "New Task",
            status: status,
        };
        // Optimistically update UI
        setTasks((prev) => [...prev, newTask]);

        // Persist to Supabase
        const result = await addTaskToDb({ id: newTask.id, name: newTask.name, status: newTask.status });
        if (!result) {
            // Rollback if insert failed
            setTasks((prev) => prev.filter((t) => t.id !== newTask.id));
        }
    }

    // Removes a task by filtering it out of the tasks array by its ID
    async function removeTask(taskId: string) {
        // Save for rollback
        const prevTasks = tasks;
        // Optimistically update UI
        setTasks((prev) => prev.filter((task) => task.id !== taskId));

        // Persist to Supabase
        const success = await removeTaskFromDb(taskId);
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
                    // Only pass tasks that belong to this column's status
                    tasks={tasks.filter((t) => t.status === status)}
                    // When the "+" button is clicked, add a task to this column
                    onAddCard={() => addTask(status)}
                    // When the "×" button is clicked on a card, remove that task
                    onRemoveCard={removeTask}
                />
            ))}
            {children}
        </div>
    );
}
