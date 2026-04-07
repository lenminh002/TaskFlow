/**
 * @file BoardClient.tsx
 * @description The primary client-side controller for the Kanban board interface.
 * @details This component manages:
 * 1. Drag-and-drop state via @dnd-kit.
 * 2. Real-time synchronization with Supabase.
 * 3. Optimistic UI updates for task mutations (create, update, delete, reorder).
 * 4. Task filtering by labels.
 */

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Column from "@/components/Column/Column";
import { addCard, removeCard, updateTaskPositions, updateCardDetails } from "@/lib/actions";
import type { Task, ColumnStatus } from "@/type/types";
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, DragOverlay, closestCorners, DragStartEvent, DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import Card from "@/components/Card/Card";
import LabelChip from "@/components/Labels/LabelChip";
import { createClient } from "@/lib/supabase/client";
import { BOARD_COLUMNS } from "@/lib/constants";
import { mapTaskRow } from "@/lib/task-mappers";

type TeamMember = { id: string; username: string };

import boardStyles from "./BoardClient.module.css";

/**
 * Props for the BoardClient component.
 */
interface BoardClientProps {
    /** The UUID of the board being rendered */
    boardId: string;
    /** The initial set of tasks fetched during server-side hydration */
    initialTasks: Task[];
    /** List of users with access to this board for task assignment */
    teamMembers?: TeamMember[];
    /** Optional CSS class for the main board container */
    className?: string;
    /** Children elements (e.g., column addition buttons) */
    children?: React.ReactNode;
}

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

function getUniqueLabels(tasks: Task[]) {
    const labelSet = new Set<string>();

    tasks.forEach((task) => task.labels?.forEach((label) => labelSet.add(label)));

    return Array.from(labelSet).sort();
}

function filterTasksByLabels(tasks: Task[], selectedLabels: string[]) {
    if (selectedLabels.length === 0) {
        return tasks;
    }

    return tasks.filter((task) => task.labels?.some((label) => selectedLabels.includes(label)));
}

function groupTasksByStatus(tasks: Task[]) {
    const groups: Record<string, Task[]> = { todo: [], in_progress: [], in_review: [], done: [] };

    tasks.forEach((task) => {
        if (task.status && groups[task.status]) {
            groups[task.status].push(task);
        }
    });

    return groups;
}

function buildTaskUpdatePayload(updates: Partial<Task>): CardUpdatePayload {
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
            : updates.dueDate === ""
                ? null
                : updates.dueDate;
    }

    return dbUpdates;
}

function moveTaskDuringDrag(tasks: Task[], activeId: string, overId: string, isOverTask: boolean, isOverColumn: boolean) {
    const activeIndex = tasks.findIndex((task) => task.id === activeId);
    const overIndex = tasks.findIndex((task) => task.id === overId);

    if (activeIndex === -1 || (isOverTask && overIndex === -1)) {
        return tasks;
    }

    if (isOverTask) {
        const nextTasks = [...tasks];
        nextTasks[activeIndex].status = nextTasks[overIndex].status;
        return arrayMove(nextTasks, activeIndex, overIndex);
    }

    if (isOverColumn) {
        const nextTasks = [...tasks];
        nextTasks[activeIndex].status = overId as ColumnStatus;
        return arrayMove(nextTasks, activeIndex, activeIndex);
    }

    return tasks;
}

function applyColumnPositionUpdates(tasks: Task[], activeId: string) {
    const status = tasks.find((task) => task.id === activeId)?.status;
    const tasksInColumn = tasks.filter((task) => task.status === status);
    const updatesToSync: { id: string; position: number; status: string }[] = [];

    const nextTasks = tasks.map((task) => {
        if (task.status !== status) {
            return task;
        }

        const indexInColumn = tasksInColumn.findIndex((columnTask) => columnTask.id === task.id);
        const nextPosition = (indexInColumn + 1) * 1000;

        if (task.position === nextPosition && task.id !== activeId) {
            return task;
        }

        updatesToSync.push({
            id: task.id,
            position: nextPosition,
            status: task.status as string,
        });

        return { ...task, position: nextPosition };
    });

    return { nextTasks, updatesToSync };
}

