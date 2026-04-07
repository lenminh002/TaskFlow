/**
 * @file useBoardDnd.ts
 * @description Custom hook for managing Kanban drag-and-drop state.
 * @details Encapsulates sensors, event handlers, and optimistic updates.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { 
    PointerSensor, 
    TouchSensor, 
    useSensor, 
    useSensors, 
    DragStartEvent, 
    DragEndEvent, 
    DragOverEvent 
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Task, ColumnStatus } from "@/type/types";
import { moveTaskDuringDrag, applyColumnPositionUpdates } from "@/lib/dnd-utils";
import { updateTaskPositions } from "@/lib/actions";

interface UseBoardDndProps {
    tasks: Task[];
    setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
    startCooldown: (ms?: number) => void;
    /** Optional external ref to track dragging state (for sharing with other hooks) */
    isDraggingRef?: React.RefObject<boolean>;
}

/**
 * Encapsulates the @dnd-kit logic for the Kanban board.
 * Returns everything needed for DndContext and DragOverlay.
 */
export function useBoardDnd({ tasks, setTasks, startCooldown, isDraggingRef: externalRef }: UseBoardDndProps) {
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const internalRef = useRef(false);
    const isDraggingRef = externalRef || internalRef;

    // Sync ref with state for realtime subscription safety 
    // (Realtime sync checks this ref to avoid mid-drag updates)
    useEffect(() => {
        (isDraggingRef as React.MutableRefObject<boolean>).current = !!activeTask;
    }, [activeTask, isDraggingRef]);

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

    function handleDragStart(event: DragStartEvent) {
        const { active } = event;
        const task = tasks.find((item) => item.id === active.id);
        if (task) {
            setActiveTask(task);
        }
    }

    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event;
        if (!over) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        if (activeId === overId || active.data.current?.type !== "Task") {
            return;
        }

        const isOverTask = over.data.current?.type === "Task";
        const isOverColumn = over.data.current?.type === "Column";

        setTasks((currentTasks) => 
            moveTaskDuringDrag(currentTasks, activeId, overId, isOverTask, isOverColumn)
        );
    }

    function handleDragEnd(event: DragEndEvent) {
        setActiveTask(null);
        const { active, over } = event;
        if (!over) return;

        const previousTasks = tasks;
        const activeId = active.id as string;
        const overId = over.id as string;
        const isOverColumn = over.data.current?.type === "Column";
        
        let newTasks = [...tasks];

        if (isOverColumn) {
            const activeIndex = newTasks.findIndex((task) => task.id === activeId);
            if (activeIndex !== -1) {
                newTasks[activeIndex].status = overId as ColumnStatus;
                newTasks = arrayMove(newTasks, activeIndex, newTasks.length - 1);
            }
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

    return {
        sensors,
        activeTask,
        isDragging: !!activeTask,
        isDraggingRef,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
    };
}
