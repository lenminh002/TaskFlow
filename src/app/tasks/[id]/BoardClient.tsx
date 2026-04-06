"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Column from "@/components/Column/Column";
import { addCard, removeCard, updateTaskPositions, updateCardDetails } from "@/lib/actions";
import type { Task, ColumnStatus } from "@/type/types";
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, DragOverlay, closestCorners, DragStartEvent, DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import Card from "@/components/Card/Card";
import { createClient } from "@/lib/supabase/client";
import { BOARD_COLUMNS } from "@/lib/constants";
import { mapTaskRow } from "@/lib/task-mappers";

/**
 * @file BoardClient.tsx
 * @description Central state manager for the Kanban board UI.
 * @details Manages local React state for all tasks, orchestrating drag-and-drop via dnd-kit, UI updates, and Supabase synchronization.
 */

/**
 * @param boardId - The ID of the database board currently being rendered.
 * @param initialTasks - The static list of tasks fetched server-side to hydrate the board.
 * @param teamMembers - A flattened mapping of Names->UUIDs authorized to edit this board natively.
 * @param className - Optional CSS class for top-level styling injection.
 * @param children - Any optional React nodes to append inside the board view.
 */
const sortTasksByPosition = (taskList: Task[]) => [...taskList].sort((a, b) => (a.position || 0) - (b.position || 0));

type CardUpdatePayload = Partial<{
    name: string;
    description: string | null;
    priority: Task["priority"] | null;
    status: ColumnStatus;
    assignee_id: string | null;
    labels: string[];
    due_date: string | null;
}>;

