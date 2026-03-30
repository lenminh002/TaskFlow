import styles from "./page.module.css";
import Column from "@/components/Column/Column";
import BoardContainer from "./BoardContainer";

export default async function TaskPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    return (
        <div>
            <h1 className={styles.title}>Task: {id}</h1>
            <BoardContainer className={styles.board}>
                <div className={styles.columns}>
                    <Column />
                    <Column />
                    <Column />
                    <Column />
                    <button className={styles.add_column}>+</button>
                    <div style={{ minWidth: '8px', flexShrink: 0 }} />
                </div>
            </BoardContainer>
        </div>
    )
}