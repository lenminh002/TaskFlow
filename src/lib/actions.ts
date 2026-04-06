/**
 * @file actions.ts
 * @description Supabase database CRUD operations.
 * @details Server actions abstracting direct DB calls for the frontend components.
 */

import { supabase } from './supabase'
import type { Task, ColumnStatus, Board } from '@/type/types'

// ─── Shared Utilities ───────────────────────────────────────────────

const VALID_STATUSES: ColumnStatus[] = ["todo", "in_progress", "in_review", "done"];

function validateStatus(status: any): ColumnStatus {
    return VALID_STATUSES.includes(status) ? (status as ColumnStatus) : "todo";
}

// ─── Board actions (navbar items) ───────────────────────────────────

/**
 * Fetch all boards from Supabase
 */
export async function fetchBoards(): Promise<Board[]> {
    const { data, error } = await supabase
        .from('boards')
        .select('*')
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching boards:', error.message)
        throw new Error(`Failed to fetch boards: ${error.message}`)
    }

    return (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
    }))
}

/**
 * Insert a new board into Supabase
 */
export async function addBoard(board: { id: string; name: string }): Promise<Board | null> {
    const { data, error } = await supabase
        .from('boards')
        .insert({ id: board.id, name: board.name })
        .select()
        .single()

    if (error) {
        console.error('Error adding board:', error.message)
        throw new Error(`Failed to add board: ${error.message}`)
    }

    return {
        id: data.id,
        name: data.name,
        createdAt: data.created_at,
    }
}

// ─── Card actions (kanban cards within a board) ─────────────────────

/**
 * Fetch all cards belonging to a specific board
 */
export async function fetchCards(boardId: string): Promise<Task[]> {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('board_id', boardId)
        .order('position', { ascending: true })

    if (error) {
        console.error('Error fetching cards:', error.message)
        throw new Error(`Failed to fetch cards: ${error.message}`)
    }

    return (data ?? []).map((row) => ({
        id: row.id,
        boardId: row.board_id,
        name: row.name,
        description: row.description ?? undefined,
        status: validateStatus(row.status),
        priority: row.priority ?? undefined,
        createdAt: row.created_at,
        dueDate: row.due_date ?? undefined,
        position: row.position ?? 0,
    }))
}

/**
 * Insert a new card into Supabase, linked to a board
 */
export async function addCard(card: { id: string; name: string; status: ColumnStatus; boardId: string }): Promise<Task | null> {
    const { data, error } = await supabase
        .from('tasks')
        .insert({
            id: card.id,
            name: card.name,
            status: card.status,
            board_id: card.boardId,
        })
        .select()
        .single()

    if (error) {
        console.error('Error adding card:', error.message)
        throw new Error(`Failed to add card: ${error.message}`)
    }

    return {
        id: data.id,
        boardId: data.board_id,
        name: data.name,
        description: data.description ?? undefined,
        status: validateStatus(data.status),
    }
}

/**
 * Delete a card from Supabase by ID
 */
export async function removeCard(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error removing card:', error.message)
        throw new Error(`Failed to remove card: ${error.message}`)
    }

    return true
}

/**
 * Update a card's status (useful for drag-and-drop later)
 */
export async function updateCardStatus(id: string, status: ColumnStatus): Promise<boolean> {
    const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', id)

    if (error) {
        console.error('Error updating card status:', error.message)
        throw new Error(`Failed to update card status: ${error.message}`)
    }

    return true
}

/**
 * Update the exact positions and status of multiple tasks simultaneously
 * following a drag-and-drop workflow.
 */
export async function updateTaskPositions(updates: { id: string, position: number, status: string }[]): Promise<boolean> {
    // Use individual .update() calls instead of .upsert() to avoid NOT NULL constraint violations.
    // upsert tries to insert a full row if the id doesn't match, which fails when required columns like `name` are missing.
    const results = await Promise.all(
        updates.map(u =>
            supabase
                .from('tasks')
                .update({ position: u.position, status: u.status })
                .eq('id', u.id)
        )
    )

    const failed = results.find(r => r.error)
    if (failed?.error) {
        console.error('Error updating task positions:', failed.error.message)
        throw new Error(`Failed to update task positions: ${failed.error.message}`)
    }
    return true
}

/**
 * Update multiple fields of a card
 */
export async function updateCardDetails(id: string, updates: Partial<{ description: string; priority: string; due_date: string | null; status: string }>): Promise<boolean> {
    const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)

    if (error) {
        console.error('Error updating card details:', error.message)
        throw new Error(`Failed to update card details: ${error.message}`)
    }

    return true
}

/**
 * Update a board's name
 */
export async function updateBoardName(id: string, name: string): Promise<boolean> {
    const { error } = await supabase
        .from('boards')
        .update({ name })
        .eq('id', id)

    if (error) {
        console.error('Error updating board name:', error.message)
        throw new Error(`Failed to update board name: ${error.message}`)
    }

    return true
}

/**
 * Delete a board
 */
export async function deleteBoard(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting board:', error.message)
        throw new Error(`Failed to delete board: ${error.message}`)
    }

    return true
}
