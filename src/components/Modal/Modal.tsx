/**
 * @file Modal.tsx
 * @description Generic React Portal wrapper for displaying application-wide modal overlays.
 * @details Handles backdrop clicking, event propagation, and accessibility through a shared layout.
 */

"use client";

import { createPortal } from "react-dom";
import styles from "./Modal.module.css";
import React from "react";

/**
 * Configuration props for the Modal component.
 */
interface ModalProps {
    /** Whether the modal is currently visible */
    isOpen: boolean;
    /** Callback function to trigger when the modal should close */
    onClose: () => void;
    /** Header title text */
    title: string;
    /** Content to render inside the modal body */
    children: React.ReactNode;
    /** Whether the modal can be closed by clicking the backdrop or the 'X' button */
    dismissible?: boolean;
}

/**
 * Renders a portalled modal window over the current page content.
 */
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
