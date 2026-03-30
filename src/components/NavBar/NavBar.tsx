'use client'

import styles from "./NavBar.module.css";
import Link from "next/link";
import { useState } from 'react'
import { tasks } from "@/lib/data";

export default function NavBar() {
    const [active, setActive] = useState<string | null>(null)

    return (
        <nav className={styles.nav}>
            <div className={styles.header}>
                <h1 className={styles.title}>TaskFlow</h1>
                <p className={styles.subtitle}>Manage your tasks efficiently</p>
                <br />
                <hr style={{ border: '1.5px solid #000000' }} />

            </div>
            <div className={styles.nav_items}>
                <div className={styles.search}>
                    <input type="text" placeholder="Search tasks" />
                    <button>🔍</button>
                </div>
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
                <button className={styles.add_task}>+</button>
            </div>
        </nav>
    );
}

