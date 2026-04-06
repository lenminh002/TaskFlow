"use server";

/**
 * @file actions.ts
 * @description Supabase database CRUD operations.
 * @details Server actions abstracting direct DB calls for the frontend components.
 */

import { createClient } from './supabase/server'
import { revalidatePath } from 'next/cache'
import type { Task, ColumnStatus, Board, Comment } from '@/type/types'
import { mapTaskRow } from '@/lib/task-mappers'

// ─── Shared Utilities ───────────────────────────────────────────────

function handleError(operation: string, error: { message?: string } | null): never {
    const message = error?.message ?? 'Unknown error';
    console.error(`Error ${operation}:`, message);
    throw new Error(`Failed to ${operation}: ${message}`);
}

interface CommentRow {
    id: string;
    task_id: string;
    user_id: string;
    content: string;
    created_at: string;
    is_system_activity?: boolean;
    users?: { username?: string } | { username?: string }[] | null;
}

function getUsernameFromRelation(users: CommentRow['users']): string {
    if (Array.isArray(users)) {
        return users[0]?.username || 'Unknown User';
    }

    return users?.username || 'Unknown User';
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

    if (error) handleError('fetch boards', error);

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

    if (error) handleError('add board', error);

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

    if (error) handleError('fetch cards', error);

    return (data ?? []).map(mapTaskRow)
}

/**
 * Insert a new card into Supabase, linked to a board.
 * @param card - Minimal task object for insertion.
 * @returns The hydrated Task instance.
 */
export async function addCard(card: { id: string; name: string; status: ColumnStatus; boardId: string; position?: number }): Promise<Task | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('tasks')
        .insert({
            id: card.id,
            name: card.name,
            status: card.status,
            board_id: card.boardId,
            position: card.position,
        })
        .select()
        .single()

    if (error) handleError('add card', error);

    return mapTaskRow(data)
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

    if (error) handleError('remove card', error);

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

    if (error) handleError('update card status', error);

    return true
}

/**
 * Update the exact positions and status of multiple tasks simultaneously
 * following a drag-and-drop workflow.
 * 
 * Uses a single Postgres RPC function (`batch_update_positions`) to perform
 * all updates in one atomic transaction, replacing the previous N-query approach.
 * 
 * @param updates - Array of task coordinate updates (ID, New Position, New Status).
 */
export async function updateTaskPositions(updates: { id: string, position: number, status: string }[]): Promise<boolean> {
    const supabase = await createClient()

    const { error } = await supabase.rpc('batch_update_positions', {
        updates: updates
    })

    if (error) handleError('update task positions', error);
    return true
}

/**
 * Update multiple fields of a card dynamically.
 * @param id - Task UUID.
 * @param updates - Partial mapping of fields to mutate (name, description, priority, etc).
 */
export async function updateCardDetails(id: string, updates: Partial<{ name: string; description: string | null; priority: string | null; due_date: string | null; status: string; assignee_id: string | null; labels: string[] }>): Promise<boolean> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)

    if (error) handleError('update card details', error);

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

    if (error) handleError('update board name', error);

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

    if (error) handleError('delete board', error);

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

    const { error: tasksError } = await supabase
        .from('tasks')
        .update({ assignee_id: null })
        .eq('board_id', id)
        .eq('assignee_id', session.user.id);

    if (tasksError) handleError('cleanly unassign tasks during board exit', tasksError);

    const { error, count } = await supabase
        .from('board_members')
        .delete({ count: 'exact' })
        .eq('board_id', id)
        .eq('user_id', session.user.id)

    if (error) handleError('leave board', error);
    if (count === 0) {
        // If count is 0, the user wasn't actually a member (security guard)
        console.error('Silent fail: No matching board_members row found to delete for user', session.user.id);
        throw new Error(`backend_silent_fail_delete`);
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

    if (error) handleError('create user profile', error);
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

    if (error) handleError('add board member', error);

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
export async function fetchBoardMembersFull(boardId: string): Promise<{ id: string, username: string }[]> {
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

// ─── Comments & Discussions ──────────────────────────────────────────

/**
 * Fetch all comments attached to a specific task, sorted chronologically.
 */
export async function fetchComments(taskId: string): Promise<Comment[]> {
    const supabase = await createClient();

    // Join with users table to get the raw username of the commenter
    const { data, error } = await supabase
        .from('comments')
        .select(`
            id,
            task_id,
            user_id,
            content,
            is_system_activity,
            created_at,
            users ( username )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetch comments:', error.message);
        return []; // Return empty gracefully rather than hard-crashing the modal
    }

    return (data || []).map((row: CommentRow) => ({
        id: row.id,
        taskId: row.task_id,
        userId: row.user_id,
        username: getUsernameFromRelation(row.users),
        content: row.content,
        createdAt: row.created_at,
        isSystemActivity: row.is_system_activity,
    }));
}

/**
 * Insert a new comment into a task using the active user session.
 */
export async function addComment(taskId: string, content: string): Promise<Comment | null> {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) throw new Error("No active session");

    const { data, error } = await supabase
        .from('comments')
        .insert({
            task_id: taskId,
            content: content
        })
        .select(`
            id,
            task_id,
            user_id,
            content,
            created_at,
            users ( username )
        `)
        .single();

    if (error) handleError('add comment', error);

    return {
        id: data.id,
        taskId: data.task_id,
        userId: data.user_id,
        username: getUsernameFromRelation(data.users),
        content: data.content,
        createdAt: data.created_at,
    };
}

/**
 * Delete an existing comment (restricted structurally by RLS to the author).
 */
export async function deleteComment(commentId: string): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

    if (error) handleError('delete comment', error);
    return true;
}
