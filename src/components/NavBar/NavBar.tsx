'use client'

import { createPortal } from "react-dom";
import styles from "./NavBar.module.css";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from 'react'
import { useModal } from "@/hooks/useModal";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { fetchBoards, addBoard } from "@/lib/actions";
import type { Board } from "@/type/types";

/**
 * @file NavBar.tsx
 * @description Sidebar navigation component.
 * @details Fetches and displays available boards. Syncs the active highlight with the URL pathname and provides modal logic for board creation/deletion.
 */

/**
 * Renders the global sidebar navigation for board context switching.
 */
export default function NavBar() {
    const router = useRouter()
    const pathname = usePathname()
    // State for data fetching and UI components
    const [loading, setLoading] = useState(true)
    const [boards, setBoards] = useState<Board[]>([])
    const { isOpen, open, close } = useModal()
    const [boardName, setBoardName] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    // Allow users to close the modal by pressing Escape
    useEscapeKey(close, isOpen)

    // Fetch boards from Supabase on initial mount
    useEffect(() => {
        fetchBoards()
            .then(setBoards)
            .finally(() => setLoading(false))
    }, [])

    // Listen for custom events to instantly sync renamed boards in the sidebar
    useEffect(() => {
        function handleRename(e: Event) {
            const { id, name } = (e as CustomEvent).detail
            setBoards((prev) =>
                prev.map((b) => (b.id === id ? { ...b, name } : b))
            )
        }
        window.addEventListener("board-renamed", handleRename)
        return () => window.removeEventListener("board-renamed", handleRename)
    }, [])

    // Focus the input field automatically when the modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [isOpen])

    // Create a new board in the database and navigate to it upon success
    async function handleAddBoard() {
        const name = boardName.trim()
        if (!name) return

        const newBoard = {
            id: crypto.randomUUID(),
            name: name,
        }

        close()
        setBoardName("")

        // Update the UI immediately before waiting on the DB
        setBoards((prev) => [...prev, newBoard])

        // Persist to Supabase and rollback if insertion fails
        const result = await addBoard(newBoard)
        if (!result) {
            setBoards((prev) => prev.filter((b) => b.id !== newBoard.id))
            return
        }

        router.push(`/tasks/${newBoard.id}`)
    }

    // Delete a board from the database and navigate to home if the deleted board is currently active
    async function handleDeleteBoard(id: string, name: string) {
        if (!window.confirm(`Are you sure you want to delete the board "${name}" and all its tasks?`)) {
            return
        }

        // Update UI immediately
        setBoards((prev) => prev.filter((b) => b.id !== id))

        if (pathname === `/tasks/${id}`) {
            router.push('/')
        }

        const { deleteBoard } = await import('@/lib/actions')
        const result = await deleteBoard(id)
        if (!result) {
            alert('Failed to delete board.')
            fetchBoards().then(setBoards)
        }
    }

    // Render the modal into the document body to overlay the entire page
    const modal =
        isOpen &&
        createPortal(
            <div className={styles.backdrop} onClick={close}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.modal_header}>
                        <h2 className={styles.modal_title}>New Board</h2>
                        <button className={styles.modal_close} onClick={close}>×</button>
                    </div>
                    <hr className={styles.modal_hr} />
                    <form
                        className={styles.modal_body}
                        onSubmit={(e) => {
                            e.preventDefault()
                            handleAddBoard()
                        }}
                    >
                        <label className={styles.modal_label}>Board Name</label>
                        <input
                            ref={inputRef}
                            type="text"
                            className={styles.modal_input}
                            placeholder="Enter board name..."
                            value={boardName}
                            onChange={(e) => setBoardName(e.target.value)}
                        />
                        <button type="submit" className={styles.modal_submit}>
                            Create Board
                        </button>
                    </form>
                </div>
            </div>,
            document.body
        )

    const filteredBoards = boards.filter((board) => {
        const words = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
        if (words.length === 0) return true;
        const bName = board.name.toLowerCase();
        return words.every(word => bName.includes(word));
    });

    return (
        <>
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
                    {/* Search bar for filtering boards */}
                    <div className={styles.search}>
                        <input
                            type="text"
                            placeholder="Search boards"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button>🔍</button>
                    </div>

                    {/* Show skeleton placeholders while loading, then render board links */}
                    {loading ? (
                        <>
                            <div className={styles.skeleton} />
                            <div className={styles.skeleton} />
                            <div className={styles.skeleton} />
                        </>
                    ) : filteredBoards.map((board) => (
                        <div key={board.id} className={styles.nav_item_container}>
                            <Link
                                href={`/tasks/${board.id}`}
                                className={`${styles.nav_item} ${pathname === `/tasks/${board.id}` ? styles.nav_item_active : ''}`}
                            >
                                {board.name}
                            </Link>
                            <button
                                className={styles.nav_item_delete}
                                onClick={() => handleDeleteBoard(board.id, board.name)}
                                title="Delete board"
                            >
                                ×
                            </button>
                        </div>
                    ))}

                    <br />
                    <hr style={{ border: '1px solid #000000' }} />
                    {/* Button to open the "add board" modal */}
                    <button className={styles.add_task} onClick={open}>+</button>
                </div>
            </nav>
            {modal}
        </>
    );
}
