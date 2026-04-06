"use server";

/**
 * @file actions.ts
 * @description Supabase database CRUD operations.
 * @details Server actions abstracting direct DB calls for the frontend components.
 */

import { createClient } from './supabase/server'
import { revalidatePath } from 'next/cache'
import type { Task, ColumnStatus, Board, TaskPriority } from '@/type/types'
import { VALID_STATUSES, VALID_PRIORITIES } from '@/lib/constants'

// ─── Shared Utilities ───────────────────────────────────────────────

function validateStatus(status: unknown): ColumnStatus {
    if (typeof status === 'string' && VALID_STATUSES.includes(status as ColumnStatus)) {
        return status as ColumnStatus;
    }
    console.warn(`Invalid status "${status}" encountered, defaulting to "todo"`);
    return "todo";
}

function validatePriority(priority: unknown): TaskPriority | undefined {
    if (!priority) return undefined;
    if (typeof priority === 'string' && VALID_PRIORITIES.includes(priority as TaskPriority)) {
        return priority as TaskPriority;
    }
    console.warn(`Invalid priority "${priority}" encountered, returning undefined`);
    return undefined;
}

// Type definition for Supabase task row with joined user data
interface TaskRow {
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
    users?: { username: string } | null;
}

// ─── Board actions (navbar items) ───────────────────────────────────

/**
 * Fetch all boards from Supabase.
 * @returns Object containing the boards list and the current user's UUID for role mapping.
 */
export async function fetchBoards(): Promise<{ boards: Board[], currentUserId: string }> {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession();
    
    const { data, error } = await supabase
        .from('boards')
        .select('*')
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching boards:', error.message)
        throw new Error(`Failed to fetch boards: ${error.message}`)
    }

    return {
        boards: (data ?? []).map((row) => ({
            id: row.id,
            name: row.name,
            createdAt: row.created_at,
            userId: row.user_id,
        })),
        currentUserId: session?.user?.id || ""
    }
}

/**
 * Insert a new board into Supabase.
 * @param board - The board object containing a generated UUID and name.
 * @returns The newly created Board object or null.
 */
export async function addBoard(board: { id: string; name: string }): Promise<Board | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('boards')
        .insert({ id: board.id, name: board.name })
        .select()
        .single()

    if (error) {
        console.error('Error adding board:', error.message)
        throw new Error(`Failed to add board: ${error.message}`)
    }

    revalidatePath('/', 'layout');

    return {
        id: data.id,
        name: data.name,
        createdAt: data.created_at,
    }
}

// ─── Card actions (kanban cards within a board) ─────────────────────

/**
 * Fetch all cards belonging to a specific board.
 * @param boardId - The UUID of the board to query.
 * @returns Array of Tasks sorted by their board position index.
 */
export async function fetchCards(boardId: string): Promise<Task[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('tasks')
        .select('*, users(username)')
        .eq('board_id', boardId)
        .order('position', { ascending: true })

    if (error) {
        console.error('Error fetching cards:', error.message)
        throw new Error(`Failed to fetch cards: ${error.message}`)
    }

    return (data ?? []).map((row: TaskRow) => ({
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
    }))
}

/**
 * Insert a new card into Supabase, linked to a board.
 * @param card - Minimal task object for insertion.
 * @returns The hydrated Task instance.
 */
