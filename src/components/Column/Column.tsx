"use client";

import { useState, useMemo } from "react";
import { useModal } from "@/hooks/useModal";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import styles from "./Column.module.css";
import Modal from "@/components/Modal/Modal";
import modalStyles from "@/components/Modal/Modal.module.css";
import { useAutoFocus } from "@/hooks/useAutoFocus";
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
    teamMembers?: {id: string, username: string}[];
    onAddCard?: (name: string) => void;
    onUpdateCard?: (id: string, updates: Partial<Task>) => void;
    onRemoveCard?: (id: string) => void;
}

export default function Column({ title, status, tasks = [], teamMembers = [], onAddCard, onUpdateCard, onRemoveCard }: ColumnProps) {
    const { isOpen, open, close } = useModal();
    const [cardName, setCardName] = useState("");
    const inputRef = useAutoFocus<HTMLInputElement>(isOpen);

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

    const modal = (
        <Modal isOpen={isOpen} onClose={close} title="New Card">
            {/* Body: Form handler for submitting a new card to this specific column */}
            <form
                className={modalStyles.modal_body}
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                }}
            >
                <label className={modalStyles.modal_label}>Card Name</label>
                <input
                    ref={inputRef}
                    type="text"
                    className={modalStyles.modal_input}
                    placeholder="Enter card name..."
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                />
                <button type="submit" className={modalStyles.modal_submit}>
                    Add Card
                </button>
            </form>
        </Modal>
    );

    return (
        <>
            {/* 
              Physical Drop Zone:
              - `ref` designates this div container as a valid drop target for dnd-kit.
              - `data-status` attaches a native DOM payload used for CSS or external tracking.
              - `style` provides immediate highlight feedback when a dragged card hovers over its airspace.
            */}
            <div 
                ref={setNodeRef}
                className={styles.column} 
                data-status={status}
                style={{ backgroundColor: isOver ? '#f0f0f0' : '' }}
            >
                <h1>{title}</h1>

                {/* 
                  SortableContext manages the strict order of tasks belonging to this column. 
                  It correlates the array of task IDs directly to their physical DOM rendering.
                */}
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                        <Card
                            key={task.id}
                            task={task}
                            teamMembers={teamMembers}
                            onUpdateCard={onUpdateCard}
                            onRemoveCard={onRemoveCard}
                        />
                    ))}
                </SortableContext>

                <hr style={{ border: '1px solid #000000' }} />

                {/* Action button to open the "New Card" modal specifically scoped to this column's status variant */}
                <button className={styles.add_card} onClick={open}>+</button>
            </div>
            
            {/* Renders the "New Card" popup overlay */}
            {modal}
        </>
    );
}