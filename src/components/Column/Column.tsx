"use client";

import { createPortal } from "react-dom";
import { useState, useRef, useEffect, useMemo } from "react";
import { useModal } from "@/hooks/useModal";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import styles from "./Column.module.css";
import Card from "@/components/Card/Card";
import type { Task, ColumnStatus } from "@/type/types";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";

/**
 * @file Column.tsx
 * @description Renders a single vertical lane in the Kanban board.
 * @details Implements @dnd-kit's SortableContext for internal list sorting and acts as a generic Droppable container.
 */

/**
 * Interface detailing explicit inputs for the Column component.
 * @param title - The readable title displayed at the top of the column.
 * @param status - The programmatic `ColumnStatus` bound to tasks sitting inside this column.
 * @param tasks - The array of tasks designated to this column.
 * @param onAddCard - Callback fired when a new task is created inside this column.
 * @param onUpdateCard - Callback fired when a child task inside this column is edited.
 * @param onRemoveCard - Callback fired when a child task inside this column is deleted.
 */
interface ColumnProps {
    title: string;
    status: ColumnStatus;
    tasks?: Task[];
    onAddCard?: (name: string) => void;
    onUpdateCard?: (id: string, updates: Partial<Task>) => void;
    onRemoveCard?: (id: string) => void;
}

export default function Column({ title, status, tasks = [], onAddCard, onUpdateCard, onRemoveCard }: ColumnProps) {
    const { isOpen, open, close } = useModal();
    const [cardName, setCardName] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // The useDroppable hook registers this entire column container as a valid target for dragged elements.
    // The `isOver` boolean provides styling feedback when a card is actively hovering in its airspace.
    const { setNodeRef, isOver } = useDroppable({
        id: status,
        data: {
            type: "Column",
            status,
        },
    });

    // Memoizes the list of task IDs. @dnd-kit's SortableContext requires a flat array of unique identifiers 
    // to map dragged elements correctly in its visual tree. useMemo prevents unnecessary re-renders.
    const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

    useEscapeKey(close, isOpen);

    // Automatically focuses the text input cursor inside the modal when the user opens "New Card".
    // A 50ms delay is artificially injected because createPortal takes a split-second to mount the DOM node natively.
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    /**
     * Triggered when the user submits the "New Card" form.
     * Prevents empty submissions by trimming whitespace. 
     * If valid, it dynamically invokes the parent `onAddCard` callback (passing the value upward),
     * resets the local input buffer, and closes the modal view.
     */
    function handleSubmit() {
        const trimmed = cardName.trim();
        if (!trimmed) return;
        onAddCard?.(trimmed);
        setCardName("");
        close();
    }

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
                ref={setNodeRef}
                className={styles.column} 
                data-status={status}
                style={{ backgroundColor: isOver ? '#f0f0f0' : '' }}
            >
                <h1>{title}</h1>

                {/* 
                  SortableContext manages the ordered list of items within this specific column. 
                  It correlates the array of task IDs to their rendered Card components.
                */}
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                        <Card
                            key={task.id}
                            task={task}
                            onUpdateCard={onUpdateCard}
                            onRemoveCard={onRemoveCard}
                        />
                    ))}
                </SortableContext>

                <hr style={{ border: '1px solid #000000' }} />

                <button className={styles.add_card} onClick={open}>+</button>
            </div>
            {modal}
        </>
    );
}