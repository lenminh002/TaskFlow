"use client";

import { createPortal } from "react-dom";
import styles from "./Modal.module.css";
import React from "react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    dismissible?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, dismissible = true }: ModalProps) {
    if (!isOpen || typeof document === "undefined") return null;

    return createPortal(
        <div className={styles.backdrop} onClick={dismissible ? onClose : undefined}>
            {/* Modal Container: Stops clicks from accidentally closing the backdrop */}
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Header: Displays title and close action */}
                <div className={styles.modal_header}>
                    <h2 className={styles.modal_title}>{title}</h2>
                    {dismissible && <button className={styles.modal_close} onClick={onClose}>×</button>}
                </div>
                <hr className={styles.modal_hr} />
                
                {/* Children render the form or customized body content natively */}
                {children}
            </div>
        </div>,
        document.body
    );
}
