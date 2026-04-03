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
    onRemoveCard?: (id: string) => void;    // Callback to remove this card from the board
}

// Card represents a single task on the Kanban board.
// Clicking the card body opens a detail modal; clicking "×" removes the card.
export default function Card({ task, onClick, onRemoveCard }: CardProps) {
    const { isOpen, open, close } = useModal();     // Custom hook to manage modal open/close state
    const title = task?.name ?? "Task";             // Fallback to "Task" if no name is provided
    const description = task?.description ?? "Description"; // Same as title

    // Allow users to close the modal by pressing the Escape key
    useEscapeKey(close, isOpen);

    // When the card body is clicked, trigger any parent callback and open the modal
    const handleOpen = () => {
        onClick?.();    // Call the optional parent onClick if provided
        open();         // Open the detail modal
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
                        <p>{description}</p>
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
                    <p>{description}</p>
                </div>
            </div>
            {modal}
        </>
    );
}