export async function addCard(card: { id: string; name: string; status: ColumnStatus; boardId: string }): Promise<Task | null> {
    const supabase = await createClient()
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
    const supabase = await createClient()
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
    const supabase = await createClient()
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
 * 
 * Note: Uses Promise.all to fire multiple updates in parallel. 
 * For large boards, a custom RPC function in Postgres would be more atomic and efficient.
 * 
 * @param updates - Array of task coordinate updates (ID, New Position, New Status).
 */
export async function updateTaskPositions(updates: { id: string, position: number, status: string }[]): Promise<boolean> {
    const supabase = await createClient()
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
 * Update multiple fields of a card dynamically.
 * @param id - Task UUID.
 * @param updates - Partial mapping of fields to mutate (name, description, priority, etc).
 */
export async function updateCardDetails(id: string, updates: Partial<{ name: string; description: string; priority: string; due_date: string | null; status: string; assignee_id: string | null }>): Promise<boolean> {
    const supabase = await createClient()
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
    const supabase = await createClient()
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
    const supabase = await createClient()
    const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting board:', error.message)
        throw new Error(`Failed to delete board: ${error.message}`)
    }

    revalidatePath('/', 'layout');

    return true
}

/**
 * Detach a member's UUID mapped in a collaborative board structure safely without destroying the instance
 */
export async function leaveBoard(id: string): Promise<boolean> {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) throw new Error("No active session")

    const { error, count } = await supabase
        .from('board_members')
        .delete({ count: 'exact' })
        .eq('board_id', id)
        .eq('user_id', session.user.id)

    if (error) {
        console.error('Error leaving board:', error.message)
        throw new Error(`Failed to leave board: ${error.message}`)
    }
    if (count === 0) {
        // If count is 0, the user wasn't actually a member (security guard)
        console.error('Silent fail: No matching board_members row found to delete for user', session.user.id);
        throw new Error(`backend_silent_fail_delete`);
    }

    // Phase 2: Unassign the user from all tasks in the board cleanly.
    // This prevents "Ghost Assignees" where a user who left still appears on tasks.
    const { error: tasksError } = await supabase
        .from('tasks')
        .update({ assignee_id: null })
        .eq('board_id', id)
        .eq('assignee_id', session.user.id);
        
    if (tasksError) {
        console.error("Failed to cleanly unassign tasks during board exit:", tasksError);
        throw new Error(tasksError.message);
    }

    revalidatePath('/', 'layout');

    return true
}

// ─── Team Collaboration ────────────────────────────────────────────────

/** Create a global user profile during app initial loading sequence */
export async function createUserProfile(id: string, username: string): Promise<boolean> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('users')
        .insert({ id, username })

    if (error) {
        console.error('Error creating user profile:', error.message)
        throw new Error(`Failed to create profile: ${error.message}`)
    }
    return true
}

/** Check if the viewer's UUID matches an existing user profile mapping natively */
export async function fetchUserProfile(id: string): Promise<{ id: string, username: string } | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

    if (error) return null;
    return data;
}

/** Attach an external User UUID structurally as a peer authorized member of an entire board via join relations */
export async function addBoardMember(boardId: string, memberId: string): Promise<boolean> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('board_members')
        .insert({ board_id: boardId, user_id: memberId })

    if (error) {
        console.error('Error adding board member:', error.message)
        throw new Error(`Failed to add board member: ${error.message}`)
    }
    
    revalidatePath('/', 'layout');
    
    return true
}

/** 
 * Fetch all users (Owner + Members) who have interactive access to a specific board.
 * 
 * Technical Implementation:
 * Uses a Set to deduplicate IDs between the board owner and the members table,
 * then performs a second 'in' query to fetch the full profiles.
 * 
 * @param boardId - Board UUID.
 * @returns Array of User profiles (id, username).
 */
export async function fetchBoardMembersFull(boardId: string): Promise<{id: string, username: string}[]> {
    const supabase = await createClient();
    
    // Fallback direct profiling bypasses complex Supabase graph relation limitations
    const { data: board } = await supabase.from('boards').select('user_id').eq('id', boardId).single();
    const { data: members } = await supabase.from('board_members').select('user_id').eq('board_id', boardId);

    const userIds = new Set<string>();
    if (board?.user_id) userIds.add(board.user_id);
    if (members) members.forEach(m => userIds.add(m.user_id));

    if (userIds.size === 0) return [];

    // Natively extract exact profiles
    const { data: profiles } = await supabase
        .from('users')
        .select('id, username')
        .in('id', Array.from(userIds));

    return profiles || [];
}
