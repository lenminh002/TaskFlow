/**
 * @file types.ts
 * @description Centralized type definitions for TaskFlow.
 * @details Provides strict structural shapes (Tasks, Boards) for type safety between frontend and Supabase.
 */

/**
 * Workflow stages for the Kanban board.
 */
export type ColumnStatus = "todo" | "in_progress" | "in_review" | "done";

/**
 * Priority levels assignable to individual tasks natively supporting emojis in UI.
 */
export type TaskPriority = "low" | "medium" | "high" | "urgent";

/**
 * Core User entity tracking collaborators on the platform.
 */
export interface User {
  id: string;
  username: string;
}

/**
 * Core Task entity representing a single card in a Kanban board.
 */
export interface Task {
  /** Unique UUID identifier */
  id: string;
  /** UUID of the parent board this task belongs to */
  boardId: string;
  /** Display title for the task (card header) */
  name: string;
  /** Optional detailed markdown or text description */
  description?: string;
  /** Workflow status mapping to a specific column */
  status?: ColumnStatus;
  /** Importance priority enum */
  priority?: TaskPriority;
  /** ISO date string or Date object representing creation time */
  createdAt?: Date | string;
  /** ISO date string or Date object representing last update time */
  updatedAt?: Date | string;
  /** Targeted deadline formatted as ISO date string or Date object */
  dueDate?: Date | string;
  /** Positioning order index for drag and drop within columns */
  position?: number;
  /** UUID of the User delegated to this task */
  assigneeId?: string;
  /** Populated username linked to the assigneeId */
  assigneeName?: string;
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
  userId?: string;
}

/**
 * Comment interface — represents a timestamped comment left on a specific task
 */
export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  username: string;   
  content: string;
  createdAt: string;
  isSystemActivity?: boolean;
}

