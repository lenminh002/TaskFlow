"use client";

import React, { useState } from "react";
import Modal from "./Modal/Modal";
import modalStyles from "@/components/Modal/Modal.module.css";
import { addBoardMember } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useModal } from "@/hooks/useModal";
import { useEscapeKey } from "@/hooks/useEscapeKey";

/** 
 * @file AddMemberButton.tsx 
 * @description Button and Modal encapsulating logic for dynamically attaching new external User UUIDs to the current Board's Row Level Security context securely.
 */

/**
 * Button component that spawns a modal for adding new members to a board.
 * @param boardId - The UUID of the board to which the new member will be added.
 */
export default function AddMemberButton({ boardId }: { boardId: string }) {
    const router = useRouter();
    const { isOpen, open, close } = useModal();
    const [memberId, setMemberId] = useState("");
    const [loading, setLoading] = useState(false);

    useEscapeKey(close, isOpen);

    // Execute Server Action attaching the unverified UUID natively into the `board_members` matrix table.
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!memberId.trim()) return;
        setLoading(true);
        try {
            await addBoardMember(boardId, memberId.trim());
            close();
            setMemberId("");
            // Refresh Server Components natively to download the freshly hydrated user structures over RLS
            router.refresh();
        } catch (err) {
            console.error(err);
            alert("Failed to add member.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={open}
                style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#000',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                }}
            >
                + Add Member
            </button>
            <Modal isOpen={isOpen} onClose={close} title="Add Team Member">
                <form onSubmit={handleSubmit} className={modalStyles.modal_body}>
                    <label className={modalStyles.modal_label}>User UUID</label>
                    <input
                        type="text"
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value)}
                        placeholder="Paste a User ID here..."
                        className={modalStyles.modal_input}
                        autoFocus
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading || !memberId.trim()}
                        className={modalStyles.modal_submit}
                    >
                        {loading ? "Adding..." : "Add to Board"}
                    </button>
                </form>
            </Modal>
        </>
    );
}
