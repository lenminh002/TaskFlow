'use client'

import styles from "./NavBar.module.css";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from 'react'
import { useModal } from "@/hooks/useModal";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { fetchBoards, addBoard, deleteBoard, leaveBoard } from "@/lib/actions";
import SingleFieldModalForm from "@/components/Modal/SingleFieldModalForm";
import { useAutoFocus } from "@/hooks/useAutoFocus";
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
    // Core UI State Variables
    const [loading, setLoading] = useState(true)
    const [boards, setBoards] = useState<Board[]>([])

    // Collaboration Role Guards: 
    // We isolate the active user locally to determine whether they're 
    // allowed to Delete the board permanently (Owner) vs. merely Leave it (Member).
    const [currentUserId, setCurrentUserId] = useState<string>("")
    const { isOpen, open, close } = useModal()
    const [boardName, setBoardName] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const inputRef = useAutoFocus<HTMLInputElement>(isOpen)

    // Allow users to close the modal by pressing Escape
    useEscapeKey(close, isOpen)

    // Fetch boards from Supabase on initial mount
    const reloadBoards = () => {
        return fetchBoards()
            .then((res) => {
                setBoards(res.boards);
                setCurrentUserId(res.currentUserId);
            })
            .catch((e) => console.error("Could not load boards:", e));
    };

    useEffect(() => {
        reloadBoards().finally(() => setLoading(false));
    }, []);

    // Listen for custom events to instantly sync renamed boards in the sidebar
    useEffect(() => {
        function handleRename(e: Event) {
            if (!(e instanceof CustomEvent) || !e.detail?.id || !e.detail?.name) {
                console.warn('Invalid board-renamed event received');
                return;
            }
            const { id, name } = e.detail;
            setBoards((prev) =>
                prev.map((b) => (b.id === id ? { ...b, name } : b))
            )
        }
        window.addEventListener("board-renamed", handleRename)
        return () => window.removeEventListener("board-renamed", handleRename)
    }, [])



    // Create a new board in the database and navigate to it upon success
    async function handleAddBoard() {
        const name = boardName.trim()
        if (!name) return

        const newBoard: Board = {
            id: crypto.randomUUID(),
            name: name,
            userId: currentUserId,
            createdAt: new Date().toISOString()
        }

        close()
        setBoardName("")

        // Update the UI immediately before waiting on the DB
        setBoards((prev) => [...prev, newBoard])

        // Persist to Supabase and rollback if insertion fails
        try {
            await addBoard(newBoard);
            router.push(`/tasks/${newBoard.id}`);
        } catch (e) {
            console.error("Failed to add board:", e);
            setBoards((prev) => prev.filter((b) => b.id !== newBoard.id));
            alert("Failed to create board. Please try again.");
        }
    }

    // Generalize board removal (Owner = delete, Member = leave)
    async function handleRemoveBoard(id: string, name: string, isOwner: boolean) {
        const actionName = isOwner ? 'delete' : 'leave';
        const confirmMsg = isOwner 
            ? `Are you sure you want to delete the board "${name}" and all its tasks?`
            : `Are you sure you want to leave the board "${name}"? You will lose access.`;

        if (typeof window === "undefined" || !window.confirm(confirmMsg)) {
            return;
        }

        // Update UI optimistically
        setBoards((prev) => prev.filter((b) => b.id !== id));
        if (pathname === `/tasks/${id}`) {
            router.push('/');
        }

        try {
            if (isOwner) {
                await deleteBoard(id);
            } else {
                await leaveBoard(id);
            }
        } catch (e) {
            console.error(`Failed to ${actionName} board:`, e);
            alert(`Failed to ${actionName} board.`);
            reloadBoards();
        }
    }

    const modal = (
        <SingleFieldModalForm
            isOpen={isOpen}
            onClose={close}
            onSubmit={handleAddBoard}
            title="New Board"
            label="Board Name"
            value={boardName}
            onChange={setBoardName}
            submitLabel="Create Board"
            placeholder="Enter board name..."
            inputRef={inputRef}
        />
    );

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
                    <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h1 className={styles.title}>TaskFlow</h1>
                    </Link>
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
                    ) : filteredBoards.map((board) => {
                        // Role Guard Check: Natively determine owner logic for each board iterably.
                        // Owners have full destruct rights. External members can only "Leave" safely.
                        const isOwner = board.userId === currentUserId;

                        return (
                            <div key={board.id} className={styles.nav_item_container}>
                                <Link
                                    href={`/tasks/${board.id}`}
                                    className={`${styles.nav_item} ${pathname === `/tasks/${board.id}` ? styles.nav_item_active : ''}`}
                                >
                                    {board.name}
                                </Link>
                                <button
                                    className={styles.nav_item_delete}
                                    style={{ color: isOwner ? '' : '#d9534f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    onClick={() => handleRemoveBoard(board.id, board.name, isOwner)}
                                    title={isOwner ? "Delete board" : "Leave board"}
                                >
                                    {isOwner ? '×' : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M16 13v-2H7V8l-5 4 5 4v-3z"></path>
                                            <path d="M20 3h-9c-1.103 0-2 .897-2 2v4h2V5h9v14h-9v-4H9v4c0 1.103.897 2 2 2h9c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2z"></path>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        )
                    })}

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