export default function BoardClient({ boardId, initialTasks, teamMembers = [], className, children }: { boardId: string; initialTasks: Task[]; teamMembers?: { id: string, username: string }[]; className?: string; children?: React.ReactNode }) {
    // During initial component mount, we forcefully re-sort the prop tasks fetched from the server.
    // This ensures that even if Supabase returned rows asynchronously out-of-order, 
    // the local sequence flawlessly honors the floating-point `position` column.
    const sortedInitial = useMemo(() => sortTasksByPosition(initialTasks), [initialTasks]);

    // `tasks` holds the entire application's source of truth for all columns simultaneously.
    const [tasks, setTasks] = useState<Task[]>(sortedInitial);

    // `activeTask` specifically tracks whichever piece of DOM the user is currently holding with their mouse/finger.
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const isDraggingRef = useRef(false);

    // Performance Fix 1: Self-event cooldown
    // After the user performs their own drag or card update, suppress incoming realtime events
    // for 1 second to avoid redundant refetches triggered by our own writes.
    const selfUpdateCooldownRef = useRef(false);
    const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Performance Fix 2: Debounce timer for realtime events
    // Collapses N rapid Postgres WAL events into a single fetchCards() call.
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /** Activates the self-event cooldown for a given duration (default 1s). */
    function startCooldown(ms = 1000) {
        selfUpdateCooldownRef.current = true;
        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = setTimeout(() => {
            selfUpdateCooldownRef.current = false;
        }, ms);
    }

    useEffect(() => {
        isDraggingRef.current = !!activeTask;
    }, [activeTask]);

    /**
     * Collaborative Supabase Realtime Socket Setup
     * 
     * Hooks into the Write-Ahead Log (WAL) listener in Postgres specifically bypassing filtering.
     * When any transaction mutates the `tasks` pipeline on any board, it fires correctly! 
     */
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel(`realtime-board-${boardId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                    filter: `board_id=eq.${boardId}`
                },
                (payload) => {
                    if (process.env.NODE_ENV === 'development') {
                        console.log("⚡ Realtime Sync Fired:", payload.eventType);
                    }

                    // Fix 1: Skip refetch if this event was triggered by our own write
                    if (selfUpdateCooldownRef.current) {
                        if (process.env.NODE_ENV === 'development') {
                            console.log("⏭️ Skipping self-triggered realtime event.");
                        }
                        return;
                    }

                    // Fix 2: Debounce — collapse rapid events into a single fetch
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(async () => {
                        // Use the client-side Supabase directly instead of the server action
                        // to avoid Next.js caching issues when called from setTimeout.
                        const { data, error } = await supabase
                            .from('tasks')
                            .select('*, users(username)')
                            .eq('board_id', boardId)
                            .order('position', { ascending: true });

                        if (error) {
                            console.error("Realtime refetch failed:", error.message);
                            return;
                        }

                        if (!isDraggingRef.current && data) {
                            const mapped = data.map(mapTaskRow);
                            setTasks(sortTasksByPosition(mapped));
                        }
                    }, 500);
                }
            )
            .subscribe((status) => {
                if (process.env.NODE_ENV === 'development') {
                    console.log("Supabase WebSocket:", status);
                }
            });

        return () => {
            supabase.removeChannel(channel);
            // Clean up pending debounce on unmount
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
        };
    }, [boardId]);

    // ─── Label Filtering State ─────────────────────────────────────────

    // Tracks which labels the user has actively clicked in the global filter toolbar.
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

    /**
     * Extracts and deduplicates every single label assigned natively to any task on the board.
     * Evaluated iteratively to generate the top filter bar rendering.
     * Uses useMemo to avoid needlessly running the Set traversal on every DOM render cycle.
     */
    const uniqueLabels = useMemo(() => {
        const _labels = new Set<string>();
        tasks.forEach(t => t.labels?.forEach(l => _labels.add(l)));
        return Array.from(_labels).sort();
    }, [tasks]);

    /**
     * The master filtered pipeline.
     * Intercepts the raw `tasks` array and trims it down based on the `selectedLabels`.
     * If no filters are active, it acts dynamically as a bypass, returning all tasks.
     */
    const filteredTasks = useMemo(() => {
        if (selectedLabels.length === 0) return tasks;
        return tasks.filter(t => t.labels?.some(l => selectedLabels.includes(l)));
    }, [tasks, selectedLabels]);

    // Memoize the tasks by column status to prevent repeated O(N) filter sweeps during every single render pass.
    const groupedTasks = useMemo(() => {
        const groups: Record<string, Task[]> = { todo: [], in_progress: [], in_review: [], done: [] };
        filteredTasks.forEach(t => {
            if (t.status && groups[t.status]) {
                groups[t.status].push(t);
            }
        });
        return groups;
    }, [filteredTasks]);

    // SSR hydration mismatch fix workaround for @dnd-kit generated aria attributes
    const isMounted = typeof document !== "undefined";

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
            startCooldown();
            await addCard({ id: newTask.id, name: newTask.name, status: status, boardId: boardId, position: newPos });
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

        const dbUpdates: CardUpdatePayload = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.description !== undefined) dbUpdates.description = updates.description === "" ? null : updates.description;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority ?? null;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.assigneeId !== undefined) dbUpdates.assignee_id = updates.assigneeId === "" ? null : updates.assigneeId;
        if (updates.labels !== undefined) dbUpdates.labels = updates.labels;
        if (updates.dueDate !== undefined) {
            dbUpdates.due_date = updates.dueDate instanceof Date
                ? updates.dueDate.toISOString()
                : updates.dueDate === "" ? null : updates.dueDate;
        }

        try {
            startCooldown(); // Suppress our own realtime events
            await updateCardDetails(id, dbUpdates);
        } catch (e) {
            // Rollback: restore the previous task state since the DB write failed.
            console.error("Failed to update task details — rolling back.", e);
            setTasks(prevTasks);
        }
    }

    /**
     * Delete a label entirely from the board. 
     * Eradicates the label on all tasks asynchronously.
     */
    async function deleteGlobalLabel(labelToDelete: string) {
        const affectedTasks = tasks.filter(t => t.labels?.includes(labelToDelete));
        if (affectedTasks.length === 0) return;

        // Optimistically pull it out of all local copies
        setTasks(prev => prev.map(t => {
            if (t.labels?.includes(labelToDelete)) {
                return { ...t, labels: t.labels.filter(l => l !== labelToDelete) };
            }
            return t;
        }));

        // Also remove from selectedFilters actively to avoid ghosting
        setSelectedLabels(prev => prev.filter(l => l !== labelToDelete));

        // Submit sequential patches (Supabase doesn't natively expose an array_remove RPC by default without custom SQL functions)
        startCooldown();
        Promise.all(affectedTasks.map(t =>
            updateCardDetails(t.id, { labels: t.labels!.filter(l => l !== labelToDelete) })
        )).catch(e => {
            console.error("Failed to fully delete label globally:", e);
        });
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

            if (activeIndex === -1 || (isOverTask && overIndex === -1)) return tasks;

            if (isOverTask) {
                const newTasks = [...tasks];
                // Cross-column: update the card's status to match the target column
                if (newTasks[activeIndex].status !== newTasks[overIndex].status) {
                    newTasks[activeIndex].status = newTasks[overIndex].status;
                }
                // Both same-column and cross-column: reorder the array
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

        const previousTasks = tasks;

        const activeId = active.id as string;
        const overId = over.id as string;
        const isOverColumn = over.data.current?.type === "Column";

        const updatesToSync: { id: string, position: number, status: string }[] = [];

        // handleDragOver already moved the card to the correct position in the array.
        // Here we just need to handle the "drop onto empty column" case and recalculate positions.
        let newTasks = [...tasks];

        // Special case: dropping directly onto a column container (empty column or column whitespace)
        if (isOverColumn) {
            const activeIndex = newTasks.findIndex((t) => t.id === activeId);
            if (activeIndex === -1) return;
            newTasks[activeIndex].status = overId as ColumnStatus;
            newTasks = arrayMove(newTasks, activeIndex, newTasks.length - 1);
        }

        // Recalculate positions for the affected column
        const status = newTasks.find(t => t.id === activeId)?.status;
        const columnTasks = newTasks.filter(t => t.status === status);

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

        // Apply updated positions locally
        setTasks(newTasks);

        // Sync positions to database asynchronously
        if (updatesToSync.length > 0) {
            startCooldown(); // Suppress our own realtime events
            updateTaskPositions(updatesToSync).catch((e) => {
                console.error("Failed to sync drag positions:", e);
                setTasks(previousTasks);
            });
        }
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
            <div style={{ paddingBottom: '1rem', position: 'sticky', left: 0 }}>
                {uniqueLabels.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#666' }}>Filter:</span>
                        {uniqueLabels.map(label => {
                            const isSelected = selectedLabels.includes(label);
                            return (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', background: isSelected ? '#0070f3' : '#fff', border: `1px solid ${isSelected ? '#0070f3' : '#ccc'}`, borderRadius: '999px', overflow: 'hidden' }}>
                                    <button
                                        onClick={() => setSelectedLabels(prev =>
                                            isSelected ? prev.filter(l => l !== label) : [...prev, label]
                                        )}
                                        style={{
                                            padding: '0.25rem 0.5rem 0.25rem 0.75rem',
                                            border: 'none',
                                            background: 'transparent',
                                            color: isSelected ? '#fff' : '#333',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        {label}
                                    </button>
                                    <button
                                        title={`Delete "${label}" from ALL cards on this board`}
                                        onClick={() => {
                                            if (window.confirm(`Are you sure you want to completely remove the label "${label}" from all tasks?`)) {
                                                deleteGlobalLabel(label);
                                            }
                                        }}
                                        style={{
                                            padding: '0.25rem 0.5rem',
                                            border: 'none',
                                            borderLeft: `1px solid ${isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                                            background: isSelected ? 'rgba(0,0,0,0.15)' : '#f9f9f9',
                                            color: isSelected ? '#fff' : '#666',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'background 0.2s'
                                        }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            );
                        })}
                        {selectedLabels.length > 0 && (
                            <button
                                onClick={() => setSelectedLabels([])}
                                style={{
                                    padding: '0.25rem 0.5rem',
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#888',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    textDecoration: 'underline'
                                }}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                )}
            </div>
            <div className={className}>
                {BOARD_COLUMNS.map(({ title, status }) => {
                    const columnTasks = groupedTasks[status as string] || [];
                    return (
                        <Column
                            key={status}
                            title={title}
                            status={status}
                            tasks={columnTasks}
                            teamMembers={teamMembers}
                            boardLabels={uniqueLabels}
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
                        <Card task={activeTask} teamMembers={teamMembers} boardLabels={uniqueLabels} />
                    ) : null}
                </DragOverlay>
            )}
        </DndContext>
    );
}
