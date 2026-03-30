import styles from "./page.module.css";
import Column from "@/components/Column/Column";

export default async function TaskPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    return (
        <div className={styles.board}>
            <h1 className={styles.title}>Task: {id}</h1>
            <div className={styles.columns}>
                <Column />
                <Column />
                <Column />
            </div>
        </div>
    )
}