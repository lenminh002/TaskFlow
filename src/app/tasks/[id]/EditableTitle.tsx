"use client";

import { useState, useRef, useEffect } from "react";
import { updateBoardName } from "@/lib/actions";
import styles from "./page.module.css";

// EditableTitle renders the board name as an <h1>.
// Clicking it turns it into an input field so you can rename the board.
// Pressing Enter or clicking away saves the new name to Supabase.
export default function EditableTitle({ boardId, initialName }: { boardId: string; initialName: string }) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(initialName);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus and select all text when entering edit mode
    useEffect(() => {
        if (editing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [editing]);

    // Save the name to Supabase and exit edit mode
    async function save() {
        setEditing(false);
        const trimmed = name.trim();
        if (!trimmed || trimmed === initialName) {
            setName(initialName); // Revert if empty
            return;
        }
        const success = await updateBoardName(boardId, trimmed);
        if (!success) {
            setName(initialName); // Rollback on failure
        } else {
            // Notify other components (e.g. NavBar) that this board was renamed
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
            title="Click to rename"
        >
            {name}
        </h1>
    );
}
