"use client";

import { useState } from "react";
import Column from "@/components/Column/Column";
import type { Task, ColumnStatus } from "@/type/types";

const BOARD_COLUMNS: { title: string; status: ColumnStatus }[] = [
    { title: "To Do", status: "todo" },
    { title: "In Progress", status: "in_progress" },
    { title: "In Review", status: "in_review" },
    { title: "Done", status: "done" },
];

export default function BoardClient({ initialTasks, className, children }: { initialTasks: Task[]; className?: string; children?: React.ReactNode }) {
    const [tasks, setTasks] = useState<Task[]>(initialTasks);

    function addTask(status: ColumnStatus) {
        const newTask: Task = {
            id: crypto.randomUUID(),
            name: "New Task",
            status: status,
        };
        setTasks((prev) => [...prev, newTask]);
    }

    return (
        <div className={className}>
            {BOARD_COLUMNS.map(({ title, status }) => (
                <Column
                    key={status}
                    title={title}
                    status={status}
                    tasks={tasks.filter((t) => t.status === status)}
                    onAddCard={() => addTask(status)}
                />
            ))}
            {children}
        </div>
    );
}
