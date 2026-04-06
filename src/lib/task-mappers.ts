import { VALID_PRIORITIES, VALID_STATUSES } from "@/lib/constants";
import type { ColumnStatus, Task, TaskPriority } from "@/type/types";

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

export function validateStatus(status: unknown): ColumnStatus {
    if (typeof status === "string" && VALID_STATUSES.includes(status as ColumnStatus)) {
        return status as ColumnStatus;
    }

    console.warn(`Invalid status "${status}" encountered, defaulting to "todo"`);
    return "todo";
}

export function validatePriority(priority: unknown): TaskPriority | undefined {
    if (!priority) return undefined;

    if (typeof priority === "string" && VALID_PRIORITIES.includes(priority as TaskPriority)) {
        return priority as TaskPriority;
    }

    console.warn(`Invalid priority "${priority}" encountered, returning undefined`);
    return undefined;
}

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
