"use client";

import { useState, useEffect, useMemo } from "react";
import Column from "@/components/Column/Column";
import { addCard, removeCard, updateTaskPositions, updateCardDetails } from "@/lib/actions";
import type { Task, ColumnStatus } from "@/type/types";
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, DragOverlay, closestCorners, DragStartEvent, DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import Card from "@/components/Card/Card";

/**
 * @file BoardClient.tsx
 * @description Central state manager for the Kanban board UI.
 * @details Manages local React state for all tasks, orchestrating drag-and-drop via dnd-kit, UI updates, and Supabase synchronization.
 */

const BOARD_COLUMNS: { title: string; status: ColumnStatus }[] = [
    { title: "To Do", status: "todo" },
    { title: "In Progress", status: "in_progress" },
    { title: "In Review", status: "in_review" },
    { title: "Done", status: "done" },
];

/**
 * @param boardId - The ID of the database board currently being rendered.
 * @param initialTasks - The static list of tasks fetched server-side to hydrate the board.
 * @param className - Optional CSS class for top-level styling injection.
 * @param children - Any optional React nodes to append inside the board view.
 */
export default function BoardClient({ boardId, initialTasks, className, children }: { boardId: string; initialTasks: Task[]; className?: string; children?: React.ReactNode }) {
    // During initial component mount, we forcefully re-sort the prop tasks fetched from the server.
    // This ensures that even if Supabase returned rows asynchronously out-of-order, 
    // the local sequence flawlessly honors the floating-point `position` column.
    const sortedInitial = [...initialTasks].sort((a, b) => (a.position || 0) - (b.position || 0));

    // `tasks` holds the entire application's source of truth for all columns simultaneously.
    const [tasks, setTasks] = useState<Task[]>(sortedInitial);

    // `activeTask` specifically tracks whichever piece of DOM the user is currently holding with their mouse/finger.
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    // Memoize the tasks by column status to prevent repeated O(N) filter sweeps during every single render pass.
    const groupedTasks = useMemo(() => {
        const groups: Record<string, Task[]> = { todo: [], in_progress: [], in_review: [], done: [] };
        tasks.forEach(t => {
            if (t.status && groups[t.status]) {
                groups[t.status].push(t);
            }
        });
        return groups;
    }, [tasks]);

    // SSR hydration mismatch fix workaround for @dnd-kit generated aria attributes
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Initialize dnd-kit sensors: PointerSensor allows dragging with mice,
    // while TouchSensor ensures standard drag gestures don't block mobile page scrolling (requiring a 250ms press).
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    /**
     * Adds a new task to the local state and syncs it with the Supabase database.
     * 
     * Technical Breakdown:
     * 1. Filters the current master board tasks down to only the requested `status` column.
     * 2. Finds the maximum `position` float currently inside that specific column.
     * 3. Adds exactly +1000.0 to that maximum. This mathematical "+1000 step distance" technique allows us
     *    to easily inject future items in between existing items later without rewriting all array positions.
     *    (Eg: Inserting between pos 1000 and pos 2000 means inserting at pos 1500, a zero-cost quick math shift, rather than integers 1 & 2 where placing between requires shifting 3, 4, 5+ outwards)
     * 4. Updates the local React visual array INSTANTLY (optimistic update).
     * 5. Spawns an asynchronous background thread writing to Supabase.
     */
    async function addTask(status: ColumnStatus, name: string) {
        const colTasks = tasks.filter(t => t.status === status);
        const maxPos = colTasks.length > 0 ? Math.max(...colTasks.map(t => t.position ?? 0)) : 0;
        const newPos = maxPos + 1000;

        const newTask: Task = {
            id: crypto.randomUUID(),
            boardId: boardId,
            name: name,
            status: status,
            position: newPos,
            createdAt: new Date().toISOString(),
        };

        setTasks((prev) => [...prev, newTask]);

        try {
            await addCard({ id: newTask.id, name: newTask.name, status: status, boardId: boardId });
            // Await position sync to ensure the new task's order is persisted before the user can interact further.
            await updateTaskPositions([{ id: newTask.id, position: newPos, status: status }]);
        } catch (e) {
            console.error("Failed to add new task:", e);
            setTasks((prev) => prev.filter((t) => t.id !== newTask.id));
        }
    }

    /**
     * Deletes a task from both the local React state and the remote Supabase database.
     * Performs an optimistic removal, rolling back if the network request fails.
     * @param taskId - The unique identifier of the task to gracefully remove.
     */
    async function removeTask(taskId: string) {
        const prevTasks = tasks;
        setTasks((prev) => prev.filter((task) => task.id !== taskId));
        try {
            await removeCard(taskId);
        } catch (e) {
            console.error("Failed to remove task:", e);
            setTasks(prevTasks);
        }
    }

    /**
     * Updates specific fields of an existing task on the dashboard locally and remotely.
     * Supports mapping over description, priority, status, and precise due dates.
     * @param id      - The unique identifier belonging to the task.
     * @param updates - Object containing the fields to update (e.g. description, priority).
     */
    async function updateTask(id: string, updates: Partial<Task>) {
        // Snapshot previous state for rollback if the DB write fails.
        const prevTasks = tasks;

        // Optimistic UI update — apply changes immediately.
        setTasks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
        );

        const dbUpdates: any = {};
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.dueDate !== undefined) {
            dbUpdates.due_date = updates.dueDate instanceof Date
                ? updates.dueDate.toISOString()
                : updates.dueDate;
        }

        try {
            await updateCardDetails(id, dbUpdates);
        } catch (e) {
            // Rollback: restore the previous task state since the DB write failed.
            console.error("Failed to update task details — rolling back.", e);
            setTasks(prevTasks);
        }
    }

    /**
     * dnd-kit Event Handler: Fired the moment a user begins dragging a card.
     * Caches the active task in local state so the DragOverlay can render a floating clone smoothly.
     * @param event - The payload from dnd-kit containing the `active` draggable node details.
     */
    function handleDragStart(event: DragStartEvent) {
        const { active } = event;
        const task = tasks.find(t => t.id === active.id);
        if (task) setActiveTask(task);
    }

    /**
     * dnd-kit Event Handler: Continuously fired while a card is dragged over other elements.
     * Used for moving cards seamlessly between columns before the user drops them.
     * Applies instantaneous array adjustments to trick the DOM into rendering the card in the new column live.
     * @param event - The payload containing the `active` dragged node and the `over` hovered node.
     */
    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveTask = active.data.current?.type === "Task";
        const isOverTask = over.data.current?.type === "Task";
        const isOverColumn = over.data.current?.type === "Column";

        if (!isActiveTask) return;

        setTasks((tasks) => {
            const activeIndex = tasks.findIndex((t) => t.id === activeId);
            const overIndex = tasks.findIndex((t) => t.id === overId);

            if (isOverTask && tasks[activeIndex].status !== tasks[overIndex].status) {
                const newTasks = [...tasks];
                newTasks[activeIndex].status = tasks[overIndex].status;
                return arrayMove(newTasks, activeIndex, overIndex);
            }

            if (isOverColumn) {
                const newTasks = [...tasks];
                newTasks[activeIndex].status = overId as ColumnStatus;
                return arrayMove(newTasks, activeIndex, activeIndex);
            }

            return tasks;
        });
    }

    /**
     * dnd-kit Event Handler: Fired the exact moment the user drops the card (releases mouse/finger).
     * 
     * Technical Breakdown:
     * 1. Nulifies `activeTask` destroying the temporary floating CSS clone immediately.
     * 2. Determines whether the item was dropped onto itself (no-op) or a new zone.
     * 3. Uses dnd-kit `arrayMove` to permanently swap the physical JS array indexes.
     * 4. Filters just the affected column where the task was dropped out of the master tasks array.
     * 5. Recalculates index paths loop mapping the "pure sequence step" (`(index + 1) * 1000`) 
     *    to normalize positions so they are heavily spread out by 1000 point buffers.
     *    We enforce a sync update to Supabase for *any* single item whose position drifted.
     * 
     * @param event - The payload housing the precise drop location `over` and the originating `active` node.
     */
    function handleDragEnd(event: DragEndEvent) {
        setActiveTask(null);
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        setTasks((tasks) => {
            const activeIndex = tasks.findIndex((t) => t.id === activeId);
            const overIndex = tasks.findIndex((t) => t.id === overId);

            let newTasks = tasks;
            if (activeIndex !== overIndex) {
                newTasks = arrayMove(newTasks, activeIndex, overIndex);
            }

            const status = newTasks.find(t => t.id === activeId)?.status;
            const columnTasks = newTasks.filter(t => t.status === status);

            const updatesToSync: { id: string, position: number, status: string }[] = [];

            newTasks = newTasks.map(t => {
                if (t.status === status) {
                    const idx = columnTasks.findIndex(ct => ct.id === t.id);
                    const newPos = (idx + 1) * 1000;
                    if (t.position !== newPos || t.id === activeId) {
                        updatesToSync.push({ id: t.id, position: newPos, status: t.status as string });
                        return { ...t, position: newPos };
                    }
                }
                return t;
            });

            if (updatesToSync.length > 0) {
                // Dispatched implicitly in the background
                try {
                    updateTaskPositions(updatesToSync);
                } catch (e) {
                    console.error("Failed to sync drag positions:", e);
                }
            }

            return newTasks;
        });
    }

    // SSR Guard for dnd-kit dynamic aria attributes hydration mismatch
    if (!isMounted) {
        return null;
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className={className}>
                {BOARD_COLUMNS.map(({ title, status }) => {
                    const columnTasks = groupedTasks[status as string] || [];
                    return (
                        <Column
                            key={status}
                            title={title}
                            status={status}
                            tasks={columnTasks}
                            onAddCard={(name) => addTask(status, name)}
                            onUpdateCard={(id, updates) => updateTask(id, updates)}
                            onRemoveCard={removeTask}
                        />
                    );
                })}
                {children}
            </div>

            {typeof document !== "undefined" && (
                <DragOverlay>
                    {activeTask ? (
                        <Card task={activeTask} />
                    ) : null}
                </DragOverlay>
            )}
        </DndContext>
    );
}

