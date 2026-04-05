"use client";

import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
import { useModal } from "@/hooks/useModal";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import type { Task } from "@/type/types";
import styles from "./Card.module.css";

/**
 * @file Card.tsx
 * @description Draggable task card with an editable detail modal.
 * @details Displays task summary on the board. Clicking opens a modal for editing details (description, priority, due date). Uses local state buffering to save explicitly.
 */

// Card prop definitions mapped to external APIs
interface CardProps {
    task?: Task;
    /** Click handler, typically for modal opening */
    onClick?: () => void;
    /** Parent callback to mutate card state upstream */
    onUpdateCard?: (id: string, updates: Partial<Task>) => void;
    /** Callback to remove card globally */
    onRemoveCard?: (id: string) => void;
}

/** Formats a date or string into "Mon DD, YYYY" format */
function formatDate(value?: Date | string): string | null {
    if (!value) return null;
    const date = typeof value === "string" ? new Date(value) : value;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Translates raw priority strings into visual labels */
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

/**
 * Draggable card component encapsulating its own edit modal workflow.
 */
export default function Card({ task, onClick, onUpdateCard, onRemoveCard }: CardProps) {
    const { isOpen, open, close } = useModal();
    const title = task?.name ?? "Task";

    // Local buffered state for editing
    const [localDesc, setLocalDesc] = useState(task?.description || "");
    const [localPriority, setLocalPriority] = useState(task?.priority || "");
    const [localDueDate, setLocalDueDate] = useState(task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "");

    // Sync local state when the modal opens to ensure any new external database values are displayed
    useEffect(() => {
        if (isOpen) {
            setLocalDesc(task?.description || "");
            setLocalPriority(task?.priority || "");
            setLocalDueDate(task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "");
        }
    }, [isOpen, task]);

    // Bind the Escape key to close the modal if it's currently open
    useEscapeKey(close, isOpen);

    // Trigger the parent's generic onClick explicitly before opening the detail edit modal
    const handleOpen = () => {
        onClick?.();
        open();
    };

    // Bundle all locally edited fields and dispatch them to the parent for DB updating before closing the modal
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

    // Provide a full-page modal using a React Portal so the overlay breaks out of the card's local CSS positioning
    const modal =
        isOpen &&
        createPortal(
            <div
                className={styles.backdrop}
                onClick={close}
            >
                <div
                    className={styles.modal}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={styles.modal_header}>
                        <h2 className={styles.modal_title}>
                            {title}
                        </h2>
                        <button
                            className={styles.modal_close}
                            onClick={close}
                        >
                            ×
                        </button>
                    </div>
                    <hr className={styles.modal_hr} />
                    <div className={styles.modal_body}>
                        {/* Description */}
                        <div className={styles.modal_field}>
                            <span className={styles.modal_label}>Description</span>
                            <textarea
                                className={styles.modal_textarea}
                                value={localDesc}
                                placeholder="Add a more detailed description..."
                                onChange={(e) => setLocalDesc(e.target.value)}
                            />
                        </div>

                        {/* Priority */}
                        <div className={styles.modal_field}>
                            <span className={styles.modal_label}>Priority</span>
                            <select
                                className={styles.modal_select}
                                value={localPriority}
                                onChange={(e) => setLocalPriority(e.target.value)}
                            >
                                <option value="">None</option>
                                <option value="low">🟢 Low</option>
                                <option value="medium">🟡 Medium</option>
                                <option value="high">🟠 High</option>
                                <option value="urgent">🔴 Urgent</option>
                            </select>
                        </div>

                        {/* Status */}
                        <div className={styles.modal_field}>
                            <span className={styles.modal_label}>Status</span>
                            <p className={styles.status_badge}>{task?.status?.replace("_", " ") ?? "—"}</p>
                        </div>

                        {/* Due Date */}
                        <div className={styles.modal_field}>
                            <span className={styles.modal_label}>Due Date</span>
                            <input
                                type="date"
                                className={styles.modal_input}
                                value={localDueDate}
                                onChange={(e) => setLocalDueDate(e.target.value)}
                            />
                        </div>

                        {/* Created At */}
                        <div className={styles.modal_field}>
                            <span className={styles.modal_label}>Created</span>
                            <p>{formatDate(task?.createdAt) || "—"}</p>
                        </div>

                        <hr className={styles.modal_hr} />
                        <button className={styles.modal_submit} onClick={handleSave}>
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );

    // ----- Card (visible on the board) -----
    return (
        <>
            <div
                className={styles.card}
                onClick={handleOpen}
                draggable
                onDragStart={(e) => {
                    if (task?.id) {
                        e.dataTransfer.setData("text/plain", task.id);
                        // Optional: style changes on drag start
                        setTimeout(() => (e.target as HTMLElement).style.opacity = '0.5', 0);
                    }
                }}
                onDragEnd={(e) => {
                    (e.target as HTMLElement).style.opacity = '1';
                }}
            >
                <div className={styles.card_header}>
                    <h3>{title}</h3>
                    {/* "×" close button — removes the card from the board */}
                    <button
                        className={styles.card_close}
                        onClick={(e) => {
                            // stopPropagation prevents the card's onClick (handleOpen) from firing
                            e.stopPropagation();
                            // Only remove if we have a valid task ID and the callback exists
                            if (task?.id && onRemoveCard) {
                                onRemoveCard(task.id);
                            }
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
                    }                    <div className={styles.card_meta}>
                        {task?.priority && <span className={styles.card_tag}>{priorityLabel(task.priority)}</span>}
                        {task?.dueDate && <span className={styles.card_tag}>📅 Due: {formatDate(task.dueDate)}</span>}
                    </div>
                </div>
            </div>
            {modal}
        </>
    );
}
