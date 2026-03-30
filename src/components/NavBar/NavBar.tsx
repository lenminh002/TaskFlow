'use client'

import styles from "./NavBar.module.css";
import Link from "next/link";
import { useState } from 'react'

const tasks = [
    { id: "1", name: "Task 1" },
    { id: "2", name: "Task 2" },
    { id: "3", name: "Task 3" },
    { id: "4", name: "Task 4" },
];


export default function NavBar() {
    const [active, setActive] = useState<string | null>(null)

    return (
        <nav className={styles.nav}>
            <div className={styles.header}>
                <h1>TaskFlow</h1>
                <p>Manage your tasks</p>
                <br />
                <search className={styles.search}>
                    <input type="text" placeholder="Search tasks" />
                    <button>🔍</button>
                </search>
                <br />
                <hr />
            </div>
            <div className={styles.nav_items}>
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

