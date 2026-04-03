"use client";

import { createPortal } from "react-dom";
import { useModal } from "@/hooks/useModal";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import type { Task } from "@/type/types";
import styles from "./Card.module.css";

// Props for the Card component
interface CardProps {
    task?: Task;                            // The task data to display on this card
    onClick?: () => void;                   // Optional callback when the card is clicked (before opening modal)
    onUpdateCard?: (id: string, updates: Partial<Task>) => void; // Callback to update card properties
    onRemoveCard?: (id: string) => void;    // Callback to remove this card from the board
}

// Format a date value into a readable string
function formatDate(value?: Date | string): string | null {
    if (!value) return null;
    const date = typeof value === "string" ? new Date(value) : value;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Map priority values to display labels
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

// Card represents a single task on the Kanban board.
// Clicking the card body opens a detail modal; clicking "×" removes the card.
export default function Card({ task, onClick, onUpdateCard, onRemoveCard }: CardProps) {
    const { isOpen, open, close } = useModal();     // Custom hook to manage modal open/close state
    const title = task?.name ?? "Task";             // Fallback to "Task" if no name is provided

    // Allow users to close the modal by pressing the Escape key
    useEscapeKey(close, isOpen);

    // When the card body is clicked, trigger any parent callback and open the modal
    const handleOpen = () => {
        onClick?.();    // Call the optional parent onClick if provided
        open();         // Open the detail modal
    };

    const handleUpdate = (updates: Partial<Task>) => {
        if (task?.id && onUpdateCard) {
            onUpdateCard(task.id, updates);
        }
    };

    // ----- Modal (rendered via portal into document.body) -----
    // createPortal renders this outside the normal DOM tree so it overlays the entire page.
    const modal =
        isOpen &&
        createPortal(
            // Backdrop: clicking it closes the modal
            <div
                className={styles.backdrop}
                onClick={close}
            >
                {/* Modal content: stopPropagation prevents clicks inside from closing the modal */}
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
                                defaultValue={task?.description || ""}
                                placeholder="Add a more detailed description..."
                                onBlur={(e) => handleUpdate({ description: e.target.value })}
                            />
                        </div>

                        {/* Priority */}
                        <div className={styles.modal_field}>
                            <span className={styles.modal_label}>Priority</span>
                            <select
                                className={styles.modal_select}
                                defaultValue={task?.priority || ""}
                                onChange={(e) => handleUpdate({ priority: e.target.value as any })}
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
                                // value requires YYYY-MM-DD
                                defaultValue={task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ""}
                                onChange={(e) => handleUpdate({ dueDate: e.target.value ? new Date(e.target.value) : undefined })}
                            />
                        </div>

                        {/* Created At */}
                        <div className={styles.modal_field}>
                            <span className={styles.modal_label}>Created</span>
                            <p>{formatDate(task?.createdAt) || "—"}</p>
                        </div>
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
                    {task?.description && <p className={styles.card_description}>{task.description}</p>}
                    <div className={styles.card_meta}>
                        {task?.priority && <span className={styles.card_tag}>{priorityLabel(task.priority)}</span>}
                        {task?.dueDate && <span className={styles.card_tag}>📅 {formatDate(task.dueDate)}</span>}
                    </div>
                </div>
            </div>
            {modal}
        </>
    );
}
