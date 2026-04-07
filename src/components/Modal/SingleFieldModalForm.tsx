/**
 * @file SingleFieldModalForm.tsx
 * @description Shared component for simple modal forms containing exactly one text input field.
 * @details Primarily used for board creation/renaming and user profile entry.
 */

"use client";

import type { FormEvent, RefObject } from "react";
import Modal from "@/components/Modal/Modal";
import modalStyles from "@/components/Modal/Modal.module.css";

/**
 * Props for the SingleFieldModalForm component.
 */
interface SingleFieldModalFormProps {
    isOpen: boolean;
    onClose: () => void;
    /** Callback to handle the form submission logic */
    onSubmit: () => void | Promise<void>;
    /** Modal header title text */
    title: string;
    /** Label for the text input field */
    label: string;
    /** Current state value of the field */
    value: string;
    /** Change callback for the input state */
    onChange: (value: string) => void;
    /** Label for the submit button */
    submitLabel: string;
    /** Optional placeholder for the input field */
    placeholder?: string;
    /** Optional ref for programmatic focus control */
    inputRef?: RefObject<HTMLInputElement | null>;
    /** Whether to automatically focus the field on mount */
    autoFocus?: boolean;
    /** Whether the form is disabled (e.g., during loading) */
    disabled?: boolean;
}

/**
 * Renders a standardized modal form with a title, a single input field, and a submit button.
 */
export default function SingleFieldModalForm({
    isOpen,
    onClose,
    onSubmit,
    title,
    label,
    value,
    onChange,
    submitLabel,
    placeholder,
    inputRef,
    autoFocus = false,
    disabled = false,
}: SingleFieldModalFormProps) {
    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await onSubmit();
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <form className={modalStyles.modal_body} onSubmit={handleSubmit}>
                <label className={modalStyles.modal_label}>{label}</label>
                <input
                    ref={inputRef}
                    type="text"
                    className={modalStyles.modal_input}
                    placeholder={placeholder}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    autoFocus={autoFocus}
                    required
                />
                <button type="submit" className={modalStyles.modal_submit} disabled={disabled}>
                    {submitLabel}
                </button>
            </form>
        </Modal>
    );
}
