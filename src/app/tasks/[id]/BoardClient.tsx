"use client"; // This component uses React state (useState), so it must run on the client

import { useState } from "react";
import Column from "@/components/Column/Column";
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
    // crypto.randomUUID() generates a unique string like "3b241101-e2bb-4d7a-8613-e2e0927584a6"
    function addTask(status: ColumnStatus) {
        const newTask: Task = {
            id: crypto.randomUUID(),
            name: "New Task",
            status: status,
        };
        // Spread the previous tasks and add the new one at the end
        setTasks((prev) => [...prev, newTask]);
    }

    // Removes a task by filtering it out of the tasks array by its ID
    function removeTask(taskId: string) {
        setTasks((prev) => prev.filter((task) => task.id !== taskId));
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
            {/* children contains the add_column button and spacer from page.tsx */}
            {children}
        </div>
    );
}
