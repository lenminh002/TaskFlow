import { supabase } from './supabase'
import type { Task, ColumnStatus } from '@/type/types'

/**
 * Fetch all tasks from Supabase
 */
export async function fetchTasks(): Promise<Task[]> {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching tasks:', error.message)
        return []
    }

    return (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? undefined,
        status: row.status as ColumnStatus,
        priority: row.priority ?? undefined,
        createdAt: row.created_at,
        dueDate: row.due_date ?? undefined,
    }))
}

/**
 * Insert a new task into Supabase
 */
export async function addTask(task: { id: string; name: string; status: ColumnStatus }): Promise<Task | null> {
    const { data, error } = await supabase
        .from('tasks')
        .insert({
            id: task.id,
            name: task.name,
            status: task.status,
        })
        .select()
        .single()

    if (error) {
        console.error('Error adding task:', error.message)
        return null
    }

    return {
        id: data.id,
        name: data.name,
        description: data.description ?? undefined,
        status: data.status as ColumnStatus,
    }
}

/**
 * Delete a task from Supabase by ID
 */
export async function removeTask(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error removing task:', error.message)
        return false
    }

    return true
}

/**
 * Update a task's status (useful for drag-and-drop later)
 */
export async function updateTaskStatus(id: string, status: ColumnStatus): Promise<boolean> {
    const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', id)

    if (error) {
        console.error('Error updating task status:', error.message)
        return false
    }

    return true
}
