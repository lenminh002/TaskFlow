/**
 * @file EditableTitle.tsx
 * @description Inline-editable title component for board names or other entities.
 * @details Renders an text element that becomes a controlled auto-sizing input upon clicking.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { updateBoardName } from "@/lib/actions";
import styles from "./EditableTitle.module.css";

interface EditableTitleProps {
    /** The unique identifier of the entity being renamed (e.g., boardId) */
    boardId: string;
    /** The current display name before any edits */
    initialName: string;
    /** Optional CSS class for the h1 container */
    className?: string;
}

/**
 * Manages local editing state for a title string, persisting changes to Supabase.
 * Broadcasts a 'board-renamed' CustomEvent on successful server-side update.
 */
export default function EditableTitle({ boardId, initialName }: EditableTitleProps) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(initialName);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync local name state if the initial name changes externally (e.g., via sync)
    useEffect(() => {
        setName(initialName);
    }, [initialName]);

    // Automatically focus and select the input when entering edit mode
    useEffect(() => {
        if (editing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [editing]);

    /**
     * Persists changes to Supabase and exits edit mode.
     * Manages local rollbacks if the network request fails.
     */
    async function save() {
        setEditing(false);
        const trimmed = name.trim();
        if (!trimmed || trimmed === initialName) {
            setName(initialName); // Revert to original on blank or no change
            return;
        }

        try {
            const success = await updateBoardName(boardId, trimmed);
            if (success) {
                // Broadcast for components that don't share React state (like Sidebar)
                window.dispatchEvent(new CustomEvent("board-renamed", {
                    detail: { id: boardId, name: trimmed }
                }));
            } else {
                setName(initialName); // Rollback on explicit failure
            }
        } catch (error) {
            console.error("Failed to update title:", error);
            setName(initialName); // Rollback on error
        }
    }

    if (editing) {
        return (
            <div className={styles.input_wrapper} data-value={name}>
                <input
                    ref={inputRef}
                    className={styles.title_input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={save}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") save();
                        if (e.key === "Escape") {
                            setName(initialName);
                            setEditing(false);
                        }
                    }}
                />
            </div>
        );
    }

    return (
        <h1
            className={styles.title}
            onClick={() => setEditing(true)}
            style={{ cursor: "pointer" }}
        >
            {name}
        </h1>
    );
}
