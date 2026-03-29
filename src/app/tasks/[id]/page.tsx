import styles from "../../page.module.css";

export default async function TaskPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    return (
        <div className={styles.main}>
            <h1>Task: {id}</h1>
        </div>
    )
}
