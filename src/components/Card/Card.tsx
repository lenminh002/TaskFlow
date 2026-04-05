"use client";

import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
import { useModal } from "@/hooks/useModal";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import type { Task } from "@/type/types";
import styles from "./Card.module.css";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * @file Card.tsx
 * @description Draggable task card with an editable detail modal.
 * @details Wraps the generic card markup with @dnd-kit's useSortable hook, enabling physical dragging semantics, CSS transforms, and sorting listeners.
 */

/**
 * Interface configuring the Card component rendering and interactions.
 * @param task - The full Task object supplying rendering data (title, status, due date, etc).
 * @param onClick - Interceptor callback fired when the card is clicked (prior to the default modal open).
 * @param onUpdateCard - Callback fired when the user modifies data inside the modal.
 * @param onRemoveCard - Callback fired when the user clicks the delete (X) badge.
 */
interface CardProps {
    task?: Task;
    onClick?: () => void;
    onUpdateCard?: (id: string, updates: Partial<Task>) => void;
    onRemoveCard?: (id: string) => void;
}

/**
 * Utility Function: Formats a JS Date object or raw timestamp string into a readable format.
 * Transforms `2024-04-05T...` into "Apr 5, 2024".
 * @param value - The raw Date object or ISO string timeline.
 * @returns An American-formatted localized string, or null if undefined.
 */
function formatDate(value?: Date | string): string | null {
    if (!value) return null;
    const date = typeof value === "string" ? new Date(value) : value;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Utility Function: Maps raw database enum variants to user-friendly emoji badges.
 * Provides a highly scannable visual identifier on the surface of the Card.
 * @param priority - The raw priority string ("low", "medium", "high", "urgent").
 * @returns The decorated label including its emoji prefix.
 */
function priorityLabel(priority?: string): string | null {
    if (!priority) return null;
    const labels: Record<string, string> = {
        low: "🟢 Low",
        medium: "🟡 Medium",
        high: "🟠 High",
        urgent: "🔴 Urgent",
    };
    return labels[priority] ?? priority;
}

export default function Card({ task, onClick, onUpdateCard, onRemoveCard }: CardProps) {
    const { isOpen, open, close } = useModal();
    const title = task?.name ?? "Task";

    const [localDesc, setLocalDesc] = useState(task?.description || "");
    const [localPriority, setLocalPriority] = useState(task?.priority || "");
    const [localDueDate, setLocalDueDate] = useState(task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "");

    // Connects the component to the dnd-kit Sortable ecosystem.
    // 'attributes' and 'listeners' govern keyboard accessibility and pointer interactions.
    // 'transform' maps the physical layout shift coordinates while 'isDragging' gives conditional opacity styling.
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task?.id || "",
        data: {
            type: "Task",
            task,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    // Modal Lifecycle Hook: Whenever the user opens the modal or the parent `task` prop changes,
    // this hook forcefully overrides the temporary modal inputs with the most up-to-date accurate database data.
    // This solves "stale state" issues if you open the modal quickly after another computer updated the same card.
    useEffect(() => {
        if (isOpen) {
            setLocalDesc(task?.description || "");
            setLocalPriority(task?.priority || "");
            setLocalDueDate(task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "");
        }
    }, [isOpen, task]);

    useEscapeKey(close, isOpen);

    /**
     * Intercepts the Card click. 
     * Since the card is technically a draggable dnd-kit zone, we safely invoke the modal open 
     * programmatically to prevent colliding drag behaviors.
     */
    const handleOpen = () => {
        onClick?.();
        open();
    };

    /**
     * Triggered inside the Modal when the user hits "Save Changes".
     * Validates the ID exists, constructs a subset Partial<Task> payload mapping to the inputs,
     * fires it up the tree to `onUpdateCard`, and visually slides the modal closed immediately.
     */
    const handleSave = () => {
        if (task?.id && onUpdateCard) {
            onUpdateCard(task.id, {
                description: localDesc,
                priority: localPriority as any,
                dueDate: localDueDate ? new Date(localDueDate) : undefined
            });
        }
        close();
    };

    const modal =
        isOpen &&
        createPortal(
            <div className={styles.backdrop} onClick={close}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.modal_header}>
                        <h2 className={styles.modal_title}>{title}</h2>
                        <button className={styles.modal_close} onClick={close}>×</button>
                    </div>
                    <hr className={styles.modal_hr} />
                    <div className={styles.modal_body}>
                        <div className={styles.modal_field}>
                            <span className={styles.modal_label}>Description</span>
                            <textarea className={styles.modal_textarea} value={localDesc} placeholder="Add a more detailed description..." onChange={(e) => setLocalDesc(e.target.value)} />
                        </div>
                        <div className={styles.modal_field}>
                            <span className={styles.modal_label}>Priority</span>
                            <select className={styles.modal_select} value={localPriority} onChange={(e) => setLocalPriority(e.target.value)}>
                                <option value="">None</option>
                                <option value="low">🟢 Low</option>
                                <option value="medium">🟡 Medium</option>
                                <option value="high">🟠 High</option>
                                <option value="urgent">🔴 Urgent</option>
                            </select>
                        </div>
                        <div className={styles.modal_field}>
                            <span className={styles.modal_label}>Status</span>
                            <p className={styles.status_badge}>{task?.status?.replace("_", " ") ?? "—"}</p>
                        </div>
                        <div className={styles.modal_field}>
                            <span className={styles.modal_label}>Due Date</span>
                            <input type="date" className={styles.modal_input} value={localDueDate} onChange={(e) => setLocalDueDate(e.target.value)} />
                        </div>
                        <div className={styles.modal_field}>
                            <span className={styles.modal_label}>Created</span>
                            <p>{formatDate(task?.createdAt) || "—"}</p>
                        </div>
                        <hr className={styles.modal_hr} />
                        <button className={styles.modal_submit} onClick={handleSave}>Save Changes</button>
                    </div>
                </div>
            </div>,
            document.body
        );

    if (!task?.id) {
        return (
            <div className={styles.card}>
                <div className={styles.card_header}><h3>{title}</h3></div>
            </div>
        );
    }

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className={styles.card}
                onClick={handleOpen}
            >
                <div className={styles.card_header}>
                    <h3>{title}</h3>
                    <button
                        className={styles.card_close}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (task?.id && onRemoveCard) onRemoveCard(task.id);
                        }}
                    >
                        ×
                    </button>
                </div>
                <br />
                <hr />
                <div className={styles.card_content}>
                    {task?.description
                        ? <p className={styles.card_description}>{task.description}</p>
                        : <p className={styles.card_description}>No description</p>
                    }
                    <div className={styles.card_meta}>
                        {task?.priority && <span className={styles.card_tag}>{priorityLabel(task.priority)}</span>}
                        {task?.dueDate && <span className={styles.card_tag}>📅 Due: {formatDate(task.dueDate)}</span>}
                    </div>
                </div>
            </div>
            {modal}
        </>
    );
}
