"use client";

import { useId } from "react";
import { createPortal } from "react-dom";
import { useModal } from "@/hooks/useModal";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import type { CardProps } from "@/type/types";
import styles from "./Card.module.css";

export default function Card({ task, onClick }: CardProps) {
    const { isOpen, open, close } = useModal();
    const titleId = useId();
    const title = task?.name ?? "Task";
    const description = task?.description ?? "Description";

    useEscapeKey(close, isOpen);

    const handleOpen = () => {
        onClick?.();
        open();
    };

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
                        <h2 id={titleId} className={styles.modal_title}>
                            {title}
                        </h2>
                        <button
                            type="button"
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

    return (
        <>
            <div
                className={styles.card}
                onClick={handleOpen}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleOpen();
                    }
                }}
            >
                <h3>{title}</h3>
                <hr />
                <div className={styles.card_content}>
                    <p>{description}</p>
                </div>
            </div>
            {modal}
        </>
    );
}
