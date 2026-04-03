'use client'

import { createPortal } from "react-dom";
import styles from "./NavBar.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from 'react'
import { useModal } from "@/hooks/useModal";
import { useEscapeKey } from "@/hooks/useEscapeKey";
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
    // Modal state for the "add board" popup
    const { isOpen, open, close } = useModal()
    // Store the board name typed into the modal input
    const [boardName, setBoardName] = useState("")
    // Ref to auto-focus the input when the modal opens
    const inputRef = useRef<HTMLInputElement>(null)

    // Allow users to close the modal by pressing Escape
    useEscapeKey(close, isOpen)

    // Fetch boards from Supabase when the component first mounts.
    useEffect(() => {
        fetchBoards()
            .then(setBoards)
            .finally(() => setLoading(false))
    }, [])

    // Listen for board rename events from EditableTitle
    // and update the board name in our local list immediately.
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

    // Auto-focus the input when the modal opens
    useEffect(() => {
        if (isOpen) {
            // Small delay to ensure the portal is mounted before focusing
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [isOpen])

    // Create a new board in Supabase, add it to the sidebar list,
    // and navigate to its page.
    async function handleAddBoard() {
        const name = boardName.trim()
        if (!name) return // Don't create a board with an empty name

        const newBoard = {
            id: crypto.randomUUID(),
            name: name,
        }

        // Close the modal and reset the input
        close()
        setBoardName("")

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

    // Modal rendered via portal into document.body
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
                    <hr style={{ border: '1px solid #000000' }} />
                    {/* Button to open the "add board" modal */}
                    <button className={styles.add_task} onClick={open}>+</button>
                </div>
            </nav>
            {modal}
        </>
    );
}
