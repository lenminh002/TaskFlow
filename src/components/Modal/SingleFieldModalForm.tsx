"use client";

import type { FormEvent, RefObject } from "react";
import Modal from "@/components/Modal/Modal";
import modalStyles from "@/components/Modal/Modal.module.css";

interface SingleFieldModalFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void | Promise<void>;
    title: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    submitLabel: string;
    placeholder?: string;
    inputRef?: RefObject<HTMLInputElement | null>;
    autoFocus?: boolean;
    disabled?: boolean;
}

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
