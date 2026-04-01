import styles from "./Column.module.css";
import Card from "@/components/Card/Card";
import type { ColumnProps } from "@/type/types";

export default function Column({ title, status, tasks = [] }: ColumnProps) {
    return (
        <div className={styles.column} data-status={status}>
            <h1>{title}</h1>

            <Card/>
            <Card/>
            <Card/>

            <hr style={{ border: '1px solid #000000' }}/>
            <button className={styles.add_card}>+</button>
        </div>
    );
}