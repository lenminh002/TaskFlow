/**
 * @file useBoardRealtime.ts
 * @description Custom hook for managing realtime board synchronization via Supabase.
 * @details Implements debouncing and a cooldown mechanism to prevent mid-mutation sync flicker.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { mapTaskRow } from "@/lib/task-mappers";
import { sortTasksByPosition } from "@/lib/board-utils";
import type { Task } from "@/type/types";

interface UseBoardRealtimeProps {
    /** UUID of the board */
    boardId: string;
    /** Local state setter for board tasks */
    setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
    /** Ref to check if a drag operation is active (suppresses sync during drag) */
    isDraggingRef: React.RefObject<boolean>;
}

/**
 * Encapsulates the Supabase Realtime subscription and synchronization logic.
 * Returns a function to trigger a mutation cooldown.
 */
export function useBoardRealtime({ boardId, setTasks, isDraggingRef }: UseBoardRealtimeProps) {
    const selfUpdateCooldownRef = useRef(false);
    const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * Prevents realtime updates from firing for a short duration.
     * Useful when we expect a local optimistic update to hit the server.
     */
    const startCooldown = useCallback((ms = 1000) => {
        selfUpdateCooldownRef.current = true;

        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);

        cooldownTimerRef.current = setTimeout(() => {
            selfUpdateCooldownRef.current = false;
        }, ms);
    }, []);

    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel(`realtime-board-${boardId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                    filter: `board_id=eq.${boardId}`
                },
                (payload) => {
                    if (process.env.NODE_ENV === 'development') {
                        console.log("⚡ Realtime Sync Fired:", payload.eventType);
                    }

                    if (selfUpdateCooldownRef.current) {
                        if (process.env.NODE_ENV === 'development') {
                            console.log("⏭️ Skipping self-triggered realtime event.");
                        }
                        return;
                    }

                    if (debounceRef.current) clearTimeout(debounceRef.current);

                    debounceRef.current = setTimeout(async () => {
                        const { data, error } = await supabase
                            .from('tasks')
                            .select('*, users(username)')
                            .eq('board_id', boardId)
                            .order('position', { ascending: true });

                        if (error) {
                            console.error("Realtime refetch failed:", error.message);
                            return;
                        }

                        if (!isDraggingRef.current && data) {
                            const mapped = data.map(mapTaskRow);
                            setTasks(sortTasksByPosition(mapped));
                        }
                    }, 500);
                }
            )
            .subscribe((status) => {
                if (process.env.NODE_ENV === 'development') {
                    console.log("Supabase WebSocket:", status);
                }
            });

        return () => {
            supabase.removeChannel(channel);

            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
        };
    }, [boardId, setTasks, isDraggingRef]);

    return { startCooldown };
}
