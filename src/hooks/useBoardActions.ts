/**
 * @file useBoardActions.ts
 * @description Custom hook for managing tasks and CRUD operations.
 * @details Handles optimistic updates and server-side persistence for board tasks.
 */

"use client";

import { useCallback } from "react";
import type { Task, ColumnStatus } from "@/type/types";
import { addCard, removeCard, updateCardDetails } from "@/lib/actions";
import { buildTaskUpdatePayload } from "@/lib/board-utils";

interface UseBoardActionsProps {
    /** UUID of the board */
    boardId: string;
    /** The shared board task list */
    tasks: Task[];
    /** Setter function for the task list */
    setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
    /** Callback to avoid mid-mutation realtime sync conflicts */
    startCooldown: (ms?: number) => void;
}

/**
 * Encapsulates task action logic (CRUD) and optimistic updates.
 */
export function useBoardActions({ boardId, tasks, setTasks, startCooldown }: UseBoardActionsProps) {

    /**
     * Optimistically adds a task and persists to database.
     */
    const addTask = useCallback(async (status: ColumnStatus, name: string) => {
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
    }, [boardId, tasks, setTasks, startCooldown]);

    /**
     * Optimistically removes a task.
     */
    const removeTask = useCallback(async (taskId: string) => {
        const prevTasks = tasks;
        setTasks((prev) => prev.filter((task) => task.id !== taskId));

        try {
            await removeCard(taskId);
        } catch (e) {
            console.error("Failed to remove task:", e);
            setTasks(prevTasks);
        }
    }, [tasks, setTasks]);

    /**
     * Optimistically updates task details.
     */
    const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
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
    }, [tasks, setTasks, startCooldown]);

    /**
     * Removes a label from every task on the board.
     */
    const deleteGlobalLabel = useCallback(async (labelToDelete: string, onLabelDeleted?: (label: string) => void) => {
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

        onLabelDeleted?.(labelToDelete);
        startCooldown();

        try {
            await Promise.all(
                affectedTasks.map((task) => updateCardDetails(task.id, {
                    labels: (task.labels ?? []).filter((label) => label !== labelToDelete),
                }))
            );
        } catch (e) {
            console.error("Failed to fully delete label globally:", e);
        }
    }, [tasks, setTasks, startCooldown]);

    return {
        addTask,
        removeTask,
        updateTask,
        deleteGlobalLabel,
    };
}
