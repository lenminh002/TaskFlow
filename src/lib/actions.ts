import { supabase } from './supabase'
import type { Task, ColumnStatus, Board } from '@/type/types'

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
        return []
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
        return null
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
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching cards:', error.message)
        return []
    }

    return (data ?? []).map((row) => ({
        id: row.id,
        boardId: row.board_id,
        name: row.name,
        description: row.description ?? undefined,
        status: row.status as ColumnStatus,
        priority: row.priority ?? undefined,
        createdAt: row.created_at,
        dueDate: row.due_date ?? undefined,
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
        return null
    }

    return {
        id: data.id,
        boardId: data.board_id,
        name: data.name,
        description: data.description ?? undefined,
        status: data.status as ColumnStatus,
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
        return false
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
        return false
    }

    return true
}
