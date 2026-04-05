"use client";

import { createPortal } from "react-dom";
import { useState, useRef, useEffect } from "react";
import { useModal } from "@/hooks/useModal";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import styles from "./Column.module.css";
import Card from "@/components/Card/Card";
import type { Task, ColumnStatus } from "@/type/types";

/**
 * @file Column.tsx
 * @description Renders a single vertical lane in the Kanban board.
 * @details Manages its own add-card modal and acts as an HTML5 drop zone, propagating actions to BoardClient.
 */

// Column-specific props
interface ColumnProps {
    /** Display name at the top (e.g. "To Do") */
    title: string;                              
    /** Status key used for logical filtering (e.g. "todo") */
    status: ColumnStatus;                       
    /** Tasks to render inside this column */
    tasks?: Task[];                             
    /** Callback for modal form submission */
    onAddCard?: (name: string) => void;         
    /** Propagates drag-and-drop or detail changes */
    onUpdateCard?: (id: string, updates: Partial<Task>) => void; 
    /** Propagates card removal */
    onRemoveCard?: (id: string) => void;        
}

/**
 * Vertical Kanban lane rendering cards and a "+" button modal for new tasks.
 */
export default function Column({ title, status, tasks = [], onAddCard, onUpdateCard, onRemoveCard }: ColumnProps) {
    const { isOpen, open, close } = useModal();
    const [cardName, setCardName] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Bind the Escape key to close the modal if it is actively open
    useEscapeKey(close, isOpen);

    // Auto-focus the input field shortly after the modal portal mounts to the DOM
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Submit the normalized card name upstream to the BoardClient for database insertion
    function handleSubmit() {
        const trimmed = cardName.trim();
        if (!trimmed) return;
        onAddCard?.(trimmed);
        setCardName("");
        close();
    }

    // Render the new-card modal globally using a portal to overlay the entire view
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
            <div 
                className={styles.column} 
                data-status={status}
                onDragOver={(e) => {
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#f0f0f0';
                }}
                onDragLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '';
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).style.backgroundColor = '';
                    const taskId = e.dataTransfer.getData("text/plain");
                    if (taskId && onUpdateCard) {
                        onUpdateCard(taskId, { status: status });
                    }
                }}
            >
                <h1>{title}</h1>

                {/* Render a Card for each task in this column */}
                {tasks.map((task) => (
                    <Card
                        key={task.id}
                        task={task}
                        onUpdateCard={onUpdateCard}
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