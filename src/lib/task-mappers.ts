/**
 * @file task-mappers.ts
 * @description Data transformation layer between Supabase DB rows and frontend Task interfaces.
 * @details Includes validation logic for ColumnStatus and TaskPriority to ensure runtime type safety.
 */

import { VALID_PRIORITIES, VALID_STATUSES } from "@/lib/constants";
import type { ColumnStatus, Task, TaskPriority } from "@/type/types";

/**
 * Raw database row structure for the 'tasks' table.
 */
export interface TaskRow {
    id: string;
    board_id: string;
    name: string;
    description?: string | null;
    status: string;
    priority?: string | null;
    created_at: string;
    due_date?: string | null;
    position?: number | null;
    assignee_id?: string | null;
    labels?: string[] | null;
    users?: { username: string } | null;
}

/**
 * Validates a status string against known ColumnStatus values.
 * @param status - The raw status value to validate.
 * @returns A valid ColumnStatus, defaults to 'todo' if invalid.
 */
export function validateStatus(status: unknown): ColumnStatus {
    if (typeof status === "string" && VALID_STATUSES.includes(status as ColumnStatus)) {
        return status as ColumnStatus;
    }

    console.warn(`Invalid status "${status}" encountered, defaulting to "todo"`);
    return "todo";
}

/**
 * Validates a priority string against known TaskPriority values.
 * @param priority - The raw priority value to validate.
 * @returns A valid TaskPriority or undefined if invalid or empty.
 */
export function validatePriority(priority: unknown): TaskPriority | undefined {
    if (!priority) return undefined;

    if (typeof priority === "string" && VALID_PRIORITIES.includes(priority as TaskPriority)) {
        return priority as TaskPriority;
    }

    console.warn(`Invalid priority "${priority}" encountered, returning undefined`);
    return undefined;
}

/**
 * Maps a raw Supabase task row to a frontend Task object.
 * @param row - The database row to transform.
 * @returns A hydrated Task object for use in components.
 */
export function mapTaskRow(row: TaskRow): Task {
    return {
        id: row.id,
        boardId: row.board_id,
        name: row.name,
        description: row.description ?? undefined,
        status: validateStatus(row.status),
        priority: validatePriority(row.priority),
        createdAt: row.created_at,
        dueDate: row.due_date ?? undefined,
        position: row.position ?? 0,
        assigneeId: row.assignee_id ?? undefined,
        assigneeName: row.users?.username ?? undefined,
        labels: row.labels ?? undefined,
    };
}
