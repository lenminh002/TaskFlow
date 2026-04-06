"use client";

/**
 * @file EditableTitle.tsx
 * @description Inline-editable title component for board names.
 * @details Renders an `h1` that becomes a controlled `input` upon clicking. Saves purely to Supabase on blur/Enter.
 */

import { useState, useRef, useEffect } from "react";
import { updateBoardName } from "@/lib/actions";
import styles from "./page.module.css";

/**
 * Manages local editing state for the board name, persisting changes to Supabase and refreshing navigation via CustomEvent.
 */
export default function EditableTitle({ boardId, initialName }: { boardId: string; initialName: string }) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(initialName);
    const inputRef = useRef<HTMLInputElement>(null);

    // Automatically select all existing text dynamically when the user clicks to enter edit mode
    useEffect(() => {
        if (editing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [editing]);

    // Persist changes to Supabase and exit edit mode, managing local rollbacks on failure
    async function save() {
        setEditing(false);
        const trimmed = name.trim();
        if (!trimmed || trimmed === initialName) {
            setName(initialName); // Revert to the original name if left blank or unchanged
            return;
        }

        const success = await updateBoardName(boardId, trimmed);
        if (!success) {
            setName(initialName); // Rollback locally if the network payload fails
        } else {
            // Broadcast a CustomEvent so disconnected UI trees (like the sidebar) resync immediately
            window.dispatchEvent(new CustomEvent("board-renamed", {
                detail: { id: boardId, name: trimmed }
            }));
        }
    }

    if (editing) {
        return (
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