export default function BoardClient({ boardId, initialTasks, teamMembers = [], className, children }: BoardClientProps) {
    const sortedInitial = useMemo(() => sortTasksByPosition(initialTasks), [initialTasks]);
    const [tasks, setTasks] = useState<Task[]>(sortedInitial);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

    const isDraggingRef = useRef(false);
    const selfUpdateCooldownRef = useRef(false);
    const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function startCooldown(ms = 1000) {
        selfUpdateCooldownRef.current = true;

        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);

        cooldownTimerRef.current = setTimeout(() => {
            selfUpdateCooldownRef.current = false;
        }, ms);
    }

    // Manage the "Dragging" state to prevent realtime refreshes from interrupting the UI
    useEffect(() => {
        isDraggingRef.current = !!activeTask;
    }, [activeTask]);

    /**
     * Realtime Subscription Logic
     * Listens for any changes to the 'tasks' table for this specific board.
     * Implements a debounce and a self-update cooldown to prevent "infinite loops" 
     * or stuttering UI during local optimistic mutations.
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

                    if (selfUpdateCooldownRef.current) {
                        if (process.env.NODE_ENV === 'development') {
                            console.log("⏭️ Skipping self-triggered realtime event.");
                        }
                        return;
                    }

                    if (debounceRef.current) clearTimeout(debounceRef.current);

                    debounceRef.current = setTimeout(async () => {
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

            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
        };
    }, [boardId]);

    const uniqueLabels = useMemo(() => getUniqueLabels(tasks), [tasks]);
    const filteredTasks = useMemo(() => filterTasksByLabels(tasks, selectedLabels), [tasks, selectedLabels]);
    const groupedTasks = useMemo(() => groupTasksByStatus(filteredTasks), [filteredTasks]);
    const isMounted = typeof document !== "undefined";

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                // Minimum movement before drag starts to allow for clicking/scrolling
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                // Delay for mobile to distinguish between scroll and drag
                delay: 250,
                tolerance: 5,
            },
        })
    );

    /**
     * Add a new task to a specific column.
     * Uses optimistic updates to update the local task list instantly,
     * then calls the server action to persist the change.
     */
    async function addTask(status: ColumnStatus, name: string) {
        const tasksInColumn = tasks.filter((task) => task.status === status);
        const maxPos = tasksInColumn.length > 0 ? Math.max(...tasksInColumn.map((task) => task.position ?? 0)) : 0;
        const newPos = maxPos + 1000;

        const newTask: Task = {
            id: crypto.randomUUID(),
            boardId,
            name,
            status,
            position: newPos,
            createdAt: new Date().toISOString(),
        };

        setTasks((prev) => [...prev, newTask]);

        try {
            startCooldown();
            await addCard({ id: newTask.id, name: newTask.name, status, boardId, position: newPos });
        } catch (e) {
            console.error("Failed to add new task:", e);
            setTasks((prev) => prev.filter((t) => t.id !== newTask.id));
        }
    }

    /**
     * Permanently remove a task by its ID.
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
     * Update task metadata (name, description, assignee, etc).
     */
    async function updateTask(id: string, updates: Partial<Task>) {
        const prevTasks = tasks;
        const dbUpdates = buildTaskUpdatePayload(updates);

        setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...updates } : task)));

        try {
            startCooldown();
            await updateCardDetails(id, dbUpdates);
        } catch (e) {
            console.error("Failed to update task details — rolling back.", e);
            setTasks(prevTasks);
        }
    }

    /**
     * Deletes a specific label string from every task on the board.
     */
    async function deleteGlobalLabel(labelToDelete: string) {
        const affectedTasks = tasks.filter((task) => task.labels?.includes(labelToDelete));

        if (affectedTasks.length === 0) {
            return;
        }

        setTasks((prev) => prev.map((task) => {
            if (!task.labels?.includes(labelToDelete)) {
                return task;
            }

            return {
                ...task,
                labels: task.labels.filter((label) => label !== labelToDelete),
            };
        }));

        setSelectedLabels((prev) => prev.filter((label) => label !== labelToDelete));

        startCooldown();

        Promise.all(
            affectedTasks.map((task) => updateCardDetails(task.id, {
                labels: (task.labels ?? []).filter((label) => label !== labelToDelete),
            }))
        ).catch((e) => {
            console.error("Failed to fully delete label globally:", e);
        });
    }

    /**
     * Triggered when a drag operation begins.
     */
    function handleDragStart(event: DragStartEvent) {
        const { active } = event;
        const task = tasks.find((item) => item.id === active.id);

        if (task) {
            setActiveTask(task);
        }
    }

    /**
     * Fires repeatedly while a task is being dragged over other elements.
     * Updates local state to move the task visually (optimistic reorder only).
     */
    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event;

        if (!over) {
            return;
        }

        const activeId = String(active.id);
        const overId = String(over.id);

        if (activeId === overId || active.data.current?.type !== "Task") {
            return;
        }

        const isOverTask = over.data.current?.type === "Task";
        const isOverColumn = over.data.current?.type === "Column";

        setTasks((currentTasks) => moveTaskDuringDrag(currentTasks, activeId, overId, isOverTask, isOverColumn));
    }

    /**
     * Finalizes a drag operation. 
     * Calculates the new positions for all tasks in the target column 
     * using sparse increments (+1000) and syncs the batch update to the backend.
     */
    function handleDragEnd(event: DragEndEvent) {
        setActiveTask(null);

        const { active, over } = event;

        if (!over) {
            return;
        }

        const previousTasks = tasks;
        const activeId = active.id as string;
        const overId = over.id as string;
        const isOverColumn = over.data.current?.type === "Column";
        let newTasks = [...tasks];

        if (isOverColumn) {
            const activeIndex = newTasks.findIndex((task) => task.id === activeId);

            if (activeIndex === -1) {
                return;
            }

            newTasks[activeIndex].status = overId as ColumnStatus;
            newTasks = arrayMove(newTasks, activeIndex, newTasks.length - 1);
        }

        const { nextTasks, updatesToSync } = applyColumnPositionUpdates(newTasks, activeId);

        setTasks(nextTasks);

        if (updatesToSync.length > 0) {
            startCooldown();
            updateTaskPositions(updatesToSync).catch((e) => {
                console.error("Failed to sync drag positions:", e);
                setTasks(previousTasks);
            });
        }
    }

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
            <div className={boardStyles.filter_bar_container}>
                {uniqueLabels.length > 0 && (
                    <div className={boardStyles.filter_bar}>
                        <span className={boardStyles.filter_label}>Filter:</span>
                        {uniqueLabels.map((label) => {
                            const isSelected = selectedLabels.includes(label);

                            return (
                                <LabelChip
                                    key={label}
                                    label={label}
                                    selected={isSelected}
                                    onClick={() => setSelectedLabels((prev) => (
                                        isSelected ? prev.filter((item) => item !== label) : [...prev, label]
                                    ))}
                                    removable
                                    onRemove={() => {
                                        if (window.confirm(`Are you sure you want to completely remove the label "${label}" from all tasks?`)) {
                                            deleteGlobalLabel(label);
                                        }
                                    }}
                                    removeTitle={`Delete "${label}" from all cards on this board`}
                                />
                            );
                        })}
                        {selectedLabels.length > 0 && (
                            <button
                                onClick={() => setSelectedLabels([])}
                                className={boardStyles.clear_button}
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
                    {activeTask ? <Card task={activeTask} teamMembers={teamMembers} boardLabels={uniqueLabels} /> : null}
                </DragOverlay>
            )}
        </DndContext>
    );
}
