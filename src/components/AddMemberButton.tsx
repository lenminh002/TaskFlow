"use client";

import React, { useState } from "react";
import { addBoardMember } from "@/lib/actions";
import { useRouter } from "next/navigation";
import SingleFieldModalForm from "@/components/Modal/SingleFieldModalForm";
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
    const handleSubmit = async () => {
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
            <SingleFieldModalForm
                isOpen={isOpen}
                onClose={close}
                onSubmit={handleSubmit}
                title="Add Team Member"
                label="User UUID"
                value={memberId}
                onChange={setMemberId}
                submitLabel={loading ? "Adding..." : "Add to Board"}
                placeholder="Paste a User ID here..."
                autoFocus
                disabled={loading || !memberId.trim()}
            />
        </>
    );
}
