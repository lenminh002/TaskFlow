"use client";

import { useState } from "react";
import Column from "@/components/Column/Column";
import { addCard, removeCard } from "@/lib/actions";
import type { Task, ColumnStatus } from "@/type/types";

/**
 * @file BoardClient.tsx
 * @description Central state manager for the Kanban board UI.
 * @details Manages local React state for all tasks, orchestrating drag-and-drop, UI updates, and Supabase synchronization.
 */

// Status maps to literal types in the Task interface.
const BOARD_COLUMNS: { title: string; status: ColumnStatus }[] = [
    { title: "To Do", status: "todo" },
    { title: "In Progress", status: "in_progress" },
    { title: "In Review", status: "in_review" },
    { title: "Done", status: "done" },
];

/**
 * Renders Kanban columns and handles task state mutations.
 */
export default function BoardClient({ boardId, initialTasks, className, children }: { boardId: string; initialTasks: Task[]; className?: string; children?: React.ReactNode }) {
    // Store all cards in React state so the UI re-renders instantly when cards change
    const [tasks, setTasks] = useState<Task[]>(initialTasks);

    // Creates a new card with a unique ID, optimistically updates the UI, and persists it to Supabase
    async function addTask(status: ColumnStatus, name: string) {
        const newTask: Task = {
            id: crypto.randomUUID(),
            boardId: boardId,
            name: name,
            status: status,
            createdAt: new Date().toISOString(),
        };
        
        // Optimistically update the UI immediately
        setTasks((prev) => [...prev, newTask]);

        // Attempt to persist the new card to Supabase
        const result = await addCard({ id: newTask.id, name: newTask.name, status: status, boardId: boardId });
        if (!result) {
            // Rollback the UI update if the database insertion failed
            setTasks((prev) => prev.filter((t) => t.id !== newTask.id));
        }
    }

    // Removes a card from the UI immediately and attempts to delete it from Supabase
    async function removeTask(taskId: string) {
        const prevTasks = tasks;
        
        // Optimistically remove the card from the UI
        setTasks((prev) => prev.filter((task) => task.id !== taskId));

        // Attempt to delete the card from Supabase
        const success = await removeCard(taskId);
        if (!success) {
            // Rollback the UI update if the deletion failed
            setTasks(prevTasks);
        }
    }

    // Updates specific fields of a task, applies them optimistically, and syncs to Supabase
    async function updateTask(id: string, updates: Partial<Task>) {
        // Optimistically apply the changes to the UI immediately
        setTasks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
        );

        // Extract and map the specific fields required for the database update
        const dbUpdates: any = {};
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.dueDate !== undefined) {
            dbUpdates.due_date = updates.dueDate instanceof Date
                ? updates.dueDate.toISOString()
                : updates.dueDate;
        }

        const { updateCardDetails } = await import("@/lib/actions");
        const result = await updateCardDetails(id, dbUpdates);

        // Log an error if the database update failed
        if (!result) {
            console.error("Failed to update task details");
        }
    }

    return (
        <div className={className}>
            {BOARD_COLUMNS.map(({ title, status }) => (
                <Column
                    key={status}
                    title={title}
                    status={status}
                    // Filter tasks by status for layout
                    tasks={tasks.filter((t) => t.status === status)}
                    onAddCard={(name) => addTask(status, name)}
                    onUpdateCard={(id, updates) => updateTask(id, updates)}
                    onRemoveCard={removeTask}
                />
            ))}
            {children}
        </div>
    );
}
