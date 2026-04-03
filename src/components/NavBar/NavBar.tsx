'use client'

import styles from "./NavBar.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from 'react'
import { fetchBoards, addBoard } from "@/lib/actions";
import type { Board } from "@/type/types";

// NavBar renders the sidebar navigation.
// It fetches boards from Supabase on mount and displays them as clickable links.
export default function NavBar() {
    const router = useRouter()
    // Track whether boards are still being fetched
    const [loading, setLoading] = useState(true)
    // Track which nav item is currently selected (highlighted)
    const [active, setActive] = useState<string | null>(null)
    // Store the list of boards fetched from Supabase
    const [boards, setBoards] = useState<Board[]>([])

    // Fetch boards from Supabase when the component first mounts.
    useEffect(() => {
        fetchBoards()
            .then(setBoards)
            .finally(() => setLoading(false))
    }, [])

    // Create a new board in Supabase, add it to the sidebar list,
    // and navigate to its page.
    async function handleAddBoard() {
        const newBoard = {
            id: crypto.randomUUID(),
            name: "New Board",
        }

        // Optimistically add to the list
        setBoards((prev) => [...prev, newBoard])
        setActive(newBoard.id)

        // Persist to Supabase
        const result = await addBoard(newBoard)
        if (!result) {
            // Rollback if it failed
            setBoards((prev) => prev.filter((b) => b.id !== newBoard.id))
            return
        }

        // Navigate to the new board's page
        router.push(`/tasks/${newBoard.id}`)
    }

    return (
        <nav className={styles.nav}>
            {/* Header section: app name and subtitle */}
            <div className={styles.header}>
                <h1 className={styles.title}>TaskFlow</h1>
                <p className={styles.subtitle}>Manage your tasks efficiently</p>
                <br />
                <hr style={{ border: '1.5px solid #000000' }} />

            </div>

            {/* Navigation items section: search bar, board links, and add button */}
            <div className={styles.nav_items}>
                {/* Search bar for filtering (not yet functional) */}
                <div className={styles.search}>
                    <input type="text" placeholder="Search tasks" />
                    <button>🔍</button>
                </div>

                {/* Show skeleton placeholders while loading, then render board links */}
                {loading ? (
                    <>
                        <div className={styles.skeleton} />
                        <div className={styles.skeleton} />
                        <div className={styles.skeleton} />
                    </>
                ) : boards.map((board) => (
                    <Link
                        href={`/tasks/${board.id}`}
                        key={board.id}
                        className={`${styles.nav_item} ${active === board.id ? styles.nav_item_active : ''}`}
                        onClick={() => setActive(board.id)}
                    >
                        {board.name}
                    </Link>
                ))}
                
                <br />
                <hr style={{ border: '1px solid #000000' }}/>
                {/* Button to add a new board — creates it in Supabase and navigates to it */}
                <button className={styles.add_task} onClick={handleAddBoard}>+</button>
            </div>
        </nav>
    );
}
