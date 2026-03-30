import styles from "./page.module.css";
import Column from "@/components/Column/Column";
import BoardContainer from "./BoardContainer";

export default async function TaskPage({ params }: { params: { id: number } }) {
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
                    <Column />
                    <Column />
                </div>
            </BoardContainer>
        </div>
    )
}