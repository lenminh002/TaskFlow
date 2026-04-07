/**
 * @file dnd-utils.ts
 * @description Pure utility functions for Kanban drag-and-drop state transformations.
 * @details Separates complex array manipulation from React component logic.
 */

import { arrayMove } from "@dnd-kit/sortable";
import type { Task, ColumnStatus } from "@/type/types";

/**
 * Handles the logic for moving a task during the 'active' drag phase.
 * Updates the task's status and position in the array optimistically.
 */
export function moveTaskDuringDrag(
    tasks: Task[], 
    activeId: string, 
    overId: string, 
    isOverTask: boolean, 
    isOverColumn: boolean
) {
    const activeIndex = tasks.findIndex((task) => task.id === activeId);
    const overIndex = tasks.findIndex((task) => task.id === overId);

    if (activeIndex === -1 || (isOverTask && overIndex === -1)) {
        return tasks;
    }

    if (isOverTask) {
        const nextTasks = [...tasks];
        // Only update status if moving to a different column
        if (nextTasks[activeIndex].status !== nextTasks[overIndex].status) {
            nextTasks[activeIndex].status = nextTasks[overIndex].status;
        }
        return arrayMove(nextTasks, activeIndex, overIndex);
    }

    if (isOverColumn) {
        const nextTasks = [...tasks];
        nextTasks[activeIndex].status = overId as ColumnStatus;
        // Keep in the same relative position but update status
        return arrayMove(nextTasks, activeIndex, activeIndex);
    }

    return tasks;
}

/**
 * Recalculates 'position' values for all tasks in a column after a drop.
 * Uses sparse increments (+1000) to ensure stable ordering.
 * Returns the full task list and a list of specific updates to sync to the server.
 */
export function applyColumnPositionUpdates(tasks: Task[], activeId: string) {
    const status = tasks.find((task) => task.id === activeId)?.status;
    const tasksInColumn = tasks.filter((task) => task.status === status);
    const updatesToSync: { id: string; position: number; status: string }[] = [];

    const nextTasks = tasks.map((task) => {
        if (task.status !== status) {
            return task;
        }

        const indexInColumn = tasksInColumn.findIndex((columnTask) => columnTask.id === task.id);
        const nextPosition = (indexInColumn + 1) * 1000;

        // Skip update if position didn't change (and it's not the active task being dropped)
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
