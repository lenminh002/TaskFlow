import { Task } from "@/type/types";

export const tasks: Task[] = [
    { id: "1", name: "Task 1", status: "todo", description: "First task" },
    { id: "2", name: "Task 2", status: "todo" },
    { id: "3", name: "Task 3", status: "in_progress", description: "In progress" },
    { id: "4", name: "Task 4", status: "in_review" },
    { id: "5", name: "Task 5", status: "done", description: "Shipped" },
];
