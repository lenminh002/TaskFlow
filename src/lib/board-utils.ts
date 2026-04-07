/**
 * @file board-utils.ts
 * @description Pure utility functions for board-level task management.
 * @details Separates logic for filtering, summary calculation, and status grouping.
 */

import type { Task } from "@/type/types";

/**
 * Sorts tasks by their position value (sparse increments).
 */
export const sortTasksByPosition = (taskList: Task[]) => [...taskList].sort((a, b) => (a.position || 0) - (b.position || 0));

/**
 * Extracts a unique, sorted list of all labels present on the given tasks.
 */
export function getUniqueLabels(tasks: Task[]) {
    const labelSet = new Set<string>();

    tasks.forEach((task) => task.labels?.forEach((label) => labelSet.add(label)));

    return Array.from(labelSet).sort();
}

/**
 * Filters the task list to only those that contain at least one of the selected labels.
 */
export function filterTasksByLabels(tasks: Task[], selectedLabels: string[]) {
    if (selectedLabels.length === 0) {
        return tasks;
    }

    return tasks.filter((task) => task.labels?.some((label) => selectedLabels.includes(label)));
}

/**
 * Groups tasks into a record keyed by their status (todo, in_progress, etc).
 */
export function groupTasksByStatus(tasks: Task[]) {
    const groups: Record<string, Task[]> = { todo: [], in_progress: [], in_review: [], done: [] };

    tasks.forEach((task) => {
        if (task.status && groups[task.status]) {
            groups[task.status].push(task);
        }
    });

    return groups;
}

/**
 * Normalizes a due date value (Date, string, or null) into a Date object or null.
 * Handles local end-of-day for YYYY-MM-DD input formats.
 */
export function parseDueDate(dueDate: Task["dueDate"]) {
    if (!dueDate) {
        return null;
    }

    if (dueDate instanceof Date) {
        return Number.isNaN(dueDate.getTime()) ? null : dueDate;
    }

    // The date picker saves plain YYYY-MM-DD values, so we treat them as local end-of-day
    // instead of UTC midnight. That keeps a task from looking overdue too early.
    if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        return new Date(`${dueDate}T23:59:59.999`);
    }

    const parsedDate = new Date(dueDate);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

/**
 * Determines if a task is overdue based on its status and due date.
 */
export function isTaskOverdue(task: Task) {
    if (task.status === "done") {
        return false;
    }

    const dueDate = parseDueDate(task.dueDate);

    if (!dueDate) {
        return false;
    }

    return dueDate.getTime() < Date.now();
}

/**
 * Calculates summary statistics for the entire board.
 */
export function getBoardSummary(tasks: Task[]) {
    // The board header stats are based on the live task list so they react immediately to edits,
    // drag/drop, and realtime sync updates.
    return {
        totalTasks: tasks.length,
        completedTasks: tasks.filter((task) => task.status === "done").length,
        overdueTasks: tasks.filter(isTaskOverdue).length,
    };
}

/**
 * Maps task object updates into a payload schema suitable for the database.
 */
export function buildTaskUpdatePayload(updates: Partial<Task>) {
    const dbUpdates: Record<string, unknown> = {}; 

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
