/**
 * @file constants.ts
 * @description Centralized constants for TaskFlow application
 * @details Provides shared constants to avoid duplication across components
 */

import type { ColumnStatus, TaskPriority } from "@/type/types";

/**
 * Valid column statuses for the Kanban board
 */
export const VALID_STATUSES: ColumnStatus[] = ["todo", "in_progress", "in_review", "done"];

/**
 * Valid priority levels for tasks
 */
export const VALID_PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];

/**
 * Column configuration for the Kanban board
 */
export const BOARD_COLUMNS = [
    { id: 'todo', title: "To Do", status: "todo" as ColumnStatus },
    { id: 'in_progress', title: "In Progress", status: "in_progress" as ColumnStatus },
    { id: 'in_review', title: "In Review", status: "in_review" as ColumnStatus },
    { id: 'done', title: "Done", status: "done" as ColumnStatus },
] as const;

/**
 * Priority options for task priority select dropdown
 */
export const PRIORITY_OPTIONS = [
    { value: '', label: 'None' },
    { value: 'low', label: '🟢 Low' },
    { value: 'medium', label: '🟡 Medium' },
    { value: 'high', label: '🟠 High' },
    { value: 'urgent', label: '🔴 Urgent' },
] as const;

/**
 * Status options for task status select dropdown
 */
export const STATUS_OPTIONS = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'in_review', label: 'In Review' },
    { value: 'done', label: 'Done' },
] as const;

/**
 * Get priority label with emoji
 */
export function getPriorityLabel(priority?: string): string | null {
    if (!priority) return null;
    const option = PRIORITY_OPTIONS.find(opt => opt.value === priority);
    return option?.label ?? priority;
}

/**
 * Get status label formatted
 */
export function getStatusLabel(status?: string): string {
    if (!status) return "—";
    const option = STATUS_OPTIONS.find(opt => opt.value === status);
    return option?.label ?? status.replace(/_/g, " ");
}
