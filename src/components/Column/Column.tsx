"use client";

import { createPortal } from "react-dom";
import { useState, useRef, useEffect } from "react";
import { useModal } from "@/hooks/useModal";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import styles from "./Column.module.css";
import Card from "@/components/Card/Card";
import type { Task, ColumnStatus } from "@/type/types";

// Props for the Column component (defined here since only Column uses it)
interface ColumnProps {
    title: string;                              // Display name shown at the top of the column (e.g. "To Do")
    status: ColumnStatus;                       // Status key used as a data attribute for styling/filtering
    tasks?: Task[];                             // Array of tasks to render as cards inside this column
    onAddCard?: (name: string) => void;         // Callback triggered with the card name from the modal
    onRemoveCard?: (id: string) => void;        // Callback triggered when a card's "×" button is clicked
}

// Column represents a single vertical lane on the Kanban board.
// It receives its tasks and callbacks from BoardClient (the parent).
export default function Column({ title, status, tasks = [], onAddCard, onRemoveCard }: ColumnProps) {
    const { isOpen, open, close } = useModal();
    const [cardName, setCardName] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Allow users to close the modal by pressing Escape
    useEscapeKey(close, isOpen);

    // Auto-focus the input when the modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Submit the new card name to the parent and close the modal
    function handleSubmit() {
        const trimmed = cardName.trim();
        if (!trimmed) return;
        onAddCard?.(trimmed);
        setCardName("");
        close();
    }

    // Modal rendered via portal into document.body
    const modal =
        isOpen &&
        createPortal(
            <div className={styles.backdrop} onClick={close}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.modal_header}>
                        <h2 className={styles.modal_title}>New Card</h2>
                        <button className={styles.modal_close} onClick={close}>×</button>
                    </div>
                    <hr className={styles.modal_hr} />
                    <form
                        className={styles.modal_body}
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSubmit();
                        }}
                    >
                        <label className={styles.modal_label}>Card Name</label>
                        <input
                            ref={inputRef}
                            type="text"
                            className={styles.modal_input}
                            placeholder="Enter card name..."
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                        />
                        <button type="submit" className={styles.modal_submit}>
                            Add Card
                        </button>
                    </form>
                </div>
            </div>,
            document.body
        );

    return (
        <>
            <div className={styles.column} data-status={status}>
                <h1>{title}</h1>

                {/* Render a Card for each task in this column */}
                {tasks.map((task) => (
                    <Card
                        key={task.id}
                        task={task}
                        onRemoveCard={onRemoveCard}
                    />
                ))}

                <hr style={{ border: '1px solid #000000' }} />

                {/* "+" button to open the add card modal */}
                <button className={styles.add_card} onClick={open}>+</button>
            </div>
            {modal}
        </>
    );
}