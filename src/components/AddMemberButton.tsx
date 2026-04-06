"use client";

import React, { useState } from "react";
import Modal from "./Modal/Modal";
import { addBoardMember } from "@/lib/actions";
import { useRouter } from "next/navigation";

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
    const [isOpen, setIsOpen] = useState(false);
    const [memberId, setMemberId] = useState("");
    const [loading, setLoading] = useState(false);

    // Execute Server Action attaching the unverified UUID natively into the `board_members` matrix table.
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!memberId.trim()) return;
        setLoading(true);
        try {
            await addBoardMember(boardId, memberId.trim());
            setIsOpen(false);
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
                onClick={() => setIsOpen(true)}
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
            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add Team Member">
                <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem', color: '#555' }}>
                    Paste a User ID to grant them permission to edit this board.
                </p>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="text"
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value)}
                        placeholder="User UUID"
                        style={{ padding: '0.5rem', border: '2px solid #000', fontSize: '1rem' }}
                        autoFocus
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading || !memberId.trim()}
                        style={{
                            padding: '0.75rem',
                            backgroundColor: '#000',
                            color: '#fff',
                            border: 'none',
                            cursor: loading || !memberId.trim() ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            fontSize: '1rem'
                        }}
                    >
                        {loading ? "Adding..." : "Add to Board"}
                    </button>
                </form>
            </Modal>
        </>
    );
}
