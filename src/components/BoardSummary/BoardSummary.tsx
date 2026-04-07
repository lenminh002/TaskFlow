/**
 * @file BoardSummary.tsx
 * @description Header-level statistics for the current Kanban board.
 * @details Displays key metrics like total, completed, and overdue tasks at a glance.
 */

import styles from "./BoardSummary.module.css";

/**
 * Props for the BoardSummary component.
 */
interface BoardSummaryProps {
    /** Total number of tasks on the board across all columns */
    totalTasks: number;
    /** Number of tasks sitting in the 'Done' status lane */
    completedTasks: number;
    /** Number of tasks whose due date has passed without being marked 'Done' */
    overdueTasks: number;
}

/**
 * Internal presentational sub-component for a single KPI card.
 */
function SummaryStat({
    label,
    value,
    accentClassName,
}: {
    /** The display name of the statistic */
    label: string;
    /** The numeric count to showcase */
    value: number;
    /** Optional CSS hook for category-specific colors (e.g. green for done) */
    accentClassName?: string;
}) {
    return (
        <div className={`${styles.statCard} ${accentClassName ?? ""}`.trim()}>
            <span className={styles.label}>{label}</span>
            <span className={styles.value}>{value}</span>
        </div>
    );
}

/**
 * Renders the top-level summary section providing a board health check.
 */
export default function BoardSummary({ totalTasks, completedTasks, overdueTasks }: BoardSummaryProps) {
    // This summary gives the board header a quick health check without needing to scan every column.
    return (
        <section className={styles.summary} aria-label="Board summary">
            <SummaryStat label="Total Tasks" value={totalTasks} />
            <SummaryStat label="Completed" value={completedTasks} accentClassName={styles.accentDone} />
            <SummaryStat label="Overdue" value={overdueTasks} accentClassName={styles.accentOverdue} />
        </section>
    );
}
