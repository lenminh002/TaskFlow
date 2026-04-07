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
import { BOARD_COLUMNS } from "@/lib/constants";
import { useBoardDnd } from "@/hooks/useBoardDnd";
import { useBoardActions } from "@/hooks/useBoardActions";
import { useBoardRealtime } from "@/hooks/useBoardRealtime";
import {
    sortTasksByPosition,
    getBoardSummary,
    groupTasksByStatus,
    getUniqueLabels
} from "@/lib/board-utils";
import type { Task } from "@/type/types";
import { DndContext, DragOverlay, closestCorners } from "@dnd-kit/core";
import BoardSummary from "@/components/BoardSummary/BoardSummary";
import Card from "@/components/Card/Card";
import LabelFilter from "@/components/Labels/LabelFilter";
import Column from "@/components/Column/Column";

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

export default function BoardClient({ boardId, initialTasks, teamMembers = [], className, children }: BoardClientProps) {
    const sortedInitial = useMemo(() => sortTasksByPosition(initialTasks), [initialTasks]);
    const [tasks, setTasks] = useState<Task[]>(sortedInitial);
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const isDraggingRef = useRef(false);

    // Logic hooks. dependencies are carefully ordered to avoid circular flows.
    const { startCooldown } = useBoardRealtime({
        boardId,
        setTasks,
        isDraggingRef
    });

    const {
        sensors,
        activeTask,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
    } = useBoardDnd({ tasks, setTasks, startCooldown, isDraggingRef });

    const {
        addTask,
        removeTask,
        updateTask,
        deleteGlobalLabel
    } = useBoardActions({ boardId, tasks, setTasks, startCooldown });

    const uniqueLabels = useMemo(() => getUniqueLabels(tasks), [tasks]);
    const filteredTasks = useMemo(() => {
        if (selectedLabels.length === 0) return tasks;
        return tasks.filter((task) => task.labels?.some((label) => selectedLabels.includes(label)));
    }, [tasks, selectedLabels]);
    const groupedTasks = useMemo(() => groupTasksByStatus(filteredTasks), [filteredTasks]);
    const boardSummary = useMemo(() => getBoardSummary(tasks), [tasks]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMounted(true);
    }, []);

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
            <div className={boardStyles.top_row}>
                <div className={boardStyles.summary_container}>
                    <BoardSummary
                        totalTasks={boardSummary.totalTasks}
                        completedTasks={boardSummary.completedTasks}
                        overdueTasks={boardSummary.overdueTasks}
                    />
                </div>

                <div className={boardStyles.filter_bar_container}>
                    <LabelFilter
                        availableLabels={uniqueLabels}
                        selectedLabels={selectedLabels}
                        onToggleLabel={(label) => setSelectedLabels((prev) => (
                            selectedLabels.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
                        ))}
                        onClear={() => setSelectedLabels([])}
                        onDeleteGlobalLabel={deleteGlobalLabel}
                    />
                </div>
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
