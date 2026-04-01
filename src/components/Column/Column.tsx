import styles from "./Column.module.css";
import Card from "@/components/Card/Card";

interface ColumnProps {
    title?: string;
}

export default function Column({ title = "Column" }: ColumnProps) {
    return (
        <div className={styles.column}>
            <h1>{title}</h1>


            <Card />
            <Card />
            <Card />
            <Card />
            <hr style={{ border: '1px solid #000000' }}/>
            <button className={styles.add_card}>+</button>
        </div>
    );
}