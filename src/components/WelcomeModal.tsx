"use client";

import React, { useState } from "react";
import Modal from "./Modal/Modal";
import { createUserProfile } from "@/lib/actions";

/**
 * @file WelcomeModal.tsx
 * @description Highly locked onboarding gateway strictly demanding a textual Username from freshly minted Anonymous Supabase tokens.
 */

export default function WelcomeModal({ userId, onComplete }: { userId: string, onComplete: () => void }) {
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
        <Modal isOpen={true} onClose={() => {}} title="Onboarding">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Welcome to TaskFlow!</h2>
            <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem', color: '#555' }}>
                Please enter a username to collaborate with your team.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="E.g. Alex"
                    style={{ padding: '0.5rem', border: '2px solid #000', fontSize: '1rem' }}
                    autoFocus
                    required
                />
                <button 
                    type="submit" 
                    disabled={loading || !username.trim()}
                    style={{
                        padding: '0.75rem',
                        backgroundColor: '#000',
                        color: '#fff',
                        border: 'none',
                        cursor: loading || !username.trim() ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: '1rem'
                    }}
                >
                    {loading ? "Joining..." : "Join Workflow"}
                </button>
            </form>
        </Modal>
    );
}
