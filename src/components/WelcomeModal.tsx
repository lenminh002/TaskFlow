"use client";

import React, { useState } from "react";
import Modal from "./Modal/Modal";
import modalStyles from "@/components/Modal/Modal.module.css";
import { createUserProfile } from "@/lib/actions";
import { useModal } from "@/hooks/useModal";

/**
 * @file WelcomeModal.tsx
 * @description Highly locked onboarding gateway strictly demanding a textual Username from freshly minted Anonymous Supabase tokens.
 */

export default function WelcomeModal({ userId, onComplete }: { userId: string, onComplete: () => void }) {
    const { isOpen } = useModal(true);
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) return;
        setLoading(true);
        try {
            // Push profile payload to public users table unlocking full interactive privileges platform-wide
            await createUserProfile(userId, username);
            onComplete();
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={() => {}} title="Welcome to TaskFlow!" dismissible={false}>
            <form onSubmit={handleSubmit} className={modalStyles.modal_body}>
                <label className={modalStyles.modal_label}>Username</label>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="E.g. Alex"
                    className={modalStyles.modal_input}
                    autoFocus
                    required
                />
                <button
                    type="submit"
                    disabled={loading || !username.trim()}
                    className={modalStyles.modal_submit}
                >
                    {loading ? "Joining..." : "Join Workflow"}
                </button>
            </form>
        </Modal>
    );
}
