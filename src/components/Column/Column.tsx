import styles from "./Column.module.css";

interface ColumnProps {
    title?: string;
    content?: string;
}

export default function Column({ title = "Column", content = "No content" }: ColumnProps) {
    return (
        <div className={styles.column}>
            <h1>{title}</h1>
            <p>{content}</p>
        </div>
    );
}