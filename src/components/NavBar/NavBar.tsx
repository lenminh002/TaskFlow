'use client'

import styles from "./NavBar.module.css";
import Link from "next/link";
import { useState, useEffect } from 'react'
import { fetchTasks } from "@/lib/actions";
import type { Task } from "@/type/types";

// NavBar is a client component that renders the sidebar navigation.
// It fetches tasks from Supabase on mount and displays them as clickable links.
export default function NavBar() {
    // Track which nav item is currently selected (highlighted)
    const [active, setActive] = useState<string | null>(null)
    // Store the list of tasks fetched from Supabase
    const [tasks, setTasks] = useState<Task[]>([])

    // Fetch tasks from Supabase when the component first mounts.
    // The empty dependency array [] ensures this only runs once on initial render.
    useEffect(() => {
        fetchTasks().then(setTasks)
    }, [])

    return (
        <nav className={styles.nav}>
            {/* Header section: app name and subtitle */}
            <div className={styles.header}>
                <h1 className={styles.title}>TaskFlow</h1>
                <p className={styles.subtitle}>Manage your tasks efficiently</p>
                <br />
                <hr style={{ border: '1.5px solid #000000' }} />

            </div>

            {/* Navigation items section: search bar, task links, and add button */}
            <div className={styles.nav_items}>
                {/* Search bar for filtering tasks (not yet functional) */}
                <div className={styles.search}>
                    <input type="text" placeholder="Search tasks" />
                    <button>🔍</button>
                </div>

                {/* Render a link for each task fetched from Supabase.
                    Clicking a link navigates to /tasks/[id] and highlights it as active. */}
                {tasks.map((task) => (
                    <Link
                        href={`/tasks/${task.id}`}
                        key={task.id}
                        className={`${styles.nav_item} ${active === task.id ? styles.nav_item_active : ''}`}
                        onClick={() => setActive(task.id)}
                    >
                        {task.name}
                    </Link>
                ))}
                
                <br />
                <hr style={{ border: '1px solid #000000' }}/>
                {/* Button to add a new task (not yet functional) */}
                <button className={styles.add_task}>+</button>
            </div>
        </nav>
    );
}
