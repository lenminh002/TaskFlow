// Type definitions for the TaskFlow application

/**
 * Column status types for the Kanban board
 */
export type ColumnStatus = "todo" | "in_progress" | "in_review" | "done";

/**
 * Priority levels for tasks
 */
export type TaskPriority = "low" | "medium" | "high" | "urgent";

/**
 * Main Task interface
 */
export interface Task {
  id: string;
  boardId: string;
  name: string;
  description?: string;
  status?: ColumnStatus;
  priority?: TaskPriority;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  dueDate?: Date | string;
}

/**
 * Column interface for Kanban board
 */
export interface Column {
  id: string;
  title: string;
  status: ColumnStatus;
  tasks: Task[];
}

/**
 * Board interface — represents a project/board shown in the navbar
 */
export interface Board {
  id: string;
  name: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

